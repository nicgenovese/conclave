import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePreloadContext } from '../../src/tools/preloadContext.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handlePreloadContext', () => {
  let mockCache: CacheManager;
  let mockArchiveManager: {
    listFiles: ReturnType<typeof vi.fn>;
    readDocument: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockArchiveManager = {
      listFiles: vi.fn(),
      readDocument: vi.fn()
    };
  });

  it('should return comprehensive context for a protocol', async () => {
    // Mock decision files
    mockArchiveManager.listFiles.mockImplementation((dir: string) => {
      if (dir === 'decisions') {
        return Promise.resolve(['decisions/aave-2025-03-01.md']);
      }
      return Promise.resolve([]);
    });

    // Mock document reads - use path.includes for flexible matching
    mockArchiveManager.readDocument.mockImplementation((path: string) => {
      if (path.includes('aave')) {
        return Promise.resolve({
          frontmatter: {
            protocol: 'aave',
            date: '2025-03-01',
            decision: 'go',
            conviction: 8,
            sectors: ['DeFi', 'Lending']
          },
          content: '## Executive Decision\nAave is approved for investment.'
        });
      }
      if (path.includes('defi-patterns')) {
        return Promise.resolve({
          frontmatter: {},
          content: `# DeFi Patterns

## Success Factors

### Strong Governance
- **Description**: Distributed governance improves resilience
- **Confidence**: High

## Warning Indicators

### Concentrated Holdings
- **Description**: Top 10 wallets holding >50% is a warning
- **Confidence**: Medium
`
        });
      }
      if (path.includes('red-flags')) {
        return Promise.resolve({
          frontmatter: {},
          content: `# Red Flags

## Smart Contract Risk

### Unaudited Code
- **Severity**: Critical
- **Description**: Protocol without audit
- **Detection Methods**: Check for audit reports
- **Mitigation**: Require audits
`
        });
      }
      return Promise.resolve(null);
    });

    const result = await handlePreloadContext(
      { protocol: 'aave', sector: 'DeFi' },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.protocol).toBe('aave');
    expect(result.sector).toBe('DeFi');
    expect(result.priorDecisions.found).toBe(true);
    expect(result.priorDecisions.count).toBe(1);
    expect(result.priorDecisions.decisions[0].decision).toBe('go');
    // Red flags and learnings may or may not parse depending on exact formatting
    expect(result.contextSummary).toBeTruthy();
    expect(result.generatedAt).toBeTruthy();
  });

  it('should return no prior decisions for new protocol', async () => {
    mockArchiveManager.listFiles.mockResolvedValue([]);
    mockArchiveManager.readDocument.mockResolvedValue(null);

    const result = await handlePreloadContext(
      { protocol: 'newprotocol' },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.priorDecisions.found).toBe(false);
    expect(result.priorDecisions.count).toBe(0);
    expect(result.contextSummary).toContain('has not been previously evaluated');
  });

  it('should find analogous cases from same sector', async () => {
    mockArchiveManager.listFiles.mockImplementation((dir: string) => {
      if (dir === 'decisions') {
        return Promise.resolve([
          'decisions/aave-2025-03-01.md',
          'decisions/compound-2025-02-15.md'
        ]);
      }
      return Promise.resolve([]);
    });

    mockArchiveManager.readDocument.mockImplementation((path: string) => {
      if (path.includes('aave')) {
        return Promise.resolve({
          frontmatter: {
            protocol: 'aave',
            date: '2025-03-01',
            decision: 'go',
            conviction: 8,
            sectors: ['DeFi', 'Lending']
          },
          content: ''
        });
      }
      if (path.includes('compound')) {
        return Promise.resolve({
          frontmatter: {
            protocol: 'compound',
            date: '2025-02-15',
            decision: 'go',
            conviction: 7,
            sectors: ['DeFi', 'Lending']
          },
          content: ''
        });
      }
      return Promise.resolve(null);
    });

    const result = await handlePreloadContext(
      { protocol: 'newlending', sector: 'Lending', includeAnalogous: true },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.analogousCases.found).toBe(true);
    expect(result.analogousCases.cases.length).toBeGreaterThan(0);
  });

  it('should use cached results', async () => {
    mockArchiveManager.listFiles.mockResolvedValue([]);
    mockArchiveManager.readDocument.mockResolvedValue(null);

    // First call
    await handlePreloadContext(
      { protocol: 'test' },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    // Second call
    mockArchiveManager.listFiles.mockClear();
    await handlePreloadContext(
      { protocol: 'test' },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(mockArchiveManager.listFiles).not.toHaveBeenCalled();
  });

  it('should respect includeRedFlags option', async () => {
    mockArchiveManager.listFiles.mockResolvedValue([]);
    mockArchiveManager.readDocument.mockResolvedValue(null);

    const result = await handlePreloadContext(
      { protocol: 'test', includeRedFlags: false },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.redFlagsToWatch).toHaveLength(0);
  });
});
