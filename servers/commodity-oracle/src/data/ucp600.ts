// UCP 600 Article Requirements Reference Data
// ICC Uniform Customs and Practice for Documentary Credits (2007 Revision)

export interface Ucp600Article {
  article: string;
  title: string;
  summary: string;
  documentTypes: string[];
  requirements: string[];
  commonDiscrepancies: string[];
}

export const UCP600_ARTICLES: Record<string, Ucp600Article> = {
  'art14': {
    article: 'Article 14',
    title: 'Standard for Examination of Documents',
    summary: 'Banks have 5 banking days to examine documents and determine compliance',
    documentTypes: ['all'],
    requirements: [
      'Documents must appear on their face to be consistent with terms of credit',
      'Documents must appear consistent with each other',
      'Data need not be identical but must not conflict',
      'Examination within 5 banking days following presentation'
    ],
    commonDiscrepancies: [
      'Inconsistent data between documents',
      'Documents not presented within examination period',
      'Non-documentary conditions ignored'
    ]
  },
  'art18': {
    article: 'Article 18',
    title: 'Commercial Invoice',
    summary: 'Commercial invoice requirements and compliance standards',
    documentTypes: ['commercial_invoice'],
    requirements: [
      'Must appear to be issued by beneficiary',
      'Must be made out in name of applicant',
      'Must be in same currency as credit',
      'Description of goods must correspond with credit description',
      'Need not be signed'
    ],
    commonDiscrepancies: [
      'Goods description differs from LC terms',
      'Invoice amount exceeds LC amount',
      'Invoice not in LC currency',
      'Beneficiary name mismatch',
      'Applicant name/address differs from LC'
    ]
  },
  'art19': {
    article: 'Article 19',
    title: 'Transport Document Covering at Least Two Modes',
    summary: 'Requirements for multimodal transport documents',
    documentTypes: ['multimodal_transport_document'],
    requirements: [
      'Must indicate name of carrier and be signed by carrier/master/agent',
      'Must indicate goods dispatched, taken in charge, or shipped on board',
      'Must indicate place of dispatch/taking in charge and destination',
      'Must be sole original or full set if issued in more than one original',
      'Must contain terms and conditions of carriage or reference thereto'
    ],
    commonDiscrepancies: [
      'Not signed by carrier or named agent',
      'Place of receipt/dispatch not as per LC',
      'Final destination not as per LC',
      'Not full set of originals'
    ]
  },
  'art20': {
    article: 'Article 20',
    title: 'Bill of Lading',
    summary: 'Requirements for bills of lading covering port-to-port shipment',
    documentTypes: ['bill_of_lading'],
    requirements: [
      'Must indicate name of carrier and be signed',
      'Must indicate goods shipped on board a named vessel at port of loading',
      'Must indicate port of loading and discharge as stipulated in credit',
      'Must be sole original or full set of originals',
      'Must contain terms and conditions or reference to charter party'
    ],
    commonDiscrepancies: [
      'On board notation missing or undated',
      'Port of loading/discharge differs from LC',
      'Vessel name not indicated',
      'Carrier not identified',
      'Not full set of originals',
      'Shipped on board date after latest shipment date'
    ]
  },
  'art21': {
    article: 'Article 21',
    title: 'Non-Negotiable Sea Waybill',
    summary: 'Requirements for non-negotiable sea waybills',
    documentTypes: ['bill_of_lading'],
    requirements: [
      'Must indicate name of carrier and be signed',
      'Must indicate goods shipped on board',
      'Must indicate port of loading and discharge',
      'Must be sole original'
    ],
    commonDiscrepancies: [
      'Missing on board notation',
      'Port mismatch',
      'Carrier not identified'
    ]
  },
  'art22': {
    article: 'Article 22',
    title: 'Charter Party Bill of Lading',
    summary: 'Requirements for charter party bills of lading',
    documentTypes: ['bill_of_lading'],
    requirements: [
      'May be signed by master, owner, charterer, or agent',
      'Must indicate it is subject to charter party',
      'Must indicate goods shipped on board',
      'Banks will not examine charter party contracts'
    ],
    commonDiscrepancies: [
      'Not indicating subject to charter party',
      'Signature not identifying capacity of signatory'
    ]
  },
  'art23': {
    article: 'Article 23',
    title: 'Air Transport Document',
    summary: 'Requirements for air waybills',
    documentTypes: ['airway_bill'],
    requirements: [
      'Must indicate name of carrier and be signed',
      'Must indicate airport of departure and destination',
      'Must indicate date of issuance (deemed flight date unless actual flight date shown)',
      'Must be original for consignor/shipper'
    ],
    commonDiscrepancies: [
      'Carrier not identified',
      'Airport of departure/destination mismatch',
      'Not original for shipper/consignor',
      'Flight date after latest shipment date'
    ]
  },
  'art26': {
    article: 'Article 26',
    title: '"On Deck", "Shipper\'s Load and Count", "Said by Shipper to Contain"',
    summary: 'Handling of qualifying clauses on transport documents',
    documentTypes: ['bill_of_lading', 'multimodal_transport_document'],
    requirements: [
      'On deck clause acceptable unless LC prohibits',
      'Shipper\'s load and count clauses acceptable',
      'Said to contain clauses acceptable',
      'These clauses do not render document discrepant'
    ],
    commonDiscrepancies: [
      'LC prohibits on deck shipment but B/L shows on deck',
      'Misinterpretation of qualifying clauses'
    ]
  },
  'art27': {
    article: 'Article 27',
    title: 'Clean Transport Document',
    summary: 'Definition and requirements for clean transport documents',
    documentTypes: ['bill_of_lading', 'airway_bill', 'multimodal_transport_document'],
    requirements: [
      'Must bear no clause declaring defective condition of goods or packaging',
      'Word "clean" need not appear on document',
      'Clauses not expressly declaring defective condition acceptable'
    ],
    commonDiscrepancies: [
      'Claused B/L indicating damaged goods/packaging',
      'Remarks indicating quantity/quality discrepancy'
    ]
  },
  'art28': {
    article: 'Article 28',
    title: 'Insurance Document and Coverage',
    summary: 'Requirements for insurance documents',
    documentTypes: ['insurance_certificate'],
    requirements: [
      'Must appear issued by insurers or underwriters or their agents',
      'Must indicate amount of coverage (minimum 110% CIF/CIP value)',
      'Must be in same currency as credit',
      'Must indicate risks covered',
      'Cover note not acceptable unless LC permits',
      'Must be dated on or before date of shipment'
    ],
    commonDiscrepancies: [
      'Insurance amount less than 110% of invoice value',
      'Insurance dated after shipment date',
      'Currency differs from LC currency',
      'Risks covered not as specified in LC',
      'Cover note presented instead of policy/certificate'
    ]
  },
  'art29': {
    article: 'Article 29',
    title: 'Extension of Expiry Date or Last Day for Presentation',
    summary: 'Automatic extension when expiry falls on non-banking day',
    documentTypes: ['all'],
    requirements: [
      'If expiry/presentation deadline falls on non-banking day, extended to next banking day',
      'Latest shipment date not extended',
      'Period for presentation runs from actual shipment date'
    ],
    commonDiscrepancies: [
      'Presentation after extended deadline',
      'Confusion between expiry extension and shipment date'
    ]
  },
  'art30': {
    article: 'Article 30',
    title: 'Tolerance in Credit Amount, Quantity and Unit Prices',
    summary: 'Allowable tolerances in LC quantities and amounts',
    documentTypes: ['commercial_invoice'],
    requirements: [
      '+/- 5% tolerance in quantity unless LC states quantity not to be exceeded/reduced',
      '+/- 5% tolerance does not apply when LC specifies quantity in packing units or individual items',
      'Credit amount may be exceeded by 5% if quantity shipped in full and unit price not reduced',
      '10% tolerance allowed for "about" or "approximately"'
    ],
    commonDiscrepancies: [
      'Quantity exceeds tolerance',
      'Amount exceeds LC maximum without justification',
      'Unit price variance not within tolerance'
    ]
  }
};

// Document type to applicable UCP articles mapping
export const DOCUMENT_UCP_MAPPING: Record<string, string[]> = {
  commercial_invoice: ['art14', 'art18', 'art30'],
  bill_of_lading: ['art14', 'art20', 'art21', 'art22', 'art26', 'art27'],
  packing_list: ['art14'],
  certificate_of_origin: ['art14'],
  inspection_certificate: ['art14'],
  insurance_certificate: ['art14', 'art28'],
  weight_certificate: ['art14'],
  quality_certificate: ['art14'],
  phytosanitary_certificate: ['art14'],
  fumigation_certificate: ['art14'],
  draft_bill_of_exchange: ['art14'],
  warehouse_receipt: ['art14'],
  airway_bill: ['art14', 'art23', 'art27'],
  multimodal_transport_document: ['art14', 'art19', 'art26', 'art27']
};

// Presentation timing rules
export const PRESENTATION_RULES = {
  maxPresentationDays: 21, // Default per UCP 600
  examinationDays: 5, // Banking days for bank examination
  staleDocumentDays: 21 // Documents dated more than 21 days after shipment
};
