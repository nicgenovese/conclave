/**
 * Gimli — The DeFi Value-Investing Agent (Tier 2)
 *
 * Gimli's sharp job: pull revenue, fees, and TVL from DeFi Llama for every
 * watchlist protocol, compute P/F and P/E ratios, compare to TradFi peers,
 * and classify each as cheap / fair / expensive.
 *
 * This IS Moria's thesis in agent form: "DeFi infrastructure at 2-9x
 * earnings, TradFi peers at 15-25x, the discount is structural."
 *
 * Wave 1: deterministic P/F + P/E computation (no LLM).
 * Wave 2: Sonnet writes a "cheap vs expensive" narrative using grounded().
 *
 * Data sources:
 *  - DeFi Llama /protocol/{slug} for fees + revenue + TVL
 *  - DeFi Llama /prices/current for market cap proxy
 *  - Hardcoded TradFi comparables table
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { WATCHLIST } from "./lib/watchlist.js";
import { sonnet, hasAnthropicKey } from "./lib/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../portal/data/gimli.json");

// ─────────────────────────────────────────────────────────
// TradFi peer comparables
// ─────────────────────────────────────────────────────────

interface TradFiPeer {
  name: string;
  pe_low: number;
  pe_high: number;
  pe_mid: number;
}

// ─────────────────────────────────────────────────────────
// Fee switch reality check
// Source: DeFi Llama + public governance records. Update as switches activate.
// ─────────────────────────────────────────────────────────

export type FeeSwitchState =
  | "live_full"       // full fee/rev capture (e.g. HYPE 97% burn)
  | "live_partial"    // activated but only small % flows to holders (Uniswap Feb 2026)
  | "live_buyback"    // buyback program (Aave sAVE, small % of mcap)
  | "not_activated"   // governance hasn't flipped the switch yet
  | "unknown";

export interface FeeSwitchInfo {
  state: FeeSwitchState;
  holder_pct: number;       // 0-100, portion of fees flowing to token holders
  note: string;
}

const FEE_SWITCH_STATUS: Record<string, FeeSwitchInfo> = {
  // Full capture
  HYPE:     { state: "live_full",      holder_pct: 97, note: "97% fee burn active" },
  PENDLE:   { state: "live_full",      holder_pct: 80, note: "80% to vePENDLE stakers" },
  ENA:      { state: "live_full",      holder_pct: 100, note: "All rev via sENA" },
  JUP:      { state: "live_full",      holder_pct: 50, note: "50% to veJUP" },
  JTO:      { state: "live_full",      holder_pct: 100, note: "MEV revenue to stakers" },

  // Partial / gradual
  UNI:      { state: "live_partial",   holder_pct: 10, note: "Fee switch Feb 2026, gradual rollout" },
  AAVE:     { state: "live_buyback",   holder_pct: 3,  note: "sAVE buyback $50M/yr vs $1.8B mcap" },

  // Not activated
  MORPHO:   { state: "not_activated",  holder_pct: 0, note: "Governance has not activated fee switch" },
  COW:      { state: "not_activated",  holder_pct: 0, note: "Surplus retained in treasury, no holder capture" },
  LDO:      { state: "not_activated",  holder_pct: 0, note: "Lido fees to node operators + insurance, not LDO" },
  wstETH:   { state: "live_full",      holder_pct: 100, note: "Staking yield IS the return" },
  ENS:      { state: "not_activated",  holder_pct: 0, note: "Registration fees to treasury" },

  // Watchlist
  KMNO:     { state: "live_full",      holder_pct: 50, note: "Kamino fee distribution to KMNO stakers" },
  VIRTUAL:  { state: "live_full",      holder_pct: 100, note: "Agent tokens revenue" },
  ONDO:     { state: "not_activated",  holder_pct: 0, note: "Token for governance, no direct rev" },
  RAIL:     { state: "live_full",      holder_pct: 100, note: "Privacy fees to stakers" },
};

function getFeeSwitchStatus(ticker: string): FeeSwitchInfo {
  return FEE_SWITCH_STATUS[ticker.toUpperCase()] || {
    state: "unknown",
    holder_pct: 0,
    note: "Fee switch status not tracked",
  };
}

const TRADFI_PEERS: Record<string, TradFiPeer> = {
  lending: { name: "Regional Banks", pe_low: 15, pe_high: 20, pe_mid: 17.5 },
  dex: { name: "Exchanges (CME/ICE)", pe_low: 18, pe_high: 25, pe_mid: 21.5 },
  "perp-dex": { name: "CME/CBOE", pe_low: 18, pe_high: 25, pe_mid: 21.5 },
  yield: { name: "Derivatives Platforms", pe_low: 15, pe_high: 20, pe_mid: 17.5 },
  "dex-aggregator": { name: "Broker-Dealers", pe_low: 12, pe_high: 18, pe_mid: 15 },
  LSD: { name: "Asset Managers", pe_low: 15, pe_high: 20, pe_mid: 17.5 },
  oracle: { name: "Data Providers (Bloomberg-adj)", pe_low: 25, pe_high: 35, pe_mid: 30 },
  RWA: { name: "Credit Platforms", pe_low: 10, pe_high: 18, pe_mid: 14 },
  L1: { name: "Cloud Infra (AWS-adj)", pe_low: 20, pe_high: 30, pe_mid: 25 },
  default: { name: "Fintech Median", pe_low: 15, pe_high: 25, pe_mid: 20 },
};

function pickPeer(tags: string[]): TradFiPeer {
  for (const tag of tags) {
    if (TRADFI_PEERS[tag]) return TRADFI_PEERS[tag];
  }
  return TRADFI_PEERS.default;
}

// ─────────────────────────────────────────────────────────
// DeFi Llama protocol data
// ─────────────────────────────────────────────────────────

interface DeFiLlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  mcap?: number;
  tvl?: number;
  chainTvls?: Record<string, number>;
}

async function fetchLlamaProtocol(slug: string): Promise<DeFiLlamaProtocol | null> {
  try {
    const url = `https://api.llama.fi/protocol/${slug}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      mcap: data.mcap,
      tvl: data.currentChainTvls
        ? Object.values(data.currentChainTvls as Record<string, number>).reduce((a, b) => a + b, 0)
        : undefined,
      chainTvls: data.currentChainTvls,
    };
  } catch {
    return null;
  }
}

// Annualized fees and revenue come from a separate endpoint
interface LlamaFeesResponse {
  totalDataChart?: number[][];  // [[timestamp, value], ...]
  total24h?: number;
  total7d?: number;
  total30d?: number;
  totalAllTime?: number;
}

async function fetchLlamaFees(slug: string, dataType: "dailyFees" | "dailyRevenue"): Promise<number | null> {
  try {
    const url = `https://api.llama.fi/summary/fees/${slug}?dataType=${dataType}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as LlamaFeesResponse;

    // Prefer 30d × 12 (annualized), fall back to 24h × 365
    if (data.total30d && data.total30d > 0) return data.total30d * 12;
    if (data.total24h && data.total24h > 0) return data.total24h * 365;
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────

export interface GimliProtocol {
  ticker: string;
  name: string;
  theme: string;
  tags: string[];
  market_cap: number | null;
  tvl: number | null;
  fees_annualized: number | null;
  revenue_annualized: number | null;
  pf_ratio: number | null;
  pe_ratio: number | null;
  tradfi_peer: string;
  peer_pe_mid: number;
  peer_pe_range: string;
  valuation: "cheap" | "fair" | "expensive" | "unknown";
  upside_to_peer_pct: number | null;
  fee_switch: FeeSwitchInfo;
  pe_if_full_capture: number | null;   // speculative P/E if all fees flowed to holders
  thesis_relevance: number;
  defillama_slug: string;
}

export interface GimliData {
  updated_at: string;
  protocols: GimliProtocol[];
  cheapest: GimliProtocol[];
  most_expensive: GimliProtocol[];
  summary: {
    total_analyzed: number;
    cheap: number;
    fair: number;
    expensive: number;
    unknown: number;
  };
  narrative: {
    text: string;
    confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB";
    model: string;
    used_api: boolean;
  };
  health: {
    defillama: "ok" | "error";
    anthropic: "ok" | "stubbed";
  };
}

// ─────────────────────────────────────────────────────────
// Valuation classification
// ─────────────────────────────────────────────────────────

function classify(peRatio: number | null, peer: TradFiPeer): {
  valuation: GimliProtocol["valuation"];
  upside_pct: number | null;
} {
  if (peRatio === null || peRatio <= 0) {
    return { valuation: "unknown", upside_pct: null };
  }

  // Cheap = trading below peer low
  // Expensive = trading above peer high
  // Fair = in between
  let valuation: GimliProtocol["valuation"];
  if (peRatio < peer.pe_low) valuation = "cheap";
  else if (peRatio > peer.pe_high) valuation = "expensive";
  else valuation = "fair";

  // Upside to mid peer multiple
  const upside = ((peer.pe_mid - peRatio) / peRatio) * 100;

  return { valuation, upside_pct: upside };
}

// ─────────────────────────────────────────────────────────
// Main fetcher
// ─────────────────────────────────────────────────────────

export async function fetchGimli(): Promise<GimliData> {
  console.log("[gimli] Analyzing DeFi valuations...");

  // Only analyze protocols that have a DeFi Llama slug
  const analyzable = WATCHLIST.filter((p) => p.defillama_slug !== null);

  const protocols: GimliProtocol[] = [];

  // Fetch in parallel but chunk to avoid rate limits
  const CHUNK = 8;
  for (let i = 0; i < analyzable.length; i += CHUNK) {
    const batch = analyzable.slice(i, i + CHUNK);
    const results = await Promise.all(
      batch.map(async (p) => {
        const [protocolData, fees, revenue] = await Promise.all([
          fetchLlamaProtocol(p.defillama_slug!),
          fetchLlamaFees(p.defillama_slug!, "dailyFees"),
          fetchLlamaFees(p.defillama_slug!, "dailyRevenue"),
        ]);

        const marketCap = protocolData?.mcap ?? null;
        const tvl = protocolData?.tvl ?? null;

        const pfRatio = fees && marketCap ? marketCap / fees : null;
        const peRatio = revenue && marketCap ? marketCap / revenue : null;

        // Speculative P/E if 100% of fees flowed to token holders
        // Useful to see "what would this look like with a fully activated fee switch"
        const peIfFullCapture = fees && marketCap ? marketCap / fees : null;

        const peer = pickPeer(p.tags);
        const { valuation, upside_pct } = classify(peRatio, peer);

        const feeSwitch = getFeeSwitchStatus(p.ticker);

        return {
          ticker: p.ticker,
          name: p.name,
          theme: p.theme,
          tags: p.tags,
          market_cap: marketCap,
          tvl,
          fees_annualized: fees,
          revenue_annualized: revenue,
          pf_ratio: pfRatio,
          pe_ratio: peRatio,
          tradfi_peer: peer.name,
          peer_pe_mid: peer.pe_mid,
          peer_pe_range: `${peer.pe_low}-${peer.pe_high}x`,
          valuation,
          upside_to_peer_pct: upside_pct,
          fee_switch: feeSwitch,
          pe_if_full_capture: peIfFullCapture,
          thesis_relevance: p.thesis_relevance,
          defillama_slug: p.defillama_slug!,
        } as GimliProtocol;
      }),
    );
    protocols.push(...results);
  }

  // Sort: cheapest first
  const withPE = protocols.filter((p) => p.pe_ratio !== null);
  withPE.sort((a, b) => (a.pe_ratio! - b.pe_ratio!));

  const cheapest = withPE.filter((p) => p.valuation === "cheap").slice(0, 5);
  const mostExpensive = [...withPE]
    .reverse()
    .filter((p) => p.valuation === "expensive")
    .slice(0, 5);

  const summary = {
    total_analyzed: protocols.length,
    cheap: protocols.filter((p) => p.valuation === "cheap").length,
    fair: protocols.filter((p) => p.valuation === "fair").length,
    expensive: protocols.filter((p) => p.valuation === "expensive").length,
    unknown: protocols.filter((p) => p.valuation === "unknown").length,
  };

  // Narrative — Sonnet if key available, stub otherwise
  const narrativeData = {
    summary,
    cheapest: cheapest.slice(0, 3).map((p) => ({
      ticker: p.ticker,
      pe_ratio: p.pe_ratio,
      peer_pe_mid: p.peer_pe_mid,
      upside_to_peer_pct: p.upside_to_peer_pct,
    })),
    most_expensive: mostExpensive.slice(0, 2).map((p) => ({
      ticker: p.ticker,
      pe_ratio: p.pe_ratio,
      peer_pe_mid: p.peer_pe_mid,
    })),
  };

  const narrativeResponse = await sonnet(
    "DeFi value-investing narrative",
    narrativeData,
    "Write exactly 3 sentences. First sentence: which protocols are cheapest vs TradFi peers right now (name them, cite their P/E ratios from the data). Second sentence: what the cheapest protocol's upside to peer multiple would be in percentage terms (cite the number). Third sentence: what the expensive protocols signal about sector froth. Do not mention any protocol or number not in the JSON. Be direct and unemotional — Moria house style.",
    600,
  );

  console.log(
    `[gimli] ${summary.total_analyzed} analyzed · ${summary.cheap} cheap · ${summary.fair} fair · ${summary.expensive} expensive · narrative:${narrativeResponse.confidence}`,
  );

  return {
    updated_at: new Date().toISOString(),
    protocols,
    cheapest,
    most_expensive: mostExpensive,
    summary,
    narrative: {
      text: narrativeResponse.text,
      confidence: narrativeResponse.confidence,
      model: narrativeResponse.model,
      used_api: narrativeResponse.usedApi,
    },
    health: {
      defillama: protocols.some((p) => p.market_cap !== null) ? "ok" : "error",
      anthropic: hasAnthropicKey() ? "ok" : "stubbed",
    },
  };
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchGimli()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[gimli] Wrote ${OUT_PATH}`);
    })
    .catch((err) => {
      console.error("[gimli] Failed:", err);
      process.exit(1);
    });
}
