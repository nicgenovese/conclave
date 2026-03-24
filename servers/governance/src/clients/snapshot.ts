/**
 * Snapshot GraphQL API Client
 * https://hub.snapshot.org/graphql
 * Free, no API key required for public data
 */

const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';

// Protocol to Snapshot space mapping
const PROTOCOL_SPACES: Record<string, string> = {
  'aave': 'aave.eth',
  'uniswap': 'uniswapgovernance.eth',
  'compound': 'comp-vote.eth',
  'curve': 'curve.eth',
  'balancer': 'balancer.eth',
  'maker': 'makerdao.eth',
  'sushi': 'sushigov.eth',
  'yearn': 'ybaby.eth',
  'lido': 'lido-snapshot.eth',
  'ens': 'ens.eth',
  'gitcoin': 'gitcoindao.eth',
  'optimism': 'opcollective.eth',
  'arbitrum': 'arbitrumfoundation.eth'
};

export interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  state: 'pending' | 'active' | 'closed';
  author: string;
  scores: number[];
  scores_total: number;
  quorum: number;
  votes: number;
  link: string;
}

export interface SnapshotVote {
  id: string;
  voter: string;
  vp: number;
  choice: number | number[];
  reason: string;
  created: number;
  proposal: {
    id: string;
    title: string;
  };
}

export interface SnapshotSpace {
  id: string;
  name: string;
  about: string;
  members: string[];
  admins: string[];
  proposalsCount: number;
  followersCount: number;
  votesCount: number;
}

export class SnapshotClient {
  private rateLimitDelay = 200; // 200ms between requests
  private lastRequest = 0;

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }

  private getSpaceId(protocol: string): string {
    const space = PROTOCOL_SPACES[protocol.toLowerCase()];
    if (!space) {
      // Try using the protocol name directly as space
      return `${protocol.toLowerCase()}.eth`;
    }
    return space;
  }

  private async query<T>(graphqlQuery: string, variables: Record<string, unknown> = {}): Promise<T> {
    await this.throttle();

    const response = await fetch(SNAPSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Snapshot API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data?: T; errors?: Array<{ message: string }> };

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Snapshot GraphQL error: ${data.errors[0].message}`);
    }

    return data.data as T;
  }

  async getProposals(protocol: string, options: {
    limit?: number;
    state?: 'all' | 'active' | 'closed' | 'pending';
    orderBy?: 'created' | 'start' | 'end';
  } = {}): Promise<SnapshotProposal[]> {
    const spaceId = this.getSpaceId(protocol);
    const limit = options.limit || 20;

    let stateFilter = '';
    if (options.state && options.state !== 'all') {
      stateFilter = `, state: "${options.state}"`;
    }

    const query = `
      query Proposals($space: String!, $first: Int!) {
        proposals(
          first: $first,
          where: { space: $space${stateFilter} },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          state
          author
          scores
          scores_total
          quorum
          votes
          link
        }
      }
    `;

    const result = await this.query<{ proposals: SnapshotProposal[] }>(query, {
      space: spaceId,
      first: limit
    });

    return result.proposals || [];
  }

  async getVotes(proposalId: string, options: {
    limit?: number;
    orderBy?: 'vp' | 'created';
  } = {}): Promise<SnapshotVote[]> {
    const limit = options.limit || 100;
    const orderBy = options.orderBy || 'vp';

    const query = `
      query Votes($proposal: String!, $first: Int!, $orderBy: String!) {
        votes(
          first: $first,
          where: { proposal: $proposal },
          orderBy: $orderBy,
          orderDirection: desc
        ) {
          id
          voter
          vp
          choice
          reason
          created
          proposal {
            id
            title
          }
        }
      }
    `;

    const result = await this.query<{ votes: SnapshotVote[] }>(query, {
      proposal: proposalId,
      first: limit,
      orderBy
    });

    return result.votes || [];
  }

  async getVoterHistory(protocol: string, voterAddress: string, options: {
    limit?: number;
  } = {}): Promise<SnapshotVote[]> {
    const spaceId = this.getSpaceId(protocol);
    const limit = options.limit || 50;

    const query = `
      query VoterHistory($space: String!, $voter: String!, $first: Int!) {
        votes(
          first: $first,
          where: { space: $space, voter: $voter },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          voter
          vp
          choice
          reason
          created
          proposal {
            id
            title
          }
        }
      }
    `;

    const result = await this.query<{ votes: SnapshotVote[] }>(query, {
      space: spaceId,
      voter: voterAddress.toLowerCase(),
      first: limit
    });

    return result.votes || [];
  }

  async getSpace(protocol: string): Promise<SnapshotSpace | null> {
    const spaceId = this.getSpaceId(protocol);

    const query = `
      query Space($id: String!) {
        space(id: $id) {
          id
          name
          about
          members
          admins
          proposalsCount
          followersCount
          votesCount
        }
      }
    `;

    const result = await this.query<{ space: SnapshotSpace | null }>(query, {
      id: spaceId
    });

    return result.space;
  }

  async getProposal(proposalId: string): Promise<SnapshotProposal | null> {
    const query = `
      query Proposal($id: String!) {
        proposal(id: $id) {
          id
          title
          body
          choices
          start
          end
          state
          author
          scores
          scores_total
          quorum
          votes
          link
        }
      }
    `;

    const result = await this.query<{ proposal: SnapshotProposal | null }>(query, {
      id: proposalId
    });

    return result.proposal;
  }

  async getDelegates(protocol: string, options: {
    limit?: number;
  } = {}): Promise<Array<{ delegator: string; delegate: string; space: string }>> {
    const spaceId = this.getSpaceId(protocol);
    const limit = options.limit || 100;

    const query = `
      query Delegations($space: String!, $first: Int!) {
        delegations(
          first: $first,
          where: { space: $space },
          orderBy: "timestamp",
          orderDirection: desc
        ) {
          delegator
          delegate
          space
        }
      }
    `;

    const result = await this.query<{ delegations: Array<{ delegator: string; delegate: string; space: string }> }>(query, {
      space: spaceId,
      first: limit
    });

    return result.delegations || [];
  }
}
