// OECD Country Risk Classification Reference Data
// Based on OECD Arrangement on Officially Supported Export Credits
// Categories 0-7 (0 = lowest risk, 7 = highest risk)

export interface CountryRiskProfile {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  oecdCategory: number; // 0-7
  politicalRisk: 'low' | 'moderate' | 'elevated' | 'high';
  transferRisk: 'low' | 'moderate' | 'elevated' | 'high';
  sovereignCeiling: string | null; // S&P sovereign rating
  notes: string[];
}

// OECD Country Risk Classifications (representative sample)
// Note: Actual classifications should be verified with OECD
export const COUNTRY_RISK_PROFILES: Record<string, CountryRiskProfile> = {
  // Category 0 - High Income OECD
  'US': {
    code: 'US',
    name: 'United States',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AA+',
    notes: []
  },
  'GB': {
    code: 'GB',
    name: 'United Kingdom',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AA',
    notes: []
  },
  'DE': {
    code: 'DE',
    name: 'Germany',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AAA',
    notes: []
  },
  'FR': {
    code: 'FR',
    name: 'France',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AA',
    notes: []
  },
  'JP': {
    code: 'JP',
    name: 'Japan',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'A+',
    notes: []
  },
  'CH': {
    code: 'CH',
    name: 'Switzerland',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AAA',
    notes: []
  },
  'SG': {
    code: 'SG',
    name: 'Singapore',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AAA',
    notes: ['Major trade finance hub']
  },
  'AU': {
    code: 'AU',
    name: 'Australia',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AAA',
    notes: ['Major commodity exporter']
  },
  'NL': {
    code: 'NL',
    name: 'Netherlands',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AAA',
    notes: ['Major commodity trading hub']
  },
  'CA': {
    code: 'CA',
    name: 'Canada',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AAA',
    notes: ['Major commodity exporter']
  },
  // Category 1-2 - Strong Investment Grade
  'KR': {
    code: 'KR',
    name: 'South Korea',
    oecdCategory: 0,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AA',
    notes: []
  },
  'AE': {
    code: 'AE',
    name: 'United Arab Emirates',
    oecdCategory: 2,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'AA',
    notes: ['Dubai trade hub', 'Oil exporter']
  },
  'SA': {
    code: 'SA',
    name: 'Saudi Arabia',
    oecdCategory: 2,
    politicalRisk: 'moderate',
    transferRisk: 'low',
    sovereignCeiling: 'A',
    notes: ['Major oil exporter', 'Vision 2030 reforms']
  },
  'QA': {
    code: 'QA',
    name: 'Qatar',
    oecdCategory: 2,
    politicalRisk: 'moderate',
    transferRisk: 'low',
    sovereignCeiling: 'AA-',
    notes: ['Major LNG exporter']
  },
  // Category 3-4 - Moderate Risk
  'CN': {
    code: 'CN',
    name: 'China',
    oecdCategory: 2,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'A+',
    notes: ['Capital controls', 'Major commodity importer']
  },
  'MX': {
    code: 'MX',
    name: 'Mexico',
    oecdCategory: 3,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BBB',
    notes: ['Oil exporter', 'USMCA member']
  },
  'BR': {
    code: 'BR',
    name: 'Brazil',
    oecdCategory: 4,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BB-',
    notes: ['Major commodity exporter', 'Agricultural powerhouse']
  },
  'IN': {
    code: 'IN',
    name: 'India',
    oecdCategory: 3,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BBB-',
    notes: ['Major gold importer', 'Growing economy']
  },
  'ID': {
    code: 'ID',
    name: 'Indonesia',
    oecdCategory: 4,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BBB',
    notes: ['Commodity exporter', 'Palm oil, nickel']
  },
  'TH': {
    code: 'TH',
    name: 'Thailand',
    oecdCategory: 3,
    politicalRisk: 'moderate',
    transferRisk: 'low',
    sovereignCeiling: 'BBB+',
    notes: ['Manufacturing hub', 'Rice exporter']
  },
  'MY': {
    code: 'MY',
    name: 'Malaysia',
    oecdCategory: 2,
    politicalRisk: 'low',
    transferRisk: 'low',
    sovereignCeiling: 'A-',
    notes: ['Palm oil exporter', 'Electronics']
  },
  'VN': {
    code: 'VN',
    name: 'Vietnam',
    oecdCategory: 4,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BB+',
    notes: ['Growing manufacturing', 'Coffee, rice']
  },
  'PH': {
    code: 'PH',
    name: 'Philippines',
    oecdCategory: 3,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BBB+',
    notes: ['Remittance economy', 'Electronics']
  },
  // Category 5-6 - Elevated Risk
  'NG': {
    code: 'NG',
    name: 'Nigeria',
    oecdCategory: 6,
    politicalRisk: 'elevated',
    transferRisk: 'elevated',
    sovereignCeiling: 'B-',
    notes: ['Oil exporter', 'FX controls', 'Dollar shortage']
  },
  'ZA': {
    code: 'ZA',
    name: 'South Africa',
    oecdCategory: 4,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'BB-',
    notes: ['Mining sector', 'Infrastructure challenges']
  },
  'EG': {
    code: 'EG',
    name: 'Egypt',
    oecdCategory: 5,
    politicalRisk: 'elevated',
    transferRisk: 'elevated',
    sovereignCeiling: 'B',
    notes: ['Currency volatility', 'IMF program']
  },
  'TR': {
    code: 'TR',
    name: 'Turkey',
    oecdCategory: 5,
    politicalRisk: 'elevated',
    transferRisk: 'elevated',
    sovereignCeiling: 'B',
    notes: ['Currency volatility', 'High inflation']
  },
  'PK': {
    code: 'PK',
    name: 'Pakistan',
    oecdCategory: 6,
    politicalRisk: 'elevated',
    transferRisk: 'high',
    sovereignCeiling: 'CCC+',
    notes: ['IMF program', 'FX constraints']
  },
  'KE': {
    code: 'KE',
    name: 'Kenya',
    oecdCategory: 5,
    politicalRisk: 'moderate',
    transferRisk: 'moderate',
    sovereignCeiling: 'B',
    notes: ['Regional hub', 'Debt concerns']
  },
  'GH': {
    code: 'GH',
    name: 'Ghana',
    oecdCategory: 6,
    politicalRisk: 'elevated',
    transferRisk: 'high',
    sovereignCeiling: 'SD',
    notes: ['Debt restructuring', 'Gold, cocoa exporter']
  },
  // Category 7 - Highest Risk
  'AR': {
    code: 'AR',
    name: 'Argentina',
    oecdCategory: 7,
    politicalRisk: 'high',
    transferRisk: 'high',
    sovereignCeiling: 'CCC-',
    notes: ['Capital controls', 'High inflation', 'Debt issues']
  },
  'VE': {
    code: 'VE',
    name: 'Venezuela',
    oecdCategory: 7,
    politicalRisk: 'high',
    transferRisk: 'high',
    sovereignCeiling: 'SD',
    notes: ['Sanctions', 'Oil exporter', 'Economic crisis']
  },
  'RU': {
    code: 'RU',
    name: 'Russia',
    oecdCategory: 7,
    politicalRisk: 'high',
    transferRisk: 'high',
    sovereignCeiling: null,
    notes: ['Sanctions', 'Major commodity exporter']
  },
  'UA': {
    code: 'UA',
    name: 'Ukraine',
    oecdCategory: 7,
    politicalRisk: 'high',
    transferRisk: 'high',
    sovereignCeiling: 'CC',
    notes: ['Conflict', 'Agricultural exporter']
  },
  'IR': {
    code: 'IR',
    name: 'Iran',
    oecdCategory: 7,
    politicalRisk: 'high',
    transferRisk: 'high',
    sovereignCeiling: null,
    notes: ['Sanctions', 'Oil exporter']
  }
};

