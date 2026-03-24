import { RateLimiter, withRetry } from '../utils/rateLimiter.js';
import type { CoinGeckoCoinData, CoinGeckoMarketChart } from '../types/index.js';

export class CoinGeckoClient {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private rateLimiter = new RateLimiter('coingecko');
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY;
    if (this.apiKey) {
      console.error('CoinGecko: Using API key for higher rate limits');
    } else {
      console.error('CoinGecko: Using free tier (30 req/min)');
    }
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (this.apiKey) {
      headers['x-cg-demo-api-key'] = this.apiKey;
    }
    return headers;
  }

  async getCoin(id: string): Promise<CoinGeckoCoinData> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const url = `${this.baseUrl}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;

      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Token not found: ${id}`);
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      return response.json() as Promise<CoinGeckoCoinData>;
    });
  }

  async getMarketChart(id: string, days: number): Promise<CoinGeckoMarketChart> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const url = `${this.baseUrl}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Token not found: ${id}`);
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      return response.json() as Promise<CoinGeckoMarketChart>;
    });
  }

  async searchCoin(query: string): Promise<Array<{ id: string; name: string; symbol: string }>> {
    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;

      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        throw new Error(`CoinGecko search error: ${response.status}`);
      }

      const data = await response.json() as { coins: Array<{ id: string; name: string; symbol: string }> };
      return data.coins.slice(0, 10);
    });
  }
}
