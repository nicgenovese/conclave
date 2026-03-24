import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  SpotPriceInputSchema,
  FuturesCurveInputSchema,
  PriceHistoryInputSchema,
  VolatilityInputSchema,
  OracleHealthInputSchema,
  OracleComparisonInputSchema,
  ReserveAttestationInputSchema,
  CollateralHealthInputSchema,
  TokenPremiumInputSchema,
  LcValidationInputSchema,
  LcStructureInputSchema,
  LcDocumentaryInputSchema,
  LcCounterpartyInputSchema,
  LcDiscrepancyInputSchema,
  LcEucpInputSchema,
  LcPricingInputSchema
} from './types/index.js';
import { CacheManager } from './utils/cache.js';
import { PythClient } from './clients/pyth.js';
import { ChainlinkClient } from './clients/chainlink.js';
import { MetalsApiClient } from './clients/metals.js';
import { ReservesClient } from './clients/reserves.js';
import { handleSpotPrice } from './tools/spotPrice.js';
import { handleFuturesPrice } from './tools/futuresPrice.js';
import { handlePriceHistory } from './tools/priceHistory.js';
import { handleVolatility } from './tools/volatility.js';
import { handleOracleHealth } from './tools/oracleHealth.js';
import { handleOracleComparison } from './tools/oracleComparison.js';
import { handleReserveAttestation } from './tools/reserveAttestation.js';
import { handleCollateralHealth } from './tools/collateralHealth.js';
import { handleTokenPremium } from './tools/tokenPremium.js';
import { handleLcValidation } from './tools/lcValidation.js';
import { handleLcStructure } from './tools/lcStructure.js';
import { handleLcDocumentary } from './tools/lcDocumentary.js';
import { handleLcCounterparty } from './tools/lcCounterparty.js';
import { handleLcDiscrepancy } from './tools/lcDiscrepancy.js';
import { handleLcEucp } from './tools/lcEucp.js';
import { handleLcPricing } from './tools/lcPricing.js';

