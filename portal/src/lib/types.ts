// ============================================
// Conclave Investor Portal — Type Definitions
// ============================================

export interface Position {
  name: string;
  ticker: string;
  allocation_usd: number;
  allocation_pct: number;
  bucket: "Core" | "DeFi Value" | "Yield" | "Emerging" | "Gas";
  pnl_pct?: number;
  notes?: string;
}

export interface PerpPosition {
  pair: string;
  leverage: number;
  capital_usd: number;
  entry_1: number;
  entry_2: number;
  stop: number;
}

export interface Portfolio {
  nav: number;
  updated_at: string;
  wallet: string;
  positions: Position[];
  perps: PerpPosition[];
  total_perp_exposure: number;
  avg_leverage: number;
  max_perp_loss: number;
  allocation_buckets: {
    name: string;
    total_usd: number;
    pct: number;
    color: string;
  }[];
}

export interface RiskFactor {
  smart_contract: number;
  liquidity: number;
  concentration: number;
  market: number;
  governance: number;
}

export interface RiskScore {
  ticker: string;
  name: string;
  overall: number;
  status: "green" | "amber" | "red";
  factors: RiskFactor;
  notes: string;
}

export interface MemoMeta {
  slug: string;
  ticker: string;
  date: string;
  decision: "BUY" | "HOLD" | "PASS" | "SELL" | "MONITOR";
  conviction: number;
  summary: string;
}

export interface PolymarketEvent {
  id: string;
  question: string;
  outcomes: { name: string; probability: number }[];
  volume_usd: number;
  end_date: string;
  category: string;
  url: string;
}

export interface XSignal {
  account: string;
  handle: string;
  text: string;
  timestamp: string;
  category: "protocol" | "analyst" | "macro" | "on-chain";
  url?: string;
}

export interface MacroData {
  updated_at: string;
  polymarket: PolymarketEvent[];
  signals: XSignal[];
}

export interface WhitelistUser {
  email: string;
  role: "admin" | "investor";
  addedAt: string;
  name?: string;
}

export interface WhitelistData {
  users: WhitelistUser[];
}

export interface Headline {
  title: string;
  source: string;
  url?: string;
  date: string;
  category: "DeFi" | "Regulation" | "Rates & Macro" | "Geopolitics" | "Commodities" | "Crypto";
  relevance?: string;
}

export interface HeadlinesData {
  updated_at: string;
  headlines: Headline[];
  polymarket: PolymarketEvent[];
}

// ============================================
// Thorin — Governance Alerts
// ============================================
export interface GovernanceAlert {
  id: string;
  protocol: string;
  title: string;
  body?: string;
  source: "snapshot" | "tally" | "forum";
  space: string;
  space_label: string;
  status: "active" | "closed" | "pending";
  created: string;
  voting_ends: string;
  author: string;
  scores_total: number;
  quorum: number;
  current_result: {
    for: number;
    against: number;
    abstain?: number;
    quorum_met: boolean;
  };
  relevance: "high" | "medium" | "low";
  impact: string;
  url: string;
  // Thorin Sonnet enrichments (Wave 2)
  ai_summary?: string;
  ai_impact_score?: number;
  ai_impact_reason?: string;
}

export interface GovernanceData {
  updated_at: string;
  source: "snapshot";
  active: GovernanceAlert[];
  recent_closed: GovernanceAlert[];
  summary: {
    active_count: number;
    high_relevance: number;
    protocols_with_activity: string[];
  };
}

// ============================================
// Balin — Risk Alerts
// ============================================
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "stop_loss"
  | "concentration"
  | "unusual_flow"
  | "liquidation_risk"
  | "stale_data"
  | "chain_concentration";

export interface RiskAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  position?: string;
  title: string;
  message: string;
  metric?: {
    current: number;
    threshold: number;
    distance_pct?: number;
  };
  created: string;
}

export interface WalletSnapshot {
  address: string;
  eth_balance: number;
  eth_usd: number;
  total_usd: number;
  last_tx: string | null;
  tx_count_24h: number;
  flow_24h: {
    inflows_eth: number;
    outflows_eth: number;
    inflows_usd: number;
    outflows_usd: number;
  };
  recent_txs: Array<{
    hash: string;
    timestamp: string;
    direction: "in" | "out";
    value_eth: number;
    value_usd: number;
    to: string;
    from: string;
  }>;
  source: "etherscan" | "public-rpc" | "fallback";
  error?: string;
}

