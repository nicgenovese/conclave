import type { LcStructureInput, LcStructureOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';

interface LcStructureContext {
  cache: CacheManager;
}

// LC type risk weights
const LC_TYPE_RISK: Record<string, number> = {
  irrevocable: 0,
  revocable: 30, // Rarely used, higher risk
  confirmed: -10, // Lower risk due to confirmation
  unconfirmed: 5,
  standby: 5,
  transferable: 15, // Complexity adds risk
  back_to_back: 20, // Higher complexity
  red_clause: 25, // Pre-shipment financing risk
  green_clause: 20 // Warehouse financing risk
};

// Payment terms risk weights
const PAYMENT_RISK: Record<string, number> = {
  sight: 0,
  usance: 10, // Extended payment = extended risk
  deferred: 15,
  acceptance: 10,
  negotiation: 5
};

export async function handleLcStructure(
  input: LcStructureInput,
  ctx: LcStructureContext
): Promise<LcStructureOutput> {
  const cacheKey = ctx.cache.generateKey('lcStructure', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcStructureOutput>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const expiryDate = new Date(input.expiryDate);
  const shipmentDate = input.latestShipDate ? new Date(input.latestShipDate) : null;

  // Calculate timelines
  const issuanceToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const shipmentToExpiry = shipmentDate
    ? Math.ceil((expiryDate.getTime() - shipmentDate.getTime()) / (1000 * 60 * 60 * 24))
    : issuanceToExpiry;
  const paymentDays = input.paymentTerms === 'sight' ? 0 : (input.usanceDays || 0);

  // Calculate presentation deadline
  const presentationDeadline = shipmentDate
    ? new Date(shipmentDate.getTime() + 21 * 24 * 60 * 60 * 1000)
    : expiryDate;

  // Determine classification
  const isConfirmed = input.lcType === 'confirmed' || !!input.confirmingBank;
  const isTransferable = input.lcType === 'transferable';

  // Assess complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (isTransferable || input.lcType === 'back_to_back' || input.lcType === 'red_clause') {
    complexity = 'complex';
  } else if (input.paymentTerms !== 'sight' || !isConfirmed || input.partialShipment === 'allowed') {
    complexity = 'moderate';
  }

  // Calculate structural risk score
  let riskScore = 30; // Base score
  riskScore += LC_TYPE_RISK[input.lcType] || 0;
  riskScore += PAYMENT_RISK[input.paymentTerms] || 0;

  // Adjust for confirmation
  if (isConfirmed) riskScore -= 10;

  // Adjust for tenor
  if (paymentDays > 90) riskScore += 10;
  if (paymentDays > 180) riskScore += 15;

  // Adjust for timeline
  if (issuanceToExpiry < 30) riskScore += 10; // Tight timeline
  if (shipmentToExpiry < 14) riskScore += 15; // Very tight presentation window

  // Adjust for amount (larger = more risk)
  if (input.amount >= 10000000) riskScore += 10;
  else if (input.amount >= 1000000) riskScore += 5;

  // Normalize score
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Risk factors
  const riskFactors: string[] = [];
  if (input.lcType === 'revocable') {
    riskFactors.push('Revocable LC can be cancelled/modified without beneficiary consent');
  }
  if (!isConfirmed) {
    riskFactors.push('Unconfirmed LC relies solely on issuing bank obligation');
  }
  if (paymentDays > 90) {
    riskFactors.push(`Extended ${paymentDays}-day payment tenor increases exposure duration`);
  }
  if (issuanceToExpiry < 30) {
    riskFactors.push('Tight timeline may constrain document preparation');
  }
  if (input.lcType === 'red_clause') {
    riskFactors.push('Red clause advances create pre-shipment credit exposure');
  }
  if (input.lcType === 'transferable') {
    riskFactors.push('Transferable LC introduces secondary beneficiary complexity');
  }

  // Risk level
  let riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  if (riskScore <= 25) riskLevel = 'low';
  else if (riskScore <= 45) riskLevel = 'moderate';
  else if (riskScore <= 65) riskLevel = 'elevated';
  else riskLevel = 'high';

  // Term analysis
  const termAnalysis = {
    partialShipmentRisk: input.partialShipment === 'allowed'
      ? 'Partial shipments allowed - multiple presentations may be required'
      : 'Partial shipments prohibited - single complete shipment required',
    transhipmentRisk: input.transhipment === 'allowed'
      ? 'Transhipment allowed - routing flexibility available'
      : 'Transhipment prohibited - direct shipping required',
    incotermsImplications: input.incoterms
      ? getIncotermsImplications(input.incoterms)
      : null,
    usanceRisk: input.paymentTerms !== 'sight' && input.usanceDays
      ? `${input.usanceDays}-day usance creates deferred payment risk; issuing bank creditworthiness critical`
      : null
  };

  // Red flags
  const redFlags: string[] = [];
  if (input.lcType === 'revocable') {
    redFlags.push('CRITICAL: Revocable LC - can be cancelled without notice');
  }
  if (issuanceToExpiry < 14) {
    redFlags.push('CRITICAL: Less than 14 days to expiry - high risk of late presentation');
  }
  if (shipmentToExpiry < 7) {
    redFlags.push('WARNING: Less than 7 days between shipment and expiry - tight presentation window');
  }
  if (paymentDays > 180 && !isConfirmed) {
    redFlags.push('WARNING: Long tenor (>180 days) without confirmation increases issuing bank exposure');
  }
  if (input.lcType === 'back_to_back' && !input.confirmingBank) {
    redFlags.push('WARNING: Back-to-back LC without confirmation adds complexity risk');
  }

  // Generate recommendation
  let recommendation: string;
  if (riskLevel === 'low') {
    recommendation = 'LC structure is straightforward with manageable risk. Standard processing recommended.';
  } else if (riskLevel === 'moderate') {
    recommendation = 'LC has moderate complexity. Ensure careful document preparation and monitor timelines.';
  } else if (riskLevel === 'elevated') {
    recommendation = 'Elevated structural risk. Consider requesting confirmation and reviewing all terms with care.';
  } else {
    recommendation = 'High structural risk. Strongly recommend LC amendment or confirmation before proceeding.';
  }

  const result: LcStructureOutput = {
    classification: {
      lcType: input.lcType,
      paymentTerms: input.paymentTerms,
      isConfirmed,
      isTransferable,
      complexity
    },
    timeline: {
      issuanceToExpiry,
      shipmentToExpiry,
      paymentDays,
      presentationDeadline: presentationDeadline.toISOString().split('T')[0]
    },
    structuralRisk: {
      score: riskScore,
      level: riskLevel,
      factors: riskFactors
    },
    termAnalysis,
    redFlags,
    recommendation,
    dataFreshness: now.toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcStructure');
  return result;
}

function getIncotermsImplications(incoterm: string): string {
  const implications: Record<string, string> = {
    FOB: 'FOB: Risk transfers at port of loading. Buyer arranges/pays freight and insurance.',
    CIF: 'CIF: Seller arranges freight and insurance to destination. Risk transfers at port of loading.',
    CFR: 'CFR: Seller pays freight; buyer arranges insurance. Risk transfers at port of loading.',
    EXW: 'EXW: Maximum buyer responsibility. Risk transfers at seller\'s premises.',
    DDP: 'DDP: Maximum seller responsibility including duties. Risk transfers at destination.',
    DAP: 'DAP: Seller delivers to destination; buyer handles import clearance.',
    FCA: 'FCA: Risk transfers when goods delivered to carrier. Flexible for multimodal.',
    CPT: 'CPT: Seller pays carriage; risk transfers at first carrier.',
    CIP: 'CIP: Seller pays carriage and insurance; risk transfers at first carrier.',
    FAS: 'FAS: Risk transfers when goods placed alongside vessel.'
  };
  return implications[incoterm] || `${incoterm}: Review specific obligations per Incoterms 2020.`;
}
