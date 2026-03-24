import { DuneClient } from '../clients/dune.js';
import { EtherscanClient } from '../clients/etherscan.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter, withRetry } from '../utils/rateLimiter.js';
import type { WalletProfileInput, WalletProfileOutput } from '../types/index.js';

// DefiLlama price API
const DEFILLAMA_PRICE_URL = 'https://coins.llama.fi/prices/current';
const priceRateLimiter = new RateLimiter('defillama-prices');

// Known exchange addresses (simplified - in production, use a full database)
const KNOWN_EXCHANGES: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Binance',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken'
};

interface ToolContext {
  cache: CacheManager;
  duneClient: DuneClient;
  etherscanClient: EtherscanClient;
}

interface DefiLlamaPriceResponse {
  coins: Record<string, {
    price: number;
    symbol: string;
    timestamp: number;
    confidence: number;
  }>;
}

// Fetch token price from DefiLlama
async function fetchTokenPrice(chain: string, tokenAddress: string): Promise<number> {
  return withRetry(async () => {
    await priceRateLimiter.throttle();

    const chainMap: Record<string, string> = {
      ethereum: 'ethereum',
      arbitrum: 'arbitrum',
      optimism: 'optimism',
      polygon: 'polygon',
      base: 'base',
      avalanche: 'avax',
      bsc: 'bsc'
    };

    const llamaChain = chainMap[chain.toLowerCase()] || 'ethereum';
    const coinId = `${llamaChain}:${tokenAddress.toLowerCase()}`;
    const url = `${DEFILLAMA_PRICE_URL}/${encodeURIComponent(coinId)}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`DefiLlama price fetch failed: ${response.status}`);
      return 0;
    }

    const data = await response.json() as DefiLlamaPriceResponse;
    return data.coins[coinId]?.price || 0;
  });
}

// Determine holder trend from transfer history
function calculateHolderTrend(
  transfers: Array<{ from: string; to: string; block_time: string }>
): 'Accumulating' | 'Stable' | 'Distributing' {
  if (transfers.length < 10) return 'Stable';

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  // Count unique addresses in recent vs older period
  const recentHolders = new Set<string>();
  const olderHolders = new Set<string>();

  for (const transfer of transfers) {
    const transferTime = new Date(transfer.block_time).getTime();
    if (transferTime >= oneWeekAgo) {
      recentHolders.add(transfer.to.toLowerCase());
    } else if (transferTime >= twoWeeksAgo) {
      olderHolders.add(transfer.to.toLowerCase());
    }
  }

  // Calculate net new vs lost holders
  let newHolders = 0;
  let lostHolders = 0;

  for (const addr of recentHolders) {
    if (!olderHolders.has(addr)) newHolders++;
  }
  for (const addr of olderHolders) {
    if (!recentHolders.has(addr)) lostHolders++;
  }

  const netChange = newHolders - lostHolders;
  const threshold = Math.max(2, Math.floor(recentHolders.size * 0.1));

  if (netChange > threshold) return 'Accumulating';
  if (netChange < -threshold) return 'Distributing';
  return 'Stable';
}

export async function handleWalletProfile(
  input: WalletProfileInput,
  ctx: ToolContext
): Promise<WalletProfileOutput> {
  const cacheKey = ctx.cache.generateKey('walletProfile', input);
  const cached = ctx.cache.get<WalletProfileOutput>(cacheKey);
  if (cached) return cached;

  // Fetch token price and transfers in parallel
  const [tokenPrice, transfers] = await Promise.all([
    fetchTokenPrice(input.chain, input.tokenAddress),
    ctx.duneClient.getTokenTransfers(
      input.chain,
      input.tokenAddress,
      input.tokenAddress,
      1000
    )
  ]);

  // Build holder balances from transfers (simplified)
  const holderBalances = new Map<string, number>();

  for (const transfer of transfers) {
    const amount = parseFloat(transfer.amount) || 0;

    // Decrease sender balance
    const fromBalance = holderBalances.get(transfer.from.toLowerCase()) || 0;
    holderBalances.set(transfer.from.toLowerCase(), fromBalance - amount);

    // Increase receiver balance
    const toBalance = holderBalances.get(transfer.to.toLowerCase()) || 0;
    holderBalances.set(transfer.to.toLowerCase(), toBalance + amount);
  }

  // Filter positive balances and sort
  const sortedHolders = Array.from(holderBalances.entries())
    .filter(([_, balance]) => balance > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, input.limit);

  // Calculate total supply from balances
  const totalSupply = sortedHolders.reduce((sum, [_, bal]) => sum + bal, 0);

  // Check contract status for top holders (batch to reduce API calls)
  const contractStatusMap = new Map<string, boolean>();
  const addressesToCheck = sortedHolders.slice(0, 20).map(([addr]) => addr);

  await Promise.all(
    addressesToCheck.map(async (addr) => {
      try {
        const isContract = await ctx.etherscanClient.isContractVerified(input.chain, addr);
        contractStatusMap.set(addr.toLowerCase(), isContract);
      } catch {
        contractStatusMap.set(addr.toLowerCase(), false);
      }
    })
  );

  // Build top holders with labels and USD values
  const topHolders = sortedHolders.map(([address, balance]) => {
    const label = KNOWN_EXCHANGES[address.toLowerCase()] || null;
    const isContract = contractStatusMap.get(address.toLowerCase()) || false;
    const category = categorizeAddress(address, label, isContract);
    const balanceUsd = tokenPrice > 0 ? balance * tokenPrice : 0;

    return {
      address,
      balance: balance.toFixed(2),
      balanceUsd: Math.round(balanceUsd * 100) / 100,
      percentOfSupply: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
      label,
      category
    };
  });

  // Calculate concentration metrics
  const top10Balance = topHolders.slice(0, 10).reduce((sum, h) => sum + parseFloat(h.balance), 0);
  const top25Balance = topHolders.slice(0, 25).reduce((sum, h) => sum + parseFloat(h.balance), 0);
  const top50Balance = topHolders.slice(0, 50).reduce((sum, h) => sum + parseFloat(h.balance), 0);

  const concentrationMetrics = {
    top10Percent: totalSupply > 0 ? (top10Balance / totalSupply) * 100 : 0,
    top25Percent: totalSupply > 0 ? (top25Balance / totalSupply) * 100 : 0,
    top50Percent: totalSupply > 0 ? (top50Balance / totalSupply) * 100 : 0
  };

  // Calculate holder trend from transfer history
  const holderTrend = calculateHolderTrend(transfers);

  // Smart money analysis (non-exchange, non-protocol addresses with significant holdings)
  const smartMoneyHolders = topHolders.filter(
    h => h.category !== 'Exchange' &&
         h.category !== 'Protocol' &&
         parseFloat(h.balance) > totalSupply * 0.001
  );

  const smartMoneyTotalUsd = smartMoneyHolders.reduce((sum, h) => sum + h.balanceUsd, 0);

  const result: WalletProfileOutput = {
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    totalHolders: holderBalances.size,
    topHolders,
    concentrationMetrics,
    holderTrend,
    smartMoneyHoldings: {
      addressCount: smartMoneyHolders.length,
      totalValueUsd: Math.round(smartMoneyTotalUsd * 100) / 100,
      percentOfSupply: smartMoneyHolders.reduce((sum, h) => sum + h.percentOfSupply, 0)
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'walletProfile');
  return result;
}

function categorizeAddress(
  address: string,
  label: string | null,
  isContract: boolean
): WalletProfileOutput['topHolders'][0]['category'] {
  // Check known exchanges first
  if (label && label.includes('Binance')) return 'Exchange';
  if (label && label.includes('Coinbase')) return 'Exchange';
  if (label && label.includes('Kraken')) return 'Exchange';
  if (KNOWN_EXCHANGES[address.toLowerCase()]) return 'Exchange';

  // If it's a verified contract, likely a protocol
  if (isContract) return 'Protocol';

  // Otherwise unknown (could be EOA - user, fund, team, etc.)
  return 'Unknown';
}
