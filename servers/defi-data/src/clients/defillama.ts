import { RateLimiter, withRetry } from '../utils/rateLimiter.js';
import type {
  DefiLlamaProtocol,
  DefiLlamaProtocolDetails,
  DefiLlamaFeesOverview
} from '../types/index.js';

export class DefiLlamaClient {
  private baseUrl = 'https://api.llama.fi';
  private rateLimiter = new RateLimiter('defillama');

  constructor() {
    console.error('DefiLlama: Using free API (no key required)');
  }

  async getProtocols(): Promise<DefiLlamaProtocol[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(`${this.baseUrl}/protocols`);

      if (!response.ok) {
        throw new Error(`DefiLlama API error: ${response.status}`);
      }

      return response.json() as Promise<DefiLlamaProtocol[]>;
    });
  }

  async getProtocol(slug: string): Promise<DefiLlamaProtocolDetails> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(`${this.baseUrl}/protocol/${encodeURIComponent(slug)}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Protocol not found: ${slug}`);
        }
        throw new Error(`DefiLlama API error: ${response.status}`);
      }

      return response.json() as Promise<DefiLlamaProtocolDetails>;
    });
  }

  async getFeesOverview(): Promise<DefiLlamaFeesOverview> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(`${this.baseUrl}/overview/fees`);

      if (!response.ok) {
        throw new Error(`DefiLlama fees API error: ${response.status}`);
      }

      return response.json() as Promise<DefiLlamaFeesOverview>;
    });
  }

  async getProtocolFees(slug: string): Promise<{
    total24h: number | null;
    total7d: number | null;
    total30d: number | null;
    totalAllTime: number | null;
    revenue24h: number | null;
    revenue7d: number | null;
    revenue30d: number | null;
  } | null> {
    const overview = await this.getFeesOverview();
    const protocol = overview.protocols.find(
      p => p.slug.toLowerCase() === slug.toLowerCase() ||
           p.name.toLowerCase() === slug.toLowerCase()
    );

    if (!protocol) return null;

    return {
      total24h: protocol.total24h,
      total7d: protocol.total7d,
      total30d: protocol.total30d,
      totalAllTime: protocol.totalAllTime,
      revenue24h: protocol.revenue24h,
      revenue7d: protocol.revenue7d,
      revenue30d: protocol.revenue30d
    };
  }
}
