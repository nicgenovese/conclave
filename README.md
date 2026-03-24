# Conclave

AI investment research committee for Moria Capital. Conclave orchestrates specialized subagents inside Claude Code to produce institutional-grade investment memos for crypto assets.

All investment decisions remain with the human investment officer. Conclave is advisory only.

## Two Modes

| Mode | Trigger | Cost | What it does |
|---|---|---|---|
| **Research Memo Run** | `analyze AAVE`, `deep dive UNI` | ~$2-5 | Full 4-phase deep dive producing a signed investment memo |
| **Daily Brief** | `daily brief` | $0 | Data refresh, portfolio snapshot, market alerts |

## Quick Start

### Research Memo Run

From Claude Code:

```
Research: analyze AAVE
Conclave: deep dive UNISWAP
Evaluate COMP for a $200K position
```

Or via the shell helper:

```bash
cd ~/conclave
./scripts/run-memo.sh AAVE
```

The shell script runs Phase 1 (data collection) and then prompts you to launch Claude Code for Phases 2-4 (analysis, risk, decision).

### Daily Brief

From Claude Code:

```
daily brief
morning update
```

Or directly:

```bash
cd ~/conclave/daily-brief && npx tsx run.ts
```

## Architecture

```
User prompt ("analyze AAVE")
        |
        v
  [SKILL.md orchestrator]
        |
        v
  Phase 1: Data Collection
  - fetch_protocol_data.py  (DeFi Llama + CoinGecko)
  - fetch_wallet_data.py    (on-chain flows)
  - portfolio.json          (current positions)
  - risk.json               (existing risk scores)
  - archive/memos/          (prior decisions)
        |
        v
  Phase 2: Research Analyst
  - Persona: tokenomics-analyst.md
  - Produces: investment thesis, valuation, supply/demand
        |
        v
  Phase 3: Risk + Adversarial (parallel)
  +--------------------------+---------------------------+
  | Risk Officer             | Devil's Advocate          |
  | - 6-dim risk scorecard   | - 3+ structural flaws    |
  | - Composite score 0-100  | - Bear case narrative     |
  | - Can REJECT if >70      | - Can KILL fatal flaws   |
  +--------------------------+---------------------------+
        |
        v
  Phase 4: Committee Chair (Opus)
  - Final verdict: BUY / HOLD / PASS / SELL
  - Conviction score 1-10
  - Position sizing, entry strategy, monitoring triggers
        |
        v
  Output: memo.md + meta.json
  -> output/          (working copy)
  -> archive/memos/   (permanent)
  -> portal/data/memos/{ticker}/  (portal display)
```

## Project Structure

```
conclave/
├── SKILL.md                 # Claude Code skill definition (orchestrator)
├── skill.json               # Skill metadata
├── workflow.yaml             # Legacy 5-phase dependency graph
├── agents/                   # Subagent personas
│   ├── tokenomics-analyst.md
│   ├── risk-officer.md
│   ├── committee-chair.md
│   ├── governance-analyst.md
│   ├── onchain-analyst.md
│   ├── commodity-analyst.md
│   ├── maturation-scorer.md
│   ├── memo-writer.md
│   └── knowledge-agent.md
├── templates/                # Output templates
│   ├── investment-memo.md
│   ├── risk-assessment.md
│   ├── risk-scorecard.md
│   ├── analyst-reports.md
│   └── decision-record.md
├── scripts/
│   ├── run-memo.sh           # Shell helper for memo runs
│   └── sync-memos.sh         # Sync memos to portal
├── archive/                  # Permanent records
│   ├── memos/
│   ├── decisions/
│   ├── learnings/
│   └── metadata/
├── output/                   # Current run working files
├── portal/                   # Next.js portal (Vercel)
│   └── data/
│       ├── memos/{ticker}/   # Per-ticker memo + meta.json
│       ├── briefs/           # Daily briefs
│       ├── portfolio.json
│       └── risk.json
├── daily-brief/              # Daily brief runner
├── servers/                  # MCP server implementations
│   ├── defi-data/
│   ├── governance/
│   ├── onchain/
│   └── research/
└── docs/
```

## Agents

| Agent | Role | Used In |
|---|---|---|
| **Tokenomics Analyst** | Token supply, emissions, vesting, staking, liquidity analysis | Phase 2 |
| **Risk Officer** | 6-dimension risk scorecard, composite score, rejection authority | Phase 3 |
| **Devil's Advocate** | Adversarial review, bear case, fatal flaw detection | Phase 3 |
| **Committee Chair** | Final verdict, conviction scoring, position sizing (Opus) | Phase 4 |
| Governance Analyst | Proposals, voter concentration, governance attack surface | Extended runs |
| On-Chain Analyst | Wallet flows, whale movements, TVL migration | Extended runs |
| Commodity Analyst | Reserve verification, custodian diligence, oracle reliability | Commodity assets |
| Maturation Scorer | Protocol maturity across security, decentralization, adoption | Extended runs |
| Knowledge Agent | Historical context retrieval from archive | Phase 1 |

Bolded agents are used in every standard memo run. The others are available for extended or specialized analyses.

## Valuation Framework

The committee chair applies these rules (from `agents/committee-chair.md`):

- **P/F < 10x** = Strong buy territory
- **P/F 10-20x** = Fair value, need catalysts
- **P/F > 20x** = Overvalued unless exceptional growth
- **No single position > 30% of NAV**
- **Max 40% in one category**
- **Conviction < 6 = PASS** (do not buy)

## Output Format

Each memo run produces:

- `{ticker}-{date}-memo.md` -- Full investment memo
- `{ticker}-{date}-analysis.md` -- Phase 2 analyst report
- `{ticker}-{date}-risk.md` -- Phase 3 risk scorecard
- `{ticker}-{date}-bear.md` -- Phase 3 bear case
- `meta.json` -- Machine-readable summary for the portal

The portal at `portal/` reads from `portal/data/memos/{ticker}/` to display memos in the web UI.

## Documentation

- [Product Requirements (PRD)](Conclave_PRD_v1.md) - Full specification
- [Agent Prompts](agents/) - Individual agent system prompts
