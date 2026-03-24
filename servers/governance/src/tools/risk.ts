import { TallyClient } from '../clients/tally.js';
import { SnapshotClient } from '../clients/snapshot.js';
import type { CacheManager } from '../utils/cache.js';
import type {
  GetAdminKeysInput,
  GetAdminKeysOutput,
  AdminAddress,
  DetectFlashLoanRiskInput,
  DetectFlashLoanRiskOutput,
  FlashLoanIncident
} from '../types/index.js';

interface RiskContext {
  cache: CacheManager;
  tallyClient: TallyClient;
  snapshotClient: SnapshotClient;
}

// Known multisig addresses for major protocols
const KNOWN_MULTISIGS: Record<string, Array<{
  address: string;
  role: string;
  sigRequired: number;
  totalSigners: number;
}>> = {
  'aave': [
    { address: '0xEC568fffba86c094cf06b22134B23074DFE2252c', role: 'Guardian', sigRequired: 5, totalSigners: 10 },
    { address: '0x25F2226B597E8F9514B3F68F00f494cF4f286491', role: 'Emergency Admin', sigRequired: 3, totalSigners: 5 }
  ],
  'uniswap': [
    { address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC', role: 'Timelock', sigRequired: 1, totalSigners: 1 }
  ],
  'compound': [
    { address: '0x6d903f6003cca6255D85CcA4D3B5E5146dC33925', role: 'Timelock', sigRequired: 1, totalSigners: 1 }
  ]
};

// Known governance token info
const GOVERNANCE_TOKENS: Record<string, {
  symbol: string;
  address: string;
  totalSupply: number;
  votingDelay: number;
  snapshotMechanism: boolean;
}> = {
  'aave': {
    symbol: 'AAVE',
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    totalSupply: 16000000,
    votingDelay: 7200, // ~1 day in blocks
    snapshotMechanism: true
  },
  'uniswap': {
    symbol: 'UNI',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    totalSupply: 1000000000,
    votingDelay: 13140, // ~2 days
    snapshotMechanism: true
  },
  'compound': {
    symbol: 'COMP',
    address: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    totalSupply: 10000000,
    votingDelay: 13140,
    snapshotMechanism: true
  },
  'ens': {
    symbol: 'ENS',
    address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
    totalSupply: 100000000,
    votingDelay: 6575, // ~1 day
    snapshotMechanism: true
  }
};

export async function handleGetAdminKeys(
  input: GetAdminKeysInput,
  ctx: RiskContext
): Promise<GetAdminKeysOutput> {
  const cacheKey = ctx.cache.generateKey('getAdminKeys', input);
  const cached = ctx.cache.get<GetAdminKeysOutput>(cacheKey);
  if (cached) return cached;

  const adminAddresses: AdminAddress[] = [];
  let upgradeability: GetAdminKeysOutput['upgradeability'] = 'AdminControlled';
  let emergencyPowers = false;

  // Check known multisigs first
  const knownMultisigs = KNOWN_MULTISIGS[input.protocol.toLowerCase()];
  if (knownMultisigs) {
    for (const ms of knownMultisigs) {
      adminAddresses.push({
        address: ms.address,
        role: ms.role,
        powers: [ms.role.includes('Guardian') ? 'pause' : 'execute'],
        isMultisig: ms.totalSigners > 1,
        signaturesRequired: ms.sigRequired,
        totalSigners: ms.totalSigners
      });

      if (ms.role.includes('Guardian') || ms.role.includes('Emergency')) {
        emergencyPowers = true;
      }
    }
  }

  // Fetch governance info from Tally
  try {
    const governance = await ctx.tallyClient.getGovernance(input.protocol);

    if (governance) {
      // Check for timelock
      if (governance.timelockId) {
        const timelockDelay = governance.votingDelay + governance.votingPeriod;
        adminAddresses.push({
          address: governance.timelockId,
          role: 'Timelock Controller',
          powers: ['execute proposals', 'queue transactions'],
          isMultisig: false,
          timelockDelay
        });
        upgradeability = 'Timelocked';
      }

      // Add proposal threshold info
      if (governance.proposalThreshold) {
        const threshold = parseFloat(governance.proposalThreshold);
        if (threshold > 0) {
          // High threshold = more decentralized
          if (threshold >= 10000) {
            upgradeability = 'Decentralized';
          }
        }
      }
    }
  } catch (error) {
    console.error('Tally governance fetch error:', error);
  }

  // Fetch space admins from Snapshot
  try {
    const space = await ctx.snapshotClient.getSpace(input.protocol);

    if (space) {
      for (const admin of space.admins || []) {
        const existing = adminAddresses.find(a => a.address.toLowerCase() === admin.toLowerCase());
        if (!existing) {
          adminAddresses.push({
            address: admin,
            role: 'Snapshot Admin',
            powers: ['manage space', 'moderate proposals'],
            isMultisig: false
          });
        }
      }
    }
  } catch (error) {
    console.error('Snapshot space fetch error:', error);
  }

  // Determine risk rating
  let riskRating: GetAdminKeysOutput['riskRating'];
  const hasMultisig = adminAddresses.some(a => a.isMultisig);
  const hasTimelock = adminAddresses.some(a => a.timelockDelay && a.timelockDelay > 0);

  if (upgradeability === 'Decentralized') {
    riskRating = 'low';
  } else if (hasMultisig && hasTimelock) {
    riskRating = 'low';
  } else if (hasMultisig || hasTimelock) {
    riskRating = 'medium';
  } else if (emergencyPowers && !hasMultisig) {
    riskRating = 'critical';
  } else {
    riskRating = 'high';
  }

  const result: GetAdminKeysOutput = {
    adminAddresses,
    upgradeability,
    emergencyPowers,
    riskRating,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'admin');
  return result;
}

export async function handleDetectFlashLoanRisk(
  input: DetectFlashLoanRiskInput,
  ctx: RiskContext
): Promise<DetectFlashLoanRiskOutput> {
  const cacheKey = ctx.cache.generateKey('detectFlashLoanRisk', input);
  const cached = ctx.cache.get<DetectFlashLoanRiskOutput>(cacheKey);
  if (cached) return cached;

  const protocolLower = input.protocol.toLowerCase();
  const tokenInfo = GOVERNANCE_TOKENS[protocolLower];

  let governanceToken = tokenInfo?.symbol || input.protocol.toUpperCase();
  let totalSupply = tokenInfo?.totalSupply || 0;
  let votingDelay = tokenInfo?.votingDelay || 0;
  let snapshotMechanism = tokenInfo?.snapshotMechanism || false;

  // Try to get more accurate info from Tally
  try {
    const governance = await ctx.tallyClient.getGovernance(input.protocol);

    if (governance) {
      governanceToken = governance.token?.symbol || governanceToken;
      totalSupply = parseFloat(governance.token?.supply || '0') || totalSupply;
      votingDelay = governance.votingDelay || votingDelay;
    }
  } catch (error) {
    console.error('Tally governance info fetch error:', error);
  }

  // Estimate flash loanable supply
  // Major lending protocols typically have 5-20% of token supply available
  const flashLoanablePercent = 15; // Conservative estimate
  const flashLoanableSupply = totalSupply * (flashLoanablePercent / 100);

  // Historical incidents (would need real data source)
  const historicalIncidents: FlashLoanIncident[] = [];

  // Known flash loan governance attacks
  const knownAttacks: Record<string, FlashLoanIncident[]> = {
    'beanstalk': [{
      timestamp: '2022-04-17',
      amount: 182000000,
      risk: 'high',
      description: 'Flash loan attack drained $182M via governance vote manipulation'
    }],
    'build': [{
      timestamp: '2022-02-05',
      amount: 470000,
      risk: 'medium',
      description: 'Flash loan used to pass malicious proposal'
    }]
  };

  if (knownAttacks[protocolLower]) {
    historicalIncidents.push(...knownAttacks[protocolLower]);
  }

  // Calculate risk factors
  const recommendations: string[] = [];
  let riskScore = 0;

  // Voting delay check
  if (votingDelay < 7200) { // Less than ~1 day in blocks
    riskScore += 2;
    recommendations.push('Increase voting delay to prevent flash loan attacks');
  }

  // Snapshot mechanism check
  if (!snapshotMechanism) {
    riskScore += 3;
    recommendations.push('Implement vote power snapshots at proposal creation');
  }

  // Flash loanable supply check
  if (flashLoanablePercent > 10) {
    riskScore += 1;
    recommendations.push('Monitor large token deposits to lending protocols');
  }

  // Historical incidents check
  if (historicalIncidents.length > 0) {
    riskScore += 2;
    recommendations.push('Protocol has historical governance attack incidents - review mitigations');
  }

  // Quorum check
  // Low quorum relative to flash loanable supply is risky
  // Would need actual quorum data to calculate

  // Determine risk level
  let flashLoanRisk: DetectFlashLoanRiskOutput['flashLoanRisk'];
  if (riskScore >= 5) {
    flashLoanRisk = 'Critical';
  } else if (riskScore >= 3) {
    flashLoanRisk = 'High';
  } else if (riskScore >= 1) {
    flashLoanRisk = 'Medium';
  } else {
    flashLoanRisk = 'Low';
  }

  if (recommendations.length === 0) {
    recommendations.push('No immediate flash loan governance risks detected');
  }

  const result: DetectFlashLoanRiskOutput = {
    flashLoanRisk,
    governanceToken,
    totalSupply,
    flashLoanableSupply,
    flashLoanablePercent,
    votingDelay,
    snapshotMechanism,
    historicalIncidents,
    recommendations,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'default');
  return result;
}
