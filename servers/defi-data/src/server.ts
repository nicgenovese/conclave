import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  TokenMetricsInputSchema,
  ProtocolMetricsInputSchema,
  ProtocolRevenueInputSchema,
  VolatilityInputSchema
} from './types/index.js';
import {
  AaveReservesInputSchema,
  AaveUserPositionsInputSchema,
  AaveRateHistoryInputSchema
} from './types/aave.js';
import {
  CompoundMarketsInputSchema,
  CompoundAccountInputSchema,
  CompoundHistoryInputSchema
} from './types/compound.js';
import { CacheManager } from './utils/cache.js';
import { CoinGeckoClient } from './clients/coingecko.js';
import { DefiLlamaClient } from './clients/defillama.js';
import { TheGraphClient } from './clients/thegraph.js';
import { AaveV3Client } from './clients/aave-v3.js';
import { CompoundV3Client } from './clients/compound-v3.js';
import { handleTokenMetrics } from './tools/tokenMetrics.js';
import { handleProtocolMetrics } from './tools/protocolMetrics.js';
import { handleProtocolRevenue } from './tools/protocolRevenue.js';
import { handleVolatility } from './tools/volatility.js';
import { handleAaveReserves } from './tools/aaveReserves.js';
import { handleAaveUserPositions } from './tools/aaveUserPositions.js';
import { handleAaveRateHistory } from './tools/aaveRateHistory.js';
import { handleCompoundMarkets } from './tools/compoundMarkets.js';
import { handleCompoundAccount } from './tools/compoundAccounts.js';
import { handleCompoundHistory } from './tools/compoundHistory.js';

export function createServer(): McpServer {
  // Initialize shared resources
  const cache = new CacheManager();
  const coingeckoClient = new CoinGeckoClient();
  const defiLlamaClient = new DefiLlamaClient();

  // Initialize subgraph clients
  const theGraphClient = new TheGraphClient();
  const aaveV3Client = new AaveV3Client(theGraphClient);
  const compoundV3Client = new CompoundV3Client(theGraphClient);

  // Periodic cache cleanup
  setInterval(() => cache.cleanup(), 60000);

  // Create MCP server
  const server = new McpServer({
    name: 'conclave-defi-data',
    version: '1.0.0'
  });

  // Register tools
  server.tool(
    'defi_get_token_metrics',
    'Get token supply, market cap, FDV, price, and ATH metrics for a cryptocurrency',
    TokenMetricsInputSchema.shape,
    async (params) => {
      try {
        const input = TokenMetricsInputSchema.parse(params);
        const result = await handleTokenMetrics(input, {
          cache,
          coingeckoClient
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_protocol_metrics',
    'Get TVL history, chain distribution, and liquidity health for a DeFi protocol',
    ProtocolMetricsInputSchema.shape,
    async (params) => {
      try {
        const input = ProtocolMetricsInputSchema.parse(params);
        const result = await handleProtocolMetrics(input, {
          cache,
          defiLlamaClient
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_protocol_revenue',
    'Get fee revenue, value capture rating, and revenue trends for a DeFi protocol',
    ProtocolRevenueInputSchema.shape,
    async (params) => {
      try {
        const input = ProtocolRevenueInputSchema.parse(params);
        const result = await handleProtocolRevenue(input, {
          cache,
          defiLlamaClient
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_volatility',
    'Get historical price volatility, max drawdown, and risk rating for a token',
    VolatilityInputSchema.shape,
    async (params) => {
      try {
        const input = VolatilityInputSchema.parse(params);
        const result = await handleVolatility(input, {
          cache,
          coingeckoClient
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  // ========== Aave V3 Subgraph Tools ==========

  server.tool(
    'defi_get_aave_reserves',
    'Get Aave V3 reserve data including supply/borrow rates, liquidity, utilization, and risk parameters',
    AaveReservesInputSchema.shape,
    async (params) => {
      try {
        const input = AaveReservesInputSchema.parse(params);
        const result = await handleAaveReserves(input, {
          cache,
          aaveV3Client
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_aave_user_positions',
    'Get a user\'s supply and borrow positions on Aave V3',
    AaveUserPositionsInputSchema.shape,
    async (params) => {
      try {
        const input = AaveUserPositionsInputSchema.parse(params);
        const result = await handleAaveUserPositions(input, {
          cache,
          aaveV3Client
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_aave_rate_history',
    'Get historical supply and borrow rate data for an Aave V3 reserve',
    AaveRateHistoryInputSchema.shape,
    async (params) => {
      try {
        const input = AaveRateHistoryInputSchema.parse(params);
        const result = await handleAaveRateHistory(input, {
          cache,
          aaveV3Client
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  // ========== Compound V3 Subgraph Tools ==========

  server.tool(
    'defi_get_compound_markets',
    'Get Compound V3 market data including supply/borrow rates and utilization',
    CompoundMarketsInputSchema.shape,
    async (params) => {
      try {
        const input = CompoundMarketsInputSchema.parse(params);
        const result = await handleCompoundMarkets(input, {
          cache,
          compoundV3Client
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_compound_account',
    'Get a user\'s positions on Compound V3 markets',
    CompoundAccountInputSchema.shape,
    async (params) => {
      try {
        const input = CompoundAccountInputSchema.parse(params);
        const result = await handleCompoundAccount(input, {
          cache,
          compoundV3Client
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'defi_get_compound_history',
    'Get historical market data for a Compound V3 market',
    CompoundHistoryInputSchema.shape,
    async (params) => {
      try {
        const input = CompoundHistoryInputSchema.parse(params);
        const result = await handleCompoundHistory(input, {
          cache,
          compoundV3Client
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true
        };
      }
    }
  );

  return server;
}
