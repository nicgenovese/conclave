import { TheGraphClient, SupportedChain } from './thegraph.js';
import { AAVE_QUERIES } from '../queries/aave-v3.js';
import type {
  AaveReserve,
  AaveUserReserve,
  AaveRateSnapshot,
  AaveReservesResponse,
  AaveUserPositionsResponse,
  AaveRateHistoryResponse
} from '../types/aave.js';

export class AaveV3Client {
  private graphClient: TheGraphClient;
  private chain: SupportedChain;

  constructor(graphClient: TheGraphClient, chain: SupportedChain = 'ethereum') {
    this.graphClient = graphClient;
    this.chain = chain;
  }

  private getSubgraphId(): string {
    return this.graphClient.getSubgraphId('aaveV3', this.chain);
  }

  setChain(chain: SupportedChain): void {
    this.chain = chain;
  }

  async getReserves(first: number = 50): Promise<AaveReserve[]> {
    const data = await this.graphClient.query<AaveReservesResponse>(
      this.getSubgraphId(),
      AAVE_QUERIES.GET_RESERVES,
      { first }
    );
    return data.reserves;
  }

  async getReserveBySymbol(symbol: string): Promise<AaveReserve | null> {
    const data = await this.graphClient.query<AaveReservesResponse>(
      this.getSubgraphId(),
      AAVE_QUERIES.GET_RESERVE_BY_SYMBOL,
      { symbol: symbol.toUpperCase() }
    );
    return data.reserves[0] || null;
  }

  async getUserPositions(userAddress: string): Promise<AaveUserPositionsResponse> {
    const data = await this.graphClient.query<AaveUserPositionsResponse>(
      this.getSubgraphId(),
      AAVE_QUERIES.GET_USER_POSITIONS,
      { user: userAddress.toLowerCase() }
    );
    return data;
  }

  async getRateHistory(
    reserveId: string,
    first: number = 100
  ): Promise<AaveRateSnapshot[]> {
    const data = await this.graphClient.query<AaveRateHistoryResponse>(
      this.getSubgraphId(),
      AAVE_QUERIES.GET_RATE_HISTORY,
      { reserve: reserveId, first }
    );
    return data.reserveParamsHistoryItems;
  }
}
