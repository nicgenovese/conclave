import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTokenMetrics } from '../../src/tools/tokenMetrics.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleTokenMetrics', () => {
  let mockCache: CacheManager;
  let mockCoingeckoClient: {
    getCoin: ReturnType<typeof vi.fn>;
    getMarketChart: ReturnType<typeof vi.fn>;
    searchCoin: ReturnType<typeof vi.fn>;
  };

  const mockCoinData = {
    id: 'aave',
    symbol: 'aave',
    name: 'Aave',
    market_data: {
      current_price: { usd: 100 },
      market_cap: { usd: 1500000000 },
      fully_diluted_valuation: { usd: 1600000000 },
      total_volume: { usd: 50000000 },
      high_24h: { usd: 105 },
      low_24h: { usd: 95 },
      price_change_24h: 2.5,
      price_change_percentage_24h: 2.5,
      price_change_percentage_7d: 5.0,
      price_change_percentage_30d: 10.0,
      circulating_supply: 15000000,
      total_supply: 16000000,
      max_supply: 16000000,
      ath: { usd: 600 },
      ath_date: { usd: '2021-05-18T00:00:00.000Z' },
      ath_change_percentage: { usd: -83.33 }
    }
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockCoingeckoClient = {
      getCoin: vi.fn(),
      getMarketChart: vi.fn(),
      searchCoin: vi.fn()
    };
  });

  it('should return formatted token metrics', async () => {
    mockCoingeckoClient.getCoin.mockResolvedValue(mockCoinData);

    const result = await handleTokenMetrics(
      { tokenId: 'aave' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(result.tokenId).toBe('aave');
    expect(result.name).toBe('Aave');
    expect(result.symbol).toBe('AAVE');
    expect(result.currentPrice).toBe(100);
    expect(result.marketCap).toBe(1500000000);
    expect(result.fullyDilutedValuation).toBe(1600000000);
    expect(result.circulatingSupply).toBe(15000000);
    expect(result.totalSupply).toBe(16000000);
    expect(result.allTimeHigh).toBe(600);
    expect(result.athDrawdown).toBe(-83.33);
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should calculate circulatingToTotalRatio correctly', async () => {
    mockCoingeckoClient.getCoin.mockResolvedValue(mockCoinData);

    const result = await handleTokenMetrics(
      { tokenId: 'aave' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    // 15000000 / 16000000 * 100 = 93.75%
    expect(result.circulatingToTotalRatio).toBeCloseTo(93.75, 2);
  });

  it('should handle null total supply', async () => {
    const coinWithNullSupply = {
      ...mockCoinData,
      market_data: {
        ...mockCoinData.market_data,
        total_supply: null
      }
    };
    mockCoingeckoClient.getCoin.mockResolvedValue(coinWithNullSupply);

    const result = await handleTokenMetrics(
      { tokenId: 'aave' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(result.totalSupply).toBeNull();
    expect(result.circulatingToTotalRatio).toBeNull();
  });

  it('should handle null FDV', async () => {
    const coinWithNullFdv = {
      ...mockCoinData,
      market_data: {
        ...mockCoinData.market_data,
        fully_diluted_valuation: null
      }
    };
    mockCoingeckoClient.getCoin.mockResolvedValue(coinWithNullFdv);

    const result = await handleTokenMetrics(
      { tokenId: 'aave' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(result.fullyDilutedValuation).toBeNull();
  });

  it('should use cached data when available', async () => {
    mockCoingeckoClient.getCoin.mockResolvedValue(mockCoinData);

    // First call - should hit API
    await handleTokenMetrics(
      { tokenId: 'aave' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );
    expect(mockCoingeckoClient.getCoin).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    mockCoingeckoClient.getCoin.mockClear();
    const cachedResult = await handleTokenMetrics(
      { tokenId: 'aave' },
      { cache: mockCache, coingeckoClient: mockCoingeckoClient }
    );

    expect(mockCoingeckoClient.getCoin).not.toHaveBeenCalled();
    expect(cachedResult.tokenId).toBe('aave');
  });

  it('should propagate API errors', async () => {
    mockCoingeckoClient.getCoin.mockRejectedValue(new Error('Token not found: invalid'));

    await expect(
      handleTokenMetrics(
        { tokenId: 'invalid' },
        { cache: mockCache, coingeckoClient: mockCoingeckoClient }
      )
    ).rejects.toThrow('Token not found');
  });
});
