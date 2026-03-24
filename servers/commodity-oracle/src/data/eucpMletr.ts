// eUCP v2.0 and MLETR Reference Data
// ICC Supplement to UCP 600 for Electronic Presentation
// UNCITRAL Model Law on Electronic Transferable Records

export interface EucpArticle {
  article: string;
  title: string;
  requirements: string[];
  complianceChecks: string[];
}

export const EUCP_ARTICLES: Record<string, EucpArticle> = {
  'e1': {
    article: 'e1',
    title: 'Scope of the eUCP',
    requirements: [
      'eUCP supplements UCP 600 for electronic presentation',
      'LC must indicate subject to eUCP',
      'Applicable when electronic records are presented'
    ],
    complianceChecks: [
      'LC explicitly states subject to eUCP',
      'Electronic presentation method specified'
    ]
  },
  'e2': {
    article: 'e2',
    title: 'Relationship of the eUCP to the UCP',
    requirements: [
      'UCP applies to electronic records where applicable',
      'eUCP prevails where UCP and eUCP conflict for electronic records'
    ],
    complianceChecks: [
      'UCP 600 terms satisfied for electronic records',
      'No conflict between UCP and eUCP interpretation'
    ]
  },
  'e3': {
    article: 'e3',
    title: 'Definitions',
    requirements: [
      'Electronic record defined as data created, stored, or transmitted electronically',
      'Format includes data structure (XML, PDF, etc.)',
      'Electronic signature includes any method of authentication'
    ],
    complianceChecks: [
      'Records are in accepted electronic format',
      'Format can be authenticated and verified'
    ]
  },
  'e4': {
    article: 'e4',
    title: 'Format',
    requirements: [
      'eLC must specify acceptable formats for electronic records',
      'If not specified, any format acceptable that can be authenticated',
      'Hybrid presentations (paper + electronic) permitted if LC allows'
    ],
    complianceChecks: [
      'Electronic records in format specified by LC',
      'If no format specified, records can be authenticated',
      'Hybrid presentation handling clear if applicable'
    ]
  },
  'e5': {
    article: 'e5',
    title: 'Presentation',
    requirements: [
      'Electronic records presented to data processing system address',
      'Presentation complete when electronic record is received',
      'If hyperlink provided, must be accessible and functional'
    ],
    complianceChecks: [
      'Records sent to specified presentation address',
      'Confirmation of receipt obtained',
      'All hyperlinks functional at time of examination'
    ]
  },
  'e6': {
    article: 'e6',
    title: 'Examination',
    requirements: [
      'Banks examine electronic records for apparent authenticity',
      'External hyperlinks examined only if link is to issuer\'s website',
      'Electronic signatures examined for apparent validity'
    ],
    complianceChecks: [
      'Electronic records appear authentic',
      'Signatures verifiable or apparently valid',
      'Data integrity maintained'
    ]
  },
  'e7': {
    article: 'e7',
    title: 'Notice of Refusal',
    requirements: [
      'Refusal notice may be sent electronically',
      'Must identify discrepancies in electronic records',
      'Electronic records may be held pending waiver'
    ],
    complianceChecks: [
      'Refusal mechanism for electronic records in place',
      'Discrepancy identification possible'
    ]
  },
  'e8': {
    article: 'e8',
    title: 'Originals and Copies',
    requirements: [
      'Electronic record can be presented as original if appears to be only transmission',
      'Multiple transmissions do not create copies unless different content',
      'LC must state if multiple electronic records required'
    ],
    complianceChecks: [
      'Original/copy distinction handled electronically',
      'Single transmission verified for original requirement',
      'Multiple record requirements met if specified'
    ]
  },
  'e9': {
    article: 'e9',
    title: 'Date of Issuance',
    requirements: [
      'Electronic record date is apparent date of creation',
      'If no date apparent, date of receipt by bank is issuance date'
    ],
    complianceChecks: [
      'Creation date/timestamp present',
      'Date verifiable from metadata or content'
    ]
  },
  'e10': {
    article: 'e10',
    title: 'Transport',
    requirements: [
      'Transport document may be electronic if LC permits',
      'Electronic transport document must indicate goods received/shipped',
      'Date of shipment can be in electronic record or metadata'
    ],
    complianceChecks: [
      'Electronic transport documents accepted per LC',
      'Shipment status clearly indicated',
      'Dates verifiable'
    ]
  },
  'e11': {
    article: 'e11',
    title: 'Corruption of an Electronic Record',
    requirements: [
      'If electronic record appears corrupted, bank may request re-presentation',
      'Re-presentation within original presentation period if possible'
    ],
    complianceChecks: [
      'Records readable and uncorrupted',
      'Integrity verification mechanisms in place'
    ]
  },
  'e12': {
    article: 'e12',
    title: 'Additional Disclaimer',
    requirements: [
      'Bank not liable for authenticity of electronic records',
      'Bank not responsible for delays in electronic transmission',
      'Bank may rely on apparent sender identification'
    ],
    complianceChecks: [
      'Sender identification apparent',
      'Transmission integrity acceptable'
    ]
  }
};

