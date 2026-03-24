# Product Requirements Document: Conclave

**Autonomous AI Investment Committee — Built on Claude Code Agents**
*Commodities Trade Finance & Crypto Fund Management*

| Field | Value |
|---|---|
| Product Name | Conclave |
| Version | 1.0 — Draft |
| Date | March 3, 2026 |
| Author | Jean-Jacques / Eko33 |
| Domain | Commodities Trade Finance & Crypto Fund Management |
| Classification | Confidential |

---

## 1. Executive Summary

Conclave is an autonomous AI investment committee that runs entirely within Claude Code. It orchestrates eight specialized subagents — analysts, a risk officer, a memo writer, and a committee chair — to perform institutional-grade due diligence on crypto assets and commodities trade finance instruments. Each agent is a Claude Code subagent with its own system prompt, tool permissions, and MCP server access, coordinated by a top-level orchestrator agent.

The system replicates the deliberation structure of a traditional investment committee — tokenomics analysis, governance review, on-chain forensics, risk synthesis, and final adjudication — while executing in minutes rather than days and producing a full audit trail.

Conclave targets two converging markets: the DeFi ecosystem (TVL exceeding $200B) and the $18 trillion global commodities trade finance market now adopting blockchain-based settlement, tokenized letters of credit, and on-chain receivables.

---

## 2. Problem Statement

Crypto fund managers and commodities trade finance operators face challenges that manual processes cannot address at scale:

- **Information fragmentation:** Protocol data spans dozens of on-chain and off-chain sources. No single analyst can synthesize it all in a reasonable timeframe.
- **Decision latency:** Traditional committees take days. Commodity-backed tokens require real-time collateral verification. Markets don't wait.
- **Bandwidth ceiling:** A human analyst cannot simultaneously monitor tokenomics, governance, on-chain flows, and regulatory risk across 30+ positions.
- **Institutional memory loss:** Past theses, assessments, and lessons are buried in documents and personal knowledge. They never inform the next decision.
- **Multi-jurisdictional compliance:** FINMA (Switzerland), MIFID II (EU), and CFTC (US) each impose distinct requirements on fund operations and reporting.
- **Counterparty opacity:** Trade finance instruments involve multi-party trust chains where on-chain collateral verification is critical but underdeveloped.

Conclave distributes this workload across purpose-built AI agents that run concurrently, share a knowledge base, and converge on a structured committee decision — all from a single `claude` command.

---

## 3. Architecture

### 3.1 Design Principle: Claude Code as Orchestration Runtime

Conclave is implemented as a Claude Code project. The top-level orchestrator runs as the main Claude Code session. Specialist agents are spawned as Claude Code **subagents** using the `Task` tool, each with scoped instructions and MCP server access defined in the project's `CLAUDE.md` and `.mcp.json` configuration.

This architecture provides several advantages over a custom orchestration script:

- **Native subagent coordination.** Claude Code's `Task` tool handles agent spawning, context passing, and result collection without custom inter-process communication.
- **Project-level configuration.** `CLAUDE.md` defines agent personas, rules, and workflows. `.mcp.json` declares MCP server connections. The entire committee is version-controlled.
- **Tool isolation.** Each subagent inherits only the MCP servers and permissions relevant to its role.
- **Iterative development.** New agents, data sources, or workflow steps are added by editing config files and prompts — no application code changes required.
- **Built-in audit trail.** Claude Code's conversation logging captures every agent interaction, tool call, and decision for compliance review.

### 3.2 Project Structure

```
conclave/
├── CLAUDE.md                    # Orchestrator persona & committee workflow
├── .mcp.json                    # MCP server declarations
├── agents/
│   ├── tokenomics-analyst.md    # Subagent system prompt
│   ├── governance-analyst.md
│   ├── onchain-analyst.md
│   ├── risk-officer.md
│   ├── maturation-scorer.md
│   ├── memo-writer.md
│   ├── knowledge-agent.md
│   └── committee-chair.md
├── templates/
│   ├── investment-memo.md       # Memo structure template
│   ├── risk-scorecard.md        # Risk scoring template
│   └── decision-record.md       # Committee output template
├── archive/
│   ├── memos/                   # Historical investment memos
│   ├── decisions/               # Past committee decisions
│   └── learnings/               # Extracted lessons & patterns
├── servers/
│   ├── defi-data/               # DeFi data MCP server
│   ├── governance/              # Governance MCP server
│   ├── onchain/                 # On-chain MCP server
│   └── research/                # Research & archive MCP server
└── output/                      # Current run artifacts
```

