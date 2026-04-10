/**
 * Moria Capital Protocol Watchlist — Single Source of Truth
 *
 * All agents (Ori, Aragorn, Thorin, Gimli, Elrond, Durin) import from here.
 * Add a new protocol in ONE place and every agent picks it up.
 *
 * Themes:
 *   - Portfolio       : what we currently hold
 *   - Watch-Core      : L1s + major DeFi infrastructure
 *   - Watch-AI        : AI/DePIN protocols (compute, data, training)
 *   - Watch-Privacy   : privacy-preserving protocols
 *   - Watch-RWA       : real-world assets, commodity/credit tokenization
 *   - Watch-Solana    : Solana-native DeFi (Jupiter, Jito, Kamino...)
 *
 * Used for: price tracking, governance monitoring, news keyword matching,
 * commodity theme alignment, Dune whale queries, historical parallels.
 */

export type Theme =
  | "Portfolio"
  | "Watch-Core"
  | "Watch-AI"
  | "Watch-Privacy"
  | "Watch-RWA"
  | "Watch-Solana";

export type Chain = "ethereum" | "base" | "arbitrum" | "optimism" | "polygon" | "bsc" | "solana" | "bitcoin" | "cosmos" | "other";

export interface Protocol {
  name: string;                      // Display name
  ticker: string;                    // Market ticker
  coingecko_id: string | null;       // CoinGecko slug (for price API)
  defillama_slug: string | null;     // DeFi Llama protocol slug (TVL, revenue)
  defillama_coin?: string;           // DeFi Llama coin reference (e.g. "coingecko:bitcoin")
  snapshot_space: string | null;     // Snapshot DAO space (governance)
  eth_contract: string | null;       // Ethereum contract address (ERC-20)
  chain: Chain;                      // Primary chain
  theme: Theme;                      // Category for filtering
  tags: string[];                    // Free-form tags (AI, privacy, LSD, oracle, etc.)
  thesis_relevance: 1 | 2 | 3 | 4 | 5; // How important to Moria's thesis (5 = core)
}

