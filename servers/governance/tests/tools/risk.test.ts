import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetAdminKeys, handleDetectFlashLoanRisk } from '../../src/tools/risk.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetAdminKeys', () => {
  let mockCache: CacheManager;
  let mockTallyClient: {
    getGovernance: ReturnType<typeof vi.fn>;
  };
  let mockSnapshotClient: {
    getSpace: ReturnType<typeof vi.fn>;
  };

  const mockGovernance = {
    timelockId: '0x1234567890abcdef1234567890abcdef12345678',
    votingDelay: 7200,
    votingPeriod: 14400,
    proposalThreshold: '10000',
    token: {
      symbol: 'AAVE',
      supply: '16000000'
    }
  };

  const mockSpace = {
    admins: ['0xadmin1', '0xadmin2'],
    members: ['0xmember1']
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockTallyClient = {
      getGovernance: vi.fn()
    };
    mockSnapshotClient = {
      getSpace: vi.fn()
    };
  });

  it('should return admin keys for known protocol', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    const result = await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    expect(result.adminAddresses.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('upgradeability');
    expect(result).toHaveProperty('emergencyPowers');
    expect(result).toHaveProperty('riskRating');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should identify multisig admin addresses', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    const result = await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    const multisigAdmins = result.adminAddresses.filter(a => a.isMultisig);
    expect(multisigAdmins.length).toBeGreaterThan(0);
    expect(multisigAdmins[0]).toHaveProperty('signaturesRequired');
    expect(multisigAdmins[0]).toHaveProperty('totalSigners');
  });

  it('should detect emergency powers', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    const result = await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    expect(result.emergencyPowers).toBe(true);
  });

  it('should calculate risk rating based on controls', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    const result = await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskRating);
  });

  it('should detect timelocked upgradeability', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    const result = await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    const timelockAdmin = result.adminAddresses.find(a => a.role === 'Timelock Controller');
    expect(timelockAdmin).toBeDefined();
    expect(timelockAdmin?.timelockDelay).toBeGreaterThan(0);
  });

  it('should include Snapshot admins', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    const result = await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    const snapshotAdmins = result.adminAddresses.filter(a => a.role === 'Snapshot Admin');
    expect(snapshotAdmins.length).toBeGreaterThan(0);
  });

  it('should use cached data when available', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);
    mockSnapshotClient.getSpace.mockResolvedValue(mockSpace);

    // First call
    await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    // Second call should use cache
    mockTallyClient.getGovernance.mockClear();
    mockSnapshotClient.getSpace.mockClear();

    await handleGetAdminKeys(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    expect(mockTallyClient.getGovernance).not.toHaveBeenCalled();
    expect(mockSnapshotClient.getSpace).not.toHaveBeenCalled();
  });

  it('should handle unknown protocol gracefully', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(null);
    mockSnapshotClient.getSpace.mockResolvedValue(null);

    const result = await handleGetAdminKeys(
      { protocol: 'unknown' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient }
    );

    expect(result.adminAddresses).toBeDefined();
    expect(result.riskRating).toBeDefined();
  });
});

describe('handleDetectFlashLoanRisk', () => {
  let mockCache: CacheManager;
  let mockTallyClient: {
    getGovernance: ReturnType<typeof vi.fn>;
  };
  let mockSnapshotClient: Record<string, ReturnType<typeof vi.fn>>;

  const mockGovernance = {
    votingDelay: 13140,
    token: {
      symbol: 'AAVE',
      supply: '16000000'
    }
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockTallyClient = {
      getGovernance: vi.fn()
    };
    mockSnapshotClient = {};
  });

  it('should return flash loan risk assessment', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(['Low', 'Medium', 'High', 'Critical']).toContain(result.flashLoanRisk);
    expect(result.governanceToken).toBe('AAVE');
    expect(result.totalSupply).toBeGreaterThan(0);
    expect(result).toHaveProperty('flashLoanableSupply');
    expect(result).toHaveProperty('flashLoanablePercent');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should detect low risk for protocols with snapshot mechanism', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(result.snapshotMechanism).toBe(true);
  });

  it('should include historical incidents for known attacks', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(null);

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'beanstalk' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(result.historicalIncidents.length).toBeGreaterThan(0);
    expect(result.historicalIncidents[0]).toHaveProperty('timestamp');
    expect(result.historicalIncidents[0]).toHaveProperty('amount');
    expect(result.historicalIncidents[0]).toHaveProperty('description');
  });

  it('should provide recommendations', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every(r => typeof r === 'string')).toBe(true);
  });

  it('should calculate flash loanable supply', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(result.flashLoanablePercent).toBeGreaterThan(0);
    expect(result.flashLoanableSupply).toBe(result.totalSupply * result.flashLoanablePercent / 100);
  });

  it('should detect higher risk for short voting delay', async () => {
    mockTallyClient.getGovernance.mockResolvedValue({
      ...mockGovernance,
      votingDelay: 1000 // Very short
    });

    // Need fresh cache for new protocol
    const freshCache = new CacheManager();

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'test-short-delay' },
      { cache: freshCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    // Short delay should increase risk
    expect(result.recommendations.some(r => r.toLowerCase().includes('voting delay'))).toBe(true);
  });

  it('should use cached data when available', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(mockGovernance);

    // First call
    await handleDetectFlashLoanRisk(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    // Second call should use cache
    mockTallyClient.getGovernance.mockClear();

    await handleDetectFlashLoanRisk(
      { protocol: 'aave' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(mockTallyClient.getGovernance).not.toHaveBeenCalled();
  });

  it('should handle unknown protocol', async () => {
    mockTallyClient.getGovernance.mockResolvedValue(null);

    const result = await handleDetectFlashLoanRisk(
      { protocol: 'unknown-protocol' },
      { cache: mockCache, tallyClient: mockTallyClient, snapshotClient: mockSnapshotClient as any }
    );

    expect(result.flashLoanRisk).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
