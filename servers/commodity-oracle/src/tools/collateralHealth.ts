import type { CollateralHealthInput, CollateralHealthOutput, ProtocolCollateral } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { ReservesClient } from '../clients/reserves.js';
import type { PythClient } from '../clients/pyth.js';

interface CollateralHealthContext {
  cache: CacheManager;
  reservesClient: ReservesClient;
  pythClient: PythClient;
}

// DeFi protocol collateral parameters for commodity tokens
// Note: These are static reference parameters only
// Actual deposited amounts require subgraph integration (not implemented)
const PROTOCOL_PARAMS: Record<string, Record<string, {
  collateralFactor: number;
  liquidationThreshold: number;
}>> = {
  PAXG: {
    aave: {
      collateralFactor: 0.70,
      liquidationThreshold: 0.75
    },
    compound: {
      collateralFactor: 0.65,
      liquidationThreshold: 0.70
    },
    maker: {
      collateralFactor: 0.65,
      liquidationThreshold: 0.70
    }
  },
  XAUT: {
    aave: {
      collateralFactor: 0.60,
      liquidationThreshold: 0.65
    }
  },
  DGX: {
    aave: {
      collateralFactor: 0.55,
      liquidationThreshold: 0.60
    }
  }
};

export async function handleCollateralHealth(
  input: CollateralHealthInput,
  ctx: CollateralHealthContext
): Promise<CollateralHealthOutput> {
  const cacheKey = ctx.cache.generateKey('collateralHealth', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<CollateralHealthOutput>(cacheKey);
  if (cached) return cached;

  const tokenAddress = ctx.reservesClient.getTokenAddress(input.token, input.chain);
  if (!tokenAddress) {
    throw new Error(`Token ${input.token} not supported on ${input.chain}`);
  }

  // Get current token price
  const tokenPrice = await ctx.reservesClient.getTokenPrice(input.token, input.chain);

  // Get gold spot price for oracle comparison
  let oraclePrice = tokenPrice;
  let oracleDeviation = 0;

  try {
    const pythData = await ctx.pythClient.getLatestPrice('XAU');
    oraclePrice = pythData.price;
    oracleDeviation = ((tokenPrice - oraclePrice) / oraclePrice) * 100;
  } catch {
    // Use token price as fallback
  }

  // Get protocol parameters (static reference data only)
  const tokenParams = PROTOCOL_PARAMS[input.token] || {};
  const protocols: ProtocolCollateral[] = [];

  const protocolsToCheck = input.protocol ? [input.protocol] : Object.keys(tokenParams);

  for (const protocolName of protocolsToCheck) {
    const params = tokenParams[protocolName];
    if (!params) continue;

    // Note: totalDeposited and utilizationRate require subgraph integration
    // Returning static parameters only with null for dynamic data
    protocols.push({
      name: protocolName,
      collateralFactor: params.collateralFactor,
      liquidationThreshold: params.liquidationThreshold,
      totalDeposited: 0, // Requires Aave/Compound subgraph integration
      totalDepositedUsd: 0,
      utilizationRate: 0,
      borrowApy: 0, // Dynamic - requires on-chain query
      supplyApy: 0  // Dynamic - requires on-chain query
    });
  }

  // Calculate theoretical liquidation threshold from protocol params
  const avgLiquidationThreshold = protocols.length > 0
    ? protocols.reduce((sum, p) => sum + p.liquidationThreshold, 0) / protocols.length
    : 0.70;

  // Cannot calculate actual health factors without position data
  // Return theoretical values based on protocol parameters only
  const theoreticalPriceToLiquidation = (1 - avgLiquidationThreshold) * 100;

  // Risk level based on theoretical liquidation threshold only
  // Actual risk depends on individual positions (data not available)
  let riskLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  if (theoreticalPriceToLiquidation > 30) riskLevel = 'low';
  else if (theoreticalPriceToLiquidation > 20) riskLevel = 'moderate';
  else if (theoreticalPriceToLiquidation > 10) riskLevel = 'elevated';
  else riskLevel = 'critical';

  const now = Date.now();
  const result: CollateralHealthOutput = {
    token: input.token,
    tokenAddress,
    chain: input.chain,
    spotPrice: {
      price: tokenPrice,
      source: 'DefiLlama',
      staleness: 0 // DefiLlama prices are near real-time
    },
    oraclePrice: {
      price: oraclePrice,
      deviation: oracleDeviation
    },
    protocols,
    liquidationRisk: {
      priceToLiquidation: theoreticalPriceToLiquidation,
      atRiskCollateral: 0, // Requires subgraph integration
      healthFactor: 0 // Cannot calculate without position data
    },
    riskLevel,
    dataFreshness: new Date(now).toISOString()
  };

  ctx.cache.set(cacheKey, result, 'collateralHealth');
  return result;
}
