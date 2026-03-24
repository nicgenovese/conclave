import { RateLimiter, withRetry } from '../utils/rateLimiter.js';

interface MetalsApiLatestResponse {
  success: boolean;
  timestamp: number;
  date: string;
  base: string;
  rates: Record<string, number>;
}

interface MetalsApiTimeSeriesResponse {
  success: boolean;
  timeseries: boolean;
  start_date: string;
  end_date: string;
  base: string;
  rates: Record<string, Record<string, number>>;
}

// Symbol mapping for Metals-API
const METALS_API_SYMBOLS: Record<string, string> = {
  XAU: 'XAU',   // Gold
  XAG: 'XAG',   // Silver
  XPT: 'XPT',   // Platinum
  XPD: 'XPD',   // Palladium
  WTI: 'WTIOIL', // WTI Crude Oil (if supported)
  BRENT: 'BRENTOIL' // Brent Crude Oil (if supported)
};

export class MetalsApiClient {
  private apiKey: string;
  private baseUrl = 'https://metals-api.com/api';
  private rateLimiter = new RateLimiter('metals_api');

  constructor() {
    this.apiKey = process.env.METALS_API_KEY || '';
    if (!this.apiKey) {
      console.error('Warning: METALS_API_KEY not set - Metals-API calls will fail');
    }
  }

  async getLatestPrice(
    commodity: string,
    baseCurrency: string = 'USD'
  ): Promise<{
    price: number;
    timestamp: number;
    date: string;
  }> {
    const symbol = METALS_API_SYMBOLS[commodity];
    if (!symbol) {
      throw new Error(`Unsupported commodity for Metals-API: ${commodity}`);
    }

    if (!this.apiKey) {
      throw new Error('METALS_API_KEY not configured');
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const url = `${this.baseUrl}/latest?access_key=${this.apiKey}&base=${baseCurrency}&symbols=${symbol}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Metals-API rate limit exceeded');
        }
        throw new Error(`Metals-API error: ${response.status}`);
      }

      const data = await response.json() as MetalsApiLatestResponse;

      if (!data.success) {
        throw new Error('Metals-API request failed');
      }

      // Metals-API returns inverse rates (1/price for metals)
      const rate = data.rates[symbol];
      if (rate === undefined) {
        throw new Error(`No rate returned for ${symbol}`);
      }

      // Convert from base currency per ounce to price per ounce
      const price = 1 / rate;

      return {
        price,
        timestamp: data.timestamp,
        date: data.date
      };
    });
  }

  async getHistoricalPrices(
    commodity: string,
    startDate: string,
    endDate: string,
    baseCurrency: string = 'USD'
  ): Promise<Array<{
    date: string;
    price: number;
  }>> {
    const symbol = METALS_API_SYMBOLS[commodity];
    if (!symbol) {
      throw new Error(`Unsupported commodity for Metals-API: ${commodity}`);
    }

    if (!this.apiKey) {
      throw new Error('METALS_API_KEY not configured');
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const url = `${this.baseUrl}/timeseries?access_key=${this.apiKey}&start_date=${startDate}&end_date=${endDate}&base=${baseCurrency}&symbols=${symbol}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Metals-API error: ${response.status}`);
      }

      const data = await response.json() as MetalsApiTimeSeriesResponse;

      if (!data.success) {
        throw new Error('Metals-API timeseries request failed');
      }

      const history: Array<{ date: string; price: number }> = [];

      for (const [date, rates] of Object.entries(data.rates)) {
        const rate = rates[symbol];
        if (rate !== undefined) {
          history.push({
            date,
            price: 1 / rate
          });
        }
      }

      // Sort by date
      history.sort((a, b) => a.date.localeCompare(b.date));

      return history;
    });
  }

  async getMultiplePrices(
    commodities: string[],
    baseCurrency: string = 'USD'
  ): Promise<Map<string, number>> {
    const symbols = commodities
      .map(c => METALS_API_SYMBOLS[c])
      .filter(Boolean);

    if (symbols.length === 0) {
      throw new Error('No valid symbols for requested commodities');
    }

    if (!this.apiKey) {
      throw new Error('METALS_API_KEY not configured');
    }

    return withRetry(async () => {
      await this.rateLimiter.throttle();

      const symbolsParam = symbols.join(',');
      const url = `${this.baseUrl}/latest?access_key=${this.apiKey}&base=${baseCurrency}&symbols=${symbolsParam}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Metals-API error: ${response.status}`);
      }

      const data = await response.json() as MetalsApiLatestResponse;

      if (!data.success) {
        throw new Error('Metals-API request failed');
      }

      const result = new Map<string, number>();

      for (const commodity of commodities) {
        const symbol = METALS_API_SYMBOLS[commodity];
        const rate = data.rates[symbol];
        if (rate !== undefined) {
          result.set(commodity, 1 / rate);
        }
      }

      return result;
    });
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  hasCommodity(commodity: string): boolean {
    return commodity in METALS_API_SYMBOLS;
  }

  getSupportedCommodities(): string[] {
    return Object.keys(METALS_API_SYMBOLS);
  }
}
