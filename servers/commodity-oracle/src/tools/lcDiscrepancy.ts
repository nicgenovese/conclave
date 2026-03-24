import type { LcDiscrepancyInput, LcDiscrepancyOutput, Discrepancy } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import { DISCREPANCY_PATTERNS, calculateRejectionProbability } from '../data/discrepancyCatalog.js';

interface LcDiscrepancyContext {
  cache: CacheManager;
}

// Normalize strings for comparison
function normalize(str: string | undefined | null): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Check string similarity (simple contains or exact match)
function stringsMatch(a: string | undefined, b: string | undefined): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

// Check if amounts match within tolerance
function amountsMatch(a: number | undefined, b: number | undefined, tolerance = 0.01): boolean {
  if (a === undefined || b === undefined) return true; // Can't compare
  const diff = Math.abs(a - b);
  const maxVal = Math.max(a, b);
  return diff / maxVal <= tolerance;
}

export async function handleLcDiscrepancy(
  input: LcDiscrepancyInput,
  ctx: LcDiscrepancyContext
): Promise<LcDiscrepancyOutput> {
  const cacheKey = ctx.cache.generateKey('lcDiscrepancy', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcDiscrepancyOutput>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const discrepancies: Discrepancy[] = [];
  let discrepancyCounter = 0;

  // Helper to add discrepancy
  function addDiscrepancy(
    category: string,
    documentType: string,
    field: string,
    lcValue: string,
    documentValue: string,
    severity: 'critical' | 'major' | 'minor',
    ucpReference: string | null,
    remediation: string
  ) {
    discrepancyCounter++;
    discrepancies.push({
      id: `DISC${String(discrepancyCounter).padStart(3, '0')}`,
      category,
      documentType,
      field,
      lcValue,
      documentValue,
      severity,
      ucpReference,
      remediation
    });
  }

  // Check each document against LC details
  for (const doc of input.documents) {
    // Beneficiary name check
    if (doc.beneficiaryName && !stringsMatch(doc.beneficiaryName, input.lcDetails.beneficiaryName)) {
      addDiscrepancy(
        'name_address',
        doc.type,
        'beneficiaryName',
        input.lcDetails.beneficiaryName,
        doc.beneficiaryName,
        'critical',
        'Article 14(d)',
        'Correct beneficiary name to exactly match LC terms'
      );
    }

    // Applicant name check
    if (doc.applicantName && !stringsMatch(doc.applicantName, input.lcDetails.applicantName)) {
      addDiscrepancy(
        'name_address',
        doc.type,
        'applicantName',
        input.lcDetails.applicantName,
        doc.applicantName,
        'major',
        'Article 14(d)',
        'Ensure applicant details consistent across all documents'
      );
    }

    // Goods description check
    if (doc.goodsDescription && !stringsMatch(doc.goodsDescription, input.lcDetails.goodsDescription)) {
      // Invoice must match exactly, others can be general
      const severity = doc.type === 'commercial_invoice' ? 'critical' : 'major';
      addDiscrepancy(
        'goods_description',
        doc.type,
        'goodsDescription',
        input.lcDetails.goodsDescription,
        doc.goodsDescription,
        severity,
        doc.type === 'commercial_invoice' ? 'Article 18(c)' : 'Article 14(d)',
        doc.type === 'commercial_invoice'
          ? 'Invoice description must correspond exactly to LC description'
          : 'Description need not be identical but must not conflict'
      );
    }

    // Amount check
    if (doc.amount !== undefined) {
      if (doc.amount > input.lcDetails.amount) {
        addDiscrepancy(
          'amount_currency',
          doc.type,
          'amount',
          String(input.lcDetails.amount),
          String(doc.amount),
          'critical',
          'Article 18(b)',
          'Reduce document amount to not exceed LC amount'
        );
      } else if (!amountsMatch(doc.amount, input.lcDetails.amount, 0.05)) {
        // Within 5% tolerance per UCP 600 Art 30
        addDiscrepancy(
          'amount_currency',
          doc.type,
          'amount',
          String(input.lcDetails.amount),
          String(doc.amount),
          'minor',
          'Article 30',
          'Amount variance within UCP 600 tolerance but verify unit price consistency'
        );
      }
    }

    // Currency check
    if (doc.currency && doc.currency.toUpperCase() !== input.lcDetails.currency.toUpperCase()) {
      addDiscrepancy(
        'amount_currency',
        doc.type,
        'currency',
        input.lcDetails.currency,
        doc.currency,
        'critical',
        'Article 18(a)',
        'All documents must be in LC currency'
      );
    }

    // Quantity check
    if (doc.quantity !== undefined && input.lcDetails.quantity !== undefined) {
      const tolerance = 0.05; // 5% per UCP 600 Art 30
      const diff = Math.abs(doc.quantity - input.lcDetails.quantity) / input.lcDetails.quantity;
      if (diff > tolerance) {
        addDiscrepancy(
          'goods_description',
          doc.type,
          'quantity',
          String(input.lcDetails.quantity),
          String(doc.quantity),
          'critical',
          'Article 30',
          `Quantity differs by ${(diff * 100).toFixed(1)}% - exceeds 5% tolerance`
        );
      }
    }

    // Port checks for transport documents
    if (doc.type === 'bill_of_lading' || doc.type === 'airway_bill') {
      if (doc.portOfLoading && input.lcDetails.portOfLoading &&
          !stringsMatch(doc.portOfLoading, input.lcDetails.portOfLoading)) {
        addDiscrepancy(
          'transport_document',
          doc.type,
          'portOfLoading',
          input.lcDetails.portOfLoading,
          doc.portOfLoading,
          'critical',
          'Article 20(a)(iii)',
          'Port of loading must match LC specification'
        );
      }

      if (doc.portOfDischarge && input.lcDetails.portOfDischarge &&
          !stringsMatch(doc.portOfDischarge, input.lcDetails.portOfDischarge)) {
        addDiscrepancy(
          'transport_document',
          doc.type,
          'portOfDischarge',
          input.lcDetails.portOfDischarge,
          doc.portOfDischarge,
          'critical',
          'Article 20(a)(iii)',
          'Port of discharge must match LC specification'
        );
      }
    }
  }

  // Calculate statistics
  const critical = discrepancies.filter(d => d.severity === 'critical').length;
  const major = discrepancies.filter(d => d.severity === 'major').length;
  const minor = discrepancies.filter(d => d.severity === 'minor').length;

  const { level: rejectionProbability } = calculateRejectionProbability(discrepancies);

  // Count by category
  const byCategory: Record<string, number> = {};
  for (const d of discrepancies) {
    byCategory[d.category] = (byCategory[d.category] || 0) + 1;
  }

  // Prioritize remediation
  const remediationPriority = discrepancies
    .sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .map(d => `${d.id}: ${d.remediation}`);

  // Generate recommendation
  let recommendation: string;
  if (discrepancies.length === 0) {
    recommendation = 'No discrepancies detected. Documents appear consistent with LC terms.';
  } else if (critical > 0) {
    recommendation = `${critical} critical discrepancy/ies detected. Documents WILL be rejected. Address all critical issues before presentation.`;
  } else if (major > 1) {
    recommendation = `${major} major discrepancies detected. High likelihood of rejection. Recommend correcting before presentation.`;
  } else if (major === 1) {
    recommendation = 'One major discrepancy detected. Moderate rejection risk. Consider correction or request waiver from applicant.';
  } else {
    recommendation = `${minor} minor discrepancy/ies detected. Low rejection risk but recommend review.`;
  }

  const result: LcDiscrepancyOutput = {
    summary: {
      totalDiscrepancies: discrepancies.length,
      critical,
      major,
      minor,
      rejectionProbability
    },
    discrepancies,
    byCategory,
    remediationPriority: remediationPriority.slice(0, 10), // Top 10
    recommendation,
    dataFreshness: now.toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcDiscrepancy');
  return result;
}
