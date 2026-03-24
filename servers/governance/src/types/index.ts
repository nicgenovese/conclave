import { z } from 'zod';

// ============================================
// Common Types
// ============================================

export type DataFreshness = string; // ISO timestamp

// ============================================
// Tool 1: governance_get_proposals
// ============================================

export const GetProposalsInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  limit: z.number().min(1).max(100).default(20),
  status: z.enum(['all', 'active', 'passed', 'failed', 'pending', 'executed', 'canceled']).default('all'),
  period: z.enum(['30d', '90d', '1y', 'all']).default('90d')
});
export type GetProposalsInput = z.infer<typeof GetProposalsInputSchema>;

export interface Proposal {
  id: string;
  title: string;
  type: string;
  status: 'Pending' | 'Active' | 'Passed' | 'Failed' | 'Executed' | 'Canceled';
  startTime: string;
  endTime: string;
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumVotes?: number;
  descriptionUrl?: string;
  executedDate?: string;
  source: 'snapshot' | 'tally';
}

export interface GetProposalsOutput {
  proposals: Proposal[];
  totalCount: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 2: governance_get_delegates
// ============================================

export const GetDelegatesInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['votingPower', 'delegateCount', 'proposalCount', 'participationRate']).default('votingPower')
});
export type GetDelegatesInput = z.infer<typeof GetDelegatesInputSchema>;

export interface Delegate {
  address: string;
  ensName?: string;
  votingPower: number;
  votingPowerPercent: number;
  delegatorCount: number;
  proposalsCreated: number;
  votesParticipated: number;
  participationRate: number;
  lastActiveDate?: string;
  statement?: string;
  isTeamMember?: boolean;
}

export interface GetDelegatesOutput {
  delegates: Delegate[];
  totalDelegates: number;
  totalVotingPower: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 3: governance_get_voting_history
// ============================================

export const GetVotingHistoryInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  delegateAddress: z.string().optional(),
  proposalId: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).default('90d'),
  limit: z.number().min(1).max(100).default(50)
});
export type GetVotingHistoryInput = z.infer<typeof GetVotingHistoryInputSchema>;

export interface Vote {
  proposalId: string;
  proposalTitle: string;
  voterAddress: string;
  voterEns?: string;
  voteWeight: number;
  support: 'for' | 'against' | 'abstain';
  rationale?: string;
  timestamp: string;
}

export interface GetVotingHistoryOutput {
  votes: Vote[];
  totalVotes: number;
  participationRate: number;
  avgVoteWeight: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 4: governance_get_sentiment
// ============================================

export const GetSentimentInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  limit: z.number().min(1).max(50).default(20),
  period: z.enum(['7d', '30d', '90d']).default('30d')
});
export type GetSentimentInput = z.infer<typeof GetSentimentInputSchema>;

export interface Discussion {
  id: string;
  title: string;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number; // -1 to 1
  replyCount: number;
  viewCount: number;
  authorReputation: number;
  timestamp: string;
  url: string;
}

export interface GetSentimentOutput {
  discussions: Discussion[];
  averageSentiment: number;
  discussionVolume: number;
  topTopics: string[];
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 5: governance_get_voter_concentration
// ============================================

export const GetVoterConcentrationInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required')
});
export type GetVoterConcentrationInput = z.infer<typeof GetVoterConcentrationInputSchema>;

export interface GetVoterConcentrationOutput {
  nakamotoCoefficient: number;
  top10Power: number;
  top20Power: number;
  top50Power: number;
  giniCoefficient: number;
  concentrationRating: 'Decentralized' | 'Moderate' | 'Concentrated' | 'Plutocratic';
  totalVoters: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 6: governance_get_quorum_data
// ============================================

export const GetQuorumDataInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  period: z.enum(['30d', '90d', '1y']).default('90d')
});
export type GetQuorumDataInput = z.infer<typeof GetQuorumDataInputSchema>;

export interface QuorumProposal {
  proposalId: string;
  title: string;
  quorumRequired: number;
  quorumAchieved: number;
  participation: number;
  passed: boolean;
}

