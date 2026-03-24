import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

interface DuneErc20Balance {
  chain: string;
  chain_id: number;
  address: string;
  amount: string;
  symbol: string;
  decimals: number;
  price_usd: number;
  value_usd: number;
}

interface DuneTransaction {
  chain: string;
  block_time: string;
  block_number: number;
  tx_hash: string;
  tx_index: number;
  from: string;
  to: string;
  value: string;
  gas_price: string;
  gas_used: string;
}

interface DuneTokenTransfer {
  chain: string;
  block_time: string;
  block_number: number;
  tx_hash: string;
  from: string;
  to: string;
  token_address: string;
  symbol: string;
  amount: string;
  amount_usd: number;
}

export interface DuneQueryResult<T = Record<string, unknown>> {
  execution_id: string;
  state: string;
  result?: {
    rows: T[];
    metadata: {
      column_names: string[];
      row_count: number;
    };
  };
}

export class DuneClient {
  private apiKey: string;
  private baseUrl = 'https://api.dune.com/api';
  private rateLimiter = new RateLimiter('dune');

  constructor() {
    this.apiKey = process.env.DUNE_API_KEY || '';
    if (!this.apiKey) {
      console.error('Warning: DUNE_API_KEY not set. Dune-based tools will fail.');
    }
  }

  private get headers(): Record<string, string> {
    return {
      'X-Dune-API-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  // Echo API: Get ERC20 balances for a wallet
  async getWalletBalances(chain: string, address: string): Promise<DuneErc20Balance[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(
        `${this.baseUrl}/echo/v1/balances/evm/${address}?chain_ids=${this.getChainId(chain)}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Dune API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as { balances: DuneErc20Balance[] };
      return data.balances || [];
    });
  }

  // Echo API: Get transactions for a wallet
  async getWalletTransactions(
    chain: string,
    address: string,
    limit = 100
  ): Promise<DuneTransaction[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const chainId = this.getChainId(chain);
      const response = await fetch(
        `${this.baseUrl}/echo/v1/transactions/evm/${address}?chain_ids=${chainId}&limit=${limit}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Dune API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as { transactions: DuneTransaction[] };
      return data.transactions || [];
    });
  }

  // Echo API: Get token transfers for a wallet
  async getTokenTransfers(
    chain: string,
    address: string,
    tokenAddress?: string,
    limit = 100
  ): Promise<DuneTokenTransfer[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      let url = `${this.baseUrl}/echo/v1/transfers/evm/${address}?chain_ids=${this.getChainId(chain)}&limit=${limit}`;
      if (tokenAddress) {
        url += `&token_address=${tokenAddress}`;
      }

      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Dune API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as { transfers: DuneTokenTransfer[] };
      return data.transfers || [];
    });
  }

  // Execute a custom query by ID (for more complex analytics)
  async executeQuery<T = Record<string, unknown>>(
    queryId: number,
    params?: Record<string, string | number>
  ): Promise<DuneQueryResult<T>> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      // Start execution
      const executeResponse = await fetch(
        `${this.baseUrl}/v1/query/${queryId}/execute`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ query_parameters: params || {} })
        }
      );

      if (!executeResponse.ok) {
        const error = await executeResponse.text();
        throw new Error(`Dune execute error: ${executeResponse.status} - ${error}`);
      }

      const execution = await executeResponse.json() as { execution_id: string };

      // Poll for results
      return this.pollForResults<T>(execution.execution_id);
    });
  }

  // Get latest results of a query (cached, doesn't use execution credits)
  async getLatestResults<T = Record<string, unknown>>(
    queryId: number
  ): Promise<DuneQueryResult<T>> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(
        `${this.baseUrl}/v1/query/${queryId}/results`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Dune results error: ${response.status} - ${error}`);
      }

      return response.json() as Promise<DuneQueryResult<T>>;
    });
  }

  private async pollForResults<T>(
    executionId: string,
    maxAttempts = 30,
    pollIntervalMs = 2000
  ): Promise<DuneQueryResult<T>> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.rateLimiter.throttle();

      const response = await fetch(
        `${this.baseUrl}/v1/execution/${executionId}/results`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Dune poll error: ${response.status}`);
      }

      const result = await response.json() as DuneQueryResult<T>;

      if (result.state === 'QUERY_STATE_COMPLETED') {
        return result;
      }

      if (result.state === 'QUERY_STATE_FAILED') {
        throw new Error('Dune query execution failed');
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    throw new Error('Dune query execution timeout');
  }

  private getChainId(chain: string): number {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      arbitrum: 42161,
      optimism: 10,
      polygon: 137,
      base: 8453,
      avalanche: 43114,
      bsc: 56
    };
    return chainIds[chain.toLowerCase()] || 1;
  }
}