### 3.3 Specialist Agents (Subagents)

Each agent is spawned via Claude Code's `Task` tool with its corresponding system prompt from `agents/`. The orchestrator passes a structured brief and collects the agent's output.

| Agent | Model | Role | MCP Servers |
|---|---|---|---|
| Tokenomics Analyst | Sonnet | Token supply, emissions, vesting, staking yields, liquidity depth | DeFi Data |
| Governance Analyst | Sonnet | Proposal tracking, voter concentration, delegate behavior, quorum analysis, governance attack surface | Governance |
| On-Chain Analyst | Sonnet | Wallet flows, whale movements, TVL migration, DEX volume, bridge activity | On-Chain |
| Risk Officer | Sonnet | Counterparty exposure, liquidity risk, audit status, regulatory flags, correlation risk, drawdown modeling | DeFi Data, On-Chain |
| Maturation Scorer | Sonnet | Protocol maturity across security, decentralization, adoption, dev activity, economic sustainability | DeFi Data, Governance |
| Memo Writer | Sonnet | Synthesizes all analyst outputs into a structured investment memo | Research |
| Knowledge Agent | Sonnet | Retrieves historical memos, prior decisions, comparable analyses from archive | Research |
| Committee Chair | Opus | Final adjudication, analyst conflict resolution, conviction scoring, go/no-go decision | Research |

### 3.4 MCP Server Layer

Four MCP servers provide all external data access, declared in `.mcp.json` and connected via stdio transport:

| Server | Tools | Sources | Data |
|---|---|---|---|
| DeFi Data | 14 | DefiLlama, TokenTerminal, CoinGecko, Blockworks, Tokenomist | TVL, revenue, prices, emissions, yields |
| Governance | 12 | Snapshot, Tally, Karma, Discourse | Proposals, voting power, delegates, forum sentiment |
| On-Chain | 4 | Etherscan, Dune | Contract verification, wallet profiling, custom analytics |
| Research | 6 | File Archive, Memo Search, Learnings | Historical memos, decision trails, pattern matching |

---

## 4. Committee Workflow

### 4.1 Invocation

A committee review is triggered from the terminal:

```bash
claude "Evaluate AAVE for a $500K position"
claude "Assess Paxos Gold (PAXG) for commodity-backed LC settlement"
claude "Review Centrifuge for trade finance receivables exposure"
```

The orchestrator (defined in `CLAUDE.md`) parses the request, determines the asset type, and initiates the committee flow.

### 4.2 Execution Phases

**Phase 1 — Intake & Scoping**
The orchestrator classifies the review target (pure crypto, commodity-backed token, trade finance instrument) and determines which agents are required. It queries the Knowledge Agent for any prior committee decisions on the same or comparable assets.

**Phase 2 — Parallel Analysis**
The orchestrator spawns analyst subagents concurrently via `Task`:

```
Task(agent: "tokenomics-analyst", input: structured_brief)
Task(agent: "governance-analyst", input: structured_brief)
Task(agent: "onchain-analyst", input: structured_brief)
Task(agent: "maturation-scorer", input: structured_brief)
```

Each subagent receives the committee brief and returns a structured analysis within its domain. The Knowledge Agent runs in parallel, preloading relevant historical context.

**Phase 3 — Risk Synthesis**
The Risk Officer subagent receives all Phase 2 outputs and produces a consolidated risk assessment with quantified exposure across market, credit, liquidity, operational, and regulatory dimensions.

**Phase 4 — Memo Generation**
The Memo Writer receives all analyst outputs plus the risk assessment and generates a structured investment memo following the template in `templates/investment-memo.md`.

