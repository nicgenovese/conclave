import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DefiLlamaClient } from '../../src/clients/defillama.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DefiLlamaClient', () => {
  let client: DefiLlamaClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new DefiLlamaClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProtocol', () => {
    it('should return protocol data for valid slug', async () => {
      const mockResponse = {
        id: '1',
        name: 'Aave',
        slug: 'aave',
        category: 'Lending',
        tvl: [
          { date: 1709251200, totalLiquidityUSD: 10000000000 },
          { date: 1709337600, totalLiquidityUSD: 10500000000 }
        ],
        currentChainTvls: {
          Ethereum: 7000000000,
          Polygon: 2000000000,
          Arbitrum: 1500000000
        },
        chains: ['Ethereum', 'Polygon', 'Arbitrum']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getProtocol('aave');

      expect(result.name).toBe('Aave');
      expect(result.slug).toBe('aave');
      expect(result.category).toBe('Lending');
      expect(result.tvl).toHaveLength(2);
      expect(result.currentChainTvls).toHaveProperty('Ethereum');
    });

    it('should throw error for non-existent protocol', async () => {
      // Use mockResolvedValue to persist across retries
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(client.getProtocol('invalid-protocol')).rejects.toThrow('Protocol not found');
    });
  });

  describe('getFeesOverview', () => {
    it('should return fees data for all protocols', async () => {
      const mockResponse = {
        protocols: [
          {
            name: 'Uniswap',
            slug: 'uniswap',
            total24h: 5000000,
            total7d: 35000000,
            total30d: 150000000,
            totalAllTime: 3000000000,
            revenue24h: 1000000,
            revenue7d: 7000000,
            revenue30d: 30000000
          },
          {
            name: 'Aave',
            slug: 'aave',
            total24h: 2000000,
            total7d: 14000000,
            total30d: 60000000,
            totalAllTime: 1500000000,
            revenue24h: 500000,
            revenue7d: 3500000,
            revenue30d: 15000000
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getFeesOverview();

      expect(result.protocols).toHaveLength(2);
      expect(result.protocols[0].name).toBe('Uniswap');
      expect(result.protocols[0].total24h).toBe(5000000);
    });
  });

  describe('getProtocolFees', () => {
    it('should return fees for specific protocol', async () => {
      const mockResponse = {
        protocols: [
          {
            name: 'Aave',
            slug: 'aave',
            total24h: 2000000,
            total7d: 14000000,
            total30d: 60000000,
            totalAllTime: 1500000000,
            revenue24h: 500000,
            revenue7d: 3500000,
            revenue30d: 15000000
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getProtocolFees('aave');

      expect(result).not.toBeNull();
      expect(result!.total24h).toBe(2000000);
      expect(result!.revenue30d).toBe(15000000);
    });

    it('should return null for non-existent protocol', async () => {
      const mockResponse = {
        protocols: [
          { name: 'Uniswap', slug: 'uniswap', total24h: 5000000 }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getProtocolFees('nonexistent');

      expect(result).toBeNull();
    });
  });
});
