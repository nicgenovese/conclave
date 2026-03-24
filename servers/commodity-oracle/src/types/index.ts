import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export const CommoditySymbol = z.enum([
  'XAU',   // Gold
  'XAG',   // Silver
  'XPT',   // Platinum
  'XPD',   // Palladium
  'WTI',   // WTI Crude Oil
  'BRENT', // Brent Crude Oil
  'NG',    // Natural Gas
  'CORN',  // Corn
  'WHEAT', // Wheat
  'SOY'    // Soybeans
]);
export type CommoditySymbol = z.infer<typeof CommoditySymbol>;

export const QuoteCurrency = z.enum(['USD', 'EUR', 'GBP']);
export type QuoteCurrency = z.infer<typeof QuoteCurrency>;

export const OracleSource = z.enum(['pyth', 'chainlink', 'metals_api']);
export type OracleSource = z.infer<typeof OracleSource>;

export const Chain = z.enum(['ethereum', 'arbitrum', 'optimism', 'base', 'polygon']);
export type Chain = z.infer<typeof Chain>;

// Supported commodity-backed tokens with verified mainnet contracts
export const CommodityToken = z.enum(['PAXG', 'XAUT', 'DGX']);
export type CommodityToken = z.infer<typeof CommodityToken>;

// ============================================================================
// Tool Input Schemas
// ============================================================================

// commodity_get_spot_price
export const SpotPriceInputSchema = z.object({
  commodity: CommoditySymbol,
  quoteCurrency: QuoteCurrency.default('USD'),
  sources: z.array(OracleSource).default(['pyth', 'chainlink'])
});
export type SpotPriceInput = z.infer<typeof SpotPriceInputSchema>;

// commodity_get_futures_curve
export const FuturesCurveInputSchema = z.object({
  commodity: z.enum(['XAU', 'XAG', 'WTI', 'BRENT', 'NG', 'CORN', 'WHEAT', 'SOY']),
  quoteCurrency: z.enum(['USD', 'EUR']).default('USD')
});
export type FuturesCurveInput = z.infer<typeof FuturesCurveInputSchema>;

// commodity_get_price_history
export const PriceHistoryInputSchema = z.object({
  commodity: CommoditySymbol,
  quoteCurrency: QuoteCurrency.default('USD'),
  period: z.enum(['7d', '30d', '90d', '1y', '5y']).default('30d'),
  interval: z.enum(['hourly', 'daily', 'weekly']).default('daily')
});
export type PriceHistoryInput = z.infer<typeof PriceHistoryInputSchema>;

// commodity_get_volatility
export const VolatilityInputSchema = z.object({
  commodity: CommoditySymbol,
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d')
});
export type VolatilityInput = z.infer<typeof VolatilityInputSchema>;

// commodity_get_oracle_health
// Note: Chainlink only supports XAU/XAG; Pyth supports XAU/XAG/WTI/BRENT
export const OracleHealthInputSchema = z.object({
  commodity: z.enum(['XAU', 'XAG', 'WTI', 'BRENT']),
  oracle: z.enum(['pyth', 'chainlink']),
  chain: Chain.default('ethereum')
});
export type OracleHealthInput = z.infer<typeof OracleHealthInputSchema>;

// commodity_compare_oracles
export const OracleComparisonInputSchema = z.object({
  commodity: z.enum(['XAU', 'XAG', 'WTI', 'BRENT']),
  includeTraditional: z.boolean().default(true)
});
export type OracleComparisonInput = z.infer<typeof OracleComparisonInputSchema>;

// commodity_get_reserve_attestation
export const ReserveAttestationInputSchema = z.object({
  token: CommodityToken,
  chain: z.enum(['ethereum', 'polygon']).default('ethereum')
});
export type ReserveAttestationInput = z.infer<typeof ReserveAttestationInputSchema>;

// commodity_get_collateral_health
export const CollateralHealthInputSchema = z.object({
  token: z.enum(['PAXG', 'XAUT', 'DGX']),
  protocol: z.enum(['aave', 'compound', 'maker']).optional(),
  chain: z.enum(['ethereum', 'polygon']).default('ethereum')
});
export type CollateralHealthInput = z.infer<typeof CollateralHealthInputSchema>;

// commodity_get_token_premium
export const TokenPremiumInputSchema = z.object({
  token: z.enum(['PAXG', 'XAUT', 'DGX']),
  period: z.enum(['24h', '7d', '30d']).default('7d')
});
export type TokenPremiumInput = z.infer<typeof TokenPremiumInputSchema>;

