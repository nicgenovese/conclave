import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

// Token contract addresses
// Only includes tokens with verified mainnet contracts
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    PAXG: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
    XAUT: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
    DGX: '0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF'
    // Note: CGLD and PMGT removed - no verified mainnet contracts
  },
  polygon: {
    PAXG: '0x553d3D295e0f695B9228246232eDF400ed3560B5'
  }
};

// Token decimals (queried once, cached)
const TOKEN_DECIMALS: Record<string, number> = {
  PAXG: 18,
  XAUT: 6,  // Tether Gold uses 6 decimals
  DGX: 9    // Digix uses 9 decimals
};

// Issuer information
const ISSUER_INFO: Record<string, {
  name: string;
  regulator: string;
  jurisdiction: string;
  custodian: string;
  vaultLocation: string;
  auditor: string;
  auditFrequency: string;
  perTokenOunces: number;
  commodity: string;
}> = {
  PAXG: {
    name: 'Paxos Trust Company',
    regulator: 'NYDFS',
    jurisdiction: 'United States',
    custodian: 'Brink\'s',
    vaultLocation: 'London LBMA vaults',
    auditor: 'Withum',
    auditFrequency: 'Monthly',
    perTokenOunces: 1,
    commodity: 'Gold (LBMA Good Delivery)'
  },
  XAUT: {
    name: 'Tether Gold',
    regulator: 'Unregulated',
    jurisdiction: 'British Virgin Islands',
    custodian: 'Multiple Swiss vaults',
    vaultLocation: 'Switzerland',
    auditor: 'Independent',
    auditFrequency: 'Quarterly',
    perTokenOunces: 1,
    commodity: 'Gold (LBMA Good Delivery)'
  },
  DGX: {
    name: 'Digix Global',
    regulator: 'Unregulated',
    jurisdiction: 'Singapore',
    custodian: 'The Safe House',
    vaultLocation: 'Singapore',
    auditor: 'Bureau Veritas',
    auditFrequency: 'Quarterly',
    perTokenOunces: 0.0321507466, // 1 DGX = 1 gram = 0.0321507466 troy oz
    commodity: 'Gold (99.99% pure)'
  }
};

interface TokenSupplyData {
  totalSupply: number;
  decimals: number;
}

interface DefiLlamaTokenResponse {
  coins: Record<string, {
    price: number;
    symbol: string;
    timestamp: number;
    confidence: number;
  }>;
}

export class ReservesClient {
  private etherscanApiKey: string;
  private rateLimiterEtherscan = new RateLimiter('etherscan');
  private rateLimiterDefillama = new RateLimiter('defillama');

  constructor() {
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY || '';
    if (!this.etherscanApiKey) {
      console.error('Warning: ETHERSCAN_API_KEY not set - supply queries may fail');
    }
  }

  async getTokenSupply(
    token: string,
    chain: string = 'ethereum'
  ): Promise<TokenSupplyData> {
    const address = TOKEN_ADDRESSES[chain]?.[token];
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Token ${token} not supported on ${chain}`);
    }

    return withRetry(async () => {
      await this.rateLimiterEtherscan.throttle();

      // Get total supply via Etherscan API
      const url = `https://api.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${address}&apikey=${this.etherscanApiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }

      const data = await response.json() as {
        status: string;
        result: string;
        message: string;
      };

      if (data.status !== '1') {
        throw new Error(`Etherscan error: ${data.message}`);
      }

      // Use known decimals for supported tokens
      const decimals = TOKEN_DECIMALS[token] ?? 18;
      const totalSupply = Number(data.result) / Math.pow(10, decimals);

      return { totalSupply, decimals };
    });
  }

  async getTokenPrice(token: string, chain: string = 'ethereum'): Promise<number> {
    const address = TOKEN_ADDRESSES[chain]?.[token];
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Token ${token} not supported on ${chain}`);
    }

    return withRetry(async () => {
      await this.rateLimiterDefillama.throttle();

      const url = `https://coins.llama.fi/prices/current/${chain}:${address}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`DefiLlama API error: ${response.status}`);
      }

      const data = await response.json() as DefiLlamaTokenResponse;
      const key = `${chain}:${address}`.toLowerCase();
      const tokenData = data.coins[key];

      if (!tokenData) {
        throw new Error(`No price data for ${token}`);
      }

      return tokenData.price;
    });
  }

  getIssuerInfo(token: string): {
    name: string;
    regulator: string;
    jurisdiction: string;
    custodian: string;
    vaultLocation: string;
    auditor: string;
    auditFrequency: string;
    perTokenOunces: number;
    commodity: string;
  } | null {
    return ISSUER_INFO[token] || null;
  }

  getTokenAddress(token: string, chain: string = 'ethereum'): string | null {
    const address = TOKEN_ADDRESSES[chain]?.[token];
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return address;
  }

  isSupported(token: string, chain: string = 'ethereum'): boolean {
    const address = TOKEN_ADDRESSES[chain]?.[token];
    return !!address && address !== '0x0000000000000000000000000000000000000000';
  }

  getSupportedTokens(chain: string = 'ethereum'): string[] {
    const tokens = TOKEN_ADDRESSES[chain] || {};
    return Object.entries(tokens)
      .filter(([, addr]) => addr !== '0x0000000000000000000000000000000000000000')
      .map(([token]) => token);
  }

  // Calculate reserve backing based on token supply and gold price
  // Note: collateralRatio cannot be verified without attestation API access
  calculateReserveBacking(
    tokenSupply: number,
    goldPrice: number,
    token: string
  ): {
    totalOunces: number;
    totalValueUsd: number;
    perTokenOunces: number;
    collateralRatio: number | null;
    collateralRatioNote: string;
  } {
    const info = ISSUER_INFO[token];
    if (!info) {
      throw new Error(`Unknown token: ${token}`);
    }

    const perTokenOunces = info.perTokenOunces;
    const totalOunces = tokenSupply * perTokenOunces;
    const totalValueUsd = totalOunces * goldPrice;

    // Cannot verify actual collateral ratio without attestation API
    // Return null with explanation rather than hardcoded value
    return {
      totalOunces,
      totalValueUsd,
      perTokenOunces,
      collateralRatio: null,
      collateralRatioNote: 'Collateral ratio requires attestation API verification - see issuer attestation reports'
    };
  }
}
