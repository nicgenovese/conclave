import type { FuturesCurveInput, FuturesCurveOutput, FuturesContract } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface FuturesPriceContext {
  cache: CacheManager;
  metalsClient: MetalsApiClient;
}

export async function handleFuturesPrice(
  input: FuturesCurveInput,
  ctx: FuturesPriceContext
): Promise<FuturesCurveOutput> {
  const cacheKey = ctx.cache.generateKey('futuresCurve', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<FuturesCurveOutput>(cacheKey);
  if (cached) return cached;

  // Get current spot price
  const spotData = await ctx.metalsClient.getLatestPrice(input.commodity, input.quoteCurrency);
  const spotPrice = spotData.price;

  // Generate synthetic futures curve based on typical commodity curves
  // In production, this would fetch from actual futures data providers
  const futures: FuturesContract[] = [];
  const now = new Date();

  // Generate contracts for the next 12 months
  for (let i = 1; i <= 12; i++) {
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + i);

    // Estimate futures price based on commodity characteristics
    // Gold typically trades in slight contango due to storage/carry costs
    // Oil can be contango or backwardation depending on market conditions
    let carryRate: number;
    switch (input.commodity) {
      case 'XAU':
      case 'XAG':
        carryRate = 0.002; // ~0.2% per month for precious metals
        break;
      case 'WTI':
      case 'BRENT':
        carryRate = 0.005; // ~0.5% per month for oil (storage costs)
        break;
      case 'NG':
        carryRate = 0.008; // Higher for natural gas (seasonal)
        break;
      default:
        carryRate = 0.003; // Default for agriculturals
    }

    const monthsForward = i;
    const futuresPrice = spotPrice * (1 + carryRate * monthsForward);
    const premium = futuresPrice - spotPrice;
    const premiumPercent = (premium / spotPrice) * 100;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expiryLabel = `${monthNames[expiryDate.getMonth()]} ${expiryDate.getFullYear()}`;

    futures.push({
      expiryDate: expiryDate.toISOString().split('T')[0],
      expiryLabel,
      price: futuresPrice,
      premium,
      premiumPercent,
      openInterest: undefined // Would need actual data
    });
  }

  // Determine curve shape
  const frontMonth = futures[0].price;
  const backMonth = futures[futures.length - 1].price;
  let curveShape: 'contango' | 'backwardation' | 'flat';

  if (backMonth > frontMonth * 1.005) {
    curveShape = 'contango';
  } else if (backMonth < frontMonth * 0.995) {
    curveShape = 'backwardation';
  } else {
    curveShape = 'flat';
  }

  // Calculate implied roll yield (annualized)
  const monthlyRoll = (futures[0].price - spotPrice) / spotPrice;
  const rollYield = monthlyRoll * 12 * 100; // Annualized percentage

  const result: FuturesCurveOutput = {
    commodity: input.commodity,
    quoteCurrency: input.quoteCurrency,
    spotPrice,
    futures,
    curveShape,
    rollYield,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'futuresCurve');
  return result;
}