// Confirmation fee basis points by country risk category
export const CONFIRMATION_FEE_BPS: Record<number, { low: number; high: number }> = {
  0: { low: 10, high: 25 },
  1: { low: 20, high: 40 },
  2: { low: 30, high: 60 },
  3: { low: 50, high: 100 },
  4: { low: 75, high: 150 },
  5: { low: 125, high: 250 },
  6: { low: 200, high: 400 },
  7: { low: 350, high: 700 }
};

// Risk level derivation
export function deriveRiskLevel(oecdCategory: number): 'low' | 'moderate' | 'elevated' | 'high' {
  if (oecdCategory <= 1) return 'low';
  if (oecdCategory <= 3) return 'moderate';
  if (oecdCategory <= 5) return 'elevated';
  return 'high';
}

// Lookup function
export function getCountryRisk(countryCode: string): CountryRiskProfile | null {
  const code = countryCode.toUpperCase();
  return COUNTRY_RISK_PROFILES[code] || null;
}

// Get confirmation recommendation
export function shouldRecommendConfirmation(
  issuingCountryCategory: number,
  amount: number,
  tenorDays: number
): { recommended: boolean; rationale: string } {
  // High risk countries always recommend confirmation
  if (issuingCountryCategory >= 5) {
    return {
      recommended: true,
      rationale: `Country risk category ${issuingCountryCategory} indicates elevated transfer/convertibility risk`
    };
  }

  // Large amounts in moderate risk countries
  if (issuingCountryCategory >= 3 && amount >= 1000000) {
    return {
      recommended: true,
      rationale: 'Large transaction amount in moderate-risk jurisdiction warrants confirmation'
    };
  }

  // Long tenor in moderate risk
  if (issuingCountryCategory >= 3 && tenorDays >= 90) {
    return {
      recommended: true,
      rationale: 'Extended tenor increases exposure to country risk over time'
    };
  }

  // Low risk - optional
  if (issuingCountryCategory <= 2) {
    return {
      recommended: false,
      rationale: 'Low country risk; confirmation optional based on counterparty preference'
    };
  }

  return {
    recommended: false,
    rationale: 'Confirmation not strictly required but may provide additional security'
  };
}