// MLETR Adopting Jurisdictions (as of 2024)
export interface MletrJurisdiction {
  country: string;
  code: string;
  status: 'adopted' | 'pending' | 'under_review' | 'not_adopted';
  effectiveDate: string | null;
  scope: string[];
  notes: string[];
}

export const MLETR_JURISDICTIONS: Record<string, MletrJurisdiction> = {
  'SG': {
    country: 'Singapore',
    code: 'SG',
    status: 'adopted',
    effectiveDate: '2021-03-19',
    scope: ['bills_of_lading', 'bills_of_exchange', 'warehouse_receipts', 'all_negotiable_instruments'],
    notes: ['Electronic Transactions Act amendments', 'Comprehensive adoption']
  },
  'BH': {
    country: 'Bahrain',
    code: 'BH',
    status: 'adopted',
    effectiveDate: '2022-01-01',
    scope: ['bills_of_lading', 'warehouse_receipts'],
    notes: ['Decree Law No. 39 of 2021']
  },
  'AE': {
    country: 'United Arab Emirates',
    code: 'AE',
    status: 'adopted',
    effectiveDate: '2023-01-02',
    scope: ['bills_of_lading', 'warehouse_receipts', 'delivery_orders'],
    notes: ['Federal Decree-Law No. 46 of 2021', 'Abu Dhabi Global Market adoption']
  },
  'GB': {
    country: 'United Kingdom',
    code: 'GB',
    status: 'adopted',
    effectiveDate: '2023-09-20',
    scope: ['bills_of_lading', 'bills_of_exchange', 'promissory_notes', 'warehouse_receipts'],
    notes: ['Electronic Trade Documents Act 2023', 'Comprehensive adoption']
  },
  'DE': {
    country: 'Germany',
    code: 'DE',
    status: 'pending',
    effectiveDate: null,
    scope: [],
    notes: ['Legislative process ongoing', 'Expected adoption']
  },
  'FR': {
    country: 'France',
    code: 'FR',
    status: 'pending',
    effectiveDate: null,
    scope: [],
    notes: ['Under consideration']
  },
  'US': {
    country: 'United States',
    code: 'US',
    status: 'under_review',
    effectiveDate: null,
    scope: [],
    notes: ['State-level adoption varies', 'UCC amendments being considered']
  },
  'CN': {
    country: 'China',
    code: 'CN',
    status: 'not_adopted',
    effectiveDate: null,
    scope: [],
    notes: ['Own electronic document framework']
  },
  'JP': {
    country: 'Japan',
    code: 'JP',
    status: 'pending',
    effectiveDate: null,
    scope: [],
    notes: ['Legislative review in progress']
  },
  'PG': {
    country: 'Papua New Guinea',
    code: 'PG',
    status: 'adopted',
    effectiveDate: '2020-11-01',
    scope: ['bills_of_lading'],
    notes: ['First MLETR adopter']
  },
  'KR': {
    country: 'South Korea',
    code: 'KR',
    status: 'pending',
    effectiveDate: null,
    scope: [],
    notes: ['Active consideration']
  }
};

// Digital signature types and their acceptance levels
export const SIGNATURE_ACCEPTANCE = {
  digital_signature: {
    type: 'PKI-based digital signature',
    acceptanceLevel: 'high',
    verifiable: true,
    notes: 'Cryptographically verifiable, widely accepted'
  },
  electronic_seal: {
    type: 'Electronic seal/stamp',
    acceptanceLevel: 'moderate',
    verifiable: true,
    notes: 'Acceptable in most jurisdictions'
  },
  blockchain_attestation: {
    type: 'Blockchain-based attestation',
    acceptanceLevel: 'varies',
    verifiable: true,
    notes: 'Acceptance depends on jurisdiction and platform'
  },
  none: {
    type: 'No electronic signature',
    acceptanceLevel: 'low',
    verifiable: false,
    notes: 'May be acceptable for non-critical documents'
  }
};

// Platform interoperability assessment
export const PLATFORM_INTEROPERABILITY = {
  proprietary: {
    interoperability: 'low',
    risks: [
      'Vendor lock-in',
      'Limited counterparty access',
      'Data portability concerns'
    ]
  },
  consortium: {
    interoperability: 'moderate',
    risks: [
      'Membership requirements',
      'Governance dependencies',
      'Standard evolution risk'
    ]
  },
  public_blockchain: {
    interoperability: 'moderate',
    risks: [
      'Regulatory uncertainty',
      'Network congestion',
      'Key management complexity'
    ]
  },
  hybrid: {
    interoperability: 'high',
    risks: [
      'Integration complexity',
      'Multiple point dependencies',
      'Coordination overhead'
    ]
  }
};

// Lookup functions
export function getMletrStatus(countryCode: string): MletrJurisdiction | null {
  return MLETR_JURISDICTIONS[countryCode.toUpperCase()] || null;
}

export function isJurisdictionMletrCompliant(countryCode: string): boolean {
  const jurisdiction = MLETR_JURISDICTIONS[countryCode.toUpperCase()];
  return jurisdiction?.status === 'adopted';
}

export function getEucpArticle(articleId: string): EucpArticle | null {
  return EUCP_ARTICLES[articleId.toLowerCase()] || null;
}
