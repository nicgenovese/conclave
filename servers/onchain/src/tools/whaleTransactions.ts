import { DuneClient } from '../clients/dune.js';
import { EtherscanClient } from '../clients/etherscan.js';
import { CacheManager } from '../utils/cache.js';
import type { WhaleTransactionsInput, WhaleTransactionsOutput } from '../types/index.js';

// Known addresses for labeling
const KNOWN_LABELS: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503': 'Binance (Cold)',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance (Cold)',
  '0x40b38765696e3d5d8d9d834d8aad4bb6e418e489': 'Robinhood'
};

const EXCHANGE_ADDRESSES = new Set(Object.keys(KNOWN_LABELS));

interface ToolContext {
  cache: CacheManager;
  duneClient: DuneClient;
  etherscanClient: EtherscanClient;
}

export async function handleWhaleTransactions(
  input: WhaleTransactionsInput,
  ctx: ToolContext
): Promise<WhaleTransactionsOutput> {
  const cacheKey = ctx.cache.generateKey('whaleTransactions', input);
  const cached = ctx.cache.get<WhaleTransactionsOutput>(cacheKey);
  if (cached) return cached;

  const periodDays = getPeriodDays(input.period);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);

  // Get token transfers
  const transfers = await ctx.duneClient.getTokenTransfers(
    input.chain,
    input.tokenAddress,
    input.tokenAddress,
    2000
  );

  // Filter whale transactions
  const whaleTransactions = transfers
    .filter(transfer => {
      const txDate = new Date(transfer.block_time);
      const valueUsd = transfer.amount_usd || 0;
      return txDate >= cutoffDate && valueUsd >= input.minValueUsd;
    })
    .slice(0, input.limit)
    .map(transfer => {
      const fromLower = transfer.from.toLowerCase();
      const toLower = transfer.to.toLowerCase();

      const fromLabel = KNOWN_LABELS[fromLower] || null;
      const toLabel = KNOWN_LABELS[toLower] || null;

      const txType = determineTxType(fromLower, toLower);

      return {
        txHash: transfer.tx_hash,
        blockNumber: transfer.block_number,
        timestamp: transfer.block_time,
        from: transfer.from,
        fromLabel,
        to: transfer.to,
        toLabel,
        valueToken: transfer.amount,
        valueUsd: transfer.amount_usd || 0,
        txType
      };
    });

  // Calculate statistics
  const totalVolumeUsd = whaleTransactions.reduce((sum, tx) => sum + tx.valueUsd, 0);
  const avgTransactionUsd = whaleTransactions.length > 0
    ? totalVolumeUsd / whaleTransactions.length
    : 0;
  const largestTransactionUsd = whaleTransactions.length > 0
    ? Math.max(...whaleTransactions.map(tx => tx.valueUsd))
    : 0;

  const exchangeDepositCount = whaleTransactions.filter(
    tx => tx.txType === 'ExchangeDeposit'
  ).length;
  const exchangeWithdrawalCount = whaleTransactions.filter(
    tx => tx.txType === 'ExchangeWithdrawal'
  ).length;

  const result: WhaleTransactionsOutput = {
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    period: input.period,
    minValueUsd: input.minValueUsd,
    transactions: whaleTransactions,
    statistics: {
      totalTransactions: whaleTransactions.length,
      totalVolumeUsd,
      avgTransactionUsd,
      largestTransactionUsd
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'whaleTransactions');
  return result;
}

function getPeriodDays(period: string): number {
  switch (period) {
    case '24h': return 1;
    case '7d': return 7;
    case '30d': return 30;
    default: return 7;
  }
}

function determineTxType(
  from: string,
  to: string
): WhaleTransactionsOutput['transactions'][0]['txType'] {
  const fromIsExchange = EXCHANGE_ADDRESSES.has(from);
  const toIsExchange = EXCHANGE_ADDRESSES.has(to);

  if (toIsExchange && !fromIsExchange) {
    return 'ExchangeDeposit';
  }
  if (fromIsExchange && !toIsExchange) {
    return 'ExchangeWithdrawal';
  }
  if (fromIsExchange && toIsExchange) {
    return 'Transfer'; // Inter-exchange transfer
  }
  return 'Transfer';
}
