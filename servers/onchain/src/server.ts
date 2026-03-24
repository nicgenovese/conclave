import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  WalletProfileInputSchema,
  ExchangeFlowsInputSchema,
  WhaleTransactionsInputSchema,
  TvlHistoryInputSchema
} from './types/index.js';
import { CacheManager } from './utils/cache.js';
import { DuneClient } from './clients/dune.js';
import { EtherscanClient } from './clients/etherscan.js';
import { DefiLlamaClient } from './clients/defillama.js';
import { handleWalletProfile } from './tools/walletProfile.js';
import { handleExchangeFlows } from './tools/exchangeFlows.js';
import { handleWhaleTransactions } from './tools/whaleTransactions.js';
import { handleTvlHistory } from './tools/tvlHistory.js';

export function createServer(): McpServer {
  // Initialize shared resources
  const cache = new CacheManager();
  const duneClient = new DuneClient();
  const etherscanClient = new EtherscanClient();
  const defiLlamaClient = new DefiLlamaClient();

  // Periodic cache cleanup
  setInterval(() => cache.cleanup(), 60000);

  // Create MCP server
  const server = new McpServer({
    name: 'conclave-onchain',
    version: '1.0.0'
  });

  // Register tools
  server.tool(
    'onchain_get_wallet_profile',
    'Get wallet labeling, holder categorization, and smart money tracking for a token',
    WalletProfileInputSchema.shape,
    async (params) => {
      try {
        const input = WalletProfileInputSchema.parse(params);
        const result = await handleWalletProfile(input, {
          cache,
          duneClient,
          etherscanClient
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
    'onchain_get_exchange_flows',
    'Get exchange deposit/withdrawal patterns (7D, 30D) for a token',
    ExchangeFlowsInputSchema.shape,
    async (params) => {
      try {
        const input = ExchangeFlowsInputSchema.parse(params);
        const result = await handleExchangeFlows(input, {
          cache,
          duneClient
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
    'onchain_get_whale_transactions',
    'Get large transaction monitoring for a token',
    WhaleTransactionsInputSchema.shape,
    async (params) => {
      try {
        const input = WhaleTransactionsInputSchema.parse(params);
        const result = await handleWhaleTransactions(input, {
          cache,
          duneClient,
          etherscanClient
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
    'onchain_get_tvl_history',
    'Get historical TVL data across chains for a protocol',
    TvlHistoryInputSchema.shape,
    async (params) => {
      try {
        const input = TvlHistoryInputSchema.parse(params);
        const result = await handleTvlHistory(input, {
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

  return server;
}
