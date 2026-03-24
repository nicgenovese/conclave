/**
 * Tally API Client
 * https://api.tally.xyz
 * Free tier available, API key recommended for higher limits
 */

const TALLY_API_URL = 'https://api.tally.xyz/query';

// Protocol to Tally organization mapping
const PROTOCOL_ORGS: Record<string, { slug: string; chainId: string }> = {
  'aave': { slug: 'aave', chainId: 'eip155:1' },
  'uniswap': { slug: 'uniswap', chainId: 'eip155:1' },
  'compound': { slug: 'compound', chainId: 'eip155:1' },
  'ens': { slug: 'ens', chainId: 'eip155:1' },
  'gitcoin': { slug: 'gitcoin', chainId: 'eip155:1' },
  'optimism': { slug: 'optimism', chainId: 'eip155:10' },
  'arbitrum': { slug: 'arbitrum', chainId: 'eip155:42161' },
  'hop': { slug: 'hop', chainId: 'eip155:1' },
  'nouns': { slug: 'nouns', chainId: 'eip155:1' }
};

export interface TallyProposal {
  id: string;
  title: string;
  description: string;
  status: string;
  proposer: { address: string; ens?: string };
  voteStats: Array<{
    support: string;
    weight: string;
    votes: string;
    percent: number;
  }>;
  quorum: string;
  createdAt: string;
  startBlock: number;
  endBlock: number;
  executableCalls?: Array<{
    target: string;
    calldata: string;
    value: string;
  }>;
}

export interface TallyDelegate {
  address: string;
  ens?: string;
  votingPower: { token: { symbol: string }; total: string };
  delegatorsCount: number;
  statement?: { statement: string };
  participationRate: number;
  proposalsCreated: number;
  votesCount: number;
}

export interface TallyGovernance {
  id: string;
  name: string;
  chainId: string;
  tokenId: string;
  token: {
    symbol: string;
    supply: string;
  };
  quorum: string;
  proposalThreshold: string;
  votingDelay: number;
  votingPeriod: number;
  timelockId?: string;
}

export class TallyClient {
  private apiKey: string;
  private rateLimitDelay = 500; // 500ms between requests
  private lastRequest = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TALLY_API_KEY || '';
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }

  private getOrgInfo(protocol: string): { slug: string; chainId: string } {
    const org = PROTOCOL_ORGS[protocol.toLowerCase()];
    if (!org) {
      return { slug: protocol.toLowerCase(), chainId: 'eip155:1' };
    }
    return org;
  }

  private async query<T>(graphqlQuery: string, variables: Record<string, unknown> = {}): Promise<T> {
    await this.throttle();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Api-Key'] = this.apiKey;
    }

    const response = await fetch(TALLY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Tally API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data?: T; errors?: Array<{ message: string }> };

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Tally GraphQL error: ${data.errors[0].message}`);
    }

    return data.data as T;
  }

  async getGovernance(protocol: string): Promise<TallyGovernance | null> {
    const { slug, chainId } = this.getOrgInfo(protocol);

    const query = `
      query Governance($slug: String!, $chainId: ChainID!) {
        organization(slug: $slug) {
          governorIds
        }
        governors(chainIds: [$chainId], organizationIds: []) {
          id
          name
          chainId
          tokenId
          token {
            symbol
            supply
          }
          quorum
          proposalThreshold
          votingDelay
          votingPeriod
          timelockId
        }
      }
    `;

    try {
      const result = await this.query<{ governors: TallyGovernance[] }>(query, {
        slug,
        chainId
      });
      return result.governors?.[0] || null;
    } catch {
      return null;
    }
  }

  async getProposals(protocol: string, options: {
    limit?: number;
    status?: string;
  } = {}): Promise<TallyProposal[]> {
    const { chainId } = this.getOrgInfo(protocol);
    const limit = options.limit || 20;

    const query = `
      query Proposals($chainId: ChainID!, $first: Int!) {
        proposals(
          chainId: $chainId,
          pagination: { limit: $first }
        ) {
          nodes {
            id
            title
            description
            status
            proposer {
              address
              ens
            }
            voteStats {
              support
              weight
              votes
              percent
            }
            quorum
            createdAt
            startBlock
            endBlock
            executableCalls {
              target
              calldata
              value
            }
          }
        }
      }
    `;

    try {
      const result = await this.query<{ proposals: { nodes: TallyProposal[] } }>(query, {
        chainId,
        first: limit
      });
      return result.proposals?.nodes || [];
    } catch {
      return [];
    }
  }

  async getDelegates(protocol: string, options: {
    limit?: number;
    sortBy?: 'votingPower' | 'delegatorsCount';
  } = {}): Promise<TallyDelegate[]> {
    const { chainId } = this.getOrgInfo(protocol);
    const limit = options.limit || 20;

    const query = `
      query Delegates($chainId: ChainID!, $first: Int!) {
        delegates(
          chainId: $chainId,
          pagination: { limit: $first },
          sort: { field: VOTING_POWER, direction: DESC }
        ) {
          nodes {
            address
            ens
            votingPower {
              token {
                symbol
              }
              total
            }
            delegatorsCount
            statement {
              statement
            }
            participationRate
            proposalsCreated
            votesCount
          }
        }
      }
    `;

    try {
      const result = await this.query<{ delegates: { nodes: TallyDelegate[] } }>(query, {
        chainId,
        first: limit
      });
      return result.delegates?.nodes || [];
    } catch {
      return [];
    }
  }

  async getVotesForProposal(proposalId: string, options: {
    limit?: number;
  } = {}): Promise<Array<{
    voter: { address: string; ens?: string };
    weight: string;
    support: string;
    reason?: string;
    createdAt: string;
  }>> {
    const limit = options.limit || 100;

    const query = `
      query Votes($proposalId: ID!, $first: Int!) {
        votes(
          proposalId: $proposalId,
          pagination: { limit: $first }
        ) {
          nodes {
            voter {
              address
              ens
            }
            weight
            support
            reason
            createdAt
          }
        }
      }
    `;

    try {
      const result = await this.query<{ votes: { nodes: Array<{
        voter: { address: string; ens?: string };
        weight: string;
        support: string;
        reason?: string;
        createdAt: string;
      }> } }>(query, {
        proposalId,
        first: limit
      });
      return result.votes?.nodes || [];
    } catch {
      return [];
    }
  }

  async getDelegationInfo(protocol: string, address: string): Promise<{
    delegatingTo?: string;
    delegatedFrom: Array<{ address: string; votingPower: string }>;
  } | null> {
    const { chainId } = this.getOrgInfo(protocol);

    const query = `
      query DelegationInfo($chainId: ChainID!, $address: Address!) {
        delegate(chainId: $chainId, address: $address) {
          delegatingTo {
            address
          }
          delegatedFrom {
            nodes {
              address
              votingPower {
                total
              }
            }
          }
        }
      }
    `;

    try {
      const result = await this.query<{ delegate: {
        delegatingTo?: { address: string };
        delegatedFrom: { nodes: Array<{ address: string; votingPower: { total: string } }> };
      } }>(query, {
        chainId,
        address
      });

      if (!result.delegate) return null;

      return {
        delegatingTo: result.delegate.delegatingTo?.address,
        delegatedFrom: result.delegate.delegatedFrom.nodes.map(d => ({
          address: d.address,
          votingPower: d.votingPower.total
        }))
      };
    } catch {
      return null;
    }
  }
}
