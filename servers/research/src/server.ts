import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  SearchMemosInputSchema,
  GetDecisionsInputSchema,
  GetLearningsInputSchema,
  GetRedFlagsInputSchema,
  GetAnalogousCasesInputSchema,
  ArchiveDecisionInputSchema,
  PreloadContextInputSchema
} from './types/index.js';
import { CacheManager } from './utils/cache.js';
import { ArchiveManager } from './archive/manager.js';
import { handleSearchMemos } from './tools/searchMemos.js';
import { handleGetDecisions } from './tools/getDecisions.js';
import { handleGetLearnings } from './tools/getLearnings.js';
import { handleGetRedFlags } from './tools/getRedFlags.js';
import { handleGetAnalogousCases } from './tools/getAnalogousCases.js';
import { handleArchiveDecision } from './tools/archiveDecision.js';
import { handlePreloadContext } from './tools/preloadContext.js';

export function createServer(): McpServer {
  // Initialize shared resources
  const cache = new CacheManager();
  const archiveManager = new ArchiveManager();

  // Periodic cache cleanup
  setInterval(() => cache.cleanup(), 60000);

  // Create MCP server
  const server = new McpServer({
    name: 'conclave-research',
    version: '1.0.0'
  });

  // Register tools
  server.tool(
    'research_search_memos',
    'Search historical investment memos by protocol name and keywords',
    SearchMemosInputSchema.shape,
    async (params) => {
      try {
        const input = SearchMemosInputSchema.parse(params);
        const result = await handleSearchMemos(input, { cache, archiveManager });
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
    'research_get_decisions',
    'Retrieve past investment decisions by protocol, sector, or outcome',
    GetDecisionsInputSchema.shape,
    async (params) => {
      try {
        const input = GetDecisionsInputSchema.parse(params);
        const result = await handleGetDecisions(input, { cache, archiveManager });
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
    'research_get_learnings',
    'Access pattern databases, sector learnings, and historical success/failure patterns',
    GetLearningsInputSchema.shape,
    async (params) => {
      try {
        const input = GetLearningsInputSchema.parse(params);
        const result = await handleGetLearnings(input, { cache, archiveManager });
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
    'research_get_red_flags',
    'Retrieve historical warning signs catalog with severity ratings and mitigation strategies',
    GetRedFlagsInputSchema.shape,
    async (params) => {
      try {
        const input = GetRedFlagsInputSchema.parse(params);
        const result = await handleGetRedFlags(input, { cache, archiveManager });
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
    'research_get_analogous_cases',
    'Find historical cases similar to the current evaluation target',
    GetAnalogousCasesInputSchema.shape,
    async (params) => {
      try {
        const input = GetAnalogousCasesInputSchema.parse(params);
        const result = await handleGetAnalogousCases(input, { cache, archiveManager });
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
    'research_archive_decision',
    'Store a new committee decision record in the archive',
    ArchiveDecisionInputSchema.shape,
    async (params) => {
      try {
        const input = ArchiveDecisionInputSchema.parse(params);
        const result = await handleArchiveDecision(input, { archiveManager });
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
    'research_preload_context',
    'Preload all relevant historical context for a protocol in a single call. Returns prior decisions, analogous cases, sector learnings, and red flags to watch. Use this at the start of Phase 1 for efficient Knowledge Agent context loading.',
    PreloadContextInputSchema.shape,
    async (params) => {
      try {
        const input = PreloadContextInputSchema.parse(params);
        const result = await handlePreloadContext(input, { cache, archiveManager });
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
