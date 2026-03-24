import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTvlHistory } from '../../src/tools/tvlHistory.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleTvlHistory', () => {
  let mockCache: CacheManager;
  let mockDefiLlamaClient: {
    getProtocol: ReturnType<typeof vi.fn>;
    getTvlHistory: ReturnType<typeof vi.fn>;
  };

  const mockProtocol = {
    name: 'Aave',
    tvl: 10000000000, // $10B
    chainTvls: {
      ethereum: 6000000000,
      polygon: 2000000000,
      avalanche: 2000000000
    }
  };

  const mockHistory = [
    { date: Math.floor(Date.now() / 1000) - 86400, totalLiquidityUSD: 9500000000 },
    { date: Math.floor(Date.now() / 1000) - 86400 * 7, totalLiquidityUSD: 9000000000 },
    { date: Math.floor(Date.now() / 1000) - 86400 * 30, totalLiquidityUSD: 8000000000 },
    { date: Math.floor(Date.now() / 1000) - 86400 * 90, totalLiquidityUSD: 7000000000 }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDefiLlamaClient = {
      getProtocol: vi.fn(),
      getTvlHistory: vi.fn()
    };
  });

  it('should return formatted TVL history', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocol);
    mockDefiLlamaClient.getTvlHistory.mockResolvedValue(mockHistory);

    const result = await handleTvlHistory(
      { protocol: 'aave', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.protocol).toBe('aave');
    expect(result.protocolName).toBe('Aave');
    expect(result.currentTvlUsd).toBe(10000000000);
    expect(result.liquidityHealth).toBe('Deep');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should calculate TVL changes correctly', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocol);
    mockDefiLlamaClient.getTvlHistory.mockResolvedValue(mockHistory);

    const result = await handleTvlHistory(
      { protocol: 'aave', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.tvlChange.change7d).toBeGreaterThan(0);
    expect(result.tvlChange.change30d).toBeGreaterThan(0);
  });

  it('should calculate chain distribution', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocol);
    mockDefiLlamaClient.getTvlHistory.mockResolvedValue(mockHistory);

    const result = await handleTvlHistory(
      { protocol: 'aave', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.chainDistribution.length).toBe(3);
    expect(result.chainDistribution[0].chain).toBe('ethereum');
    expect(result.chainDistribution[0].percentOfTotal).toBe(60);
  });

  it('should return correct liquidity health for different TVL levels', async () => {
    // Test Deep liquidity
    mockDefiLlamaClient.getProtocol.mockResolvedValue({ ...mockProtocol, tvl: 1500000000 });
    mockDefiLlamaClient.getTvlHistory.mockResolvedValue(mockHistory);

    let result = await handleTvlHistory(
      { protocol: 'test1', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Deep');

    // Test Adequate liquidity
    mockCache = new CacheManager();
    mockDefiLlamaClient.getProtocol.mockResolvedValue({ ...mockProtocol, tvl: 150000000 });

    result = await handleTvlHistory(
      { protocol: 'test2', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Adequate');

    // Test Shallow liquidity
    mockCache = new CacheManager();
    mockDefiLlamaClient.getProtocol.mockResolvedValue({ ...mockProtocol, tvl: 15000000 });

    result = await handleTvlHistory(
      { protocol: 'test3', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Shallow');

    // Test Critical liquidity
    mockCache = new CacheManager();
    mockDefiLlamaClient.getProtocol.mockResolvedValue({ ...mockProtocol, tvl: 5000000 });

    result = await handleTvlHistory(
      { protocol: 'test4', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Critical');
  });

  it('should filter history by period', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocol);
    mockDefiLlamaClient.getTvlHistory.mockResolvedValue(mockHistory);

    const result = await handleTvlHistory(
      { protocol: 'aave', period: '7d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.historicalTvl.length).toBeLessThanOrEqual(7);
  });

  it('should use cached data when available', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocol);
    mockDefiLlamaClient.getTvlHistory.mockResolvedValue(mockHistory);

    // First call
    await handleTvlHistory(
      { protocol: 'aave', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    // Second call should use cache
    mockDefiLlamaClient.getProtocol.mockClear();
    mockDefiLlamaClient.getTvlHistory.mockClear();

    await handleTvlHistory(
      { protocol: 'aave', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(mockDefiLlamaClient.getProtocol).not.toHaveBeenCalled();
    expect(mockDefiLlamaClient.getTvlHistory).not.toHaveBeenCalled();
  });
});
