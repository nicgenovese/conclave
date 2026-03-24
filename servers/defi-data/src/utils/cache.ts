interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL: Record<string, number> = {
  tokenMetrics: 300000,       // 5 minutes
  protocolMetrics: 600000,    // 10 minutes
  protocolRevenue: 3600000,   // 1 hour (revenue data updates infrequently)
  volatility: 300000,         // 5 minutes
  liquidityDepth: 300000,     // 5 minutes
  stakingYields: 600000,      // 10 minutes
  emissionsSchedule: 3600000, // 1 hour (unlock schedules are static)
  // Subgraph data TTLs
  aaveReserves: 180000,       // 3 minutes (rates change frequently)
  aaveUserPositions: 60000,   // 1 minute (positions can change rapidly)
  aaveRateHistory: 900000,    // 15 minutes (historical data stable)
  compoundMarkets: 180000,    // 3 minutes
  compoundAccount: 60000,     // 1 minute
  compoundHistory: 900000,    // 15 minutes
  subgraphStatus: 60000,      // 1 minute (sync status checks)
  default: 300000             // 5 minutes
};

export class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlKey?: keyof typeof CACHE_TTL | string): void {
    const ttl = CACHE_TTL[ttlKey || 'default'] || CACHE_TTL.default;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  generateKey(tool: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${String(params[k])}`)
      .join('&');
    return `${tool}:${sortedParams}`;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
