# Conclave

**Moria Capital's AI investment research committee.** Institutional-grade DeFi due diligence powered by adversarial AI agents. Every number from APIs — zero hallucination.

> *"The fund is the product. The infrastructure is the moat."*

---

## What It Does

| Mode | When | Cost | Output |
|------|------|------|--------|
| **Research Memo** | Weekly / on-demand | ~$2-5 | 10-15 page deep dive with BUY/HOLD/PASS/SELL verdict |
| **Daily Brief** | Every 12h (automated) | $0 | Portfolio snapshot, alerts, Polymarket intelligence, risk flags |
| **Investor Portal** | Always on | Free | LP dashboard — what investors see |

## Research Memo Run

A 4-phase adversarial pipeline. Every agent challenges the previous one.

```
  Data Collection (free APIs)
        │
        ▼
  Research Analyst → builds the bull case
        │
        ├──► Risk Officer → 6-dimension risk scorecard (can REJECT)
        │
        └──► Devil's Advocate → must find 3+ structural flaws (can KILL)
                │
                ▼
        Committee Chair → final verdict + conviction score
```

**Usage:**
```bash
# From Claude Code
Conclave: analyze AAVE
Research: deep dive PENDLE

# Or via shell
./scripts/run-memo.sh AAVE
```

**Output:** Investment memo → `archive/memos/` → `portal/data/memos/` → visible to LPs.

## Daily Brief

Smart portfolio monitoring — zero AI cost. Fetches live data from free APIs, then runs computational analysis:

- **Portfolio prices** from CoinGecko (free, no key)
- **Protocol TVL** from DeFi Llama (free, no key)
- **Prediction markets** from Polymarket Gamma API (free, no key)
- **Smart alerts**: price moves >5%, concentration warnings, perps near stops, risk flags
- **Macro intelligence**: Fed rate odds, crypto regulation, DeFi-relevant events
- **Insights**: auto-generated commentary on how macro events affect the portfolio

```bash
cd daily-brief && npm install && npm run brief
```

**Output:** `portal/data/briefs/YYYY-MM-DD.md` + updated JSON data files.

## Investor Portal

Next.js app deployed on Vercel. LP-facing, read-only, institutional quality.

| Page | What LPs See |
|------|-------------|
| **Dashboard** | NAV, positions, allocation chart, perps monitor |
| **Research** | Investment memos from committee runs |
| **Macro** | Polymarket predictions, signal feed, macro intelligence |
| **Risk** | Traffic light risk matrix per position (green/amber/red) |
| **Admin** | Whitelist management, system health, API key status |

**Access control:** Google OAuth + email whitelist. Only approved emails can sign in.
**Health monitoring:** `/api/health` endpoint shows status of every data source and env var.

## Project Structure

```
conclave/
├── SKILL.md              # Claude Code skill — orchestrates everything
├── agents/               # 9 AI agent personas
│   ├── tokenomics-analyst.md    # Bull case builder
│   ├── risk-officer.md          # 6-dim risk scoring, can REJECT
│   ├── committee-chair.md       # Final verdict (Opus-level)
│   ├── governance-analyst.md    # Voting, delegation, centralization
│   ├── onchain-analyst.md       # Wallet flows, whale tracking
│   ├── commodity-analyst.md     # RWA / trade finance
│   ├── maturation-scorer.md     # Protocol maturity
│   ├── memo-writer.md           # Narrative synthesis
│   └── knowledge-agent.md       # Historical context
│
├── daily-brief/          # $0 daily data refresh
│   ├── run.ts                   # Orchestrator (fetch → analyze → brief)
│   ├── fetch-portfolio.ts       # CoinGecko + DeFi Llama
│   ├── fetch-macro.ts           # Polymarket Gamma API
│   └── analyze.ts               # Smart alerts + insights engine
│
├── portal/               # Next.js investor portal
│   ├── src/app/                 # 6 pages + 8 API routes
│   ├── src/lib/                 # Auth, data layer, types
│   └── data/                    # JSON files (updated by daily-brief)
│
├── servers/              # MCP servers for deep analysis
│   ├── defi-data/               # 14 tools (DeFi Llama, CoinGecko, TheGraph)
│   ├── governance/              # 12 tools (Snapshot, Tally, Karma)
│   ├── onchain/                 # 4 tools (Dune, Etherscan)
│   ├── research/                # 6 tools (Archive, memo search)
│   └── commodity-oracle/        # 10 tools (Pyth, Chainlink, Metals)
│
├── archive/              # Permanent records
│   ├── memos/                   # Investment memos
│   ├── decisions/               # Committee decisions
│   └── learnings/               # Sector patterns + red flags
│
├── templates/            # Output templates
├── scripts/              # Helpers (sync-memos.sh, run-memo.sh)
└── workflow.yaml         # Agent dependency graph
```

## API Keys

The portal runs without any API keys. All data comes from JSON files updated by the daily brief.

| Key | Required For | Where to Get |
|-----|-------------|-------------|
| `GOOGLE_CLIENT_ID` | Portal login | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Portal login | Same as above |
| `NEXTAUTH_SECRET` | Session encryption | `openssl rand -base64 32` |
| `ETHERSCAN_API_KEY` | On-chain data (memo runs) | [etherscan.io/myapikey](https://etherscan.io/myapikey) |
| `COINGECKO_API_KEY` | Higher rate limits | [coingecko.com/api](https://www.coingecko.com/en/api) |
| `X_BEARER_TOKEN` | Social signal feed | [developer.twitter.com](https://developer.twitter.com) |
| `DUNE_API_KEY` | Wallet profiling (memo runs) | [dune.com/settings/api](https://dune.com/settings/api) |

Only the first 3 are needed for the portal. The rest enhance memo runs.

## Valuation Framework

Hard-coded rules the committee chair enforces:

- **P/F < 10x** → Strong buy territory for proven protocols
- **P/F 10-20x** → Fair value, need catalysts
- **P/F > 20x** → Overvalued unless exceptional growth
- **Revenue margin > 50%** → Strong fee capture
- **No single position > 30% of NAV**
- **Max 40% in one category**
- **Conviction < 6 → PASS** (do not buy)

## Zero Hallucination Policy

Every data point in a Conclave memo comes from a deterministic API call:
- Prices → CoinGecko API
- TVL, fees, revenue → DeFi Llama API
- Wallet balances → Etherscan API
- Prediction markets → Polymarket Gamma API
- On-chain analytics → Dune Analytics API

Agents are instructed: *"If you don't have the data, say so. Never invent a number."*

---

Built by [Moria Capital](https://github.com/nicgenovese/conclave). All investment decisions are advisory only.
