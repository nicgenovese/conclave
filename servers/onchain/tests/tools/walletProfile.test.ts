import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWalletProfile } from '../../src/tools/walletProfile.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleWalletProfile', () => {
  let mockCache: CacheManager;
  let mockDuneClient: {
    getTokenTransfers: ReturnType<typeof vi.fn>;
  };
  let mockEtherscanClient: {
    isContractVerified: ReturnType<typeof vi.fn>;
  };

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  const mockTransfers = [
    {
      tx_hash: '0xtx1',
      block_time: oneWeekAgo.toISOString(),
      from: '0x0000000000000000000000000000000000000000', // Mint
      to: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
      amount: '1000000'
    },
    {
      tx_hash: '0xtx2',
      block_time: oneWeekAgo.toISOString(),
      from: '0x0000000000000000000000000000000000000000',
      to: '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase
      amount: '500000'
    },
    {
      tx_hash: '0xtx3',
      block_time: oneWeekAgo.toISOString(),
      from: '0x0000000000000000000000000000000000000000',
      to: '0x1234567890abcdef1234567890abcdef12345678', // Unknown holder
      amount: '250000'
    },
    {
      tx_hash: '0xtx4',
      block_time: twoWeeksAgo.toISOString(),
      from: '0x0000000000000000000000000000000000000000',
      to: '0xabcdef1234567890abcdef1234567890abcdef12', // Another unknown
      amount: '100000'
    }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDuneClient = {
      getTokenTransfers: vi.fn()
    };
    mockEtherscanClient = {
      isContractVerified: vi.fn().mockResolvedValue(false)
    };
    // Mock global fetch for price API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        coins: {
          'ethereum:0xtoken': { price: 100, symbol: 'TKN', timestamp: Date.now() / 1000, confidence: 1 }
        }
      })
    });
  });

  it('should return wallet profile with top holders', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.tokenAddress).toBe('0xtoken');
    expect(result.chain).toBe('ethereum');
    expect(result.topHolders.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('concentrationMetrics');
    expect(result).toHaveProperty('holderTrend');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should categorize known exchange addresses', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    const exchangeHolders = result.topHolders.filter(h => h.category === 'Exchange');
    expect(exchangeHolders.length).toBeGreaterThan(0);

    const binance = result.topHolders.find(h => h.label === 'Binance');
    expect(binance).toBeDefined();
  });

  it('should calculate concentration metrics', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.concentrationMetrics).toHaveProperty('top10Percent');
    expect(result.concentrationMetrics).toHaveProperty('top25Percent');
    expect(result.concentrationMetrics).toHaveProperty('top50Percent');
    expect(result.concentrationMetrics.top10Percent).toBeGreaterThanOrEqual(0);
    expect(result.concentrationMetrics.top10Percent).toBeLessThanOrEqual(100);
  });

  it('should calculate holder balance percentages', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    const totalPercent = result.topHolders.reduce((sum, h) => sum + h.percentOfSupply, 0);
    expect(totalPercent).toBeCloseTo(100, 0);
  });

  it('should identify smart money holdings', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.smartMoneyHoldings).toHaveProperty('addressCount');
    expect(result.smartMoneyHoldings).toHaveProperty('totalValueUsd');
    expect(result.smartMoneyHoldings).toHaveProperty('percentOfSupply');
  });

  it('should categorize contracts as Protocol', async () => {
    mockEtherscanClient.isContractVerified.mockResolvedValue(true);
    mockDuneClient.getTokenTransfers.mockResolvedValue([
      {
        tx_hash: '0xtx1',
        block_time: oneWeekAgo.toISOString(),
        from: '0x0000000000000000000000000000000000000000',
        to: '0x1111111111111111111111111111111111111111',
        amount: '1000000'
      }
    ]);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    const protocolHolder = result.topHolders.find(h => h.category === 'Protocol');
    expect(protocolHolder).toBeDefined();
  });

  it('should use cached data when available', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    // First call
    await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    // Second call should use cache
    mockDuneClient.getTokenTransfers.mockClear();

    await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(mockDuneClient.getTokenTransfers).not.toHaveBeenCalled();
  });

  it('should handle empty transfers', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue([]);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 10 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.topHolders.length).toBe(0);
    expect(result.totalHolders).toBe(0);
  });

  it('should respect limit parameter', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWalletProfile(
      { tokenAddress: '0xtoken', chain: 'ethereum', limit: 2 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.topHolders.length).toBeLessThanOrEqual(2);
  });
});
