import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  isError: string;
  functionName: string;
}

interface EtherscanTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

export class EtherscanClient {
  private apiKey: string;
  private rateLimiter = new RateLimiter('etherscan');

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || '';
    if (!this.apiKey) {
      console.error('Warning: ETHERSCAN_API_KEY not set. Etherscan-based features will be limited.');
    }
  }

  private getBaseUrl(chain: string): string {
    const baseUrls: Record<string, string> = {
      ethereum: 'https://api.etherscan.io/api',
      arbitrum: 'https://api.arbiscan.io/api',
      optimism: 'https://api-optimistic.etherscan.io/api',
      polygon: 'https://api.polygonscan.com/api',
      base: 'https://api.basescan.org/api',
      avalanche: 'https://api.snowtrace.io/api',
      bsc: 'https://api.bscscan.com/api'
    };
    return baseUrls[chain.toLowerCase()] || baseUrls.ethereum;
  }

  async getTransactions(
    chain: string,
    address: string,
    startBlock = 0,
    endBlock = 99999999
  ): Promise<EtherscanTransaction[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const baseUrl = this.getBaseUrl(chain);
      const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=desc&apikey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }

      const data = await response.json() as EtherscanResponse<EtherscanTransaction[]>;

      if (data.status !== '1' && data.message !== 'No transactions found') {
        throw new Error(`Etherscan error: ${data.message}`);
      }

      return Array.isArray(data.result) ? data.result : [];
    });
  }

  async getTokenTransfers(
    chain: string,
    address: string,
    contractAddress?: string
  ): Promise<EtherscanTokenTransfer[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const baseUrl = this.getBaseUrl(chain);
      let url = `${baseUrl}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${this.apiKey}`;

      if (contractAddress) {
        url += `&contractaddress=${contractAddress}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }

      const data = await response.json() as EtherscanResponse<EtherscanTokenTransfer[]>;

      if (data.status !== '1' && data.message !== 'No transactions found') {
        throw new Error(`Etherscan error: ${data.message}`);
      }

      return Array.isArray(data.result) ? data.result : [];
    });
  }

  async getTokenSupply(chain: string, contractAddress: string): Promise<string> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const baseUrl = this.getBaseUrl(chain);
      const url = `${baseUrl}?module=stats&action=tokensupply&contractaddress=${contractAddress}&apikey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }

      const data = await response.json() as EtherscanResponse<string>;

      if (data.status !== '1') {
        throw new Error(`Etherscan error: ${data.message}`);
      }

      return data.result;
    });
  }

  async isContractVerified(chain: string, address: string): Promise<boolean> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const baseUrl = this.getBaseUrl(chain);
      const url = `${baseUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }

      const data = await response.json() as EtherscanResponse<Array<{ SourceCode: string }>>;

      if (data.status !== '1') {
        return false;
      }

      return data.result[0]?.SourceCode !== '';
    });
  }
}
