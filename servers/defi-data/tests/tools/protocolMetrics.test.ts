import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProtocolMetrics } from '../../src/tools/protocolMetrics.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleProtocolMetrics', () => {
  let mockCache: CacheManager;
  let mockDefiLlamaClient: {
    getProtocol: ReturnType<typeof vi.fn>;
    getFeesOverview: ReturnType<typeof vi.fn>;
    getProtocolFees: ReturnType<typeof vi.fn>;
  };

  const now = Math.floor(Date.now() / 1000);
  const mockProtocolData = {
    id: '1',
    name: 'Aave',
    slug: 'aave',
    category: 'Lending',
    tvl: [
      { date: now - 86400 * 31, totalLiquidityUSD: 9000000000 },
      { date: now - 86400 * 8, totalLiquidityUSD: 9500000000 },
      { date: now - 86400 * 2, totalLiquidityUSD: 10000000000 },
      { date: now - 86400, totalLiquidityUSD: 10200000000 },
      { date: now, totalLiquidityUSD: 10500000000 }
    ],
    currentChainTvls: {
      Ethereum: 7000000000,
      Polygon: 2000000000,
      Arbitrum: 1500000000
    },
    chains: ['Ethereum', 'Polygon', 'Arbitrum']
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDefiLlamaClient = {
      getProtocol: vi.fn(),
      getFeesOverview: vi.fn(),
      getProtocolFees: vi.fn()
    };
  });

  it('should return formatted protocol metrics', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocolData);

    const result = await handleProtocolMetrics(
      { protocol: 'aave' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.protocol).toBe('aave');
    expect(result.protocolName).toBe('Aave');
    expect(result.category).toBe('Lending');
    expect(result.currentTvlUsd).toBe(10500000000);
    expect(result).toHaveProperty('tvlChange');
    expect(result).toHaveProperty('chainDistribution');
    expect(result).toHaveProperty('historicalTvl');
    expect(result).toHaveProperty('liquidityHealth');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should calculate TVL changes correctly', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocolData);

    const result = await handleProtocolMetrics(
      { protocol: 'aave' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    // 24h change: (10500000000 - 10200000000) / 10200000000 * 100 ≈ 2.94%
    expect(result.tvlChange.change24h).toBeCloseTo(2.94, 1);
  });

  it('should build chain distribution sorted by TVL', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocolData);

    const result = await handleProtocolMetrics(
      { protocol: 'aave' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.chainDistribution).toHaveLength(3);
    expect(result.chainDistribution[0].chain).toBe('Ethereum');
    expect(result.chainDistribution[0].tvlUsd).toBe(7000000000);
    expect(result.chainDistribution[0].percentOfTotal).toBeCloseTo(66.67, 1);
  });

  it('should determine liquidity health correctly', async () => {
    // Test Deep ($10B+)
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocolData);
    let result = await handleProtocolMetrics(
      { protocol: 'aave' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Deep');

    // Test Adequate ($100M-$1B)
    mockCache.clear();
    mockDefiLlamaClient.getProtocol.mockResolvedValue({
      ...mockProtocolData,
      tvl: [{ date: now, totalLiquidityUSD: 500000000 }]
    });
    result = await handleProtocolMetrics(
      { protocol: 'medium' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Adequate');

    // Test Critical (< $10M)
    mockCache.clear();
    mockDefiLlamaClient.getProtocol.mockResolvedValue({
      ...mockProtocolData,
      tvl: [{ date: now, totalLiquidityUSD: 5000000 }]
    });
    result = await handleProtocolMetrics(
      { protocol: 'small' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.liquidityHealth).toBe('Critical');
  });

  it('should use cached data when available', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue(mockProtocolData);

    // First call
    await handleProtocolMetrics(
      { protocol: 'aave' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(mockDefiLlamaClient.getProtocol).toHaveBeenCalledTimes(1);

    // Second call should use cache
    mockDefiLlamaClient.getProtocol.mockClear();
    await handleProtocolMetrics(
      { protocol: 'aave' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(mockDefiLlamaClient.getProtocol).not.toHaveBeenCalled();
  });

  it('should handle empty TVL history', async () => {
    mockDefiLlamaClient.getProtocol.mockResolvedValue({
      ...mockProtocolData,
      tvl: []
    });

    const result = await handleProtocolMetrics(
      { protocol: 'new-protocol' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.currentTvlUsd).toBe(0);
    expect(result.historicalTvl).toHaveLength(0);
  });
});
