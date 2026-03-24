import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoinGeckoClient } from '../../src/clients/coingecko.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CoinGeckoClient', () => {
  let client: CoinGeckoClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new CoinGeckoClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCoin', () => {
    it('should return token data for valid ID', async () => {
      const mockResponse = {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getCoin('aave');

      expect(result.id).toBe('aave');
      expect(result.name).toBe('Aave');
      expect(result.market_data.current_price.usd).toBe(100);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent token', async () => {
      // Use mockResolvedValue to persist across retries
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(client.getCoin('invalid-token-xyz')).rejects.toThrow('Token not found');
    });

    it('should throw error on rate limit', async () => {
      // Use mockResolvedValue to persist across retries
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429
      });

      await expect(client.getCoin('aave')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('getMarketChart', () => {
    it('should return historical price data', async () => {
      const mockResponse = {
        prices: [
          [1709251200000, 95],
          [1709337600000, 98],
          [1709424000000, 100]
        ],
        market_caps: [
          [1709251200000, 1400000000],
          [1709337600000, 1450000000],
          [1709424000000, 1500000000]
        ],
        total_volumes: [
          [1709251200000, 45000000],
          [1709337600000, 48000000],
          [1709424000000, 50000000]
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getMarketChart('aave', 30);

      expect(result.prices).toHaveLength(3);
      expect(result.prices[0][1]).toBe(95);
      expect(result.prices[2][1]).toBe(100);
    });
  });

  describe('searchCoin', () => {
    it('should return search results', async () => {
      const mockResponse = {
        coins: [
          { id: 'aave', name: 'Aave', symbol: 'AAVE' },
          { id: 'aavegotchi', name: 'Aavegotchi', symbol: 'GHST' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.searchCoin('aave');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('aave');
    });
  });
});