// commodity_validate_lc
export const LcValidationInputSchema = z.object({
  commodity: z.enum(['XAU', 'XAG', 'WTI', 'BRENT']),
  quantity: z.number().positive(),
  unit: z.enum(['oz', 'kg', 'barrel', 'mt']),
  invoicePrice: z.number().positive(),
  invoiceCurrency: z.enum(['USD', 'EUR']).default('USD'),
  lcAmount: z.number().positive(),
  expiryDate: z.string(),
  tolerancePercent: z.number().min(0).max(10).default(5)
});
export type LcValidationInput = z.infer<typeof LcValidationInputSchema>;

// ============================================================================
// Tool Output Types
// ============================================================================

export interface PriceData {
  source: OracleSource;
  price: number;
  confidence?: number;
  timestamp: string;
  staleness: number;
  status: 'fresh' | 'stale' | 'unavailable';
}

export interface SpotPriceOutput {
  commodity: string;
  quoteCurrency: string;
  prices: PriceData[];
  consensus: {
    price: number;
    spread: number;
    spreadPercent: number;
    agreement: 'strong' | 'moderate' | 'weak';
  };
  dataFreshness: string;
}

export interface FuturesContract {
  expiryDate: string;
  expiryLabel: string;
  price: number;
  premium: number;
  premiumPercent: number;
  openInterest?: number;
}

export interface FuturesCurveOutput {
  commodity: string;
  quoteCurrency: string;
  spotPrice: number;
  futures: FuturesContract[];
  curveShape: 'contango' | 'backwardation' | 'flat';
  rollYield: number;
  dataFreshness: string;
}

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceHistoryOutput {
  commodity: string;
  quoteCurrency: string;
  period: string;
  interval: string;
  currentPrice: number;
  priceChange: {
    change24h: number;
    change7d: number;
    change30d: number;
    change90d: number | null;
    changeYtd: number | null;
  };
  history: OHLCVData[];
  statistics: {
    high: number;
    low: number;
    average: number;
    median: number;
  };
  dataFreshness: string;
}

export interface VolatilityOutput {
  commodity: string;
  period: string;
  currentPrice: number;
  volatility: {
    daily: number;
    annualized: number;
    realized: number;
  };
  drawdown: {
    maxDrawdown: number;
    drawdownDate: string;
    recoveryDays: number | null;
  };
  riskMetrics: {
    sharpeRatio: number | null;
    valueAtRisk95: number;
    valueAtRisk99: number;
  };
  comparison: {
    vsGold: number | null;
    vsBtc: number | null;
    vsEth: number | null;
  };
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  dataFreshness: string;
}

export interface OracleHealthOutput {
  commodity: string;
  oracle: string;
  chain: string;
  feedAddress: string;
  currentPrice: number;
  lastUpdate: {
    timestamp: string;
    blockNumber: number | null;
    staleness: number;
  };
  healthMetrics: {
    updateFrequency: number;
    heartbeatInterval: number;
    deviationThreshold: number;
    missedHeartbeats: number;
  };
  confidence: {
    interval: number;
    intervalPercent: number;
    publishers: number;
  };
  reliability: {
    uptimePercent: number;
    averageStaleness: number;
    maxStaleness: number;
  };
  status: 'healthy' | 'degraded' | 'stale' | 'critical';
  alerts: string[];
  dataFreshness: string;
}

export interface OracleComparisonOutput {
  commodity: string;
  timestamp: string;
  sources: Array<{
    name: string;
    type: 'onchain' | 'traditional';
    price: number;
    staleness: number;
    status: string;
  }>;
  analysis: {
    median: number;
    mean: number;
    spread: number;
    spreadPercent: number;
    outliers: string[];
  };
  arbitrage: {
    maxSpread: number;
    opportunity: 'none' | 'minor' | 'significant';
    recommendation: string;
  };
  consensus: 'strong' | 'moderate' | 'weak' | 'divergent';
  dataFreshness: string;
}

export interface ReserveAttestationOutput {
  token: string;
  tokenAddress: string;
  chain: string;
  issuer: {
    name: string;
    regulator: string;
    jurisdiction: string;
  };
  supply: {
    totalSupply: number;
    circulatingSupply: number;
    lockedSupply: number;
  };
  backing: {
    commodity: string;
    totalOunces: number;
    perTokenOunces: number;
    vaultLocation: string;
    custodian: string;
  };
  attestation: {
    lastAudit: string | null; // Requires attestation API integration
    auditor: string;
    frequency: string;
    reportUrl: string | null;
    verificationMethod: string;
  };
  collateralRatio: number;
  status: 'fully_backed' | 'underbacked' | 'overbacked' | 'unknown';
  alerts: string[];
  dataFreshness: string;
}