**Phase 5 — Committee Adjudication**
The Committee Chair (Opus) receives the complete memo, resolves any analyst conflicts, assigns a conviction score (1–10), and issues a decision: **go**, **no-go**, or **conditional** — with written rationale and position sizing guidance. The decision is written to `output/` and archived via the Research MCP Server.

### 4.3 Decision Outputs

Each committee run produces:

- **Investment Memo** — thesis, evidence, risks, recommendation, position sizing
- **Risk Scorecard** — quantified metrics across five risk dimensions
- **Maturation Score** — 0–100 composite across security, decentralization, adoption, dev activity, sustainability
- **Decision Record** — go/no-go/conditional, conviction level, review triggers, dissenting views
- **Audit Log** — full subagent interaction trace with timestamps and source citations

---

## 5. Commodities Trade Finance Module

### 5.1 Use Cases

| Use Case | Description | Agents Involved |
|---|---|---|
| Letter of Credit Analysis | Tokenized LC evaluation — on-chain settlement guarantees, counterparty creditworthiness via DeFi primitives | Risk Officer, On-Chain Analyst, Chair |
| Commodity-Backed Token Evaluation | Gold/oil/agriculture-backed tokens — collateral verification, redemption mechanics, oracle reliability | Tokenomics, On-Chain, Risk Officer |
| Trade Finance Protocol Scoring | DeFi protocols for receivables, invoice factoring, supply chain finance — maturity and risk scoring | Maturation Scorer, Governance Analyst |
| Treasury Management | Fund treasury allocation across stablecoins, yield positions, and commodity hedges | Tokenomics, Risk Officer, Chair |
| Cross-Chain Settlement | Bridge risk, settlement finality, multi-chain exposure for commodity trade flows | On-Chain Analyst, Risk Officer |
| Regulatory Compliance | Governance proposals and on-chain activity monitored for MIFID II, CFTC, FINMA compliance signals | Governance Analyst, Risk Officer, Knowledge Agent |

### 5.2 Commodity Oracle Framework

For commodity-backed tokens, the system evaluates oracle reliability through a structured framework: data source diversity (Chainlink, Pyth, custom feeds), update frequency relative to commodity price volatility, deviation thresholds, and historical uptime. The Risk Officer flags any position where oracle infrastructure does not meet minimum thresholds defined in the fund's risk policy.

### 5.3 Trade Finance Settlement Verification

For tokenized LCs and receivables, the On-Chain Analyst verifies the full settlement chain: origination event, collateral lock, counterparty attestation, oracle price feeds, maturity conditions, and redemption mechanics. Each step is logged in the committee memo as an auditable trail.

---

## 6. Fund Management Features

### 6.1 Scheduled Monitoring

The orchestrator can be run on a cron schedule to re-evaluate existing positions. Material event triggers include:

- Governance proposals affecting fund holdings
- TVL changes exceeding configurable thresholds
- On-chain anomalies (whale movements, bridge exploits)
- Commodity price dislocations on backed tokens
- Regulatory announcements in relevant jurisdictions

### 6.2 Treasury Optimization

For on-chain treasuries (fund treasuries, DAO treasuries, tokenized commodity reserves), the Tokenomics Analyst and Risk Officer model yield-bearing allocation strategies accounting for impermanent loss, smart contract risk, liquidity depth, and correlation exposure to primary commodity positions.

### 6.3 LP Reporting & Compliance

The Memo Writer generates LP-ready reports: NAV attribution, risk exposure breakdowns, governance participation summaries, and regulatory compliance attestations. FINMA-specific reporting templates are included for Swiss-domiciled funds.

---

## 7. Implementation Plan

### 7.1 Phase 1 — Foundation (Q2 2026)

- Scaffold four MCP servers with core tool implementations
- Write subagent system prompts for all eight agents
- Define `CLAUDE.md` orchestrator workflow and `templates/`
- Implement single-agent analyst flows (one agent at a time, not parallel)
- Set up `archive/` structure and Research MCP Server
- **Exit criteria:** Single-analyst memo generation for a crypto asset via `claude` CLI

### 7.2 Phase 2 — Multi-Agent Committee (Q3 2026)

