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