export interface ProtocolCollateral {
  name: string;
  collateralFactor: number;
  liquidationThreshold: number;
  totalDeposited: number;
  totalDepositedUsd: number;
  utilizationRate: number;
  borrowApy: number;
  supplyApy: number;
}

export interface CollateralHealthOutput {
  token: string;
  tokenAddress: string;
  chain: string;
  spotPrice: {
    price: number;
    source: string;
    staleness: number;
  };
  oraclePrice: {
    price: number;
    deviation: number;
  };
  protocols: ProtocolCollateral[];
  liquidationRisk: {
    priceToLiquidation: number;
    atRiskCollateral: number;
    healthFactor: number;
  };
  riskLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  dataFreshness: string;
}

export interface TokenPremiumOutput {
  token: string;
  tokenAddress: string;
  underlying: string;
  currentPrices: {
    tokenPrice: number;
    spotPrice: number;
    premium: number;
    premiumPercent: number;
  };
  historicalPremium: {
    average: number;
    min: number;
    max: number;
    current: number;
    percentile: number;
  };
  premiumHistory: Array<{
    date: string;
    premium: number;
    premiumPercent: number;
  }>;
  analysis: {
    trend: 'widening' | 'narrowing' | 'stable';
    signal: 'overvalued' | 'fair' | 'undervalued';
    recommendation: string;
  };
  dataFreshness: string;
}

export interface LcValidationOutput {
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  pricing: {
    spotPrice: number;
    invoicePrice: number;
    deviation: number;
    deviationPercent: number;
    withinTolerance: boolean;
  };
  coverage: {
    requiredAmount: number;
    lcAmount: number;
    coverageRatio: number;
    shortfall: number;
    isSufficient: boolean;
  };
  expiry: {
    daysRemaining: number;
    spotAtExpiry: number | null;
    priceRisk: number;
  };
  marketContext: {
    currentSpot: number;
    thirtyDayVolatility: number;
    priceDirection: 'rising' | 'falling' | 'stable';
  };
  recommendation: string;
  dataFreshness: string;
}

// ============================================================================
// LC Analysis Module Types
// ============================================================================

// LC Type enums
export const LcType = z.enum([
  'irrevocable',
  'revocable',
  'confirmed',
  'unconfirmed',
  'standby',
  'transferable',
  'back_to_back',
  'red_clause',
  'green_clause'
]);
export type LcType = z.infer<typeof LcType>;

export const PaymentTerms = z.enum([
  'sight',
  'usance',
  'deferred',
  'acceptance',
  'negotiation'
]);
export type PaymentTerms = z.infer<typeof PaymentTerms>;

export const Incoterms = z.enum([
  'FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP', 'FCA', 'CPT', 'CIP', 'FAS'
]);
export type Incoterms = z.infer<typeof Incoterms>;

export const LcCurrency = z.enum(['USD', 'EUR', 'GBP', 'CHF', 'JPY']);
export type LcCurrency = z.infer<typeof LcCurrency>;

export const DocumentType = z.enum([
  'commercial_invoice',
  'bill_of_lading',
  'packing_list',
  'certificate_of_origin',
  'inspection_certificate',
  'insurance_certificate',
  'weight_certificate',
  'quality_certificate',
  'phytosanitary_certificate',
  'fumigation_certificate',
  'draft_bill_of_exchange',
  'warehouse_receipt',
  'airway_bill',
  'multimodal_transport_document'
]);
export type DocumentType = z.infer<typeof DocumentType>;

// lc_analyze_structure
export const LcStructureInputSchema = z.object({
  lcType: LcType,
  paymentTerms: PaymentTerms,
  usanceDays: z.number().min(0).max(360).optional(),
  issuingBank: z.string().min(1),
  confirmingBank: z.string().optional(),
  advisingBank: z.string().optional(),
  beneficiary: z.string().min(1),
  applicant: z.string().min(1),
  amount: z.number().positive(),
  currency: LcCurrency,
  commodity: CommoditySymbol.optional(),
  expiryDate: z.string(),
  latestShipDate: z.string().optional(),
  partialShipment: z.enum(['allowed', 'prohibited']).default('allowed'),
  transhipment: z.enum(['allowed', 'prohibited']).default('allowed'),
  incoterms: Incoterms.optional()
});
export type LcStructureInput = z.infer<typeof LcStructureInputSchema>;

