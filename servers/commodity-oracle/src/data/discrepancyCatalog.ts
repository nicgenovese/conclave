// LC Documentary Discrepancy Catalog
// Common discrepancies in trade finance documentary credits

export interface DiscrepancyPattern {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  ucpReference: string | null;
  commonCauses: string[];
  remediation: string;
  rejectionLikelihood: 'high' | 'medium' | 'low';
}

export const DISCREPANCY_CATEGORIES = [
  'name_address',
  'goods_description',
  'amount_currency',
  'date_timing',
  'transport_document',
  'insurance',
  'missing_document',
  'format_signature'
] as const;

export type DiscrepancyCategory = typeof DISCREPANCY_CATEGORIES[number];

export const DISCREPANCY_PATTERNS: DiscrepancyPattern[] = [
  // Name/Address Discrepancies
  {
    id: 'NAME001',
    category: 'name_address',
    description: 'Beneficiary name differs between LC and documents',
    severity: 'critical',
    ucpReference: 'Article 14(d)',
    commonCauses: [
      'Typographical errors',
      'Legal name vs trading name',
      'Incomplete name on documents'
    ],
    remediation: 'Request amendment to LC or correct documents to match exactly',
    rejectionLikelihood: 'high'
  },
  {
    id: 'NAME002',
    category: 'name_address',
    description: 'Applicant name/address inconsistent across documents',
    severity: 'major',
    ucpReference: 'Article 14(d)',
    commonCauses: [
      'Different addresses used (HQ vs branch)',
      'Abbreviated names',
      'Missing country'
    ],
    remediation: 'Ensure all documents reflect identical applicant details as per LC',
    rejectionLikelihood: 'medium'
  },
  {
    id: 'NAME003',
    category: 'name_address',
    description: 'Consignee/notify party details differ from LC terms',
    severity: 'major',
    ucpReference: 'Article 20',
    commonCauses: [
      'Different notify party on B/L',
      'Consignee format incorrect',
      'Missing or incorrect contact details'
    ],
    remediation: 'Amend transport document or request LC amendment',
    rejectionLikelihood: 'medium'
  },

  // Goods Description Discrepancies
  {
    id: 'GOODS001',
    category: 'goods_description',
    description: 'Goods description on invoice differs from LC',
    severity: 'critical',
    ucpReference: 'Article 18(c)',
    commonCauses: [
      'Additional descriptive text added',
      'Different product codes/specifications',
      'Abbreviated descriptions'
    ],
    remediation: 'Invoice must correspond exactly to LC description; amend invoice or LC',
    rejectionLikelihood: 'high'
  },
  {
    id: 'GOODS002',
    category: 'goods_description',
    description: 'Goods description on other documents inconsistent with invoice',
    severity: 'major',
    ucpReference: 'Article 14(d)',
    commonCauses: [
      'Generic description on B/L',
      'Technical specs differ between docs',
      'HS codes mismatch'
    ],
    remediation: 'Other docs need not match exactly but must not conflict with invoice',
    rejectionLikelihood: 'medium'
  },
  {
    id: 'GOODS003',
    category: 'goods_description',
    description: 'Quantity differs from LC or between documents',
    severity: 'critical',
    ucpReference: 'Article 30',
    commonCauses: [
      'Over/under shipment beyond tolerance',
      'Unit of measure mismatch',
      'Partial shipment when prohibited'
    ],
    remediation: 'Check if within UCP 600 Article 30 tolerance (+/- 5%)',
    rejectionLikelihood: 'high'
  },

  // Amount/Currency Discrepancies
  {
    id: 'AMT001',
    category: 'amount_currency',
    description: 'Invoice amount exceeds LC value',
    severity: 'critical',
    ucpReference: 'Article 18(b)',
    commonCauses: [
      'Shipping costs added to invoice',
      'Exchange rate fluctuation',
      'Quantity shipped exceeded LC quantity'
    ],
    remediation: 'Reduce invoice amount or request LC amendment for increase',
    rejectionLikelihood: 'high'
  },
  {
    id: 'AMT002',
    category: 'amount_currency',
    description: 'Currency differs from LC',
    severity: 'critical',
    ucpReference: 'Article 18(a)',
    commonCauses: [
      'Documents in local currency instead of LC currency',
      'Dual currency invoicing'
    ],
    remediation: 'All amounts must be in LC currency; re-issue documents',
    rejectionLikelihood: 'high'
  },
  {
    id: 'AMT003',
    category: 'amount_currency',
    description: 'Insurance amount insufficient (less than 110% CIF/CIP)',
    severity: 'major',
    ucpReference: 'Article 28(f)(ii)',
    commonCauses: [
      'Calculated on FOB instead of CIF value',
      'Currency conversion errors',
      'Minimum cover requirement missed'
    ],
    remediation: 'Request insurance certificate for at least 110% of CIF value',
    rejectionLikelihood: 'medium'
  },

  // Date/Timing Discrepancies
  {
    id: 'DATE001',
    category: 'date_timing',
    description: 'Documents presented after LC expiry date',
    severity: 'critical',
    ucpReference: 'Article 6(d)',
    commonCauses: [
      'Shipping delays',
      'Document preparation time underestimated',
      'Time zone confusion'
    ],
    remediation: 'Request LC expiry extension (amendment) if possible',
    rejectionLikelihood: 'high'
  },
  {
    id: 'DATE002',
    category: 'date_timing',
    description: 'Shipment date after latest allowed shipment date',
    severity: 'critical',
    ucpReference: 'Article 14(c)',
    commonCauses: [
      'Production delays',
      'Vessel schedule changes',
      'On board date incorrect'
    ],
    remediation: 'Cannot be remedied after fact; request LC amendment before shipment',
    rejectionLikelihood: 'high'
  },
  {
    id: 'DATE003',
    category: 'date_timing',
    description: 'Stale documents (presented more than 21 days after shipment)',
    severity: 'major',
    ucpReference: 'Article 14(c)',
    commonCauses: [
      'Slow document collection',
      'Courier delays',
      'Document corrections took time'
    ],
    remediation: 'Present documents within stipulated or default 21-day period',
    rejectionLikelihood: 'medium'
  },
  {
    id: 'DATE004',
    category: 'date_timing',
    description: 'Insurance dated after shipment date',
    severity: 'major',
    ucpReference: 'Article 28(e)',
    commonCauses: [
      'Insurance arranged after shipment',
      'Backdating not done',
      'Open cover certificate dated incorrectly'
    ],
    remediation: 'Insurance must be dated on or before shipment date',
    rejectionLikelihood: 'medium'
  },

  // Transport Document Discrepancies
  {
    id: 'TRAN001',
    category: 'transport_document',
    description: 'B/L not showing "shipped on board" or on board date',
    severity: 'critical',
    ucpReference: 'Article 20(a)(ii)',
    commonCauses: [
      'Received for shipment B/L without on board notation',
      'On board notation unsigned',
      'Date of on board notation missing'
    ],
    remediation: 'Request shipped on board B/L with dated notation',
    rejectionLikelihood: 'high'
  },
  {
    id: 'TRAN002',
    category: 'transport_document',
    description: 'Port of loading/discharge differs from LC',
    severity: 'critical',
    ucpReference: 'Article 20(a)(iii)',
    commonCauses: [
      'Vessel called at different port',
      'Port name spelled differently',
      'Range of ports vs specific port'
    ],
    remediation: 'Ports must match LC; amend B/L or request LC amendment',
    rejectionLikelihood: 'high'
  },
  {
    id: 'TRAN003',
    category: 'transport_document',
    description: 'Full set of original B/Ls not presented',
    severity: 'critical',
    ucpReference: 'Article 20(a)(iv)',
    commonCauses: [
      'B/L sent directly to applicant',
      'One original lost or missing',
      '3/3 required but only 2/3 presented'
    ],
    remediation: 'Present full set of originals as indicated on B/L',
    rejectionLikelihood: 'high'
  },
  {
    id: 'TRAN004',
    category: 'transport_document',
    description: 'B/L claused/unclean (indicates defective cargo)',
    severity: 'critical',
    ucpReference: 'Article 27',
    commonCauses: [
      'Cargo damage noted',
      'Packaging defects observed',
      'Quantity variance noted by carrier'
    ],
    remediation: 'Clean B/L required unless LC permits claused B/L',
    rejectionLikelihood: 'high'
  },
  {
    id: 'TRAN005',
    category: 'transport_document',
    description: 'Transhipment indicated when prohibited by LC',
    severity: 'major',
    ucpReference: 'Article 20(c)',
    commonCauses: [
      'Vessel route requires transhipment',
      'LC prohibits transhipment but occurs'
    ],
    remediation: 'Book direct vessel or request LC amendment to allow transhipment',
    rejectionLikelihood: 'medium'
  },

  // Insurance Discrepancies
  {
    id: 'INS001',
    category: 'insurance',
    description: 'Risks covered do not match LC requirements',
    severity: 'major',
    ucpReference: 'Article 28(g)',
    commonCauses: [
      'ICC clause type mismatch (A vs C)',
      'War/SRCC not included when required',
      'Institute Cargo Clauses not specified'
    ],
    remediation: 'Obtain insurance covering all risks specified in LC',
    rejectionLikelihood: 'medium'
  },
  {
    id: 'INS002',
    category: 'insurance',
    description: 'Cover note presented instead of policy/certificate',
    severity: 'major',
    ucpReference: 'Article 28(a)',
    commonCauses: [
      'Final policy not yet issued',
      'Open cover reference insufficient'
    ],
    remediation: 'Present insurance policy or certificate, not cover note',
    rejectionLikelihood: 'medium'
  },

  // Missing Document Discrepancies
  {
    id: 'MISS001',
    category: 'missing_document',
    description: 'Required document not presented',
    severity: 'critical',
    ucpReference: 'Article 14(a)',
    commonCauses: [
      'Document not obtained from issuing authority',
      'Document lost in transit',
      'Overlooked in presentation'
    ],
    remediation: 'Obtain and present missing document within presentation period',
    rejectionLikelihood: 'high'
  },
  {
    id: 'MISS002',
    category: 'missing_document',
    description: 'Insufficient copies/originals of document',
    severity: 'major',
    ucpReference: 'Article 17',
    commonCauses: [
      'LC requires multiple originals',
      'Copies required but not provided',
      'Originals presented instead of copies'
    ],
    remediation: 'Provide exact number of copies/originals as specified in LC',
    rejectionLikelihood: 'medium'
  },

  // Format/Signature Discrepancies
  {
    id: 'FMT001',
    category: 'format_signature',
    description: 'Document not signed as required',
    severity: 'major',
    ucpReference: 'Article 14(a)',
    commonCauses: [
      'Electronic signature not accepted',
      'Signatory authority unclear',
      'Stamp used instead of signature'
    ],
    remediation: 'Ensure documents signed by authorized party as per LC requirements',
    rejectionLikelihood: 'medium'
  },
  {
    id: 'FMT002',
    category: 'format_signature',
    description: 'Corrections/alterations not properly authenticated',
    severity: 'minor',
    ucpReference: 'Article 14',
    commonCauses: [
      'Manual corrections without counter-signature',
      'White-out used',
      'Unsigned amendments'
    ],
    remediation: 'All corrections must be authenticated by document issuer',
    rejectionLikelihood: 'low'
  }
];