export interface RiskAlertsData {
  updated_at: string;
  wallet: WalletSnapshot | null;
  alerts: RiskAlert[];
  concentration: {
    max_position_pct: number;
    max_position: string;
    limit: number;
    breach: boolean;
  };
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

// ============================================
// Gimli — Commodities
// ============================================
export interface CommodityPoint {
  value: number | null;
  source: "metals-api" | "coingecko" | "alpha-vantage" | "yahoo" | null;
  error?: string;
}

export interface CurveState {
  front: number | null;
  next: number | null;
  curve: "backwardation" | "contango" | "flat" | "unknown";
  spread_pct: number | null;
}

export interface CommoditySignal {
  type: "backwardation" | "contango" | "premium" | "discount" | "regime";
  market: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface CommoditiesData {
  updated_at: string;
  spot: {
    gold_usd_oz: CommodityPoint;
    silver_usd_oz: CommodityPoint;
    platinum_usd_oz: CommodityPoint;
    palladium_usd_oz: CommodityPoint;
    copper_usd_lb: CommodityPoint;
    wti_usd_bbl: CommodityPoint;
    brent_usd_bbl: CommodityPoint;
  };
  futures: {
    gold: CurveState;
    copper: CurveState;
    wti: CurveState;
  };
  tokenized: {
    paxg_usd: CommodityPoint;
    xaut_usd: CommodityPoint;
    paxg_premium_bps: number | null;
  };
  mining_equities: {
    freeport_fcx: CommodityPoint;
    bhp: CommodityPoint;
    rio: CommodityPoint;
    newmont_nem: CommodityPoint;
  };
  signals: CommoditySignal[];
  health: {
    metals_api: "ok" | "no_key" | "error";
    alpha_vantage: "ok" | "no_key" | "error";
    coingecko: "ok" | "error";
  };
}

// ============================================
// Elrond — Macro Data
// ============================================
export interface FredPoint {
  value: number | null;
  date: string | null;
  error?: string;
}

export interface MacroDataFull {
  updated_at: string;
  fed: {
    funds_rate: FredPoint;
    balance_sheet_usd_bn: FredPoint;
  };
  yields: {
    y2: FredPoint;
    y10: FredPoint;
    y30: FredPoint;
    real_10y: FredPoint;
    curve_2s10s_bps: number | null;
    inverted: boolean;
  };
  inflation: {
    cpi_yoy_pct: FredPoint;
    core_cpi_yoy_pct: FredPoint;
    trend: "declining" | "rising" | "stable" | "unknown";
  };
  employment: {
    unrate: FredPoint;
    nfp_thousands: FredPoint;
  };
  dollar: {
    dxy_proxy: FredPoint;
  };
  financial_conditions: {
    nfci: FredPoint;
    regime: "loose" | "neutral" | "tight" | "unknown";
  };
  regime: "risk_on" | "risk_off" | "neutral" | "unknown";
  regime_summary: string;
  ai_parallel?: {
    closest_period: string;
    similarities: string;
    divergences: string;
    confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB";
  };
  health: {
    fred: "ok" | "no_key" | "error";
  };
}

// ============================================
// Aragorn — Intelligence
// ============================================
export type IntelligenceCategory = "commodity" | "defi" | "regulatory" | "company" | "exploits";
export type IntelligencePriority = "high" | "medium" | "low";

export interface IntelligenceItem {
  id: string;
  source: string;
  source_weight: number;
  title: string;
  link: string;
  category: IntelligenceCategory;
  priority: IntelligencePriority;
  priority_score: number;
  matched_keywords: string[];
  published: string;
  snippet?: string;
}

export interface IntelligenceData {
  updated_at: string;
  categories: Record<IntelligenceCategory, IntelligenceItem[]>;
  top_stories: IntelligenceItem[];
  summary: {
    total_items: number;
    by_category: Record<IntelligenceCategory, number>;
    by_priority: Record<IntelligencePriority, number>;
    sources_succeeded: number;
    sources_failed: number;
    failed_sources: string[];
  };
}

// ============================================
// Ori — The Truth Agent (Tier 1, deterministic)
// ============================================
export interface OriPosition {
  ticker: string;
  name: string;
  theme: string;
  bucket: string;
  chain: string;
  balance: number | null;
  price_usd: number | null;
  value_usd: number | null;
  allocation_pct: number | null;
  pnl_pct?: number;
  source: "etherscan" | "hyperliquid" | "manual" | "none";
}

export interface OriPerp {
  pair: string;
  side: "long" | "short" | "none";
  leverage: number;
  size_usd: number;
  entry_price: number | null;
  mark_price: number | null;
  liquidation_price: number | null;
  unrealized_pnl_usd: number | null;
  stop_loss: number | null;
  distance_to_stop_pct: number | null;
  source: "hyperliquid" | "manual" | "none";
}

export interface OriCommodityPoint {
  value: number | null;
  change_pct_24h: number | null;
  source: "yahoo" | "defillama" | "none";
}

export interface OriAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  type: "stop_loss" | "concentration" | "stale_data" | "missing_data";
  position?: string;
  title: string;
  message: string;
  created: string;
}

export interface OriData {
  updated_at: string;
  wallet_address: string;
  nav_usd: number;
  positions: OriPosition[];
  perps: OriPerp[];
  commodities: {
    gold_usd_oz: OriCommodityPoint;
    silver_usd_oz: OriCommodityPoint;
    copper_usd_lb: OriCommodityPoint;
    wti_usd_bbl: OriCommodityPoint;
    brent_usd_bbl: OriCommodityPoint;
    paxg_usd: OriCommodityPoint;
    xaut_usd: OriCommodityPoint;
    mining_equities: {
      fcx: OriCommodityPoint;
      bhp: OriCommodityPoint;
      rio: OriCommodityPoint;
      nem: OriCommodityPoint;
    };
  };
  alerts: OriAlert[];
  concentration: {
    max_position_pct: number;
    max_position_ticker: string;
    limit: number;
    breach: boolean;
  };
  health: {
    etherscan: "ok" | "no_key" | "error" | "stub";
    defillama: "ok" | "error";
    hyperliquid: "ok" | "error";
    yahoo: "ok" | "error";
    stale: boolean;
  };
  // The legacy_shape field is consumed by legacy dashboard code
  legacy_shape: Portfolio;
}

// ============================================
// Storylines — "Today's Big Picture" hero card
// ============================================
export type StorylineCategory =
  | "Geopolitics"
  | "Regulatory"
  | "DeFi"
  | "Commodity"
  | "Macro"
  | "Crypto"
  | "Other";

export interface StorylineSource {
  title: string;
  source: string;
  url: string;
  published?: string;
}

export interface MatchedPolymarket {
  question: string;
  yes_probability: number | null;
  no_probability: number | null;
  volume_24h_usd: number | null;
  end_date: string | null;
  url: string;
}

export interface Storyline {
  rank: 1 | 2 | 3 | 4;
  title: string;
  category: StorylineCategory;
  importance: number;
  summary: string;
  sources: StorylineSource[];
  polymarket: MatchedPolymarket | null;
  confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB";
}

export interface StorylinesData {
  updated_at: string;
  next_refresh_at: string;
  model: string;
  storylines: Storyline[];
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

// ============================================
// Benchmarks — BTC / ETH / SPX for NAV comparison
// ============================================
export interface Benchmark {
  symbol: string;
  label: string;
  price: number | null;
  change_pct_24h: number | null;
  source: string;
  error?: string;
}

export interface BenchmarksData {
  updated_at: string;
  btc: Benchmark;
  eth: Benchmark;
  spx: Benchmark;
}

// ============================================
// Durin — Daily Brief
// ============================================
export interface DurinSummary {
  nav_usd?: number;
  positions_count?: number;
  macro_regime?: string;
  cheap_defi_count?: number;
  high_relevance_governance?: number;
  critical_risk_alerts?: number;
  high_priority_news?: number;
}

export interface DurinBriefData {
  updated_at: string;
  model?: string;
  confidence?: "FACT" | "INFERENCE" | "GUESS" | "STUB";
  what_moved?: string;
  risks_today?: string;
  decisions_this_week?: string;
  summary?: DurinSummary;
  sources?: string[];
  cost_usd?: number;
  input_tokens?: number;
  output_tokens?: number;
}

// ============================================
// Gimli — DeFi Value-Investing Agent (Tier 2)
// ============================================
export type FeeSwitchState =
  | "live_full"
  | "live_partial"
  | "live_buyback"
  | "not_activated"
  | "unknown";

export interface FeeSwitchInfo {
  state: FeeSwitchState;
  holder_pct: number;
  note: string;
}

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
  pe_if_full_capture: number | null;
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
