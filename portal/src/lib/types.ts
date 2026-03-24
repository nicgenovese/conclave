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
