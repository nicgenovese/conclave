import type { LcCounterpartyInput, LcCounterpartyOutput, BankAssessment, CountryRiskAssessment } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import { findBankProfile, getRiskTierFromRating } from '../data/bankRatings.js';
import { getCountryRisk, shouldRecommendConfirmation, CONFIRMATION_FEE_BPS, deriveRiskLevel } from '../data/countryRisk.js';

interface LcCounterpartyContext {
  cache: CacheManager;
}

export async function handleLcCounterparty(
  input: LcCounterpartyInput,
  ctx: LcCounterpartyContext
): Promise<LcCounterpartyOutput> {
  const cacheKey = ctx.cache.generateKey('lcCounterparty', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcCounterpartyOutput>(cacheKey);
  if (cached) return cached;

  const now = new Date();

  // Assess issuing bank
  const issuingBankProfile = findBankProfile(input.issuingBank.name);
  const issuingCountryRisk = getCountryRisk(input.issuingBank.country);

  const issuingBankAssessment: BankAssessment = {
    name: input.issuingBank.name,
    country: input.issuingBank.country,
    creditRating: issuingBankProfile?.creditRating || null,
    ratingAgency: issuingBankProfile?.ratingAgency || null,
    riskTier: issuingBankProfile
      ? getRiskTierFromRating(issuingBankProfile.creditRating)
      : 'unrated',
    tradeFinanceCapability: issuingBankProfile?.tradeFinanceCapability || 'unknown'
  };

  const issuingCountryAssessment: CountryRiskAssessment = {
    country: input.issuingBank.country,
    oecdCategory: issuingCountryRisk?.oecdCategory ?? 5,
    politicalRisk: issuingCountryRisk?.politicalRisk || 'elevated',
    transferRisk: issuingCountryRisk?.transferRisk || 'elevated',
    sovereignCeiling: issuingCountryRisk?.sovereignCeiling || null
  };

  // Assess confirming bank if provided
  let confirmingBankAssessment: BankAssessment | null = null;
  let confirmingCountryAssessment: CountryRiskAssessment | null = null;

  if (input.confirmingBank) {
    const confirmingBankProfile = findBankProfile(input.confirmingBank.name);
    const confirmingCountryRisk = getCountryRisk(input.confirmingBank.country);

    confirmingBankAssessment = {
      name: input.confirmingBank.name,
      country: input.confirmingBank.country,
      creditRating: confirmingBankProfile?.creditRating || null,
      ratingAgency: confirmingBankProfile?.ratingAgency || null,
      riskTier: confirmingBankProfile
        ? getRiskTierFromRating(confirmingBankProfile.creditRating)
        : 'unrated',
      tradeFinanceCapability: confirmingBankProfile?.tradeFinanceCapability || 'unknown'
    };

    confirmingCountryAssessment = {
      country: input.confirmingBank.country,
      oecdCategory: confirmingCountryRisk?.oecdCategory ?? 0,
      politicalRisk: confirmingCountryRisk?.politicalRisk || 'low',
      transferRisk: confirmingCountryRisk?.transferRisk || 'low',
      sovereignCeiling: confirmingCountryRisk?.sovereignCeiling || null
    };
  }

  // Calculate overall risk score
  let riskScore = 30; // Base score

  // Bank risk contribution
  const bankRiskWeights: Record<string, number> = {
    prime: 0,
    investment_grade: 10,
    sub_investment: 25,
    speculative: 40,
    unrated: 30
  };
  riskScore += bankRiskWeights[issuingBankAssessment.riskTier] || 30;

  // Country risk contribution (OECD category 0-7 mapped to 0-35)
  riskScore += (issuingCountryAssessment.oecdCategory || 0) * 5;

  // Tenor risk (longer = more risk)
  if (input.tenorDays > 90) riskScore += 5;
  if (input.tenorDays > 180) riskScore += 10;

  // Amount risk
  if (input.amount >= 10000000) riskScore += 5;
  else if (input.amount >= 1000000) riskScore += 2;

  // Confirmation benefit
  if (confirmingBankAssessment) {
    const confirmingRiskReduction = confirmingBankAssessment.riskTier === 'prime' ? 20 : 10;
    riskScore = Math.max(10, riskScore - confirmingRiskReduction);
  }

  // Normalize
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Risk level
  let riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  if (riskScore <= 20) riskLevel = 'low';
  else if (riskScore <= 40) riskLevel = 'moderate';
  else if (riskScore <= 60) riskLevel = 'elevated';
  else if (riskScore <= 80) riskLevel = 'high';
  else riskLevel = 'critical';

  // Primary concerns
  const primaryConcerns: string[] = [];

  if (issuingBankAssessment.riskTier === 'unrated') {
    primaryConcerns.push('Issuing bank is unrated - creditworthiness unknown');
  } else if (issuingBankAssessment.riskTier === 'sub_investment' || issuingBankAssessment.riskTier === 'speculative') {
    primaryConcerns.push(`Issuing bank rated ${issuingBankAssessment.creditRating} (${issuingBankAssessment.riskTier})`);
  }

  if (issuingCountryAssessment.oecdCategory >= 5) {
    primaryConcerns.push(`High country risk (OECD category ${issuingCountryAssessment.oecdCategory})`);
  }

  if (issuingCountryAssessment.transferRisk === 'elevated' || issuingCountryAssessment.transferRisk === 'high') {
    primaryConcerns.push(`${issuingCountryAssessment.transferRisk} transfer/convertibility risk`);
  }

  if (input.tenorDays > 180) {
    primaryConcerns.push('Extended tenor (>180 days) increases exposure duration');
  }

  // Confirmation analysis
  const { recommended: confirmationRecommended, rationale: confirmationRationale } =
    shouldRecommendConfirmation(issuingCountryAssessment.oecdCategory, input.amount, input.tenorDays);

  // Estimate confirmation cost
  const feeRange = CONFIRMATION_FEE_BPS[issuingCountryAssessment.oecdCategory] || CONFIRMATION_FEE_BPS[5];
  const baseBps = (feeRange.low + feeRange.high) / 2;
  const tenorAdjustment = Math.max(0, (input.tenorDays - 30) / 30) * 5;
  const estimatedCostBps = Math.round(baseBps + tenorAdjustment);

  // Generate recommendation
  let recommendation: string;
  if (riskLevel === 'low' || riskLevel === 'moderate') {
    recommendation = confirmingBankAssessment
      ? 'Counterparty risk is well-managed with confirmation in place.'
      : 'Counterparty risk is acceptable. Confirmation optional but may provide additional security.';
  } else if (riskLevel === 'elevated') {
    recommendation = confirmingBankAssessment
      ? 'Elevated underlying risk mitigated by confirmation. Monitor issuing bank and country conditions.'
      : 'Elevated counterparty risk. Strongly recommend adding confirmation from a prime-rated bank.';
  } else {
    recommendation = confirmingBankAssessment
      ? 'High underlying risk present despite confirmation. Consider additional risk mitigation or reduced exposure.'
      : 'High counterparty risk. Do not proceed without confirmation from a prime-rated bank in a low-risk jurisdiction.';
  }

  const result: LcCounterpartyOutput = {
    issuingBankAssessment,
    confirmingBankAssessment,
    countryRisk: {
      issuingCountry: issuingCountryAssessment,
      confirmingCountry: confirmingCountryAssessment
    },
    overallRisk: {
      score: riskScore,
      level: riskLevel,
      primaryConcerns
    },
    confirmationAnalysis: {
      recommended: confirmationRecommended && !confirmingBankAssessment,
      rationale: confirmingBankAssessment
        ? 'Confirmation already in place'
        : confirmationRationale,
      estimatedCostBps
    },
    recommendation,
    dataFreshness: now.toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcCounterparty');
  return result;
}
