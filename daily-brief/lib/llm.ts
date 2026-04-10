/**
 * Conclave LLM Helper — Grounded Generation with Post-Validation
 *
 * Design principles:
 *  1. EVERY LLM call is grounded — the model is handed raw JSON data and told
 *     to only use values that appear in that data.
 *  2. EVERY output is post-validated — any number the model writes is regex-
 *     matched against the source data. Hallucinated numbers → fallback.
 *  3. Works without ANTHROPIC_API_KEY — returns deterministic placeholder text
 *     until the key is added. Nothing crashes.
 *  4. Model choice is explicit per task: sonnet() for synthesis/judgment,
 *     opus() for the heaviest reasoning (Gandalf, Durin interactive).
 *  5. Every response carries a confidence label: FACT | INFERENCE | GUESS.
 */

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// Lazy client creation — don't crash during build if key is missing
let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

export function hasAnthropicKey(): boolean {
  return Boolean(ANTHROPIC_API_KEY);
}

// ────────────────────────────────────────────────────────
// Models
// ────────────────────────────────────────────────────────
export const MODELS = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-5",
  opus: "claude-opus-4-5",
} as const;

export type ModelName = keyof typeof MODELS;

// ────────────────────────────────────────────────────────
// Grounded generation request
// ────────────────────────────────────────────────────────
export interface GroundedRequest {
  task: string; // short description: "Score headlines", "Summarize proposals"
  model: ModelName;
  sourceData: object; // the JSON data the LLM must ground in
  instruction: string; // what the LLM should produce
  maxTokens?: number;
  temperature?: number;
}

