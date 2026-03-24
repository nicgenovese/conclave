import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetRedFlags } from '../../src/tools/getRedFlags.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetRedFlags', () => {
  let mockCache: CacheManager;
  let mockArchiveManager: {
    readDocument: ReturnType<typeof vi.fn>;
  };

  const mockRedFlagsContent = `# Red Flags Knowledge Base

## Smart Contract Risks

### Unaudited Contracts
- **Severity**: critical
- **Description**: Protocol has not undergone third-party security audits
- **Detection Methods**: Check for audit reports on protocol website or GitHub
- **Mitigation**: Require minimum 2 independent audits before deployment
- **Tags**: [security, audit, smart-contract]

### Upgradeable Proxy Without Timelock
- **Severity**: high
- **Description**: Proxy contracts can be upgraded without delay
- **Detection Methods**: Check proxy implementation for timelock mechanism
- **Mitigation**: Implement minimum 48-hour timelock for all upgrades
- **Tags**: [security, proxy, governance]

## Economic Risks

### Concentrated Token Ownership
- **Severity**: medium
- **Description**: Small number of wallets hold majority of tokens
- **Detection Methods**: Analyze top holder distribution on-chain
- **Mitigation**: Implement vesting schedules and decentralized distribution
- **Tags**: [tokenomics, centralization]

## Governance Risks

### Low Voter Participation
- **Severity**: low
- **Description**: Consistently low turnout for governance votes
- **Detection Methods**: Track historical proposal participation rates
- **Mitigation**: Implement delegation and incentivized voting
- **Tags**: [governance, participation]
`;

  beforeEach(() => {
    mockCache = new CacheManager();
    mockArchiveManager = {
      readDocument: vi.fn()
    };
  });

  it('should return parsed red flags', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.totalCount).toBeGreaterThan(0);
  });

  it('should parse red flag properties correctly', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const flag = result.redFlags[0];
    expect(flag).toHaveProperty('id');
    expect(flag).toHaveProperty('title');
    expect(flag).toHaveProperty('description');
    expect(flag).toHaveProperty('riskCategory');
    expect(flag).toHaveProperty('severityRating');
    expect(flag).toHaveProperty('detectionMethods');
    expect(flag).toHaveProperty('mitigationStrategies');
  });

  it('should categorize red flags correctly', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const categories = result.redFlags.map(f => f.riskCategory);
    expect(categories).toContain('smart-contract');
    expect(categories).toContain('economic');
    expect(categories).toContain('governance');
  });

  it('should filter by risk category', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { riskCategory: 'smart-contract', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.every(f => f.riskCategory === 'smart-contract')).toBe(true);
  });

  it('should parse severity levels correctly', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const severities = result.redFlags.map(f => f.severityRating);
    expect(severities.every(s => ['low', 'medium', 'high', 'critical'].includes(s))).toBe(true);
  });

  it('should respect limit parameter', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 2 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.length).toBeLessThanOrEqual(2);
  });

  it('should return empty results when document not found', async () => {
    mockArchiveManager.readDocument.mockResolvedValue(null);

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.length).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it('should use cached data when available', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    // First call
    await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Second call should use cache
    mockArchiveManager.readDocument.mockClear();

    await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.readDocument).not.toHaveBeenCalled();
  });

  it('should include detection methods array', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.every(f => Array.isArray(f.detectionMethods))).toBe(true);
  });

  it('should include mitigation strategies array', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.every(f => Array.isArray(f.mitigationStrategies))).toBe(true);
  });

  it('should handle empty content gracefully', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: '' });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.redFlags.length).toBe(0);
  });

  it('should handle malformed content gracefully', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: 'Just some random text without proper formatting' });

    const result = await handleGetRedFlags(
      { limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Should not throw, just return empty or partial results
    expect(result).toHaveProperty('redFlags');
    expect(result).toHaveProperty('totalCount');
  });
});
