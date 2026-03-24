import type { OracleHealthInput, OracleHealthOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { PythClient } from '../clients/pyth.js';
import type { ChainlinkClient } from '../clients/chainlink.js';

interface OracleHealthContext {
  cache: CacheManager;
  pythClient: PythClient;
  chainlinkClient: ChainlinkClient;
}

export async function handleOracleHealth(
  input: OracleHealthInput,
  ctx: OracleHealthContext
): Promise<OracleHealthOutput> {
  const cacheKey = ctx.cache.generateKey('oracleHealth', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<OracleHealthOutput>(cacheKey);
  if (cached) return cached;

  let result: OracleHealthOutput;

  if (input.oracle === 'pyth') {
    result = await getPythHealth(input, ctx);
  } else {
    result = await getChainlinkHealth(input, ctx);
  }

  ctx.cache.set(cacheKey, result, 'oracleHealth');
  return result;
}

async function getPythHealth(
  input: OracleHealthInput,
  ctx: OracleHealthContext
): Promise<OracleHealthOutput> {
  const priceData = await ctx.pythClient.getLatestPrice(input.commodity);
  const now = Math.floor(Date.now() / 1000);
  const staleness = now - priceData.timestamp;

  // Determine status
  let status: 'healthy' | 'degraded' | 'stale' | 'critical';
  const alerts: string[] = [];

  if (staleness < 30) {
    status = 'healthy';
  } else if (staleness < 120) {
    status = 'degraded';
    alerts.push(`Price data is ${staleness} seconds old`);
  } else if (staleness < 600) {
    status = 'stale';
    alerts.push(`Price data is stale (${staleness} seconds old)`);
  } else {
    status = 'critical';
    alerts.push(`Price data is critically stale (${staleness} seconds old)`);
  }

  // Check confidence interval
  const confidencePercent = (priceData.confidence / priceData.price) * 100;
  if (confidencePercent > 1) {
    alerts.push(`High price uncertainty: ${confidencePercent.toFixed(2)}% confidence interval`);
    if (status === 'healthy') status = 'degraded';
  }

  return {
    commodity: input.commodity,
    oracle: 'pyth',
    chain: input.chain,
    feedAddress: 'N/A (Pyth uses feed IDs)',
    currentPrice: priceData.price,
    lastUpdate: {
      timestamp: new Date(priceData.timestamp * 1000).toISOString(),
      blockNumber: null,
      staleness
    },
    healthMetrics: {
      updateFrequency: 0, // Variable - Pyth updates on price deviation
      heartbeatInterval: 60, // Expected max staleness for healthy feed
      deviationThreshold: 0.5,
      missedHeartbeats: Math.max(0, Math.floor(staleness / 60) - 1)
    },
    confidence: {
      interval: priceData.confidence,
      intervalPercent: confidencePercent,
      publishers: 0 // Publisher count not available via API
    },
    reliability: {
      uptimePercent: 0, // Historical data not available
      averageStaleness: 0, // Historical data not available
      maxStaleness: staleness
    },
    status,
    alerts,
    dataFreshness: new Date().toISOString()
  };
}

async function getChainlinkHealth(
  input: OracleHealthInput,
  ctx: OracleHealthContext
): Promise<OracleHealthOutput> {
  const feedAddress = ctx.chainlinkClient.getFeedAddress(input.commodity, input.chain);
  if (!feedAddress) {
    throw new Error(`No Chainlink feed for ${input.commodity} on ${input.chain}`);
  }

  const priceData = await ctx.chainlinkClient.getLatestPrice(input.commodity, input.chain);
  const heartbeat = ctx.chainlinkClient.getHeartbeatInterval(input.commodity);

  // Determine status
  let status: 'healthy' | 'degraded' | 'stale' | 'critical';
  const alerts: string[] = [];

  if (priceData.staleness < heartbeat * 0.5) {
    status = 'healthy';
  } else if (priceData.staleness < heartbeat) {
    status = 'degraded';
    alerts.push(`Approaching heartbeat interval (${priceData.staleness}s of ${heartbeat}s)`);
  } else if (priceData.staleness < heartbeat * 2) {
    status = 'stale';
    alerts.push(`Exceeded heartbeat interval (${priceData.staleness}s, expected ${heartbeat}s)`);
  } else {
    status = 'critical';
    alerts.push(`Critically stale: ${priceData.staleness}s since last update`);
  }

  return {
    commodity: input.commodity,
    oracle: 'chainlink',
    chain: input.chain,
    feedAddress,
    currentPrice: priceData.price,
    lastUpdate: {
      timestamp: new Date(priceData.timestamp * 1000).toISOString(),
      blockNumber: null,
      staleness: priceData.staleness
    },
    healthMetrics: {
      updateFrequency: 0, // Variable - updates on deviation or heartbeat
      heartbeatInterval: heartbeat,
      deviationThreshold: 0.5, // Typical 0.5% deviation trigger
      missedHeartbeats: Math.max(0, Math.floor(priceData.staleness / heartbeat) - 1)
    },
    confidence: {
      interval: 0, // Chainlink doesn't expose confidence intervals
      intervalPercent: 0,
      publishers: 0 // Node count not available via API
    },
    reliability: {
      uptimePercent: 0, // Historical data not available
      averageStaleness: 0, // Historical data not available
      maxStaleness: priceData.staleness
    },
    status,
    alerts,
    dataFreshness: new Date().toISOString()
  };
}
