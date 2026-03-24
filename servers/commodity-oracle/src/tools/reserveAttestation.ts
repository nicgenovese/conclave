import type { ReserveAttestationInput, ReserveAttestationOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { ReservesClient } from '../clients/reserves.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface ReserveAttestationContext {
  cache: CacheManager;
  reservesClient: ReservesClient;
  metalsClient: MetalsApiClient;
}

export async function handleReserveAttestation(
  input: ReserveAttestationInput,
  ctx: ReserveAttestationContext
): Promise<ReserveAttestationOutput> {
  const cacheKey = ctx.cache.generateKey('reserveAttestation', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<ReserveAttestationOutput>(cacheKey);
  if (cached) return cached;

  const tokenAddress = ctx.reservesClient.getTokenAddress(input.token, input.chain);
  if (!tokenAddress) {
    throw new Error(`Token ${input.token} not supported on ${input.chain}`);
  }

  const issuerInfo = ctx.reservesClient.getIssuerInfo(input.token);
  if (!issuerInfo) {
    throw new Error(`No issuer information available for ${input.token}`);
  }

  // Get token supply
  const supplyData = await ctx.reservesClient.getTokenSupply(input.token, input.chain);

  // Get current gold price for value calculations
  let goldPrice = 0;
  try {
    const priceData = await ctx.metalsClient.getLatestPrice('XAU', 'USD');
    goldPrice = priceData.price;
  } catch {
    // Use fallback price if API unavailable
    goldPrice = 2000; // Approximate
  }

  // Calculate reserve backing
  const reserveData = ctx.reservesClient.calculateReserveBacking(
    supplyData.totalSupply,
    goldPrice,
    input.token
  );

  const alerts: string[] = [];

  // Alert about regulatory status
  if (issuerInfo.regulator === 'Unregulated') {
    alerts.push('Issuer operates without direct regulatory oversight');
  }

  // Alert about collateral verification
  alerts.push(reserveData.collateralRatioNote);

  // Cannot verify backing status without attestation API access
  // Set to 'unknown' with explanation rather than making assumptions
  const status: 'fully_backed' | 'underbacked' | 'overbacked' | 'unknown' = 'unknown';

  const result: ReserveAttestationOutput = {
    token: input.token,
    tokenAddress,
    chain: input.chain,
    issuer: {
      name: issuerInfo.name,
      regulator: issuerInfo.regulator,
      jurisdiction: issuerInfo.jurisdiction
    },
    supply: {
      totalSupply: supplyData.totalSupply,
      circulatingSupply: supplyData.totalSupply, // Assume all circulating
      lockedSupply: 0
    },
    backing: {
      commodity: issuerInfo.commodity,
      totalOunces: reserveData.totalOunces,
      perTokenOunces: reserveData.perTokenOunces,
      vaultLocation: issuerInfo.vaultLocation,
      custodian: issuerInfo.custodian
    },
    attestation: {
      lastAudit: null, // Requires attestation API integration - see issuer website
      auditor: issuerInfo.auditor,
      frequency: issuerInfo.auditFrequency,
      reportUrl: null, // Would link to actual attestation report
      verificationMethod: 'On-chain supply verification only - attestation API not integrated'
    },
    collateralRatio: reserveData.collateralRatio ?? 0, // 0 indicates unverified
    status,
    alerts,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'reserveAttestation');
  return result;
}
