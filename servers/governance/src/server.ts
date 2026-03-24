import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CacheManager } from './utils/cache.js';
import { SnapshotClient } from './clients/snapshot.js';
import { TallyClient } from './clients/tally.js';
import { KarmaClient } from './clients/karma.js';
import { DiscourseClient } from './clients/discourse.js';

// Import schemas
import {
  GetProposalsInputSchema,
  GetDelegatesInputSchema,
  GetVotingHistoryInputSchema,
  GetSentimentInputSchema,
  GetVoterConcentrationInputSchema,
  GetQuorumDataInputSchema,
  GetAdminKeysInputSchema,
  GetProposalPipelineInputSchema,
  DetectFlashLoanRiskInputSchema,
  GetDelegationGraphInputSchema,
  GetProposalSuccessRateInputSchema,
  GetCommunityContributorsInputSchema
} from './types/index.js';

// Import handlers
import { handleGetProposals, handleGetProposalPipeline, handleGetProposalSuccessRate } from './tools/proposals.js';
import { handleGetDelegates, handleGetDelegationGraph } from './tools/delegates.js';
import { handleGetVotingHistory, handleGetQuorumData, handleGetVoterConcentration } from './tools/voting.js';
import { handleGetAdminKeys, handleDetectFlashLoanRisk } from './tools/risk.js';
import { handleGetSentiment, handleGetCommunityContributors } from './tools/community.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'governance-mcp-server',
    version: '1.0.0'
  });

  // Initialize shared resources
  const cache = new CacheManager();
  const snapshotClient = new SnapshotClient();
  const tallyClient = new TallyClient();
  const karmaClient = new KarmaClient();
  const discourseClient = new DiscourseClient();

  // Shared contexts for tool handlers
  const proposalsCtx = { cache, snapshotClient, tallyClient };
  const delegatesCtx = { cache, snapshotClient, tallyClient, karmaClient };
  const votingCtx = { cache, snapshotClient, tallyClient, karmaClient };
  const riskCtx = { cache, tallyClient, snapshotClient };
  const communityCtx = { cache, discourseClient, tallyClient, karmaClient };

  // ============================================
  // Tool 1: governance_get_proposals
  // ============================================
  server.tool(
    'governance_get_proposals',
    'Retrieve governance proposals from Snapshot and Tally. Returns proposal details including votes, status, and quorum.',
    GetProposalsInputSchema.shape,
    async (args) => {
      const input = GetProposalsInputSchema.parse(args);
      const result = await handleGetProposals(input, proposalsCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 2: governance_get_delegates
  // ============================================
  server.tool(
    'governance_get_delegates',
    'Get delegate information including voting power, participation rates, and delegation counts from Karma and Tally.',
    GetDelegatesInputSchema.shape,
    async (args) => {
      const input = GetDelegatesInputSchema.parse(args);
      const result = await handleGetDelegates(input, delegatesCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 3: governance_get_voting_history
  // ============================================
  server.tool(
    'governance_get_voting_history',
    'Retrieve voting history for proposals or delegates. Shows vote weights, support direction, and rationales.',
    GetVotingHistoryInputSchema.shape,
    async (args) => {
      const input = GetVotingHistoryInputSchema.parse(args);
      const result = await handleGetVotingHistory(input, votingCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 4: governance_get_sentiment
  // ============================================
  server.tool(
    'governance_get_sentiment',
    'Analyze community sentiment from governance forum discussions. Returns sentiment scores and trending topics.',
    GetSentimentInputSchema.shape,
    async (args) => {
      const input = GetSentimentInputSchema.parse(args);
      const result = await handleGetSentiment(input, communityCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 5: governance_get_voter_concentration
  // ============================================
  server.tool(
    'governance_get_voter_concentration',
    'Calculate voting power concentration metrics including Nakamoto coefficient, Gini index, and top holder percentages.',
    GetVoterConcentrationInputSchema.shape,
    async (args) => {
      const input = GetVoterConcentrationInputSchema.parse(args);
      const result = await handleGetVoterConcentration(input, votingCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 6: governance_get_quorum_data
  // ============================================
  server.tool(
    'governance_get_quorum_data',
    'Retrieve quorum requirements and historical quorum achievement rates for governance proposals.',
    GetQuorumDataInputSchema.shape,
    async (args) => {
      const input = GetQuorumDataInputSchema.parse(args);
      const result = await handleGetQuorumData(input, votingCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 7: governance_get_admin_keys
  // ============================================
  server.tool(
    'governance_get_admin_keys',
    'Identify admin addresses, multisigs, timelocks, and emergency powers. Assess centralization risks from admin controls.',
    GetAdminKeysInputSchema.shape,
    async (args) => {
      const input = GetAdminKeysInputSchema.parse(args);
      const result = await handleGetAdminKeys(input, riskCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 8: governance_get_proposal_pipeline
  // ============================================
  server.tool(
    'governance_get_proposal_pipeline',
    'Track proposals through their lifecycle: pending, active, queued, executed. Shows execution velocity and success rates.',
    GetProposalPipelineInputSchema.shape,
    async (args) => {
      const input = GetProposalPipelineInputSchema.parse(args);
      const result = await handleGetProposalPipeline(input, proposalsCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 9: governance_detect_flash_loan_risk
  // ============================================
  server.tool(
    'governance_detect_flash_loan_risk',
    'Assess vulnerability to flash loan governance attacks. Checks voting delays, snapshot mechanisms, and loanable supply.',
    DetectFlashLoanRiskInputSchema.shape,
    async (args) => {
      const input = DetectFlashLoanRiskInputSchema.parse(args);
      const result = await handleDetectFlashLoanRisk(input, riskCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 10: governance_get_vote_delegation_graph
  // ============================================
  server.tool(
    'governance_get_vote_delegation_graph',
    'Map delegation networks and identify circular delegations, isolated delegates, and delegation depth.',
    GetDelegationGraphInputSchema.shape,
    async (args) => {
      const input = GetDelegationGraphInputSchema.parse(args);
      const result = await handleGetDelegationGraph(input, delegatesCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 11: governance_get_proposal_success_rate
  // ============================================
  server.tool(
    'governance_get_proposal_success_rate',
    'Calculate proposal passing rates, execution rates, and voter turnout statistics over time.',
    GetProposalSuccessRateInputSchema.shape,
    async (args) => {
      const input = GetProposalSuccessRateInputSchema.parse(args);
      const result = await handleGetProposalSuccessRate(input, proposalsCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ============================================
  // Tool 12: governance_get_community_contributors
  // ============================================
  server.tool(
    'governance_get_community_contributors',
    'Identify active community contributors: proposers, voters, delegates, forum participants. Assess participation diversity.',
    GetCommunityContributorsInputSchema.shape,
    async (args) => {
      const input = GetCommunityContributorsInputSchema.parse(args);
      const result = await handleGetCommunityContributors(input, communityCtx);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}
