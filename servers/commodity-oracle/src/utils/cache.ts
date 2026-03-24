interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL: Record<string, number> = {
  spotPrice: 30000,             // 30 seconds - real-time pricing
  futuresCurve: 300000,         // 5 minutes
  priceHistory: 600000,         // 10 minutes
  volatility: 1800000,          // 30 minutes
  oracleHealth: 60000,          // 1 minute
  oracleComparison: 30000,      // 30 seconds
  reserveAttestation: 3600000,  // 1 hour
  collateralHealth: 300000,     // 5 minutes
  tokenPremium: 600000,         // 10 minutes
  lcValidation: 300000,         // 5 minutes
  default: 300000               // 5 minutes
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

  set<T>(key: string, value: T, ttlKey?: keyof typeof CACHE_TTL): void {
    const ttl = CACHE_TTL[ttlKey || 'default'];
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