export const WATCHLIST: Protocol[] = [
  // ─────────────────────────────────────────────
  // PORTFOLIO — what we currently hold
  // ─────────────────────────────────────────────
  {
    name: "Ethereum",
    ticker: "ETH",
    coingecko_id: "ethereum",
    defillama_slug: null,
    defillama_coin: "coingecko:ethereum",
    snapshot_space: null,
    eth_contract: null,
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["L1", "settlement"],
    thesis_relevance: 5,
  },
  {
    name: "Aave",
    ticker: "AAVE",
    coingecko_id: "aave",
    defillama_slug: "aave",
    snapshot_space: "aave.eth",
    eth_contract: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["lending", "fee-switch"],
    thesis_relevance: 5,
  },
  {
    name: "Hyperliquid",
    ticker: "HYPE",
    coingecko_id: "hyperliquid",
    defillama_slug: "hyperliquid",
    snapshot_space: null, // Hyperliquid governance not on Snapshot yet
    eth_contract: null,
    chain: "other",
    theme: "Portfolio",
    tags: ["perp-dex", "fee-burn"],
    thesis_relevance: 5,
  },
  {
    name: "Pendle",
    ticker: "PENDLE",
    coingecko_id: "pendle",
    defillama_slug: "pendle",
    snapshot_space: "pendlecontrol.eth",
    eth_contract: "0x808507121B80c02388fAd14726482e061B8da827",
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["yield", "fixed-income"],
    thesis_relevance: 4,
  },
  {
    name: "Morpho",
    ticker: "MORPHO",
    coingecko_id: "morpho",
    defillama_slug: "morpho",
    snapshot_space: "morpho.eth",
    eth_contract: "0x58D97B57BB95320F9a05dC918Aef65434969c2B2",
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["lending", "isolated-markets"],
    thesis_relevance: 4,
  },
  {
    name: "Uniswap",
    ticker: "UNI",
    coingecko_id: "uniswap",
    defillama_slug: "uniswap",
    snapshot_space: "uniswapgovernance.eth",
    eth_contract: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["dex", "liquidity"],
    thesis_relevance: 4,
  },
  {
    name: "Lido (wstETH)",
    ticker: "wstETH",
    coingecko_id: "wrapped-steth",
    defillama_slug: "lido",
    snapshot_space: "lido-snapshot.eth",
    eth_contract: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["LSD", "staking"],
    thesis_relevance: 4,
  },
  {
    name: "CoW Protocol",
    ticker: "COW",
    coingecko_id: "cow-protocol",
    defillama_slug: "cow-protocol",
    snapshot_space: "cow.eth",
    eth_contract: "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB",
    chain: "ethereum",
    theme: "Portfolio",
    tags: ["dex", "mev-protection"],
    thesis_relevance: 3,
  },

  // ─────────────────────────────────────────────
  // WATCH-CORE — major infrastructure we don't own (yet)
  // ─────────────────────────────────────────────
  {
    name: "Solana",
    ticker: "SOL",
    coingecko_id: "solana",
    defillama_slug: null,
    defillama_coin: "coingecko:solana",
    snapshot_space: null,
    eth_contract: null,
    chain: "solana",
    theme: "Watch-Core",
    tags: ["L1", "high-throughput"],
    thesis_relevance: 4,
  },
  {
    name: "Bitcoin",
    ticker: "BTC",
    coingecko_id: "bitcoin",
    defillama_slug: null,
    defillama_coin: "coingecko:bitcoin",
    snapshot_space: null,
    eth_contract: null,
    chain: "bitcoin",
    theme: "Watch-Core",
    tags: ["L1", "store-of-value"],
    thesis_relevance: 3,
  },
  {
    name: "ENS",
    ticker: "ENS",
    coingecko_id: "ethereum-name-service",
    defillama_slug: null,
    snapshot_space: "ens.eth",
    eth_contract: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
    chain: "ethereum",
    theme: "Watch-Core",
    tags: ["identity", "naming"],
    thesis_relevance: 2,
  },

  // ─────────────────────────────────────────────
  // WATCH-AI — AI / DePIN protocols
  // ─────────────────────────────────────────────
  {
    name: "Bittensor",
    ticker: "TAO",
    coingecko_id: "bittensor",
    defillama_slug: "bittensor",
    snapshot_space: null, // Bittensor uses its own governance
    eth_contract: null,
    chain: "other",
    theme: "Watch-AI",
    tags: ["AI", "decentralized-inference", "subnets"],
    thesis_relevance: 3,
  },
  {
    name: "Virtuals Protocol",
    ticker: "VIRTUAL",
    coingecko_id: "virtual-protocol",
    defillama_slug: "virtuals-protocol",
    snapshot_space: null,
    eth_contract: "0x44ff8620b8cA30902395A7bD3F2407e1A091BF73",
    chain: "base",
    theme: "Watch-AI",
    tags: ["AI", "agent-tokens"],
    thesis_relevance: 3,
  },
  {
    name: "Render Network",
    ticker: "RENDER",
    coingecko_id: "render-token",
    defillama_slug: null,
    snapshot_space: "rndrnetwork.eth",
    eth_contract: "0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24",
    chain: "ethereum",
    theme: "Watch-AI",
    tags: ["AI", "DePIN", "GPU"],
    thesis_relevance: 3,
  },
  {
    name: "io.net",
    ticker: "IO",
    coingecko_id: "io",
    defillama_slug: null,
    snapshot_space: null,
    eth_contract: null,
    chain: "solana",
    theme: "Watch-AI",
    tags: ["AI", "DePIN", "GPU"],
    thesis_relevance: 2,
  },
  {
    name: "Akash Network",
    ticker: "AKT",
    coingecko_id: "akash-network",
    defillama_slug: "akash-network",
    snapshot_space: null,
    eth_contract: null,
    chain: "cosmos",
    theme: "Watch-AI",
    tags: ["AI", "DePIN", "compute"],
    thesis_relevance: 2,
  },
  {
    name: "Near Protocol",
    ticker: "NEAR",
    coingecko_id: "near",
    defillama_slug: null,
    defillama_coin: "coingecko:near",
    snapshot_space: null,
    eth_contract: null,
    chain: "other",
    theme: "Watch-AI",
    tags: ["L1", "AI", "sharding"],
    thesis_relevance: 2,
  },
  {
    name: "Worldcoin",
    ticker: "WLD",
    coingecko_id: "worldcoin-wld",
    defillama_slug: null,
    snapshot_space: null,
    eth_contract: "0x163f8C2467924be0ae7B5347228CABF260318753",
    chain: "ethereum",
    theme: "Watch-AI",
    tags: ["AI", "proof-of-personhood"],
    thesis_relevance: 2,
  },

  // ─────────────────────────────────────────────
  // WATCH-PRIVACY — privacy protocols
  // ─────────────────────────────────────────────
  {
    name: "Zcash",
    ticker: "ZEC",
    coingecko_id: "zcash",
    defillama_slug: null,
    defillama_coin: "coingecko:zcash",
    snapshot_space: null,
    eth_contract: null,
    chain: "other",
    theme: "Watch-Privacy",
    tags: ["privacy", "L1", "zk"],
    thesis_relevance: 3,
  },
  {
    name: "Monero",
    ticker: "XMR",
    coingecko_id: "monero",
    defillama_slug: null,
    defillama_coin: "coingecko:monero",
    snapshot_space: null,
    eth_contract: null,
    chain: "other",
    theme: "Watch-Privacy",
    tags: ["privacy", "L1"],
    thesis_relevance: 2,
  },
  {
    name: "Railgun",
    ticker: "RAIL",
    coingecko_id: "railgun",
    defillama_slug: "railgun",
    snapshot_space: null,
    eth_contract: "0xE76C6c83af64e4C60245D8C7dE953DF673a7A33D",
    chain: "ethereum",
    theme: "Watch-Privacy",
    tags: ["privacy", "zk"],
    thesis_relevance: 2,
  },
  {
    name: "Namada",
    ticker: "NAM",
    coingecko_id: "namada",
    defillama_slug: "namada-shielded-pools",
    snapshot_space: null,
    eth_contract: null,
    chain: "cosmos",
    theme: "Watch-Privacy",
    tags: ["privacy", "shielded"],
    thesis_relevance: 2,
  },

  // ─────────────────────────────────────────────
  // WATCH-RWA — tokenization / real-world assets
  // ─────────────────────────────────────────────
  {
    name: "Ondo Finance",
    ticker: "ONDO",
    coingecko_id: "ondo-finance",
    defillama_slug: "ondo-finance",
    snapshot_space: null,
    eth_contract: "0xfAbA6f8e4a5e8Ab82F62fe7C39859fA577269BE3",
    chain: "ethereum",
    theme: "Watch-RWA",
    tags: ["RWA", "treasuries", "yield"],
    thesis_relevance: 4,
  },
  {
    name: "Centrifuge",
    ticker: "CFG",
    coingecko_id: "centrifuge",
    defillama_slug: "centrifuge",
    snapshot_space: null,
    eth_contract: null,
    chain: "other",
    theme: "Watch-RWA",
    tags: ["RWA", "credit", "receivables"],
    thesis_relevance: 4,
  },
  {
    name: "Maple Finance",
    ticker: "SYRUP",
    coingecko_id: "syrup",
    defillama_slug: "maple",
    snapshot_space: null,
    eth_contract: null,
    chain: "ethereum",
    theme: "Watch-RWA",
    tags: ["RWA", "credit", "institutional"],
    thesis_relevance: 3,
  },
  {
    name: "Ethena",
    ticker: "ENA",
    coingecko_id: "ethena",
    defillama_slug: "ethena",
    snapshot_space: "ethena.eth",
    eth_contract: null,
    chain: "ethereum",
    theme: "Watch-RWA",
    tags: ["synthetic-dollar", "basis-trade"],
    thesis_relevance: 3,
  },

  // ─────────────────────────────────────────────
  // WATCH-SOLANA — Solana native DeFi
  // ─────────────────────────────────────────────
  {
    name: "Jupiter",
    ticker: "JUP",
    coingecko_id: "jupiter-exchange-solana",
    defillama_slug: "jupiter",
    snapshot_space: null,
    eth_contract: null,
    chain: "solana",
    theme: "Watch-Solana",
    tags: ["dex-aggregator", "perps"],
    thesis_relevance: 3,
  },
  {
    name: "Jito",
    ticker: "JTO",
    coingecko_id: "jito-governance-token",
    defillama_slug: "jito-liquid-staking",
    snapshot_space: null,
    eth_contract: null,
    chain: "solana",
    theme: "Watch-Solana",
    tags: ["LSD", "MEV"],
    thesis_relevance: 3,
  },
  {
    name: "Kamino",
    ticker: "KMNO",
    coingecko_id: "kamino",
    defillama_slug: "kamino",
    snapshot_space: null,
    eth_contract: null,
    chain: "solana",
    theme: "Watch-Solana",
    tags: ["lending", "leverage"],
    thesis_relevance: 2,
  },
];

