import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProtocolRevenue } from '../../src/tools/protocolRevenue.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleProtocolRevenue', () => {
  let mockCache: CacheManager;
  let mockDefiLlamaClient: {
    getProtocolFees: ReturnType<typeof vi.fn>;
  };

  const mockFeesData = {
    total24h: 5000000,
    total7d: 35000000,
    total30d: 150000000,
    totalAllTime: 3000000000,
    revenue24h: 2500000,
    revenue7d: 17500000,
    revenue30d: 75000000
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDefiLlamaClient = {
      getProtocolFees: vi.fn()
    };
  });

  it('should return formatted revenue metrics for 30d period', async () => {
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue(mockFeesData);

    const result = await handleProtocolRevenue(
      { protocol: 'uniswap', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.protocol).toBe('uniswap');
    expect(result.period).toBe('30d');
    expect(result.fees.total).toBe(150000000);
    expect(result.fees.daily).toBe(5000000);
    expect(result.revenue.total).toBe(75000000);
    expect(result.revenue.revenueShare).toBe(50); // 75M / 150M * 100
    expect(result).toHaveProperty('valueCaptureRating');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should return formatted revenue metrics for 24h period', async () => {
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue(mockFeesData);

    const result = await handleProtocolRevenue(
      { protocol: 'uniswap', period: '24h' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.period).toBe('24h');
    expect(result.fees.total).toBe(5000000);
    expect(result.fees.daily).toBe(5000000);
    expect(result.revenue.total).toBe(2500000);
  });

  it('should return formatted revenue metrics for 7d period', async () => {
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue(mockFeesData);

    const result = await handleProtocolRevenue(
      { protocol: 'uniswap', period: '7d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.period).toBe('7d');
    expect(result.fees.total).toBe(35000000);
    expect(result.fees.daily).toBe(5000000); // 35M / 7
    expect(result.revenue.total).toBe(17500000);
  });

  it('should determine value capture rating correctly', async () => {
    // Strong (50%+ revenue share)
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue(mockFeesData);
    let result = await handleProtocolRevenue(
      { protocol: 'strong', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.valueCaptureRating).toBe('Strong');

    // Moderate (20-50% revenue share)
    mockCache.clear();
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue({
      ...mockFeesData,
      revenue30d: 45000000 // 30% of 150M
    });
    result = await handleProtocolRevenue(
      { protocol: 'moderate', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.valueCaptureRating).toBe('Moderate');

    // Weak (< 20% revenue share)
    mockCache.clear();
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue({
      ...mockFeesData,
      revenue30d: 15000000 // 10% of 150M
    });
    result = await handleProtocolRevenue(
      { protocol: 'weak', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.valueCaptureRating).toBe('Weak');

    // None (0% revenue share)
    mockCache.clear();
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue({
      ...mockFeesData,
      revenue30d: 0
    });
    result = await handleProtocolRevenue(
      { protocol: 'none', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.valueCaptureRating).toBe('None');
  });

  it('should determine fee trend correctly', async () => {
    // Growing trend (current > previous by >10%)
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue({
      ...mockFeesData,
      total30d: 200000000, // Much higher than extrapolated 7d
      total7d: 35000000
    });
    let result = await handleProtocolRevenue(
      { protocol: 'growing', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.fees.trend).toBe('Growing');

    // Declining trend
    mockCache.clear();
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue({
      ...mockFeesData,
      total30d: 100000000,
      total7d: 50000000 // Extrapolated would be ~214M, much higher than 100M
    });
    result = await handleProtocolRevenue(
      { protocol: 'declining', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(result.fees.trend).toBe('Declining');
  });

  it('should throw error when no fees data found', async () => {
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue(null);

    await expect(
      handleProtocolRevenue(
        { protocol: 'unknown', period: '30d' },
        { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
      )
    ).rejects.toThrow('No fees data found');
  });

  it('should use cached data when available', async () => {
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue(mockFeesData);

    // First call
    await handleProtocolRevenue(
      { protocol: 'uniswap', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(mockDefiLlamaClient.getProtocolFees).toHaveBeenCalledTimes(1);

    // Second call should use cache
    mockDefiLlamaClient.getProtocolFees.mockClear();
    await handleProtocolRevenue(
      { protocol: 'uniswap', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );
    expect(mockDefiLlamaClient.getProtocolFees).not.toHaveBeenCalled();
  });

  it('should handle null fee values gracefully', async () => {
    mockDefiLlamaClient.getProtocolFees.mockResolvedValue({
      total24h: null,
      total7d: null,
      total30d: null,
      revenue24h: null,
      revenue7d: null,
      revenue30d: null
    });

    const result = await handleProtocolRevenue(
      { protocol: 'new-protocol', period: '30d' },
      { cache: mockCache, defiLlamaClient: mockDefiLlamaClient }
    );

    expect(result.fees.total).toBe(0);
    expect(result.revenue.total).toBe(0);
    expect(result.valueCaptureRating).toBe('None');
  });
});
