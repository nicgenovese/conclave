import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleExchangeFlows } from '../../src/tools/exchangeFlows.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleExchangeFlows', () => {
  let mockCache: CacheManager;
  let mockDuneClient: {
    getTokenTransfers: ReturnType<typeof vi.fn>;
  };

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 86400000 * 2);

  const mockTransfers = [
    {
      tx_hash: '0xabc1',
      block_time: yesterday.toISOString(),
      from: '0x1234567890abcdef1234567890abcdef12345678',
      to: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
      amount: '1000',
      amount_usd: 100000
    },
    {
      tx_hash: '0xabc2',
      block_time: yesterday.toISOString(),
      from: '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase
      to: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '500',
      amount_usd: 50000
    },
    {
      tx_hash: '0xabc3',
      block_time: twoDaysAgo.toISOString(),
      from: '0x2910543af39aba0cd09dbb2d50200b3e800a63d2', // Kraken
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: '2000',
      amount_usd: 200000
    }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDuneClient = {
      getTokenTransfers: vi.fn()
    };
  });

  it('should calculate exchange flows correctly', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    expect(result.tokenAddress).toBe('0xtoken');
    expect(result.chain).toBe('ethereum');
    expect(result.period).toBe('7d');
    expect(result.summary.totalInflowUsd).toBe(100000); // Only Binance deposit
    expect(result.summary.totalOutflowUsd).toBe(250000); // Coinbase + Kraken withdrawals
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should calculate netflow signal correctly', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    // Net outflow > 10% should be Bullish
    expect(result.summary.netflowUsd).toBe(150000);
    expect(result.summary.flowSignal).toBe('Bullish');
  });

  it('should detect bearish signal on net inflow', async () => {
    const bearishTransfers = [
      {
        tx_hash: '0x1',
        block_time: yesterday.toISOString(),
        from: '0x1111111111111111111111111111111111111111',
        to: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
        amount: '5000',
        amount_usd: 500000
      },
      {
        tx_hash: '0x2',
        block_time: yesterday.toISOString(),
        from: '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase
        to: '0x2222222222222222222222222222222222222222',
        amount: '100',
        amount_usd: 10000
      }
    ];
    mockDuneClient.getTokenTransfers.mockResolvedValue(bearishTransfers);

    const result = await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    expect(result.summary.flowSignal).toBe('Bearish');
  });

  it('should aggregate daily flows', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    expect(result.dailyFlows.length).toBeGreaterThan(0);
    expect(result.dailyFlows[0]).toHaveProperty('date');
    expect(result.dailyFlows[0]).toHaveProperty('inflowUsd');
    expect(result.dailyFlows[0]).toHaveProperty('outflowUsd');
    expect(result.dailyFlows[0]).toHaveProperty('netflowUsd');
  });

  it('should break down flows by exchange', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    const result = await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    expect(result.exchangeBreakdown.length).toBeGreaterThan(0);
    const binanceFlow = result.exchangeBreakdown.find(e => e.exchange === 'Binance');
    expect(binanceFlow).toBeDefined();
    expect(binanceFlow?.inflowUsd).toBe(100000);
  });

  it('should use cached data when available', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue(mockTransfers);

    // First call
    await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    // Second call should use cache
    mockDuneClient.getTokenTransfers.mockClear();

    await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    expect(mockDuneClient.getTokenTransfers).not.toHaveBeenCalled();
  });

  it('should handle empty transfer list', async () => {
    mockDuneClient.getTokenTransfers.mockResolvedValue([]);

    const result = await handleExchangeFlows(
      { tokenAddress: '0xtoken', chain: 'ethereum', period: '7d' },
      { cache: mockCache, duneClient: mockDuneClient }
    );

    expect(result.summary.totalInflowUsd).toBe(0);
    expect(result.summary.totalOutflowUsd).toBe(0);
    expect(result.summary.netflowUsd).toBe(0);
    expect(result.summary.flowSignal).toBe('Neutral');
  });
});