- Enable parallel subagent execution via `Task` tool
- Implement inter-agent dependency graph (Risk Officer waits for analysts)
- Build Committee Chair adjudication logic with conflict resolution
- Implement Knowledge Agent retrieval and contextual preloading
- Full committee dry runs on historical assets for calibration
- **Exit criteria:** End-to-end committee decision with all eight agents on sample assets

### 7.3 Phase 3 — Commodities Integration (Q4 2026)

- Add commodity oracle data feeds to DeFi Data MCP Server
- Build LC analysis and receivables modules
- Integrate trade finance protocol scoring
- Add FINMA compliance layer to Governance MCP Server
- **Exit criteria:** Complete commodity-backed token evaluation pipeline

### 7.4 Phase 4 — Production (Q1 2027)

- Cron-based scheduled committee runs for portfolio monitoring
- Alerting system for material event triggers
- Web dashboard for decision review and override
- Portfolio rebalancing recommendation engine
- Full audit logging with export capability
- **Exit criteria:** Autonomous committee running daily with human-in-the-loop override

---

## 8. Technical Requirements

### 8.1 Claude Code Configuration

- **Orchestrator model:** Sonnet (cost-efficient for coordination logic)
- **Subagent models:** Sonnet for all analysts; Opus for Committee Chair only
- **Temperature:** 0.1 for analyst agents (factual precision); 0.3 for Committee Chair (balanced judgment)
- **Context management:** Each subagent receives only its relevant data slice plus the shared committee brief
- **Estimated cost per full committee run:** $2–$5

### 8.2 MCP Server Infrastructure

- **Transport:** stdio for all servers (local execution)
- **Language:** TypeScript (Node.js) for server implementations
- **Credential management:** Environment variables per server, never exposed to agent context
- **Rate limiting:** Built into each server with configurable backoff

### 8.3 Security

- MCP servers run in isolated processes with minimal filesystem access
- Committee decisions require human approval before any on-chain execution
- All outputs are advisory in v1 — no autonomous trade execution
- Cryptographic signing on decision records for tamper-evident audit trails
- `.mcp.json` scopes each subagent to only its required servers

---

## 9. Success Metrics

- **Decision quality:** Recommendations match or outperform a human-only committee benchmark over 6 months.
- **Speed:** Full committee evaluation in under 15 minutes (vs. 3–5 days manual).
- **Coverage:** 50+ assets/instruments evaluated per month at consistent analytical depth.
- **Audit completeness:** 100% of decisions produce a traceable trail from data source to recommendation.
- **Risk detection:** Zero missed critical flags (exploits, governance attacks, collateral depegs) on monitored positions.

---

## 10. Risks & Mitigations

- **Hallucination:** All analytical claims grounded in MCP tool outputs with source citations. Committee Chair cross-validates. No analyst output is taken at face value.
- **Data reliability:** Multi-source triangulation for critical metrics. Graceful degradation when individual APIs are unavailable. Stale data flagged explicitly.
- **Regulatory:** No autonomous trade execution in v1. All outputs advisory. Human approval required for capital deployment.
- **Subagent failure:** Timeout handling per `Task` call. Retry logic. Fallback to reduced-committee mode if an agent fails.
- **Cost creep:** Token budgets per agent per run enforced at orchestrator level. Opus restricted to Committee Chair. Sonnet handles all analytical workload.

---

## 11. Appendix

### Glossary

- **MCP (Model Context Protocol):** Open protocol for connecting AI models to external data sources and tools via standardized server interfaces.
- **Subagent:** A Claude Code agent spawned via the `Task` tool with scoped instructions and tool access.
- **TVL (Total Value Locked):** Total crypto assets deposited in a DeFi protocol's smart contracts.
- **LC (Letter of Credit):** Financial instrument guaranteeing payment to a seller, widely used in international commodity trade.
- **Maturation Score:** Composite metric assessing protocol readiness across security, decentralization, adoption, developer activity, and economic sustainability.

### Related Documents

- System Architecture Diagram (attached)
- MCP Server API Specifications (forthcoming)
- Agent Prompt Engineering Guide (forthcoming)
- Risk Scoring Methodology (forthcoming)
- Compliance Framework — FINMA / MIFID II / CFTC (forthcoming)
