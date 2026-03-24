import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
  }>;
}

export interface SubgraphConfig {
  id: string;
  name: string;
  chain: string;
}

export const SUBGRAPH_REGISTRY = {
  aaveV3: {
    ethereum: {
      id: 'HB1Z2EAw4rtPRYVb2Nz8QGFLHCpym6ByBX6vbCViuE9F',
      name: 'Aave V3 Ethereum',
      chain: 'ethereum'
    },
    arbitrum: {
      id: 'GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF',
      name: 'Aave V3 Arbitrum',
      chain: 'arbitrum'
    },
    polygon: {
      id: 'Co2URyXjnxaw8WqxKyVHdirq9Ahhm5vcTs4pMT6MWpFM',
      name: 'Aave V3 Polygon',
      chain: 'polygon'
    },
    optimism: {
      id: 'DSfLz8oQBUeU5atALgUFQKMTSYV6aVe3KG9FeDqHDXCy',
      name: 'Aave V3 Optimism',
      chain: 'optimism'
    },
    base: {
      id: 'GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF',
      name: 'Aave V3 Base',
      chain: 'base'
    }
  },
  compoundV3: {
    ethereum: {
      id: 'AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9',
      name: 'Compound V3 Ethereum',
      chain: 'ethereum'
    },
    arbitrum: {
      id: '8WLPsLnuK9MtKCK6zXvXGhxJg8e5B1VkSzKL1WQVHK9r',
      name: 'Compound V3 Arbitrum',
      chain: 'arbitrum'
    },
    polygon: {
      id: 'Hf3T5SN6FnHvJmqxTkEdWoqtLz8Vb3nPRvPdGejqTLgM',
      name: 'Compound V3 Polygon',
      chain: 'polygon'
    },
    base: {
      id: 'A1234567890123456789012345678901234567890123',
      name: 'Compound V3 Base',
      chain: 'base'
    }
  }
} as const;

export type SupportedChain = 'ethereum' | 'arbitrum' | 'polygon' | 'optimism' | 'base';

export class TheGraphClient {
  private baseUrl = 'https://gateway.thegraph.com/api';
  private rateLimiter = new RateLimiter('thegraph');
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.THEGRAPH_API_KEY || '';
    if (!this.apiKey) {
      console.error('TheGraph: WARNING - No API key set (THEGRAPH_API_KEY). Queries will fail.');
    }
  }

  private buildUrl(subgraphId: string): string {
    return `${this.baseUrl}/${this.apiKey}/subgraphs/id/${subgraphId}`;
  }

  async query<T>(
    subgraphId: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('TheGraph API key not configured. Set THEGRAPH_API_KEY environment variable.');
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(this.buildUrl(subgraphId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('TheGraph rate limit exceeded');
        }
        if (response.status === 402) {
          throw new Error('TheGraph API key quota exceeded or invalid');
        }
        throw new Error(`TheGraph API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as GraphQLResponse<T>;

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(e => e.message).join('; ');
        throw new Error(`GraphQL error: ${errorMessages}`);
      }

      if (!result.data) {
        throw new Error('GraphQL response missing data');
      }

      return result.data;
    });
  }

  getSubgraphId(protocol: 'aaveV3' | 'compoundV3', chain: SupportedChain): string {
    const registry = SUBGRAPH_REGISTRY[protocol];
    const config = registry[chain as keyof typeof registry];
    if (!config) {
      throw new Error(`${protocol} subgraph not configured for chain: ${chain}`);
    }
    return config.id;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