export function createServer(): McpServer {
  // Initialize shared resources
  const cache = new CacheManager();
  const pythClient = new PythClient();
  const chainlinkClient = new ChainlinkClient();
  const metalsClient = new MetalsApiClient();
  const reservesClient = new ReservesClient();

  // Periodic cache cleanup
  setInterval(() => cache.cleanup(), 60000);

  // Create MCP server
  const server = new McpServer({
    name: 'conclave-commodity-oracle',
    version: '1.0.0'
  });

  // Register tools

  server.tool(
    'commodity_get_spot_price',
    'Get real-time spot prices for commodities from multiple oracle sources (Pyth, Chainlink, Metals-API)',
    SpotPriceInputSchema.shape,
    async (params) => {
      try {
        const input = SpotPriceInputSchema.parse(params);
        const result = await handleSpotPrice(input, {
          cache,
          pythClient,
          chainlinkClient,
          metalsClient
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
    'commodity_get_futures_curve',
    'Get futures prices across multiple expiry dates for forward curve analysis (contango/backwardation)',
    FuturesCurveInputSchema.shape,
    async (params) => {
      try {
        const input = FuturesCurveInputSchema.parse(params);
        const result = await handleFuturesPrice(input, {
          cache,
          metalsClient
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
    'commodity_get_price_history',
    'Get historical price data for volatility and trend analysis',
    PriceHistoryInputSchema.shape,
    async (params) => {
      try {
        const input = PriceHistoryInputSchema.parse(params);
        const result = await handlePriceHistory(input, {
          cache,
          metalsClient
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
    'commodity_get_volatility',
    'Calculate volatility metrics, drawdown analysis, and VaR for risk assessment',
    VolatilityInputSchema.shape,
    async (params) => {
      try {
        const input = VolatilityInputSchema.parse(params);
        const result = await handleVolatility(input, {
          cache,
          metalsClient
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
    'commodity_get_oracle_health',
    'Monitor oracle reliability, staleness, update frequency, and health status',
    OracleHealthInputSchema.shape,
    async (params) => {
      try {
        const input = OracleHealthInputSchema.parse(params);
        const result = await handleOracleHealth(input, {
          cache,
          pythClient,
          chainlinkClient
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
    'commodity_compare_oracles',
    'Compare prices across oracle sources to detect anomalies and arbitrage opportunities',
    OracleComparisonInputSchema.shape,
    async (params) => {
      try {
        const input = OracleComparisonInputSchema.parse(params);
        const result = await handleOracleComparison(input, {
          cache,
          pythClient,
          chainlinkClient,
          metalsClient
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
    'commodity_get_reserve_attestation',
    'Get proof of reserves data for commodity-backed tokens (PAXG, XAUT, etc.)',
    ReserveAttestationInputSchema.shape,
    async (params) => {
      try {
        const input = ReserveAttestationInputSchema.parse(params);
        const result = await handleReserveAttestation(input, {
          cache,
          reservesClient,
          metalsClient
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
    'commodity_get_collateral_health',
    'Monitor collateral health for commodity-backed tokens in DeFi protocols',
    CollateralHealthInputSchema.shape,
    async (params) => {
      try {
        const input = CollateralHealthInputSchema.parse(params);
        const result = await handleCollateralHealth(input, {
          cache,
          reservesClient,
          pythClient
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
    'commodity_get_token_premium',
    'Analyze premium/discount of commodity-backed tokens vs underlying spot price',
    TokenPremiumInputSchema.shape,
    async (params) => {
      try {
        const input = TokenPremiumInputSchema.parse(params);
        const result = await handleTokenPremium(input, {
          cache,
          reservesClient,
          metalsClient
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
    'commodity_validate_lc',
    'Validate letter of credit parameters against commodity prices and market conditions',
    LcValidationInputSchema.shape,
    async (params) => {
      try {
        const input = LcValidationInputSchema.parse(params);
        const result = await handleLcValidation(input, {
          cache,
          metalsClient
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

  // ============================================================================
  // LC Analysis Module Tools
  // ============================================================================

  server.tool(
    'lc_analyze_structure',
    'Analyze LC structure, classify type, assess structural risk, and evaluate payment terms',
    LcStructureInputSchema.shape,
    async (params) => {
      try {
        const input = LcStructureInputSchema.parse(params);
        const result = await handleLcStructure(input, { cache });
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
    'lc_check_documentary_compliance',
    'Validate documents against UCP 600 requirements and check presentation timing',
    LcDocumentaryInputSchema.shape,
    async (params) => {
      try {
        const input = LcDocumentaryInputSchema.parse(params);
        const result = await handleLcDocumentary(input, { cache });
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
    'lc_assess_counterparty_risk',
    'Evaluate issuing and confirming bank creditworthiness and country risk',
    LcCounterpartyInputSchema.shape,
    async (params) => {
      try {
        const input = LcCounterpartyInputSchema.parse(params);
        const result = await handleLcCounterparty(input, { cache });
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
    'lc_detect_discrepancies',
    'Scan documents for discrepancies against LC terms with severity assessment and remediation guidance',
    LcDiscrepancyInputSchema.shape,
    async (params) => {
      try {
        const input = LcDiscrepancyInputSchema.parse(params);
        const result = await handleLcDiscrepancy(input, { cache });
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
    'lc_check_eucp_compliance',
    'Validate electronic documents against eUCP requirements and MLETR jurisdiction recognition',
    LcEucpInputSchema.shape,
    async (params) => {
      try {
        const input = LcEucpInputSchema.parse(params);
        const result = await handleLcEucp(input, { cache });
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
    'lc_calculate_pricing',
    'Calculate LC fees, confirmation costs, and discounting analysis with market benchmarks',
    LcPricingInputSchema.shape,
    async (params) => {
      try {
        const input = LcPricingInputSchema.parse(params);
        const result = await handleLcPricing(input, { cache });
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
