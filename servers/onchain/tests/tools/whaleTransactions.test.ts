import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWhaleTransactions } from '../../src/tools/whaleTransactions.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleWhaleTransactions', () => {
  let mockCache: CacheManager;
  let mockDuneClient: {
    getTokenTransfers: ReturnType<typeof vi.fn>;
  };
  let mockEtherscanClient: {
    isContractVerified: ReturnType<typeof vi.fn>;
  };

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  const mockTransfers = [
    {
      tx_hash: '0xwhale1',
      block_number: 12345678,
      block_time: yesterday.toISOString(),
      from: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
      to: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '100000',
      amount_usd: 1000000
    },
    {
      tx_hash: '0xwhale2',
      block_number: 12345679,
      block_time: yesterday.toISOString(),
      from: '0xabcdef1234567890abcdef1234567890abcdef12',
      to: '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase
      amount: '50000',
      amount_usd: 500000
    },
    {
      tx_hash: '0xsmall',
      block_number: 12345680,
      block_time: yesterday.toISOString(),
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      amount: '100',
      amount_usd: 1000 // Below whale threshold
    }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDuneClient = {
      getTokenTransfers: vi.fn()
    };
    mockEtherscanClient = {
      isContractVerified: vi.fn()
    };
  });

  it('should filter transactions by minimum value', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.transactions.length).toBe(2);
    expect(result.transactions.every(tx => tx.valueUsd >= 100000)).toBe(true);
  });

  it('should label known exchange addresses', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    const binanceTx = result.transactions.find(tx => tx.fromLabel === 'Binance');
    expect(binanceTx).toBeDefined();

    const coinbaseTx = result.transactions.find(tx => tx.toLabel === 'Coinbase');
    expect(coinbaseTx).toBeDefined();
  });

  it('should categorize transaction types correctly', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    const withdrawal = result.transactions.find(tx => tx.txType === 'ExchangeWithdrawal');
    expect(withdrawal).toBeDefined();

    const deposit = result.transactions.find(tx => tx.txType === 'ExchangeDeposit');
    expect(deposit).toBeDefined();
  });

  it('should calculate statistics correctly', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.statistics.totalTransactions).toBe(2);
    expect(result.statistics.totalVolumeUsd).toBe(1500000);
    expect(result.statistics.avgTransactionUsd).toBe(750000);
    expect(result.statistics.largestTransactionUsd).toBe(1000000);
  });

  it('should respect limit parameter', async () => {
    const manyTransfers = Array.from({ length: 10 }, (_, i) => ({
      tx_hash: `0xtx${i}`,
      block_number: 12345678 + i,
      block_time: yesterday.toISOString(),
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      amount: '100000',
      amount_usd: 1000000
    }));
    mockDuneClient.getTokenTransfers.mockResolvedValue(manyTransfers);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 5 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.transactions.length).toBe(5);
  });

  it('should filter by period', async () => {
    const oldDate = new Date(now.getTime() - 86400000 * 10); // 10 days ago
    const oldTransfers = [
      {
        tx_hash: '0xold',
        block_number: 12345600,
        block_time: oldDate.toISOString(),
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        amount: '100000',
        amount_usd: 1000000
      }
    ];
    mockDuneClient.getTokenTransfers.mockResolvedValue(oldTransfers);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.transactions.length).toBe(0);
  });

  it('should use cached data when available', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    // First call
    await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    // Second call should use cache
    mockDuneClient.getTokenTransfers.mockClear();

    await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(mockDuneClient.getTokenTransfers).not.toHaveBeenCalled();
  });

  it('should handle empty results', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue([]);

    const result = await handleWhaleTransactions(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d', minValueUsd: 100000, limit: 50 },
      { cache: mockCache, duneClient: mockDuneClient, etherscanClient: mockEtherscanClient }
    );

    expect(result.transactions.length).toBe(0);
    expect(result.statistics.totalTransactions).toBe(0);
    expect(result.statistics.totalVolumeUsd).toBe(0);
    expect(result.statistics.avgTransactionUsd).toBe(0);
    expect(result.statistics.largestTransactionUsd).toBe(0);
  });
});
