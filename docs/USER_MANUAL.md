# Conclave User Manual

A comprehensive guide to running AI-powered investment committee reviews for DeFi protocols, commodity-backed tokens, and trade finance instruments.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Use Cases](#use-cases)
   - [DeFi Protocol Analysis](#use-case-1-defi-protocol-analysis)
   - [Commodity-Backed Token Analysis](#use-case-2-commodity-backed-token-analysis)
   - [Trade Finance Instrument Analysis](#use-case-3-trade-finance-instrument-analysis)
3. [Running a Committee Review](#running-a-committee-review)
4. [Understanding the Output](#understanding-the-output)
5. [Interpreting Analyst Reports](#interpreting-analyst-reports)
6. [Risk Scoring Reference](#risk-scoring-reference)
7. [Red Flags Reference](#red-flags-reference)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Claude Code CLI installed and authenticated
- MCP servers configured in `.mcp.json`
- API keys set for data providers (CoinGecko, DefiLlama, etc.)

### Basic Usage

```bash
# Using the /committee skill
/committee aave $500K
/committee paxg
/committee centrifuge $1M

# Using natural language
claude "Evaluate AAVE for a $500K position"
claude "Assess Paxos Gold (PAXG) for commodity exposure"
claude "Review Compound for lending protocol allocation"
```

### What Happens

When you invoke a committee review:

1. **Intake** - System queries historical context for prior decisions on this asset
2. **Analysis** - 4-5 specialized analysts run in parallel (15-20 minutes)
3. **Risk Synthesis** - Risk Officer consolidates all findings
4. **Memo Generation** - Investment memo is produced
5. **Decision** - Committee Chair issues GO/NO-GO with conviction score

**Estimated cost:** $2-$5 per review
**Estimated time:** 15-30 minutes

---

## Use Cases

### Use Case 1: DeFi Protocol Analysis

**When to use:** Evaluating lending protocols, DEXs, derivatives platforms, yield aggregators, or governance tokens.

**Example protocols:** AAVE, Uniswap, Compound, Lido, Curve, MakerDAO, Pendle, GMX

#### How to Run

```bash
# Basic review
/committee aave

# With position size (enables liquidity analysis)
/committee uniswap $500K

# Natural language variants
claude "Evaluate Compound V3 for a lending allocation"
claude "Assess Lido stETH for liquid staking exposure"
claude "Review GMX for derivatives protocol investment"
```

#### What Analysts Run

| Analyst | Focus Area |
|---------|------------|
| Tokenomics Analyst | Token supply, emissions, vesting, staking yields, value capture |
| Governance Analyst | DAO structure, voting power, proposal lifecycle, attack surface |
| On-Chain Analyst | Wallet flows, whale movements, TVL trends, smart money signals |
| Maturation Scorer | Security audits, decentralization maturity, adoption metrics |
| Risk Officer | Consolidated 5-dimensional risk assessment |

#### Key Metrics Analyzed

**Tokenomics:**
- Circulating vs total supply ratio
- Emission schedule and inflation rate
- Top holder concentration (Gini coefficient)
- Protocol revenue and fee distribution
- Liquidity depth across DEXs

**Governance:**
- Voter participation rate
- Delegate concentration (top 10 voting power)
- Proposal pass/fail rates
- Time to execution
- Flash loan attack vulnerability

**On-Chain:**
- Smart money inflows/outflows
- Exchange netflow (accumulation vs distribution)
- Whale transaction patterns
- TVL growth trajectory
- New holder acquisition rate

#### Sample Output Interpretation

```
TOKENOMICS SCORE: 72/100
- Circulating/Total: 68% (Healthy - no major unlocks imminent)
- Top 10 Concentration: 42% (Moderate - acceptable for mature protocol)
- Daily Emissions: 0.08% (Low - sustainable inflation)
- Real Yield: +3.2% (Positive - staking rewards exceed inflation)
- Revenue/FDV: 2.1% (Strong - indicates real demand)
```

**Reading the score:**
- 80-100: Excellent fundamentals, minimal tokenomic risk
- 60-79: Solid fundamentals, manageable concerns
- 40-59: Material concerns requiring mitigation
- Below 40: Significant red flags, likely NO-GO

---

### Use Case 2: Commodity-Backed Token Analysis

**When to use:** Evaluating tokenized precious metals, commodity-linked stablecoins, or real-world asset (RWA) tokens.

**Example assets:** PAXG (Paxos Gold), XAUT (Tether Gold), commodity indices, tokenized treasury products

#### How to Run

```bash
# Commodity-backed token review
/committee paxg

# With position size
/committee xaut $250K

# Natural language
claude "Assess Paxos Gold for treasury diversification"
claude "Evaluate XAUT as gold exposure hedge"
claude "Review commodity-backed stablecoin for settlement use"
```

#### Additional Analyst

The **Commodity Analyst** is automatically added for commodity-backed assets, analyzing:
- Reserve verification and proof of reserves
- Custodian due diligence and ratings
- Oracle reliability and price feed health
- Premium/discount to spot price
- Redemption mechanics and liquidity

#### Key Metrics Analyzed

**Reserve Health:**
- Reserve ratio (target: 100%+)
- Attestation frequency and recency
- Custodian credit rating (BBB minimum)
- Geographic distribution of reserves
- Insurance coverage

**Oracle Reliability:**
- Update frequency (heartbeat)
- Price deviation thresholds
- Number of independent sources
- Historical staleness incidents
- Circuit breaker mechanisms

**Premium Analysis:**
- Current premium/discount to spot
- Historical premium range
- Arbitrage efficiency
- Redemption queue depth

#### Sample Output Interpretation

```
COMMODITY ANALYSIS SCORE: 78/100

RESERVE STATUS: VERIFIED
- Reserve Ratio: 100.2% (Fully backed)
- Last Attestation: 3 days ago (Fresh)
- Custodian: Brinks (A-rated)
- Insurance: $500M coverage

ORACLE HEALTH: HEALTHY
- Primary: Chainlink PAXG/USD (5 sources)
- Heartbeat: 1 hour (Acceptable for gold)
- Last Update: 12 minutes ago
- 30-day Uptime: 99.97%

TOKEN PREMIUM: +0.3% vs LBMA spot
- 30-day Avg: +0.25%
- 90-day Range: -0.5% to +1.2%
- Arbitrage Active: Yes (healthy)
```

**Reading reserve status:**
- VERIFIED: Reserves confirmed by third-party attestation
- UNVERIFIED: No recent attestation, proceed with caution
- UNDERCOLLATERALIZED: Reserve ratio below 100%, major red flag

---

### Use Case 3: Trade Finance Instrument Analysis

**When to use:** Evaluating digitized letters of credit, LC-backed tokens, tokenized receivables, or trade finance platforms.

**Example instruments:** Tokenized LCs, trade receivables pools, commodity financing instruments, Centrifuge pools

#### How to Run

```bash
# Trade finance platform review
/committee centrifuge $1M

# Natural language
claude "Evaluate Centrifuge for trade receivables exposure"
claude "Assess tokenized LC instrument for settlement"
claude "Review trade finance pool for yield allocation"
```

#### Trade Finance Tools Used

| Tool | Purpose |
|------|---------|
| `lc_analyze_structure` | Classify LC type, assess structural risk |
| `lc_check_documentary_compliance` | Validate against UCP 600 rules |
| `lc_assess_counterparty_risk` | Evaluate issuing/confirming bank risk |
| `lc_detect_discrepancies` | Scan for documentary issues |
| `lc_check_eucp_compliance` | Validate electronic document standards |
| `lc_calculate_pricing` | Calculate fees and true cost |

#### Key Metrics Analyzed

**LC Structure:**
- LC type (sight, deferred, negotiable, transferable)
- Issuing bank and confirming bank
- Terms and conditions analysis
- Structural risk assessment

**Documentary Compliance:**
- UCP 600 article compliance
- Document completeness check
- Discrepancy detection
- Remediation guidance

**Counterparty Risk:**
- Issuing bank credit rating
- Confirming bank rating (if applicable)
- Country risk assessment
- Sovereign transfer risk

**Electronic Standards:**
- eUCP compliance status
- MLETR recognition
- Digital signature validity
- Electronic presentation requirements

#### Sample Output Interpretation

```
TRADE FINANCE ANALYSIS

LC STRUCTURE ASSESSMENT
- Type: Irrevocable Documentary LC (Sight)
- Issuing Bank: HSBC (AA- rated)
- Confirming Bank: Deutsche Bank (A+ rated)
- Structural Risk: LOW

DOCUMENTARY COMPLIANCE: 94%
- UCP 600 Compliant: YES
- Articles Validated: 39/41
- Minor Issues: 2 (non-material)
  * Invoice date precedes LC date (Art. 14d)
  * B/L shows "freight collect" vs "prepaid" (Art. 27)

COUNTERPARTY RISK SCORE: 82/100
- Issuing Bank Risk: Low (Tier 1 global bank)
- Country Risk: Low (UK jurisdiction)
- Transfer Risk: Minimal (G7 country)

PRICING ANALYSIS
- Issuance Fee: 0.15%
- Confirmation Fee: 0.25%
- Negotiation Fee: 0.10%
- All-in Cost: 0.50% (Market rate)
```

**Reading compliance score:**
- 95-100%: Fully compliant, ready for settlement
- 85-94%: Minor discrepancies, resolvable
- 70-84%: Material discrepancies, require amendment
- Below 70%: Significant issues, do not proceed

---

## Running a Committee Review

### Command Syntax

```bash
/committee <protocol> [position_size]
```

**Parameters:**
- `protocol` (required): The asset or protocol name (e.g., aave, paxg, centrifuge)
- `position_size` (optional): Investment amount for liquidity analysis (e.g., $500K, $1M)

### Review Phases

#### Phase 1: Intake & Scoping (2-3 minutes)

The Knowledge Agent queries historical context:
- Prior committee decisions on this protocol
- Analogous cases and pattern matching
- Sector-specific learnings and red flags
- Recent news and developments

**What you'll see:**
```
PHASE 1: INTAKE & SCOPING
- Querying historical context for AAVE...
- Found 2 prior decisions (GO: 2023-06, NO-GO: 2022-11)
- Loading lending protocol sector patterns...
- Checking recent governance developments...
```

#### Phase 2: Parallel Analysis (10-15 minutes)

4-5 analysts run concurrently:
- Tokenomics Analyst
- Governance Analyst
- On-Chain Analyst
- Maturation Scorer
- Commodity Analyst (if applicable)

**What you'll see:**
```
PHASE 2: PARALLEL ANALYSIS
[Running] Tokenomics Analyst - analyzing token economics...
[Running] Governance Analyst - assessing DAO structure...
[Running] On-Chain Analyst - tracking wallet flows...
[Running] Maturation Scorer - evaluating protocol maturity...

[Complete] Tokenomics Analyst - Score: 72/100
[Complete] On-Chain Analyst - Score: 68/100
[Complete] Governance Analyst - Score: 75/100
[Complete] Maturation Scorer - Score: 81/100
```

**Partial Success:** Phase 2 requires at least 3 of 4 main analysts. If one fails (API timeout, data unavailable), the review continues with available data.

#### Phase 3: Risk Synthesis (3-5 minutes)

Risk Officer consolidates all analyst outputs into a 6-dimensional risk assessment.

**What you'll see:**
```
PHASE 3: RISK SYNTHESIS
- Consolidating analyst findings...
- Calculating composite risk score...
- Identifying critical risk factors...

RISK ASSESSMENT COMPLETE
Composite Score: 71/100
Critical Risks: 0
Material Risks: 2
```

#### Phase 4: Memo Generation (3-5 minutes)

Memo Writer produces the investment memo with all findings, analysis, and recommendation.

**What you'll see:**
```
PHASE 4: MEMO GENERATION
- Synthesizing all analyst reports...
- Generating executive summary...
- Writing investment thesis...
- Compiling risk analysis...
- Formulating recommendation...

Investment memo written to output/aave-2024-01-15-investment-memo.md
```

#### Phase 5: Committee Adjudication (2-3 minutes)

Committee Chair (Opus) makes the final decision with conviction scoring.

**What you'll see:**
```
PHASE 5: COMMITTEE ADJUDICATION
- Reviewing all evidence...
- Evaluating analyst conflicts...
- Applying go/no-go criteria...

COMMITTEE DECISION
Verdict: GO
Conviction: 7/10 (Strong)
Position Size: $500K (as proposed)
```

---

## Understanding the Output

### Output Files

All outputs are saved to the `output/` directory with timestamps:

```
output/
├── aave-2024-01-15-analyst-reports.md    # Combined analyst findings
├── aave-2024-01-15-risk-assessment.md    # 6-dimensional risk scorecard
├── aave-2024-01-15-investment-memo.md    # Full investment memo
└── aave-2024-01-15-committee-decision.md # Final decision record
```

Approved decisions are also archived for future reference:
```
archive/
├── memos/aave-2024-01-15-memo.md
└── decisions/aave-2024-01-15-decision.md
```

### Decision Outcomes

| Verdict | Meaning | Typical Conviction |
|---------|---------|-------------------|
| **GO** | Approved for investment | 5-10 |
| **NO-GO** | Rejected, do not invest | N/A |
| **DEFER** | Needs more information | N/A |

### Conviction Scoring

| Score | Label | Allocation Guidance |
|-------|-------|---------------------|
| 9-10 | Exceptional | Maximum allocation permitted |
| 7-8 | Strong | Standard allocation |
| 5-6 | Moderate | Reduced allocation, closer monitoring |
| 3-4 | Weak | Minimal allocation, watchlist only |
| 1-2 | Poor | Avoid entirely |

### Position Sizing Guidance

The decision includes position sizing recommendations based on:
- Conviction score
- Liquidity analysis (if position size provided)
- Concentration limits
- Risk-adjusted sizing

```
POSITION SIZING
Proposed: $500,000
Recommended: $500,000 (100% of proposed)
Max Single Position: $750,000 (liquidity-constrained)
Liquidity Analysis: 2% slippage on $500K exit = $10K cost
```

---

## Interpreting Analyst Reports

### Tokenomics Analysis

**Key sections to review:**

1. **Supply Dynamics**
   - Look for circulating/total ratio > 50% (healthy)
   - Check unlock schedule for cliff events
   - Assess inflation rate vs staking yield

2. **Holder Distribution**
   - Top 10 concentration < 50% preferred
   - Watch for single-entity dominance
   - Check for exchange concentration

3. **Value Capture**
   - Protocol revenue / FDV > 1% indicates real usage
   - Fee distribution mechanism matters
   - Compare yield sources (real vs emissions)

### Governance Analysis

**Key sections to review:**

1. **Participation Health**
   - Voter participation > 10% is healthy
   - Delegate diversity important
   - Watch for voter apathy trends

2. **Power Distribution**
   - Top delegate concentration < 30% preferred
   - Multi-sig composition matters
   - Emergency power controls assessed

3. **Proposal Lifecycle**
   - Pass rate 30-80% indicates healthy debate
   - Time to execution should be reasonable
   - Watch for governance attacks

### On-Chain Analysis

**Key sections to review:**

1. **Smart Money Signals**
   - Net inflows = accumulation = bullish
   - Net outflows = distribution = bearish
   - Cross-reference with price action

2. **Exchange Flows**
   - Outflows = moving to self-custody = bullish
   - Inflows = preparing to sell = bearish
   - Large spikes warrant investigation

3. **TVL Trends**
   - Consistent growth = healthy adoption
   - Sharp declines = investigate cause
   - Compare vs sector trends

### Commodity Analysis

**Key sections to review:**

1. **Reserve Verification**
   - 100%+ reserve ratio required
   - Fresh attestation (< 30 days)
   - Credible custodian (BBB+ rating)

2. **Oracle Health**
   - Multiple independent sources
   - Appropriate update frequency
   - Circuit breaker mechanisms

3. **Premium/Discount**
   - Small premium (< 2%) is normal
   - Large discount may signal problems
   - Active arbitrage = healthy market

---

## Risk Scoring Reference

### Six Risk Dimensions

| Dimension | Weight | Key Factors |
|-----------|--------|-------------|
| Smart Contract | 20% | Audit status, exploit history, upgradeability |
| Economic | 20% | Tokenomics sustainability, unlock schedule |
| Governance | 15% | Centralization, attack vectors |
| Operational | 15% | Team, regulatory, dependencies |
| Market | 15% | Volatility, correlation, liquidity |
| Commodity/Counterparty | 15% | Reserve integrity, custodian, oracle |

### Score Interpretation

| Composite Score | Risk Level | Typical Action |
|-----------------|------------|----------------|
| 80-100 | Low | GO with high conviction |
| 60-79 | Moderate | GO with standard conviction |
| 50-59 | Elevated | CONDITIONAL GO or DEFER |
| 40-49 | High | NO-GO unless mitigated |
| Below 40 | Critical | NO-GO |

### Go/No-Go Criteria Checklist

For a GO decision, all must be true:
- [ ] Composite risk score > 60/100
- [ ] No critical unmitigated risks
- [ ] Positive risk-adjusted return expectation
- [ ] Acceptable liquidity for position size
- [ ] Operational due diligence passed

---

## Red Flags Reference

### Tokenomics Red Flags

| Flag | Threshold | Severity |
|------|-----------|----------|
| Low circulation | < 30% circulating with aggressive unlocks | HIGH |
| High concentration | Top 10 holders > 60% | HIGH |
| High inflation | Daily emissions > 0.5% of circulating | MEDIUM |
| Negative real yield | Staking yield < inflation rate | MEDIUM |
| Low revenue | Protocol revenue/FDV < 1% annually | MEDIUM |
| Thin liquidity | < $500K depth for 2% slippage | HIGH |

### Governance Red Flags

| Flag | Threshold | Severity |
|------|-----------|----------|
| Low participation | Voter participation < 5% | HIGH |
| Power concentration | Top 10 delegates > 50% voting power | HIGH |
| Extreme pass rates | < 20% or > 95% pass rate | MEDIUM |
| Slow execution | Average > 30 days to execute | LOW |
| Flash loan risk | Unmitigated flash loan attack vector | CRITICAL |
| Delegate churn | Retention < 50% | MEDIUM |

### Commodity/Reserve Red Flags

| Flag | Threshold | Severity |
|------|-----------|----------|
| Undercollateralized | Reserve ratio < 100% | CRITICAL |
| Stale attestation | Last attestation > 90 days | HIGH |
| Weak custodian | Rating below BBB or unrated | HIGH |
| Slow oracle | Heartbeat > 1 hour for volatile assets | MEDIUM |
| Wide deviation | Oracle threshold > 5% without circuit breaker | MEDIUM |
| Illiquid redemption | Process > 7 days or unclear | HIGH |

### On-Chain Red Flags

| Flag | Threshold | Severity |
|------|-----------|----------|
| Whale distribution | Large holders selling > 5% weekly | HIGH |
| Exchange inflows | Net positive for 2+ weeks | MEDIUM |
| TVL collapse | > 30% decline in 30 days | HIGH |
| Smart money exit | Labeled wallets reducing exposure | MEDIUM |
| Concentration spike | Single wallet gaining > 10% | MEDIUM |

---

## Troubleshooting

### Common Issues

#### "Phase 2 incomplete - insufficient analysts"

**Cause:** Fewer than 3 of 4 main analysts completed successfully.

**Resolution:**
1. Check API rate limits on data providers
2. Verify API keys are configured correctly
3. Re-run the review after a few minutes

#### "No historical context found"

**Cause:** First review of this protocol, no prior decisions.

**Resolution:** This is normal for new protocols. The review will proceed without historical context. Consider searching for analogous protocols.

#### "Oracle data stale"

**Cause:** Commodity price feeds haven't updated recently.

**Resolution:**
1. This is flagged in the Commodity Analysis
2. Check if oracle is paused (weekend, maintenance)
3. Manual verification of spot price recommended

#### "Position size exceeds liquidity"

**Cause:** Requested position too large for available liquidity.

**Resolution:**
1. Reduce position size
2. Plan staged entry over multiple days
3. Consider alternative venues

### Data Provider Status

Check data provider status if tools are failing:

| Provider | Status Page |
|----------|-------------|
| CoinGecko | status.coingecko.com |
| DefiLlama | defillama.com |
| Snapshot | snapshot.org |
| Dune | dune.com/status |

### Getting Help

- Review server logs in `servers/*/logs/`
- Check MCP configuration in `.mcp.json`
- Verify environment variables are set
- Report issues at github.com/anthropics/claude-code/issues

---

## Appendix: MCP Server Reference

### DeFi Data Server

| Tool | Description |
|------|-------------|
| `defi_get_token_metrics` | Token supply, market cap, FDV, price |
| `defi_get_protocol_metrics` | TVL, chain distribution, liquidity |
| `defi_get_protocol_revenue` | Fee revenue, value capture |
| `defi_get_volatility` | Historical volatility, drawdown |
| `defi_get_aave_reserves` | Aave V3 supply/borrow rates |
| `defi_get_aave_user_positions` | Aave user positions |
| `defi_get_aave_rate_history` | Historical Aave rates |
| `defi_get_compound_markets` | Compound V3 market data |
| `defi_get_compound_account` | Compound user positions |
| `defi_get_compound_history` | Historical Compound data |

### Governance Server

| Tool | Description |
|------|-------------|
| `governance_get_proposals` | Retrieve DAO proposals |
| `governance_get_delegates` | Delegate profiles and power |
| `governance_get_voting_history` | Historical voting patterns |
| `governance_get_sentiment` | Forum sentiment analysis |
| `governance_get_voter_concentration` | Concentration metrics |
| `governance_get_quorum_data` | Quorum requirements |
| `governance_get_admin_keys` | Admin addresses and controls |
| `governance_get_proposal_pipeline` | Proposal lifecycle |
| `governance_detect_flash_loan_risk` | Attack vulnerability |
| `governance_get_vote_delegation_graph` | Delegation network |
| `governance_get_proposal_success_rate` | Pass/execution rates |
| `governance_get_community_contributors` | Active contributors |

### On-Chain Server

| Tool | Description |
|------|-------------|
| `onchain_get_wallet_profile` | Wallet labeling and categorization |
| `onchain_get_exchange_flows` | Exchange deposit/withdrawal patterns |
| `onchain_get_whale_transactions` | Large transaction monitoring |
| `onchain_get_tvl_history` | Historical TVL data |

### Commodity Oracle Server

| Tool | Description |
|------|-------------|
| `commodity_get_spot_price` | Real-time commodity prices |
| `commodity_get_futures_curve` | Forward curve analysis |
| `commodity_get_price_history` | Historical price data |
| `commodity_get_volatility` | Volatility and risk metrics |
| `commodity_get_oracle_health` | Oracle reliability check |
| `commodity_compare_oracles` | Cross-source comparison |
| `commodity_get_reserve_attestation` | Proof of reserves |
| `commodity_get_collateral_health` | DeFi collateral ratios |
| `commodity_get_token_premium` | Premium/discount analysis |
| `commodity_validate_lc` | LC market validation |
| `lc_analyze_structure` | LC type and risk |
| `lc_check_documentary_compliance` | UCP 600 validation |
| `lc_assess_counterparty_risk` | Bank and country risk |
| `lc_detect_discrepancies` | Documentary issues |
| `lc_check_eucp_compliance` | Electronic standards |
| `lc_calculate_pricing` | Fee calculation |

### Research Server

| Tool | Description |
|------|-------------|
| `research_search_memos` | Search historical memos |
| `research_get_decisions` | Retrieve decision records |
| `research_get_learnings` | Access pattern databases |
| `research_get_red_flags` | Historical warning signs |
| `research_get_analogous_cases` | Similar case matching |
| `research_archive_decision` | Store new decisions |
| `research_preload_context` | Load all context |

---

*Last updated: 2026-03-03*