// ─────────────────────────────────────────────
// Helper accessors
// ─────────────────────────────────────────────

export function getPortfolio(): Protocol[] {
  return WATCHLIST.filter((p) => p.theme === "Portfolio");
}

export function getWatchlist(): Protocol[] {
  return WATCHLIST.filter((p) => p.theme !== "Portfolio");
}

export function getByTheme(theme: Theme): Protocol[] {
  return WATCHLIST.filter((p) => p.theme === theme);
}

export function getAllCoinGeckoIds(): string[] {
  return WATCHLIST.map((p) => p.coingecko_id).filter((x): x is string => x !== null);
}

export function getAllDeFiLlamaCoins(): string[] {
  return WATCHLIST.map((p) => {
    if (p.defillama_coin) return p.defillama_coin;
    if (p.coingecko_id) return `coingecko:${p.coingecko_id}`;
    return null;
  }).filter((x): x is string => x !== null);
}

export function getAllSnapshotSpaces(): { space: string; protocol: string; ticker: string }[] {
  return WATCHLIST.filter((p) => p.snapshot_space !== null).map((p) => ({
    space: p.snapshot_space!,
    protocol: p.name,
    ticker: p.ticker,
  }));
}

/**
 * Build a comprehensive keyword list for news/RSS matching.
 * Includes tickers, names, and theme tags.
 */
