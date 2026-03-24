import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

// Chainlink AggregatorV3Interface ABI (minimal)
const AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string memory)'
];

// Chainlink feed addresses per chain
// Source: https://data.chain.link/feeds
// Note: Chainlink only provides XAU/USD and XAG/USD on Ethereum mainnet
// WTI, BRENT, and NG feeds are NOT available on Chainlink
const CHAINLINK_FEEDS: Record<string, Record<string, string>> = {
  ethereum: {
    XAU: '0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6', // XAU/USD
    XAG: '0x379589227b15F1a12195D3f2d90bBc9F31f95235'  // XAG/USD
  }
  // Note: Arbitrum does not have commodity price feeds
};

// Heartbeat intervals (seconds) for staleness detection
// Source: https://data.chain.link/feeds/ethereum/mainnet/xau-usd
const HEARTBEAT_INTERVALS: Record<string, number> = {
  XAU: 86400,   // 24 hours (actual Chainlink heartbeat for XAU/USD)
  XAG: 86400    // 24 hours (actual Chainlink heartbeat for XAG/USD)
};

interface ChainlinkPriceData {
  price: number;
  decimals: number;
  timestamp: number;
  roundId: bigint;
  staleness: number;
  isStale: boolean;
}

export class ChainlinkClient {
  private rpcUrls: Record<string, string>;
  private rateLimiter = new RateLimiter('chainlink');

  constructor() {
    this.rpcUrls = {
      ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      optimism: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
    };
  }

  async getLatestPrice(commodity: string, chain: string = 'ethereum'): Promise<ChainlinkPriceData> {
    const feedAddress = CHAINLINK_FEEDS[chain]?.[commodity];
    if (!feedAddress || feedAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`No Chainlink feed for ${commodity} on ${chain}`);
    }

    const rpcUrl = this.rpcUrls[chain];
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain: ${chain}`);
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      // Get decimals
      const decimalsResult = await this.callContract(
        rpcUrl,
        feedAddress,
        'decimals()',
        []
      );
      const decimals = parseInt(decimalsResult, 16);

      // Get latest round data
      const roundDataResult = await this.callContract(
        rpcUrl,
        feedAddress,
        'latestRoundData()',
        []
      );

      // Parse the response (ABI-encoded tuple)
      const parsed = this.parseRoundData(roundDataResult);
      const price = Number(parsed.answer) / Math.pow(10, decimals);
      const timestamp = Number(parsed.updatedAt);
      const staleness = Math.floor(Date.now() / 1000) - timestamp;
      const heartbeat = HEARTBEAT_INTERVALS[commodity] || 3600;

      return {
        price,
        decimals,
        timestamp,
        roundId: parsed.roundId,
        staleness,
        isStale: staleness > heartbeat * 1.5 // 50% buffer
      };
    });
  }

  private async callContract(
    rpcUrl: string,
    contractAddress: string,
    methodSignature: string,
    _params: unknown[]
  ): Promise<string> {
    // Calculate function selector (first 4 bytes of keccak256 hash)
    const selector = this.getFunctionSelector(methodSignature);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: selector
          },
          'latest'
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }

    const result = await response.json() as { result?: string; error?: { message: string } };

    if (result.error) {
      throw new Error(`Contract call failed: ${result.error.message}`);
    }

    return result.result || '0x';
  }

  private getFunctionSelector(signature: string): string {
    // Simple hash implementation for function selectors
    // In production, use proper keccak256
    const selectors: Record<string, string> = {
      'decimals()': '0x313ce567',
      'latestRoundData()': '0xfeaf968c',
      'description()': '0x7284e416'
    };
    return selectors[signature] || '0x00000000';
  }

  private parseRoundData(data: string): {
    roundId: bigint;
    answer: bigint;
    startedAt: bigint;
    updatedAt: bigint;
    answeredInRound: bigint;
  } {
    // Remove 0x prefix and parse 5 x 32-byte values
    const hex = data.slice(2);
    const roundId = BigInt('0x' + hex.slice(0, 64));
    const answer = BigInt('0x' + hex.slice(64, 128));
    const startedAt = BigInt('0x' + hex.slice(128, 192));
    const updatedAt = BigInt('0x' + hex.slice(192, 256));
    const answeredInRound = BigInt('0x' + hex.slice(256, 320));

    return { roundId, answer, startedAt, updatedAt, answeredInRound };
  }

  getFeedAddress(commodity: string, chain: string = 'ethereum'): string | null {
    const address = CHAINLINK_FEEDS[chain]?.[commodity];
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return address;
  }

  getHeartbeatInterval(commodity: string): number {
    return HEARTBEAT_INTERVALS[commodity] || 3600;
  }

  hasFeed(commodity: string, chain: string = 'ethereum'): boolean {
    const address = CHAINLINK_FEEDS[chain]?.[commodity];
    return !!address && address !== '0x0000000000000000000000000000000000000000';
  }

  getSupportedCommodities(chain: string = 'ethereum'): string[] {
    const feeds = CHAINLINK_FEEDS[chain] || {};
    return Object.entries(feeds)
      .filter(([, addr]) => addr !== '0x0000000000000000000000000000000000000000')
      .map(([commodity]) => commodity);
  }
}
