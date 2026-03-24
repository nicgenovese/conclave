import type { LcValidationInput, LcValidationOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface LcValidationContext {
  cache: CacheManager;
  metalsClient: MetalsApiClient;
}

// Unit conversion to standard units (ounces for precious metals, barrels for oil)
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  XAU: {
    oz: 1,
    kg: 32.1507, // kg to oz
    mt: 32150.7  // metric ton to oz
  },
  XAG: {
    oz: 1,
    kg: 32.1507,
    mt: 32150.7
  },
  WTI: {
    barrel: 1,
    mt: 7.33 // metric ton to barrels (approx for crude)
  },
  BRENT: {
    barrel: 1,
    mt: 7.33
  }
};

export async function handleLcValidation(
  input: LcValidationInput,
  ctx: LcValidationContext
): Promise<LcValidationOutput> {
  const cacheKey = ctx.cache.generateKey('lcValidation', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcValidationOutput>(cacheKey);
  if (cached) return cached;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Get current spot price
  const spotData = await ctx.metalsClient.getLatestPrice(input.commodity, input.invoiceCurrency);
  const spotPrice = spotData.price;

  // Convert quantity to standard units
  const conversions = UNIT_CONVERSIONS[input.commodity];
  if (!conversions) {
    errors.push(`Unknown commodity: ${input.commodity}`);
  }

  const conversionFactor = conversions?.[input.unit] || 1;
  const standardQuantity = input.quantity * conversionFactor;

  // Calculate required amount
  const requiredAmount = input.quantity * input.invoicePrice;

  // Validate invoice price against spot
  const priceDeviation = input.invoicePrice - spotPrice;
  const priceDeviationPercent = (priceDeviation / spotPrice) * 100;
  const withinTolerance = Math.abs(priceDeviationPercent) <= input.tolerancePercent;

  if (!withinTolerance) {
    if (priceDeviationPercent > 0) {
      warnings.push(`Invoice price ${priceDeviationPercent.toFixed(2)}% above spot - verify premium justification`);
    } else {
      warnings.push(`Invoice price ${Math.abs(priceDeviationPercent).toFixed(2)}% below spot - unusual discount`);
    }
  }

  // Validate LC coverage
  const coverageRatio = (input.lcAmount / requiredAmount) * 100;
  const shortfall = Math.max(0, requiredAmount - input.lcAmount);
  const isSufficient = coverageRatio >= 100;

  if (!isSufficient) {
    errors.push(`LC amount insufficient: covers only ${coverageRatio.toFixed(1)}% of invoice value`);
  } else if (coverageRatio < 105) {
    warnings.push(`LC coverage is tight (${coverageRatio.toFixed(1)}%) - consider buffer for price movements`);
  }

  // Validate expiry date
  const expiryDate = new Date(input.expiryDate);
  const now = new Date();
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    errors.push('LC has already expired');
  } else if (daysRemaining < 7) {
    warnings.push(`LC expires in ${daysRemaining} days - limited time for settlement`);
  }

  // Get historical volatility for price risk assessment
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const historicalPrices = await ctx.metalsClient.getHistoricalPrices(
    input.commodity,
    startDate.toISOString().split('T')[0],
    now.toISOString().split('T')[0],
    input.invoiceCurrency
  );

  // Calculate 30-day volatility
  const prices = historicalPrices.map(h => h.price);
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const thirtyDayVolatility = dailyVol * Math.sqrt(30) * 100;

  // Estimate price risk over LC tenor
  const tenorDays = Math.max(0, daysRemaining);
  const tenorVolatility = dailyVol * Math.sqrt(tenorDays);
  const priceRisk = tenorVolatility * 2 * 100; // 2 std dev (95% confidence)

  if (priceRisk > 10) {
    warnings.push(`High price risk: ${priceRisk.toFixed(1)}% potential movement over LC tenor`);
  }

  // Determine price direction
  let priceDirection: 'rising' | 'falling' | 'stable';
  if (prices.length >= 7) {
    const recentAvg = prices.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const olderAvg = prices.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const trend = (recentAvg - olderAvg) / olderAvg;

    if (trend > 0.02) priceDirection = 'rising';
    else if (trend < -0.02) priceDirection = 'falling';
    else priceDirection = 'stable';
  } else {
    priceDirection = 'stable';
  }

  // Generate recommendation
  const isValid = errors.length === 0;
  let recommendation: string;

  if (!isValid) {
    recommendation = `LC validation FAILED: ${errors.join('; ')}. Address these issues before proceeding.`;
  } else if (warnings.length > 0) {
    recommendation = `LC validation PASSED with warnings: ${warnings.join('; ')}. Review flagged items.`;
  } else {
    recommendation = 'LC validation PASSED. Terms are within acceptable parameters for settlement.';
  }

  const result: LcValidationOutput = {
    validation: {
      isValid,
      errors,
      warnings
    },
    pricing: {
      spotPrice,
      invoicePrice: input.invoicePrice,
      deviation: priceDeviation,
      deviationPercent: priceDeviationPercent,
      withinTolerance
    },
    coverage: {
      requiredAmount,
      lcAmount: input.lcAmount,
      coverageRatio,
      shortfall,
      isSufficient
    },
    expiry: {
      daysRemaining,
      spotAtExpiry: null, // Would need futures data
      priceRisk
    },
    marketContext: {
      currentSpot: spotPrice,
      thirtyDayVolatility,
      priceDirection
    },
    recommendation,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcValidation');
  return result;
}
