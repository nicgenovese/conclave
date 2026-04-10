/**
 * Balin — Risk Sentinel (wallet fetcher)
 * Fetches wallet balance + recent transactions from Etherscan.
 * Works with or without API key (public endpoint, just rate-limited).
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_PATH = resolve(__dirname, "../portal/data/portfolio.json");

const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || "0x08fC70ADf6B0950749b7647F67616589b1853A53";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// Try to load wallet address from portfolio.json
function getWalletAddress(): string {
  try {
    const portfolio = JSON.parse(readFileSync(PORTFOLIO_PATH, "utf-8"));
    return portfolio.wallet || WALLET_ADDRESS;
  } catch {
    return WALLET_ADDRESS;
  }
}

export interface WalletData {
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

async function fetchEthBalance(address: string): Promise<number> {
  const apiBase = "https://api.etherscan.io/api";
  const keyParam = ETHERSCAN_API_KEY ? `&apikey=${ETHERSCAN_API_KEY}` : "";

  const url = `${apiBase}?module=account&action=balance&address=${address}&tag=latest${keyParam}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Etherscan ${res.status}`);

  const json = await res.json();
  if (json.status !== "1") {
    // Etherscan returns status "0" with message when rate limited / no key
    if (json.message?.includes("rate limit")) {
      throw new Error("Etherscan rate limited — add ETHERSCAN_API_KEY");
    }
    throw new Error(`Etherscan error: ${json.message || "unknown"}`);
  }

  // Result is in wei
  return parseInt(json.result) / 1e18;
}

async function fetchRecentTxs(address: string): Promise<any[]> {
  const apiBase = "https://api.etherscan.io/api";
  const keyParam = ETHERSCAN_API_KEY ? `&apikey=${ETHERSCAN_API_KEY}` : "";

  const url = `${apiBase}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc${keyParam}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  if (json.status !== "1") return [];

  return json.result || [];
}

async function fetchEthPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    );
    const json = await res.json();
    return json.ethereum?.usd || 0;
  } catch {
    return 0;
  }
}

export async function fetchWallet(): Promise<WalletData> {
  const address = getWalletAddress();
  console.log(`[balin] Fetching wallet data for ${address.slice(0, 10)}...`);

  const fallback: WalletData = {
    address,
    eth_balance: 0,
    eth_usd: 0,
    total_usd: 0,
    last_tx: null,
    tx_count_24h: 0,
    flow_24h: {
      inflows_eth: 0,
      outflows_eth: 0,
      inflows_usd: 0,
      outflows_usd: 0,
    },
    recent_txs: [],
    source: "fallback",
    error: undefined,
  };

  try {
    // Fetch in parallel
    const [balance, txs, ethPrice] = await Promise.all([
      fetchEthBalance(address),
      fetchRecentTxs(address),
      fetchEthPrice(),
    ]);

    const totalUsd = balance * ethPrice;

    // Compute 24h flow
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const recentTxs = txs
      .filter((tx: any) => now - parseInt(tx.timeStamp) * 1000 < day)
      .map((tx: any) => {
        const valueEth = parseInt(tx.value) / 1e18;
        const direction: "in" | "out" =
          tx.to.toLowerCase() === address.toLowerCase() ? "in" : "out";
        return {
          hash: tx.hash,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          direction,
          value_eth: valueEth,
          value_usd: valueEth * ethPrice,
          to: tx.to,
          from: tx.from,
        };
      });

    const inflowsEth = recentTxs
      .filter((t) => t.direction === "in")
      .reduce((sum, t) => sum + t.value_eth, 0);
    const outflowsEth = recentTxs
      .filter((t) => t.direction === "out")
      .reduce((sum, t) => sum + t.value_eth, 0);

    const lastTx = txs[0]
      ? new Date(parseInt(txs[0].timeStamp) * 1000).toISOString()
      : null;

    const data: WalletData = {
      address,
      eth_balance: balance,
      eth_usd: ethPrice,
      total_usd: totalUsd,
      last_tx: lastTx,
      tx_count_24h: recentTxs.length,
      flow_24h: {
        inflows_eth: inflowsEth,
        outflows_eth: outflowsEth,
        inflows_usd: inflowsEth * ethPrice,
        outflows_usd: outflowsEth * ethPrice,
      },
      recent_txs: recentTxs.slice(0, 10),
      source: ETHERSCAN_API_KEY ? "etherscan" : "public-rpc",
    };

    console.log(
      `[balin] ✓ Balance: ${balance.toFixed(4)} ETH ($${totalUsd.toFixed(0)}) · ${recentTxs.length} txs in 24h`,
    );

    return data;
  } catch (err) {
    console.warn(`[balin] ✗ Wallet fetch failed:`, err instanceof Error ? err.message : err);
    return {
      ...fallback,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchWallet()
    .then((data) => {
      const outPath = resolve(__dirname, "../portal/data/wallet.json");
      writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`[balin] Wrote ${outPath}`);
    })
    .catch((err) => {
      console.error("[balin] Failed:", err);
      process.exit(1);
    });
}
