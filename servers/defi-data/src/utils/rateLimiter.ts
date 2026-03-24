interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  minDelayMs: number;
}

const RATE_LIMITS: Record<string, RateLimiterConfig> = {
  defillama: {
    maxRequestsPerMinute: 60,
    minDelayMs: 100
  },
  coingecko: {
    maxRequestsPerMinute: 30, // Free tier limit
    minDelayMs: 2000
  },
  tokenterminal: {
    maxRequestsPerMinute: 60,
    minDelayMs: 1000
  },
  tokenomist: {
    maxRequestsPerMinute: 60,
    minDelayMs: 1000
  },
  thegraph: {
    maxRequestsPerMinute: 100, // The Graph free tier is generous
    minDelayMs: 100
  }
};

export class RateLimiter {
  private requestTimestamps: number[] = [];
  private config: RateLimiterConfig;
  private lastRequestTime = 0;

  constructor(source: keyof typeof RATE_LIMITS | string) {
    this.config = RATE_LIMITS[source] || RATE_LIMITS.defillama;
  }

  async throttle(): Promise<void> {
    const now = Date.now();

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.minDelayMs) {
      await this.sleep(this.config.minDelayMs - timeSinceLastRequest);
    }

    // Check rate limit window
    const windowStart = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(t => t > windowStart);

    if (this.requestTimestamps.length >= this.config.maxRequestsPerMinute) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitTime = oldestInWindow - windowStart + 100;
      await this.sleep(waitTime);
    }

    this.requestTimestamps.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}
