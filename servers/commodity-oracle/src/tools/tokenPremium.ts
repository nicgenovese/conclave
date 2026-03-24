import type { TokenPremiumInput, TokenPremiumOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { ReservesClient } from '../clients/reserves.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface TokenPremiumContext {
  cache: CacheManager;
  reservesClient: ReservesClient;
  metalsClient: MetalsApiClient;
}

// Token to underlying commodity mapping
const TOKEN_UNDERLYING: Record<string, string> = {
  PAXG: 'XAU',
  XAUT: 'XAU',
  DGX: 'XAU'
};

export async function handleTokenPremium(
  input: TokenPremiumInput,
  ctx: TokenPremiumContext
): Promise<TokenPremiumOutput> {
  const cacheKey = ctx.cache.generateKey('tokenPremium', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<TokenPremiumOutput>(cacheKey);
  if (cached) return cached;

  const underlying = TOKEN_UNDERLYING[input.token];
  if (!underlying) {
    throw new Error(`Unknown underlying commodity for ${input.token}`);
  }

  const tokenAddress = ctx.reservesClient.getTokenAddress(input.token, 'ethereum');
  if (!tokenAddress) {
    throw new Error(`Token ${input.token} not found`);
  }

  // Get current prices
  const [tokenPrice, spotData] = await Promise.all([
    ctx.reservesClient.getTokenPrice(input.token, 'ethereum'),
    ctx.metalsClient.getLatestPrice(underlying, 'USD')
  ]);

  const spotPrice = spotData.price;
  const premium = tokenPrice - spotPrice;
  const premiumPercent = (premium / spotPrice) * 100;

  // Note: Historical premium analysis requires historical token price data
  // which is not available through current data sources
  // Returning current snapshot only with explanation
  const premiumHistory: Array<{ date: string; premium: number; premiumPercent: number }> = [];

  // Determine signal based on current premium only
  // Standard gold token premium typically ranges -0.5% to +1%
  let signal: 'overvalued' | 'fair' | 'undervalued';
  let recommendation: string;

  if (premiumPercent > 1.0) {
    signal = 'overvalued';
    recommendation = `Token trades at ${premiumPercent.toFixed(2)}% premium above spot gold. This exceeds typical market premium (0-1%). Consider waiting for premium to normalize.`;
  } else if (premiumPercent < -0.5) {
    signal = 'undervalued';
    recommendation = `Token trades at ${premiumPercent.toFixed(2)}% discount to spot gold. This is below typical market range. May present buying opportunity, but verify liquidity.`;
  } else {
    signal = 'fair';
    recommendation = `Token trades at ${premiumPercent.toFixed(2)}% premium/discount to spot gold. This is within typical market range (±0.5-1%).`;
  }

  const result: TokenPremiumOutput = {
    token: input.token,
    tokenAddress,
    underlying: `Gold (${underlying})`,
    currentPrices: {
      tokenPrice,
      spotPrice,
      premium,
      premiumPercent
    },
    historicalPremium: {
      average: 0, // Historical token prices not available
      min: 0,
      max: 0,
      current: premiumPercent,
      percentile: 0 // Cannot calculate without historical data
    },
    premiumHistory, // Empty - historical token prices not available
    analysis: {
      trend: 'stable', // Cannot determine trend without historical data
      signal,
      recommendation
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'tokenPremium');
  return result;
}
