interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL: Record<string, number> = {
  walletProfile: 300000,      // 5 minutes
  exchangeFlows: 300000,      // 5 minutes
  whaleTransactions: 60000,   // 1 minute
  tvlHistory: 600000,         // 10 minutes
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

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
