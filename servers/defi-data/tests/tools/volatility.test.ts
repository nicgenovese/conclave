import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleVolatility } from '../../src/tools/volatility.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleVolatility', () => {
  let mockCache: CacheManager;
  let mockCoingeckoClient: {
    getMarketChart: ReturnType<typeof vi.fn>;
  };

  // Generate mock price data with some volatility
  const generateMockPrices = (
    days: number,
    basePrice: number,
    volatilityFactor: number
  ): [number, number][] => {
    const prices: [number, number][] = [];
    const now = Date.now();
    let price = basePrice;

    for (let i = days; i >= 0; i--) {
      const timestamp = now - i * 86400000;
      // Add some random-ish price movement
      const change = (Math.sin(i * 0.5) * volatilityFactor) + (i % 3 === 0 ? 0.02 : -0.01);
      price = price * (1 + change);
      prices.push([timestamp, price]);
    }

    return prices;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockCoingeckoClient = {
      getMarketChart: vi.fn()
    };
  });

  it('should return formatted volatility metrics', async () => {
    const mockPrices = generateMockPrices(30, 100, 0.03);
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: mockPrices,
      market_caps: [],
      total_volumes: []
    });

    const result = await handleVolatility(
      { tokenId: 'aave', period: '30d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(result.tokenId).toBe('aave');
    expect(result.period).toBe('30d');
    expect(result).toHaveProperty('volatilityMetrics');
    expect(result.volatilityMetrics).toHaveProperty('dailyVolatility');
    expect(result.volatilityMetrics).toHaveProperty('annualizedVolatility');
    expect(result.volatilityMetrics).toHaveProperty('maxDrawdown');
    expect(result.volatilityMetrics).toHaveProperty('maxDrawdownDate');
    expect(result).toHaveProperty('priceRange');
    expect(result).toHaveProperty('riskRating');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should calculate price range correctly', async () => {
    const mockPrices: [number, number][] = [
      [Date.now() - 86400000 * 3, 90],
      [Date.now() - 86400000 * 2, 110],
      [Date.now() - 86400000, 95],
      [Date.now(), 100]
    ];
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: mockPrices,
      market_caps: [],
      total_volumes: []
    });

    const result = await handleVolatility(
      { tokenId: 'test', period: '7d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(result.priceRange.high).toBe(110);
    expect(result.priceRange.low).toBe(90);
    expect(result.priceRange.current).toBe(100);
    expect(result.priceRange.percentFromHigh).toBeCloseTo(9.09, 1); // (110-100)/110 * 100
    expect(result.priceRange.percentFromLow).toBeCloseTo(11.11, 1); // (100-90)/90 * 100
  });

  it('should calculate max drawdown correctly', async () => {
    const mockPrices: [number, number][] = [
      [Date.now() - 86400000 * 5, 100], // Start
      [Date.now() - 86400000 * 4, 120], // New high
      [Date.now() - 86400000 * 3, 80],  // 33% drawdown from 120
      [Date.now() - 86400000 * 2, 90],  // Recovery
      [Date.now() - 86400000, 95],
      [Date.now(), 100]
    ];
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: mockPrices,
      market_caps: [],
      total_volumes: []
    });

    const result = await handleVolatility(
      { tokenId: 'test', period: '7d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    // Max drawdown should be ~33.33% (from 120 to 80)
    expect(result.volatilityMetrics.maxDrawdown).toBeCloseTo(33.33, 1);
  });

  it('should determine risk rating correctly', async () => {
    // Low volatility (< 30% annualized)
    const lowVolPrices: [number, number][] = [];
    for (let i = 30; i >= 0; i--) {
      lowVolPrices.push([Date.now() - i * 86400000, 100 + (i % 2 === 0 ? 0.5 : -0.5)]);
    }
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: lowVolPrices,
      market_caps: [],
      total_volumes: []
    });

    let result = await handleVolatility(
      { tokenId: 'stable', period: '30d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );
    expect(result.riskRating).toBe('Low');

    // High volatility (60-100% annualized)
    mockCache.clear();
    const highVolPrices: [number, number][] = [];
    for (let i = 30; i >= 0; i--) {
      highVolPrices.push([Date.now() - i * 86400000, 100 * (1 + (i % 2 === 0 ? 0.05 : -0.05))]);
    }
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: highVolPrices,
      market_caps: [],
      total_volumes: []
    });

    result = await handleVolatility(
      { tokenId: 'volatile', period: '30d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );
    expect(['High', 'Extreme']).toContain(result.riskRating);
  });

  it('should handle different periods correctly', async () => {
    const mockPrices = generateMockPrices(365, 100, 0.02);
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: mockPrices,
      market_caps: [],
      total_volumes: []
    });

    const result = await handleVolatility(
      { tokenId: 'aave', period: '1y' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(result.period).toBe('1y');
    expect(mockCoingeckoClient.getMarketChart).toHaveBeenCalledWith('aave', 365);
  });

  it('should use cached data when available', async () => {
    const mockPrices = generateMockPrices(30, 100, 0.03);
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: mockPrices,
      market_caps: [],
      total_volumes: []
    });

    // First call
    await handleVolatility(
      { tokenId: 'aave', period: '30d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );
    expect(mockCoingeckoClient.getMarketChart).toHaveBeenCalledTimes(1);

    // Second call should use cache
    mockCoingeckoClient.getMarketChart.mockClear();
    await handleVolatility(
      { tokenId: 'aave', period: '30d' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );
    expect(mockCoingeckoClient.getMarketChart).not.toHaveBeenCalled();
  });

  it('should throw error for insufficient price data', async () => {
    mockCoingeckoClient.getMarketChart.mockResolvedValue({
      prices: [[Date.now(), 100]], // Only one price point
      market_caps: [],
      total_volumes: []
    });

    await expect(
      handleVolatility(
        { tokenId: 'new-token', period: '7d' },
        { cache: mockCache, coingeckoClient: mockCoingeckoClient }
      )
    ).rejects.toThrow('Insufficient price data');
  });
});