export interface LcStructureOutput {
  classification: {
    lcType: string;
    paymentTerms: string;
    isConfirmed: boolean;
    isTransferable: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  timeline: {
    issuanceToExpiry: number;
    shipmentToExpiry: number;
    paymentDays: number;
    presentationDeadline: string;
  };
  structuralRisk: {
    score: number;
    level: 'low' | 'moderate' | 'elevated' | 'high';
    factors: string[];
  };
  termAnalysis: {
    partialShipmentRisk: string;
    transhipmentRisk: string;
    incotermsImplications: string | null;
    usanceRisk: string | null;
  };
  redFlags: string[];
  recommendation: string;
  dataFreshness: string;
}

// lc_check_documentary_compliance
export const LcDocumentaryInputSchema = z.object({
  documents: z.array(z.object({
    type: DocumentType,
    presented: z.boolean(),
    copies: z.number().min(0).default(1),
    originals: z.number().min(0).default(0),
    issuedDate: z.string().optional(),
    issuedBy: z.string().optional()
  })),
  lcRequirements: z.object({
    requiredDocs: z.array(z.string()),
    presentationDays: z.number().min(1).max(30).default(21),
    latestShipDate: z.string(),
    expiryDate: z.string(),
    expiryPlace: z.string()
  }),
  shipmentDate: z.string().optional()
});
export type LcDocumentaryInput = z.infer<typeof LcDocumentaryInputSchema>;

export interface DocumentComplianceResult {
  documentType: string;
  ucpArticle: string;
  status: 'compliant' | 'non_compliant' | 'warning' | 'not_presented';
  issues: string[];
  requirements: string[];
}

export interface LcDocumentaryOutput {
  overallCompliance: {
    status: 'compliant' | 'discrepant' | 'incomplete';
    complianceScore: number;
    criticalIssues: number;
    warnings: number;
  };
  documentResults: DocumentComplianceResult[];
  timingAnalysis: {
    presentationDeadline: string;
    daysRemaining: number;
    shipmentCompliance: 'on_time' | 'late' | 'unknown';
    staleDocs: string[];
  };
  missingDocuments: string[];
  ucpArticlesApplied: string[];
  recommendation: string;
  dataFreshness: string;
}

// lc_assess_counterparty_risk
export const LcCounterpartyInputSchema = z.object({
  issuingBank: z.object({
    name: z.string().min(1),
    swiftCode: z.string().optional(),
    country: z.string().min(2)
  }),
  confirmingBank: z.object({
    name: z.string().min(1),
    swiftCode: z.string().optional(),
    country: z.string().min(2)
  }).optional(),
  amount: z.number().positive(),
  currency: LcCurrency,
  tenorDays: z.number().min(0).max(360).default(0)
});
export type LcCounterpartyInput = z.infer<typeof LcCounterpartyInputSchema>;

export interface BankAssessment {
  name: string;
  country: string;
  creditRating: string | null;
  ratingAgency: string | null;
  riskTier: 'prime' | 'investment_grade' | 'sub_investment' | 'speculative' | 'unrated';
  tradeFinanceCapability: 'strong' | 'adequate' | 'limited' | 'unknown';
}

export interface CountryRiskAssessment {
  country: string;
  oecdCategory: number;
  politicalRisk: 'low' | 'moderate' | 'elevated' | 'high';
  transferRisk: 'low' | 'moderate' | 'elevated' | 'high';
  sovereignCeiling: string | null;
}

export interface LcCounterpartyOutput {
  issuingBankAssessment: BankAssessment;
  confirmingBankAssessment: BankAssessment | null;
  countryRisk: {
    issuingCountry: CountryRiskAssessment;
    confirmingCountry: CountryRiskAssessment | null;
  };
  overallRisk: {
    score: number;
    level: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
    primaryConcerns: string[];
  };
  confirmationAnalysis: {
    recommended: boolean;
    rationale: string;
    estimatedCostBps: number;
  };
  recommendation: string;
  dataFreshness: string;
}

// lc_detect_discrepancies
export const LcDiscrepancyInputSchema = z.object({
  lcDetails: z.object({
    beneficiaryName: z.string(),
    applicantName: z.string(),
    goodsDescription: z.string(),
    amount: z.number(),
    currency: z.string(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    shipmentTerms: z.string().optional(),
    portOfLoading: z.string().optional(),
    portOfDischarge: z.string().optional()
  }),
  documents: z.array(z.object({
    type: z.string(),
    beneficiaryName: z.string().optional(),
    applicantName: z.string().optional(),
    goodsDescription: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    quantity: z.number().optional(),
    dateIssued: z.string().optional(),
    portOfLoading: z.string().optional(),
    portOfDischarge: z.string().optional(),
    additionalDetails: z.record(z.string()).optional()
  }))
});
export type LcDiscrepancyInput = z.infer<typeof LcDiscrepancyInputSchema>;

export interface Discrepancy {
  id: string;
  category: string;
  documentType: string;
  field: string;
  lcValue: string;
  documentValue: string;
  severity: 'critical' | 'major' | 'minor';
  ucpReference: string | null;
  remediation: string;
}

export interface LcDiscrepancyOutput {
  summary: {
    totalDiscrepancies: number;
    critical: number;
    major: number;
    minor: number;
    rejectionProbability: 'low' | 'moderate' | 'high' | 'certain';
  };
  discrepancies: Discrepancy[];
  byCategory: Record<string, number>;
  remediationPriority: string[];
  recommendation: string;
  dataFreshness: string;
}

// lc_check_eucp_compliance
export const LcEucpInputSchema = z.object({
  electronicRecords: z.array(z.object({
    type: z.string(),
    format: z.enum(['pdf', 'xml', 'json', 'edifact', 'blockchain_hash', 'image']),
    signatureType: z.enum(['digital_signature', 'electronic_seal', 'blockchain_attestation', 'none']).optional(),
    hashAlgorithm: z.string().optional(),
    timestamp: z.string().optional(),
    issuerIdentity: z.string().optional(),
    verifiable: z.boolean().default(false)
  })),
  platformType: z.enum(['proprietary', 'consortium', 'public_blockchain', 'hybrid']).optional(),
  mletrJurisdictions: z.array(z.string()).optional(),
  presentationMethod: z.enum(['swift', 'platform', 'blockchain', 'email']).default('swift')
});
export type LcEucpInput = z.infer<typeof LcEucpInputSchema>;

export interface EucpArticleCompliance {
  article: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'warning';
  issues: string[];
}

export interface LcEucpOutput {
  overallCompliance: {
    eucpCompliant: boolean;
    mletrRecognized: boolean;
    complianceScore: number;
  };
  articleCompliance: EucpArticleCompliance[];
  electronicSignatures: {
    allSigned: boolean;
    signatureTypes: string[];
    validationStatus: 'verified' | 'unverified' | 'invalid' | 'mixed';
  };
  platformAssessment: {
    type: string | null;
    interoperability: 'high' | 'moderate' | 'low' | 'unknown';
    risks: string[];
  };
  jurisdictionAnalysis: {
    mletrAdopted: string[];
    mletrPending: string[];
    noRecognition: string[];
  };
  recommendation: string;
  dataFreshness: string;
}

// lc_calculate_pricing
export const LcPricingInputSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  tenorDays: z.number().min(0).max(360).default(0),
  isConfirmed: z.boolean().default(false),
  issuingBankRisk: z.enum(['prime', 'investment_grade', 'sub_investment', 'unrated']).default('investment_grade'),
  countryRiskCategory: z.number().min(0).max(7).default(0),
  discountingRequested: z.boolean().default(false),
  referenceRate: z.enum(['SOFR', 'EURIBOR', 'SONIA']).default('SOFR'),
  commodity: CommoditySymbol.optional()
});
export type LcPricingInput = z.infer<typeof LcPricingInputSchema>;

export interface LcPricingOutput {
  fees: {
    issuanceFee: { bps: number; amount: number };
    advisingFee: { bps: number; amount: number };
    confirmationFee: { bps: number; amount: number } | null;
    amendmentFee: { flat: number };
    negotiationFee: { bps: number; amount: number };
  };
  discounting: {
    available: boolean;
    referenceRate: string;
    currentRate: number;
    spread: number;
    allInRate: number;
    discountAmount: number;
    netProceeds: number;
  } | null;
  totalCost: {
    upfrontFees: number;
    financingCost: number;
    allInCost: number;
    effectiveAnnualRate: number;
  };
  benchmark: {
    marketRange: { low: number; high: number };
    position: 'below_market' | 'at_market' | 'above_market';
  };
  recommendation: string;
  dataFreshness: string;
}
