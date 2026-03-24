// Major Trade Finance Bank Ratings Reference Data
// Static reference data for counterparty risk assessment

export interface BankProfile {
  name: string;
  aliases: string[];
  swiftCode: string;
  country: string;
  creditRating: string;
  ratingAgency: 'S&P' | 'Moodys' | 'Fitch';
  riskTier: 'prime' | 'investment_grade' | 'sub_investment' | 'speculative' | 'unrated';
  tradeFinanceCapability: 'strong' | 'adequate' | 'limited' | 'unknown';
  specializations: string[];
}

// Major global trade finance banks with indicative ratings
// Note: Actual ratings should be verified with rating agencies
export const BANK_PROFILES: BankProfile[] = [
  // Global Leaders
  {
    name: 'HSBC',
    aliases: ['HSBC Holdings', 'Hongkong and Shanghai Banking Corporation'],
    swiftCode: 'HSBCHKHH',
    country: 'GB',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['commodity_finance', 'emerging_markets', 'asia_pacific']
  },
  {
    name: 'Standard Chartered',
    aliases: ['Standard Chartered Bank', 'StanChart'],
    swiftCode: 'SCBLGB2L',
    country: 'GB',
    creditRating: 'A',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'strong',
    specializations: ['commodity_finance', 'africa', 'middle_east', 'asia']
  },
  {
    name: 'Citi',
    aliases: ['Citibank', 'Citigroup'],
    swiftCode: 'CITIUS33',
    country: 'US',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['global_trade', 'treasury', 'commodity_finance']
  },
  {
    name: 'JPMorgan Chase',
    aliases: ['JPMorgan', 'Chase', 'JP Morgan'],
    swiftCode: 'CHASUS33',
    country: 'US',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['structured_trade', 'commodity_finance', 'investment_grade']
  },
  {
    name: 'BNP Paribas',
    aliases: ['BNPP'],
    swiftCode: 'BNPAFRPP',
    country: 'FR',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['commodity_finance', 'energy', 'metals']
  },
  {
    name: 'Deutsche Bank',
    aliases: ['DB'],
    swiftCode: 'DEUTDEFF',
    country: 'DE',
    creditRating: 'A-',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'strong',
    specializations: ['structured_trade', 'europe', 'commodity_finance']
  },
  {
    name: 'ING',
    aliases: ['ING Bank', 'ING Group'],
    swiftCode: 'INGBNL2A',
    country: 'NL',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['commodity_finance', 'energy', 'sustainable_trade']
  },
  {
    name: 'Societe Generale',
    aliases: ['SocGen', 'SG'],
    swiftCode: 'SOGEFRPP',
    country: 'FR',
    creditRating: 'A',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'strong',
    specializations: ['commodity_finance', 'africa', 'structured_trade']
  },
  {
    name: 'Credit Agricole',
    aliases: ['CA-CIB', 'CACIB'],
    swiftCode: 'AGRIFRPP',
    country: 'FR',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['agriculture', 'commodity_finance', 'export_finance']
  },
  {
    name: 'UBS',
    aliases: ['UBS AG', 'UBS Group'],
    swiftCode: 'UBSWCHZH',
    country: 'CH',
    creditRating: 'A+',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'adequate',
    specializations: ['precious_metals', 'commodity_backed', 'wealth']
  },
  {
    name: 'Credit Suisse',
    aliases: ['CS'],
    swiftCode: 'CRESCHZZ',
    country: 'CH',
    creditRating: 'BBB+',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'adequate',
    specializations: ['commodity_finance', 'structured_trade']
  },
  // Asian Banks
  {
    name: 'DBS Bank',
    aliases: ['DBS', 'Development Bank of Singapore'],
    swiftCode: 'DBSSSGSG',
    country: 'SG',
    creditRating: 'AA-',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['asia_pacific', 'commodity_finance', 'digital_trade']
  },
  {
    name: 'OCBC',
    aliases: ['Oversea-Chinese Banking Corporation'],
    swiftCode: 'OCBCSGSG',
    country: 'SG',
    creditRating: 'AA-',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['asia_pacific', 'sme_trade']
  },
  {
    name: 'Bank of China',
    aliases: ['BOC'],
    swiftCode: 'BKCHCNBJ',
    country: 'CN',
    creditRating: 'A',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'strong',
    specializations: ['china_trade', 'belt_road', 'commodity_finance']
  },
  {
    name: 'ICBC',
    aliases: ['Industrial and Commercial Bank of China'],
    swiftCode: 'ICBKCNBJ',
    country: 'CN',
    creditRating: 'A',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'strong',
    specializations: ['china_trade', 'infrastructure', 'commodity_finance']
  },
  {
    name: 'MUFG',
    aliases: ['Mitsubishi UFJ', 'BTMU', 'Bank of Tokyo-Mitsubishi UFJ'],
    swiftCode: 'BOLOFRPP',
    country: 'JP',
    creditRating: 'A',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'strong',
    specializations: ['asia_pacific', 'project_finance', 'commodity_finance']
  },
  {
    name: 'Mizuho',
    aliases: ['Mizuho Bank', 'Mizuho Financial Group'],
    swiftCode: 'MHCBJPJT',
    country: 'JP',
    creditRating: 'A',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'adequate',
    specializations: ['asia_pacific', 'project_finance']
  },
  // Middle East
  {
    name: 'Emirates NBD',
    aliases: ['ENBD'],
    swiftCode: 'EABORAGE',
    country: 'AE',
    creditRating: 'BBB+',
    ratingAgency: 'S&P',
    riskTier: 'investment_grade',
    tradeFinanceCapability: 'adequate',
    specializations: ['middle_east', 'commodity_finance', 'islamic_trade']
  },
  {
    name: 'First Abu Dhabi Bank',
    aliases: ['FAB', 'NBAD'],
    swiftCode: 'NBADORX',
    country: 'AE',
    creditRating: 'AA-',
    ratingAgency: 'S&P',
    riskTier: 'prime',
    tradeFinanceCapability: 'strong',
    specializations: ['middle_east', 'energy', 'commodity_finance']
  }
];