export interface GetQuorumDataOutput {
  quorumRequirement: number;
  avgQuorumAchieved: number;
  quorumRate: number;
  proposals: QuorumProposal[];
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 7: governance_get_admin_keys
// ============================================

export const GetAdminKeysInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required')
});
export type GetAdminKeysInput = z.infer<typeof GetAdminKeysInputSchema>;

export interface AdminAddress {
  address: string;
  role: string;
  powers: string[];
  isMultisig: boolean;
  signaturesRequired?: number;
  totalSigners?: number;
  timelockDelay?: number;
}

export interface GetAdminKeysOutput {
  adminAddresses: AdminAddress[];
  upgradeability: 'Decentralized' | 'Timelocked' | 'AdminControlled' | 'Immutable';
  emergencyPowers: boolean;
  riskRating: 'low' | 'medium' | 'high' | 'critical';
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 8: governance_get_proposal_pipeline
// ============================================

export const GetProposalPipelineInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  status: z.enum(['all', 'pending', 'active', 'succeeded', 'queued', 'executed', 'canceled']).default('all')
});
export type GetProposalPipelineInput = z.infer<typeof GetProposalPipelineInputSchema>;

export interface PipelineProposal {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  eta?: string;
  timelockDelay?: number;
  timeToExecution?: number;
}

export interface GetProposalPipelineOutput {
  proposals: PipelineProposal[];
  avgTimeToExecution: number;
  executionSuccessRate: number;
  pendingCount: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 9: governance_detect_flash_loan_risk
// ============================================

export const DetectFlashLoanRiskInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required')
});
export type DetectFlashLoanRiskInput = z.infer<typeof DetectFlashLoanRiskInputSchema>;

export interface FlashLoanIncident {
  timestamp: string;
  amount: number;
  risk: 'low' | 'medium' | 'high';
  description: string;
}

export interface DetectFlashLoanRiskOutput {
  flashLoanRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  governanceToken: string;
  totalSupply: number;
  flashLoanableSupply: number;
  flashLoanablePercent: number;
  votingDelay: number;
  snapshotMechanism: boolean;
  historicalIncidents: FlashLoanIncident[];
  recommendations: string[];
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 10: governance_get_vote_delegation_graph
// ============================================

export const GetDelegationGraphInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  delegateAddress: z.string().optional(),
  depth: z.number().min(1).max(3).default(2)
});
export type GetDelegationGraphInput = z.infer<typeof GetDelegationGraphInputSchema>;

export interface DelegationEdge {
  from: string;
  fromEns?: string;
  to: string;
  toEns?: string;
  power: number;
  depth: number;
}

export interface GetDelegationGraphOutput {
  delegationEdges: DelegationEdge[];
  circularDelegations: string[][];
  isolatedDelegates: number;
  delegationDensity: number;
  maxDelegationDepth: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 11: governance_get_proposal_success_rate
// ============================================

export const GetProposalSuccessRateInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  period: z.enum(['30d', '90d', '1y', 'all']).default('1y')
});
export type GetProposalSuccessRateInput = z.infer<typeof GetProposalSuccessRateInputSchema>;

export interface GetProposalSuccessRateOutput {
  totalProposals: number;
  passedProposals: number;
  executedProposals: number;
  failedProposals: number;
  canceledProposals: number;
  passingRate: number;
  executionRate: number;
  avgVoterTurnout: number;
  dataFreshness: DataFreshness;
}

// ============================================
// Tool 12: governance_get_community_contributors
// ============================================

export const GetCommunityContributorsInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  type: z.enum(['all', 'proposers', 'voters', 'delegates', 'forum']).default('all'),
  limit: z.number().min(1).max(100).default(20)
});
export type GetCommunityContributorsInput = z.infer<typeof GetCommunityContributorsInputSchema>;

export interface Contributor {
  address: string;
  ensName?: string;
  type: 'proposer' | 'voter' | 'delegate' | 'forum';
  activityScore: number;
  proposalsCreated: number;
  votesParticipated: number;
  forumPosts: number;
  lastActive: string;
  isTeamMember?: boolean;
}

export interface GetCommunityContributorsOutput {
  contributors: Contributor[];
  totalContributors: number;
  diversityIndex: number;
  teamMemberPercent: number;
  newContributors30d: number;
  dataFreshness: DataFreshness;
}
