interface CacheEntry<T> {
  value: T;
  expiry: number;
}

type CacheCategory = 'proposals' | 'delegates' | 'voting' | 'sentiment' | 'concentration' | 'admin' | 'default';

const TTL_CONFIG: Record<CacheCategory, number> = {
  proposals: 5 * 60 * 1000,      // 5 minutes - proposals change frequently
  delegates: 15 * 60 * 1000,     // 15 minutes - delegate data more stable
  voting: 10 * 60 * 1000,        // 10 minutes
  sentiment: 30 * 60 * 1000,     // 30 minutes - forum data less volatile
  concentration: 60 * 60 * 1000, // 1 hour - concentration metrics stable
  admin: 60 * 60 * 1000,         // 1 hour - admin keys rarely change
  default: 10 * 60 * 1000        // 10 minutes
};

export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .filter(k => params[k] !== undefined)
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, category: CacheCategory = 'default'): void {
    const ttl = TTL_CONFIG[category];
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearCategory(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}