// Rating tier classification
export const RATING_TIERS: Record<string, 'prime' | 'investment_grade' | 'sub_investment' | 'speculative'> = {
  // S&P / Fitch scale
  'AAA': 'prime',
  'AA+': 'prime',
  'AA': 'prime',
  'AA-': 'prime',
  'A+': 'prime',
  'A': 'investment_grade',
  'A-': 'investment_grade',
  'BBB+': 'investment_grade',
  'BBB': 'investment_grade',
  'BBB-': 'investment_grade',
  'BB+': 'sub_investment',
  'BB': 'sub_investment',
  'BB-': 'sub_investment',
  'B+': 'speculative',
  'B': 'speculative',
  'B-': 'speculative',
  'CCC+': 'speculative',
  'CCC': 'speculative',
  'CCC-': 'speculative',
  'CC': 'speculative',
  'C': 'speculative',
  'D': 'speculative',
  // Moody's scale mapping
  'Aaa': 'prime',
  'Aa1': 'prime',
  'Aa2': 'prime',
  'Aa3': 'prime',
  'A1': 'prime',
  'A2': 'investment_grade',
  'A3': 'investment_grade',
  'Baa1': 'investment_grade',
  'Baa2': 'investment_grade',
  'Baa3': 'investment_grade',
  'Ba1': 'sub_investment',
  'Ba2': 'sub_investment',
  'Ba3': 'sub_investment',
  'B1': 'speculative',
  'B2': 'speculative',
  'B3': 'speculative'
};

// Lookup function
export function findBankProfile(nameOrSwift: string): BankProfile | null {
  const searchTerm = nameOrSwift.toUpperCase();
  return BANK_PROFILES.find(bank =>
    bank.name.toUpperCase() === searchTerm ||
    bank.swiftCode === searchTerm ||
    bank.aliases.some(alias => alias.toUpperCase() === searchTerm)
  ) || null;
}

export function getRiskTierFromRating(rating: string): 'prime' | 'investment_grade' | 'sub_investment' | 'speculative' | 'unrated' {
  return RATING_TIERS[rating] || 'unrated';
}
