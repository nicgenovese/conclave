/**
 * Normalization utilities for converting subgraph data formats
 */

/**
 * Convert Aave ray (27 decimals) to APY percentage.
 * Ray = 10^27, rate is per second.
 * Uses linear approximation: rate * secondsPerYear / RAY * 100
 */
export function rayToApy(ray: string): number {
  if (!ray || ray === '0') return 0;

  const rayBn = BigInt(ray);
  const RAY = BigInt(10) ** BigInt(27);
  const SECONDS_PER_YEAR = BigInt(31536000);

  // APY = rate * secondsPerYear / RAY * 100 (linear approximation)
  const apyBps = (rayBn * SECONDS_PER_YEAR * BigInt(10000)) / RAY;
  return Number(apyBps) / 100;
}

/**
 * Convert Aave wad (18 decimals) to percentage (0-100)
 */
export function wadToPercent(wad: string): number {
  if (!wad || wad === '0') return 0;

  const wadBn = BigInt(wad);
  const WAD = BigInt(10) ** BigInt(18);

  // Convert to percentage with 2 decimal precision
  const percentBps = (wadBn * BigInt(10000)) / WAD;
  return Number(percentBps) / 100;
}

/**
 * Convert Compound decimal rate (0-1 scale stored as BigInt) to APY percentage
 */
export function compoundRateToApy(rate: string, decimals: number = 18): number {
  if (!rate || rate === '0') return 0;

  const rateBn = BigInt(rate);
  const divisor = BigInt(10) ** BigInt(decimals);

  // Rate is already annualized, just convert to percentage
  return (Number(rateBn) / Number(divisor)) * 100;
}

/**
 * Parse subgraph BigInt string to number with decimals
 */
export function parseAmount(raw: string, decimals: number): number {
  if (!raw || raw === '0') return 0;

  const bn = BigInt(raw);
  const divisor = BigInt(10) ** BigInt(decimals);

  // For very large numbers, use string manipulation to avoid precision loss
  const intPart = bn / divisor;
  const fracPart = bn % divisor;

  const fracStr = fracPart.toString().padStart(decimals, '0');
  const resultStr = `${intPart}.${fracStr}`;

  return parseFloat(resultStr);
}

/**
 * Convert amount to USD using price
 */
export function toUsd(amount: number, priceUsd: number): number {
  return amount * priceUsd;
}

/**
 * Convert basis points (0-10000) to percentage (0-100)
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Format timestamp to ISO string
 */
export function timestampToIso(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  return new Date(ts * 1000).toISOString();
}

/**
 * Calculate utilization rate as percentage
 */
export function calculateUtilization(totalBorrow: number, totalLiquidity: number): number {
  if (totalLiquidity === 0) return 0;
  return (totalBorrow / totalLiquidity) * 100;
}

/**
 * Determine liquidity risk level based on health factor
 */
export function getLiquidationRisk(health: number | null): 'Safe' | 'Moderate' | 'High' | 'Critical' {
  if (health === null || health === 0) return 'Safe';
  if (health >= 2) return 'Safe';
  if (health >= 1.5) return 'Moderate';
  if (health >= 1.1) return 'High';
  return 'Critical';
}
