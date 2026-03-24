/**
 * Karma API Client
 * https://api.karmahq.xyz
 * Delegate reputation and activity data
 */

const KARMA_API_URL = 'https://api.karmahq.xyz';

// Protocol to Karma DAO name mapping
const PROTOCOL_DAOS: Record<string, string> = {
  'aave': 'aave',
  'uniswap': 'uniswap',
  'compound': 'compound',
  'ens': 'ens',
  'gitcoin': 'gitcoin',
  'optimism': 'optimism',
  'arbitrum': 'arbitrum',
  'maker': 'makerdao',
  'hop': 'hop'
};

export interface KarmaDelegate {
  address: string;
  ensName?: string;
  publicAddress: string;
  realName?: string;
  profilePictureUrl?: string;
  karmaScore: number;
  delegatorCount: number;
  delegatedVotes: string;
  votingWeight: number;
  forumActivityScore: number;
  offChainVotesPct: number;
  onChainVotesPct: number;
  discordScore?: number;
  status: 'active' | 'inactive' | 'recognized' | 'shadow';
  lastVoteTimestamp?: string;
  workstreams?: string[];
}

export interface KarmaDaoStats {
  daoName: string;
  totalDelegates: number;
  activeDelegates: number;
  totalVotingPower: string;
  avgKarmaScore: number;
  topDelegatesConcentration: number;
}

export class KarmaClient {
  private rateLimitDelay = 300; // 300ms between requests
  private lastRequest = 0;

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }

  private getDaoName(protocol: string): string {
    return PROTOCOL_DAOS[protocol.toLowerCase()] || protocol.toLowerCase();
  }

  private async request<T>(endpoint: string): Promise<T> {
    await this.throttle();

    const response = await fetch(`${KARMA_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Karma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T;
    return data;
  }

  async getDelegates(protocol: string, options: {
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
    field?: 'karmaScore' | 'delegatedVotes' | 'delegatorCount';
  } = {}): Promise<KarmaDelegate[]> {
    const daoName = this.getDaoName(protocol);
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const order = options.order || 'desc';
    const field = options.field || 'delegatedVotes';

    try {
      const result = await this.request<{
        data: {
          delegates: KarmaDelegate[];
        }
      }>(`/dao/delegates?name=${daoName}&pageSize=${limit}&offset=${offset}&order=${order}&field=${field}`);

      return result.data?.delegates || [];
    } catch {
      return [];
    }
  }

  async getDelegate(protocol: string, address: string): Promise<KarmaDelegate | null> {
    const daoName = this.getDaoName(protocol);

    try {
      const result = await this.request<{
        data: {
          delegate: KarmaDelegate;
        }
      }>(`/dao/delegate?name=${daoName}&address=${address}`);

      return result.data?.delegate || null;
    } catch {
      return null;
    }
  }

  async getDaoStats(protocol: string): Promise<KarmaDaoStats | null> {
    const daoName = this.getDaoName(protocol);

    try {
      const result = await this.request<{
        data: {
          stats: KarmaDaoStats;
        }
      }>(`/dao/stats?name=${daoName}`);

      return result.data?.stats || null;
    } catch {
      return null;
    }
  }

  async getDelegateActivity(protocol: string, address: string): Promise<{
    proposals: Array<{ id: string; vote: string; timestamp: string }>;
    forumPosts: number;
    lastActive: string;
  } | null> {
    const daoName = this.getDaoName(protocol);

    try {
      const result = await this.request<{
        data: {
          activity: {
            proposals: Array<{ id: string; vote: string; timestamp: string }>;
            forumPosts: number;
            lastActive: string;
          }
        }
      }>(`/dao/delegate/activity?name=${daoName}&address=${address}`);

      return result.data?.activity || null;
    } catch {
      return null;
    }
  }

  async getTopDelegates(protocol: string, limit: number = 10): Promise<{
    delegates: KarmaDelegate[];
    concentrationPercent: number;
  }> {
    const delegates = await this.getDelegates(protocol, {
      limit,
      field: 'delegatedVotes',
      order: 'desc'
    });

    // Calculate concentration
    let totalPower = 0;
    let topPower = 0;

    for (const d of delegates) {
      const power = parseFloat(d.delegatedVotes) || 0;
      topPower += power;
    }

    // Get all delegates to calculate total
    const allDelegates = await this.getDelegates(protocol, { limit: 1000 });
    for (const d of allDelegates) {
      totalPower += parseFloat(d.delegatedVotes) || 0;
    }

    const concentrationPercent = totalPower > 0 ? (topPower / totalPower) * 100 : 0;

    return {
      delegates,
      concentrationPercent
    };
  }
}
