import type { LcPricingInput, LcPricingOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import { CONFIRMATION_FEE_BPS } from '../data/countryRisk.js';

interface LcPricingContext {
  cache: CacheManager;
}

// Current reference rates (would be fetched from API in production)
const REFERENCE_RATES: Record<string, number> = {
  SOFR: 5.30,
  EURIBOR: 3.90,
  SONIA: 5.20
};

// Base fee structure (bps per annum or flat)
const FEE_STRUCTURE = {
  issuance: {
    prime: 10,
    investment_grade: 15,
    sub_investment: 25,
    unrated: 30
  },
  advising: {
    base: 10, // Flat bps
    min: 100, // Minimum USD
    max: 500 // Maximum USD
  },
  amendment: {
    flat: 150 // USD per amendment
  },
  negotiation: {
    base: 10 // bps
  }
};

export async function handleLcPricing(
  input: LcPricingInput,
  ctx: LcPricingContext
): Promise<LcPricingOutput> {
  const cacheKey = ctx.cache.generateKey('lcPricing', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcPricingOutput>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const amount = input.amount;
  const tenorDays = input.tenorDays;
  const annualizedTenor = tenorDays / 365;

  // Calculate issuance fee
  const issuanceBaseBps = FEE_STRUCTURE.issuance[input.issuingBankRisk];
  const issuanceBps = Math.round(issuanceBaseBps * (1 + annualizedTenor));
  const issuanceFeeAmount = (amount * issuanceBps) / 10000;

  // Calculate advising fee
  const advisingBps = FEE_STRUCTURE.advising.base;
  let advisingFeeAmount = (amount * advisingBps) / 10000;
  advisingFeeAmount = Math.max(FEE_STRUCTURE.advising.min, Math.min(FEE_STRUCTURE.advising.max, advisingFeeAmount));

  // Calculate confirmation fee if applicable
  let confirmationFee: { bps: number; amount: number } | null = null;
  if (input.isConfirmed) {
    const feeRange = CONFIRMATION_FEE_BPS[input.countryRiskCategory] || CONFIRMATION_FEE_BPS[3];
    const baseBps = (feeRange.low + feeRange.high) / 2;

    // Adjust for bank risk
    const bankRiskAdjustment: Record<string, number> = {
      prime: 0.8,
      investment_grade: 1.0,
      sub_investment: 1.3,
      unrated: 1.5
    };
    const adjustedBps = Math.round(baseBps * (bankRiskAdjustment[input.issuingBankRisk] || 1.0));

    // Annualize for tenor
    const confirmationBps = Math.round(adjustedBps * Math.max(1, 1 + annualizedTenor * 0.5));
    const confirmationAmount = (amount * confirmationBps) / 10000;

    confirmationFee = {
      bps: confirmationBps,
      amount: confirmationAmount
    };
  }

  // Calculate negotiation fee
  const negotiationBps = FEE_STRUCTURE.negotiation.base;
  const negotiationFeeAmount = (amount * negotiationBps) / 10000;

  // Calculate discounting if requested
  let discounting = null;
  if (input.discountingRequested && tenorDays > 0) {
    const referenceRate = REFERENCE_RATES[input.referenceRate] || REFERENCE_RATES['SOFR'];

    // Spread based on bank and country risk
    let spread = 100; // Base 100 bps
    spread += input.countryRiskCategory * 20;
    if (input.issuingBankRisk === 'sub_investment') spread += 50;
    if (input.issuingBankRisk === 'unrated') spread += 75;
    if (!input.isConfirmed && input.countryRiskCategory >= 3) spread += 30;

    const allInRate = referenceRate + spread / 100;
    const discountFactor = (allInRate / 100) * (tenorDays / 365);
    const discountAmount = amount * discountFactor;
    const netProceeds = amount - discountAmount;

    discounting = {
      available: true,
      referenceRate: input.referenceRate,
      currentRate: referenceRate,
      spread: spread / 100,
      allInRate,
      discountAmount: Math.round(discountAmount * 100) / 100,
      netProceeds: Math.round(netProceeds * 100) / 100
    };
  }

  // Calculate total costs
  const upfrontFees = issuanceFeeAmount + advisingFeeAmount + (confirmationFee?.amount || 0);
  const financingCost = discounting?.discountAmount || 0;
  const allInCost = upfrontFees + financingCost;

  // Effective annual rate
  const effectiveAnnualRate = tenorDays > 0
    ? (allInCost / amount) * (365 / tenorDays) * 100
    : (upfrontFees / amount) * 100;

  // Market benchmark
  const marketLow = input.countryRiskCategory <= 2 ? 0.5 : (input.countryRiskCategory <= 4 ? 1.0 : 2.0);
  const marketHigh = input.countryRiskCategory <= 2 ? 1.5 : (input.countryRiskCategory <= 4 ? 3.0 : 6.0);

  let position: 'below_market' | 'at_market' | 'above_market';
  if (effectiveAnnualRate < marketLow) position = 'below_market';
  else if (effectiveAnnualRate > marketHigh) position = 'above_market';
  else position = 'at_market';

  // Generate recommendation
  let recommendation: string;
  if (position === 'below_market') {
    recommendation = 'Pricing appears competitive. Verify all fees are included and terms are favorable.';
  } else if (position === 'at_market') {
    recommendation = 'Pricing is within market range. Consider negotiating confirmation fee if applicable.';
  } else {
    recommendation = 'Pricing above typical market range. Consider alternative banks or negotiate better terms.';
  }

  if (input.isConfirmed && input.countryRiskCategory <= 2) {
    recommendation += ' Confirmation may be optional given low country risk.';
  } else if (!input.isConfirmed && input.countryRiskCategory >= 4) {
    recommendation += ' Strongly recommend adding confirmation despite additional cost.';
  }

  const result: LcPricingOutput = {
    fees: {
      issuanceFee: { bps: issuanceBps, amount: Math.round(issuanceFeeAmount * 100) / 100 },
      advisingFee: { bps: advisingBps, amount: Math.round(advisingFeeAmount * 100) / 100 },
      confirmationFee,
      amendmentFee: { flat: FEE_STRUCTURE.amendment.flat },
      negotiationFee: { bps: negotiationBps, amount: Math.round(negotiationFeeAmount * 100) / 100 }
    },
    discounting,
    totalCost: {
      upfrontFees: Math.round(upfrontFees * 100) / 100,
      financingCost: Math.round(financingCost * 100) / 100,
      allInCost: Math.round(allInCost * 100) / 100,
      effectiveAnnualRate: Math.round(effectiveAnnualRate * 100) / 100
    },
    benchmark: {
      marketRange: { low: marketLow, high: marketHigh },
      position
    },
    recommendation,
    dataFreshness: now.toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcPricing');
  return result;
}
