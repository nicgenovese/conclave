import { DuneClient } from '../clients/dune.js';
import { CacheManager } from '../utils/cache.js';
import type { ExchangeFlowsInput, ExchangeFlowsOutput } from '../types/index.js';

// Known exchange addresses
const EXCHANGE_ADDRESSES = new Set([
  '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance
  '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', // Binance
  '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', // Coinbase
  '0x503828976d22510aad0201ac7ec88293211d23da', // Coinbase
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2', // Kraken
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13'  // Kraken
]);

const EXCHANGE_LABELS: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Binance',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken'
};

interface ToolContext {
  cache: CacheManager;
  duneClient: DuneClient;
}

export async function handleExchangeFlows(
  input: ExchangeFlowsInput,
  ctx: ToolContext
): Promise<ExchangeFlowsOutput> {
  const cacheKey = ctx.cache.generateKey('exchangeFlows', input);
  const cached = ctx.cache.get<ExchangeFlowsOutput>(cacheKey);
  if (cached) return cached;

  const periodDays = input.period === '7d' ? 7 : 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);

  // Get token transfers
  const transfers = await ctx.duneClient.getTokenTransfers(
    input.chain,
    input.tokenAddress,
    input.tokenAddress,
    2000 // Get more transfers to cover the period
  );

  // Filter by date and analyze exchange flows
  const dailyFlows = new Map<string, { inflow: number; outflow: number }>();
  const exchangeBreakdown = new Map<string, { inflow: number; outflow: number }>();

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const transfer of transfers) {
    const txDate = new Date(transfer.block_time);
    if (txDate < cutoffDate) continue;

    const dateKey = txDate.toISOString().split('T')[0];
    const amount = transfer.amount_usd || 0;

    const fromLower = transfer.from.toLowerCase();
    const toLower = transfer.to.toLowerCase();

    const isFromExchange = EXCHANGE_ADDRESSES.has(fromLower);
    const isToExchange = EXCHANGE_ADDRESSES.has(toLower);

    // Initialize daily flow
    if (!dailyFlows.has(dateKey)) {
      dailyFlows.set(dateKey, { inflow: 0, outflow: 0 });
    }
    const dayFlow = dailyFlows.get(dateKey)!;

    if (isToExchange && !isFromExchange) {
      // Inflow to exchange (bearish - people depositing to sell)
      dayFlow.inflow += amount;
      totalInflow += amount;

      const exchange = EXCHANGE_LABELS[toLower] || 'Unknown Exchange';
      if (!exchangeBreakdown.has(exchange)) {
        exchangeBreakdown.set(exchange, { inflow: 0, outflow: 0 });
      }
      exchangeBreakdown.get(exchange)!.inflow += amount;
    } else if (isFromExchange && !isToExchange) {
      // Outflow from exchange (bullish - people withdrawing to hold)
      dayFlow.outflow += amount;
      totalOutflow += amount;

      const exchange = EXCHANGE_LABELS[fromLower] || 'Unknown Exchange';
      if (!exchangeBreakdown.has(exchange)) {
        exchangeBreakdown.set(exchange, { inflow: 0, outflow: 0 });
      }
      exchangeBreakdown.get(exchange)!.outflow += amount;
    }
  }

  const netflow = totalOutflow - totalInflow;

  // Determine flow signal
  let flowSignal: ExchangeFlowsOutput['summary']['flowSignal'];
  const netflowRatio = totalInflow > 0 ? netflow / totalInflow : 0;

  if (netflowRatio > 0.1) {
    flowSignal = 'Bullish'; // Net outflow > 10%
  } else if (netflowRatio < -0.1) {
    flowSignal = 'Bearish'; // Net inflow > 10%
  } else {
    flowSignal = 'Neutral';
  }

  // Format daily flows
  const sortedDailyFlows = Array.from(dailyFlows.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, flows]) => ({
      date,
      inflowUsd: flows.inflow,
      outflowUsd: flows.outflow,
      netflowUsd: flows.outflow - flows.inflow
    }));

  // Format exchange breakdown
  const sortedExchangeBreakdown = Array.from(exchangeBreakdown.entries())
    .map(([exchange, flows]) => ({
      exchange,
      inflowUsd: flows.inflow,
      outflowUsd: flows.outflow,
      netflowUsd: flows.outflow - flows.inflow
    }))
    .sort((a, b) => Math.abs(b.netflowUsd) - Math.abs(a.netflowUsd));

  const result: ExchangeFlowsOutput = {
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    period: input.period,
    summary: {
      netflowUsd: netflow,
      totalInflowUsd: totalInflow,
      totalOutflowUsd: totalOutflow,
      flowSignal
    },
    dailyFlows: sortedDailyFlows,
    exchangeBreakdown: sortedExchangeBreakdown,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'exchangeFlows');
  return result;
}