export function getNewsKeywords(): string[] {
  const keywords = new Set<string>();
  for (const p of WATCHLIST) {
    keywords.add(p.ticker.toLowerCase());
    keywords.add(p.name.toLowerCase());
    for (const tag of p.tags) keywords.add(tag.toLowerCase());
  }
  // Moria thesis keywords
  const thesisKeywords = [
    "tokenization",
    "real world asset",
    "real-world asset",
    "rwa",
    "trade finance",
    "letter of credit",
    "commodity",
    "glencore",
    "trafigura",
    "vitol",
    "cargill",
    "stablecoin",
    "mica",
    "genius act",
    "fed",
    "sec",
    "cftc",
    "finma",
    "etf",
    "fee switch",
    "buyback",
    "treasury",
    "exploit",
    "hack",
    "rug",
  ];
  for (const kw of thesisKeywords) keywords.add(kw);
  return Array.from(keywords);
}

/**
 * Protocols grouped by thesis relevance — used by Durin for brief prioritization.
 * Higher relevance = mentioned first in brief.
 */
export function getProtocolsByRelevance(): Record<number, Protocol[]> {
  const grouped: Record<number, Protocol[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const p of WATCHLIST) grouped[p.thesis_relevance].push(p);
  return grouped;
}

/**
 * Stats — useful for logging and health checks.
 */
export function watchlistStats() {
  return {
    total: WATCHLIST.length,
    portfolio: getByTheme("Portfolio").length,
    watch_core: getByTheme("Watch-Core").length,
    watch_ai: getByTheme("Watch-AI").length,
    watch_privacy: getByTheme("Watch-Privacy").length,
    watch_rwa: getByTheme("Watch-RWA").length,
    watch_solana: getByTheme("Watch-Solana").length,
    with_snapshot: WATCHLIST.filter((p) => p.snapshot_space).length,
    with_defillama: WATCHLIST.filter((p) => p.defillama_slug).length,
    keywords: getNewsKeywords().length,
  };
}
