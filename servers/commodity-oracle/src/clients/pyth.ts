import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

// Pyth Hermes API response types
interface PythPrice {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
}

interface PythPriceFeed {
  id: string;
  price: PythPrice;
  ema_price: PythPrice;
}

interface PythLatestResponse {
  parsed: PythPriceFeed[];
}

// Pyth feed IDs for commodities (mainnet)
// Source: https://docs.pyth.network/price-feeds/pro/price-feed-ids
const PYTH_FEED_IDS: Record<string, string> = {
  XAU: '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',   // Gold/USD
  XAG: '0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e',   // Silver/USD
  WTI: '0xb51c577aa6c8ccc9ae7c88f54bc1232a51afcfb9e69c1f66b76eb5f56ab23e6b',   // WTI Crude Oil/USD
  BRENT: '0x374ddb8a25370dc3a997fd3c73103b1ac04c2cfd60103bf7f607fdb56c968e0d'  // BRENT1M (front-month futures)
  // Note: Natural Gas (NG) not available on Pyth mainnet as of 2026-03
};

export class PythClient {
  private baseUrl = 'https://hermes.pyth.network';
  private rateLimiter = new RateLimiter('pyth');

  async getLatestPrice(commodity: string): Promise<{
    price: number;
    confidence: number;
    timestamp: number;
    expo: number;
  }> {
    const feedId = PYTH_FEED_IDS[commodity];
    if (!feedId) {
      throw new Error(`Unknown commodity: ${commodity}. Supported: ${Object.keys(PYTH_FEED_IDS).join(', ')}`);
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const url = `${this.baseUrl}/v2/updates/price/latest?ids[]=${feedId}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Price feed not found for ${commodity}`);
        }
        if (response.status === 429) {
          throw new Error('Pyth rate limit exceeded');
        }
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json() as PythLatestResponse;

      if (!data.parsed || data.parsed.length === 0) {
        throw new Error(`No price data returned for ${commodity}`);
      }

      const feed = data.parsed[0];
      const expo = feed.price.expo;
      const price = Number(feed.price.price) * Math.pow(10, expo);
      const confidence = Number(feed.price.conf) * Math.pow(10, expo);

      return {
        price,
        confidence,
        timestamp: feed.price.publish_time,
        expo
      };
    });
  }

  async getMultiplePrices(commodities: string[]): Promise<Map<string, {
    price: number;
    confidence: number;
    timestamp: number;
  }>> {
    const feedIds = commodities
      .map(c => PYTH_FEED_IDS[c])
      .filter(Boolean);

    if (feedIds.length === 0) {
      throw new Error('No valid feed IDs for requested commodities');
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const idsParam = feedIds.map(id => `ids[]=${id}`).join('&');
      const url = `${this.baseUrl}/v2/updates/price/latest?${idsParam}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json() as PythLatestResponse;
      const result = new Map<string, { price: number; confidence: number; timestamp: number }>();

      for (const feed of data.parsed || []) {
        // Find commodity by feed ID
        const commodity = Object.entries(PYTH_FEED_IDS).find(
          ([, id]) => id === feed.id
        )?.[0];

        if (commodity) {
          const expo = feed.price.expo;
          result.set(commodity, {
            price: Number(feed.price.price) * Math.pow(10, expo),
            confidence: Number(feed.price.conf) * Math.pow(10, expo),
            timestamp: feed.price.publish_time
          });
        }
      }

      return result;
    });
  }

  hasFeed(commodity: string): boolean {
    return commodity in PYTH_FEED_IDS;
  }

  getSupportedCommodities(): string[] {
    return Object.keys(PYTH_FEED_IDS);
  }
}