// Severity to rejection probability mapping
export const SEVERITY_REJECTION_MAP: Record<string, number> = {
  critical: 0.9,
  major: 0.5,
  minor: 0.1
};

// Get discrepancy pattern by ID
export function getDiscrepancyPattern(id: string): DiscrepancyPattern | null {
  return DISCREPANCY_PATTERNS.find(p => p.id === id) || null;
}

// Get all patterns for a category
export function getPatternsByCategory(category: DiscrepancyCategory): DiscrepancyPattern[] {
  return DISCREPANCY_PATTERNS.filter(p => p.category === category);
}

// Calculate rejection probability from discrepancies
export function calculateRejectionProbability(
  discrepancies: Array<{ severity: 'critical' | 'major' | 'minor' }>
): { probability: number; level: 'low' | 'moderate' | 'high' | 'certain' } {
  if (discrepancies.length === 0) {
    return { probability: 0, level: 'low' };
  }

  // Any critical = likely rejection
  const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
  const majorCount = discrepancies.filter(d => d.severity === 'major').length;

  let probability: number;
  if (criticalCount > 0) {
    probability = Math.min(1, 0.9 + (criticalCount - 1) * 0.05);
  } else if (majorCount >= 2) {
    probability = 0.7 + majorCount * 0.05;
  } else if (majorCount === 1) {
    probability = 0.5;
  } else {
    probability = 0.1 * discrepancies.length;
  }

  probability = Math.min(1, probability);

  let level: 'low' | 'moderate' | 'high' | 'certain';
  if (probability >= 0.9) level = 'certain';
  else if (probability >= 0.6) level = 'high';
  else if (probability >= 0.3) level = 'moderate';
  else level = 'low';

  return { probability, level };
}
