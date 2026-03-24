import { TheGraphClient, SupportedChain } from './thegraph.js';
import { COMPOUND_QUERIES } from '../queries/compound-v3.js';
import type {
  CompoundMarket,
  CompoundAccount,
  CompoundMarketSnapshot,
  CompoundMarketsResponse,
  CompoundMarketResponse,
  CompoundAccountsResponse,
  CompoundSnapshotsResponse
} from '../types/compound.js';

export class CompoundV3Client {
  private graphClient: TheGraphClient;
  private chain: SupportedChain;

  constructor(graphClient: TheGraphClient, chain: SupportedChain = 'ethereum') {
    this.graphClient = graphClient;
    this.chain = chain;
  }

  private getSubgraphId(): string {
    return this.graphClient.getSubgraphId('compoundV3', this.chain);
  }

  setChain(chain: SupportedChain): void {
    this.chain = chain;
  }

  async getMarkets(): Promise<CompoundMarket[]> {
    const data = await this.graphClient.query<CompoundMarketsResponse>(
      this.getSubgraphId(),
      COMPOUND_QUERIES.GET_MARKETS
    );
    return data.markets;
  }

  async getMarketById(marketId: string): Promise<CompoundMarket | null> {
    const data = await this.graphClient.query<CompoundMarketResponse>(
      this.getSubgraphId(),
      COMPOUND_QUERIES.GET_MARKET_BY_ID,
      { id: marketId.toLowerCase() }
    );
    return data.market;
  }

  async getAccountPositions(accountAddress: string): Promise<CompoundAccount[]> {
    const data = await this.graphClient.query<CompoundAccountsResponse>(
      this.getSubgraphId(),
      COMPOUND_QUERIES.GET_ACCOUNT_POSITIONS,
      { account: accountAddress.toLowerCase() }
    );
    return data.accounts;
  }

  async getMarketSnapshots(
    marketId: string,
    first: number = 100
  ): Promise<CompoundMarketSnapshot[]> {
    const data = await this.graphClient.query<CompoundSnapshotsResponse>(
      this.getSubgraphId(),
      COMPOUND_QUERIES.GET_MARKET_SNAPSHOTS,
      { market: marketId.toLowerCase(), first }
    );
    return data.marketDailySnapshots;
  }
}
