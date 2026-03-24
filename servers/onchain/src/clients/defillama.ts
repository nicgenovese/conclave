import { RateLimiter, withRetry } from '../utils/rateLimiter.js';
import type { DefiLlamaProtocol, DefiLlamaTvlHistory } from '../types/index.js';

export class DefiLlamaClient {
  private baseUrl = 'https://api.llama.fi';
  private rateLimiter = new RateLimiter('defillama');

  async getProtocol(slug: string): Promise<DefiLlamaProtocol> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(`${this.baseUrl}/protocol/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Protocol not found: ${slug}`);
        }
        throw new Error(`DefiLlama API error: ${response.status}`);
      }

      return response.json() as Promise<DefiLlamaProtocol>;
    });
  }

  async getTvlHistory(slug: string): Promise<DefiLlamaTvlHistory[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(`${this.baseUrl}/protocol/${slug}`);

      if (!response.ok) {
        throw new Error(`DefiLlama API error: ${response.status}`);
      }

      const data = await response.json() as { tvl: DefiLlamaTvlHistory[] };
      return data.tvl || [];
    });
  }

  async getAllProtocols(): Promise<DefiLlamaProtocol[]> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const response = await fetch(`${this.baseUrl}/protocols`);

      if (!response.ok) {
        throw new Error(`DefiLlama API error: ${response.status}`);
      }

      return response.json() as Promise<DefiLlamaProtocol[]>;
    });
  }
}