export interface GroundedResponse {
  ok: boolean;
  text: string;
  confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB";
  model: string;
  usedApi: boolean;
  validationErrors?: string[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

// ────────────────────────────────────────────────────────
// The core grounded generation function
// ────────────────────────────────────────────────────────
export async function grounded(req: GroundedRequest): Promise<GroundedResponse> {
  const client = getClient();

  // No API key → deterministic stub
  if (!client) {
    return {
      ok: true,
      text: `[${req.task}] LLM layer not yet activated. Add ANTHROPIC_API_KEY to enable narrative generation. Raw data still present in the FACT section above.`,
      confidence: "STUB",
      model: req.model,
      usedApi: false,
    };
  }

  const systemPrompt = buildSystemPrompt(req.task);
  const userPrompt = buildUserPrompt(req.sourceData, req.instruction);

  try {
    const response = await client.messages.create({
      model: MODELS[req.model],
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    // Post-validate: any number in the output must exist in the source data
    const validationErrors = postValidate(text, req.sourceData);

    // Cost estimation (approximate, Sonnet 4.5 pricing)
    const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
    const outputCost = (response.usage.output_tokens / 1_000_000) * 15;

    return {
      ok: validationErrors.length === 0,
      text,
      confidence: validationErrors.length === 0 ? "INFERENCE" : "GUESS",
      model: MODELS[req.model],
      usedApi: true,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: inputCost + outputCost,
    };
  } catch (err) {
    console.error(`[llm] ${req.task} failed:`, err instanceof Error ? err.message : err);
    return {
      ok: false,
      text: `[${req.task}] LLM call failed — ${err instanceof Error ? err.message : "unknown error"}. Falling back to raw data.`,
      confidence: "STUB",
      model: req.model,
      usedApi: false,
    };
  }
}

// ────────────────────────────────────────────────────────
// Grounding instructions — the system prompt that enforces non-hallucination
// ────────────────────────────────────────────────────────
function buildSystemPrompt(task: string): string {
  return `You are a research assistant for Moria Capital, a DeFi value fund building on-chain rails for commodity trade finance.

Your current task: ${task}

ABSOLUTE RULES — violations cause your output to be rejected:

1. GROUNDING: You will be given raw JSON data. You may ONLY use numbers, dates, tickers, and facts that appear in that data. If a fact is not in the data, you cannot mention it. "I know this from my training" is FORBIDDEN.

2. PRECISION: When you cite a number, use the EXACT value from the data. Do not round unless the data is already rounded. Do not convert units unless asked.

3. UNCERTAINTY: If the data is ambiguous or missing, say "the data shows" or "the data does not indicate." NEVER invent filler context.

4. CONFIDENCE LABELING: Start every paragraph with one of:
   - "FACT:" when you are directly quoting or paraphrasing the data
   - "INFERENCE:" when you are drawing a conclusion from the data using reasoning
   - "GUESS:" if you find yourself about to speculate (in which case, stop and rewrite to remove the speculation)

5. BREVITY: Be concise. No filler words, no hedging, no "it's important to note." Say the thing directly.

6. MORIA VOICE: Write like a senior analyst briefing a portfolio manager. Direct, unemotional, specific. No exclamation points. No crypto-Twitter hype. No "to the moon" language.

7. THESIS ALIGNMENT: Moria's thesis is (a) undervalued DeFi infrastructure at 2-9x earnings vs TradFi 15-25x, (b) commodity trade finance migrating to DeFi rails, (c) value investing discipline with margin of safety. Prioritize information that moves these theses.

If you cannot complete the task with integrity given the data provided, say so explicitly and stop.`;
}

function buildUserPrompt(sourceData: object, instruction: string): string {
  return `Here is the data you must ground your response in:

\`\`\`json
${JSON.stringify(sourceData, null, 2)}
\`\`\`

Instruction: ${instruction}

Remember: use ONLY values that appear in the JSON above. Label every paragraph FACT: or INFERENCE:.`;
}

// ────────────────────────────────────────────────────────
// Post-validation — catches hallucinated numbers
// ────────────────────────────────────────────────────────
function postValidate(text: string, sourceData: object): string[] {
  const errors: string[] = [];
  const sourceJson = JSON.stringify(sourceData);

  // Extract all numbers from the LLM text that look like data points.
  // We look for: integers ≥ 10, decimals, percentages, dollar amounts.
  // Skip small integers (1-9) and round years (2020-2030) which are often sentence-filler.
  const numberPattern = /(?<![\w.])(\$?-?\d{2,}(?:,\d{3})*(?:\.\d+)?%?)/g;
  const numbersInText = new Set<string>();

  const matches = text.matchAll(numberPattern);
  for (const match of matches) {
    const num = match[1].replace(/[$,%]/g, "").replace(/,/g, "");
    const parsed = parseFloat(num);
    if (isNaN(parsed)) continue;
    if (parsed >= 2020 && parsed <= 2030 && !num.includes(".")) continue; // likely a year
    numbersInText.add(num);
  }

  // Each extracted number must appear somewhere in the source data.
  for (const num of numbersInText) {
    const escapedNum = num.replace(/\./g, "\\.");
    const regex = new RegExp(`(?<![\\w.])${escapedNum}(?![\\w.])`);
    if (!regex.test(sourceJson)) {
      errors.push(`number ${num} not found in source data`);
    }
  }

  return errors;
}

// ────────────────────────────────────────────────────────
// Convenience wrappers for each model tier
// ────────────────────────────────────────────────────────
export async function sonnet(
  task: string,
  sourceData: object,
  instruction: string,
  maxTokens = 1024,
): Promise<GroundedResponse> {
  return grounded({ task, model: "sonnet", sourceData, instruction, maxTokens });
}

export async function opus(
  task: string,
  sourceData: object,
  instruction: string,
  maxTokens = 2048,
): Promise<GroundedResponse> {
  return grounded({ task, model: "opus", sourceData, instruction, maxTokens });
}

export async function haiku(
  task: string,
  sourceData: object,
  instruction: string,
  maxTokens = 512,
): Promise<GroundedResponse> {
  return grounded({ task, model: "haiku", sourceData, instruction, maxTokens });
}
