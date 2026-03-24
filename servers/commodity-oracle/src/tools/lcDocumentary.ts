import type { LcDocumentaryInput, LcDocumentaryOutput, DocumentComplianceResult } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import { UCP600_ARTICLES, DOCUMENT_UCP_MAPPING, PRESENTATION_RULES } from '../data/ucp600.js';

interface LcDocumentaryContext {
  cache: CacheManager;
}

export async function handleLcDocumentary(
  input: LcDocumentaryInput,
  ctx: LcDocumentaryContext
): Promise<LcDocumentaryOutput> {
  const cacheKey = ctx.cache.generateKey('lcDocumentary', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcDocumentaryOutput>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const expiryDate = new Date(input.lcRequirements.expiryDate);
  const latestShipDate = new Date(input.lcRequirements.latestShipDate);
  const shipmentDate = input.shipmentDate ? new Date(input.shipmentDate) : null;

  // Calculate presentation deadline
  const presentationDays = input.lcRequirements.presentationDays || PRESENTATION_RULES.maxPresentationDays;
  const presentationDeadline = shipmentDate
    ? new Date(Math.min(
        shipmentDate.getTime() + presentationDays * 24 * 60 * 60 * 1000,
        expiryDate.getTime()
      ))
    : expiryDate;

  const daysRemaining = Math.ceil((presentationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check shipment compliance
  let shipmentCompliance: 'on_time' | 'late' | 'unknown' = 'unknown';
  if (shipmentDate) {
    shipmentCompliance = shipmentDate <= latestShipDate ? 'on_time' : 'late';
  }

  // Process each document
  const documentResults: DocumentComplianceResult[] = [];
  const missingDocuments: string[] = [];
  const staleDocs: string[] = [];
  const ucpArticlesApplied = new Set<string>();
  let criticalIssues = 0;
  let warnings = 0;

  // Check required documents
  for (const requiredDoc of input.lcRequirements.requiredDocs) {
    const presented = input.documents.find(d => d.type === requiredDoc);
    if (!presented || !presented.presented) {
      missingDocuments.push(requiredDoc);
      documentResults.push({
        documentType: requiredDoc,
        ucpArticle: 'Article 14',
        status: 'not_presented',
        issues: ['Required document not presented'],
        requirements: ['Must be presented as specified in LC']
      });
      criticalIssues++;
    }
  }

  // Analyze presented documents
  for (const doc of input.documents) {
    if (!doc.presented) continue;

    const issues: string[] = [];
    const requirements: string[] = [];
    let status: 'compliant' | 'non_compliant' | 'warning' = 'compliant';

    // Get applicable UCP articles
    const applicableArticles = DOCUMENT_UCP_MAPPING[doc.type] || ['art14'];
    applicableArticles.forEach(art => ucpArticlesApplied.add(art));

    // Check document-specific requirements
    const primaryArticle = applicableArticles[0];
    const articleInfo = UCP600_ARTICLES[primaryArticle];

    if (articleInfo) {
      requirements.push(...articleInfo.requirements.slice(0, 3));
    }

    // Check for stale documents
    if (doc.issuedDate && shipmentDate) {
      const docDate = new Date(doc.issuedDate);
      const daysSinceShipment = Math.ceil((docDate.getTime() - shipmentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceShipment > PRESENTATION_RULES.staleDocumentDays) {
        staleDocs.push(doc.type);
        issues.push(`Document dated ${daysSinceShipment} days after shipment (stale)`);
        status = 'warning';
        warnings++;
      }
    }

    // Document-specific checks
    switch (doc.type) {
      case 'commercial_invoice':
        if (doc.originals < 1) {
          issues.push('Original invoice typically required');
          status = 'warning';
          warnings++;
        }
        break;

      case 'bill_of_lading':
        if (doc.originals < 3) {
          issues.push(`Full set typically 3/3 originals; only ${doc.originals} presented`);
          if (doc.originals === 0) {
            status = 'non_compliant';
            criticalIssues++;
          } else {
            status = 'warning';
            warnings++;
          }
        }
        requirements.push('Must show shipped on board notation with date');
        requirements.push('Must indicate port of loading and discharge');
        break;

      case 'insurance_certificate':
        if (doc.issuedDate && shipmentDate) {
          const insuranceDate = new Date(doc.issuedDate);
          if (insuranceDate > shipmentDate) {
            issues.push('Insurance dated after shipment date (UCP 600 Art. 28)');
            status = 'non_compliant';
            criticalIssues++;
          }
        }
        requirements.push('Must be dated on or before shipment date');
        requirements.push('Must cover at least 110% of CIF/CIP value');
        break;

      case 'certificate_of_origin':
        if (!doc.issuedBy) {
          issues.push('Certificate of Origin issuer not specified');
          status = 'warning';
          warnings++;
        }
        break;

      case 'inspection_certificate':
        requirements.push('Must be issued by inspection company specified in LC');
        break;
    }

    documentResults.push({
      documentType: doc.type,
      ucpArticle: articleInfo?.article || 'Article 14',
      status,
      issues,
      requirements
    });
  }

  // Calculate overall compliance
  let overallStatus: 'compliant' | 'discrepant' | 'incomplete';
  let complianceScore: number;

  if (missingDocuments.length > 0) {
    overallStatus = 'incomplete';
    complianceScore = Math.max(0, 100 - missingDocuments.length * 20 - criticalIssues * 15 - warnings * 5);
  } else if (criticalIssues > 0) {
    overallStatus = 'discrepant';
    complianceScore = Math.max(0, 100 - criticalIssues * 20 - warnings * 5);
  } else if (warnings > 2) {
    overallStatus = 'discrepant';
    complianceScore = Math.max(50, 100 - warnings * 5);
  } else {
    overallStatus = 'compliant';
    complianceScore = Math.max(80, 100 - warnings * 5);
  }

  // Generate recommendation
  let recommendation: string;
  if (overallStatus === 'compliant') {
    if (warnings > 0) {
      recommendation = `Documents appear compliant with ${warnings} minor issue(s) to review. Proceed with presentation.`;
    } else {
      recommendation = 'Documents appear fully compliant. Ready for presentation.';
    }
  } else if (overallStatus === 'incomplete') {
    recommendation = `Missing ${missingDocuments.length} required document(s): ${missingDocuments.join(', ')}. Cannot present until complete.`;
  } else {
    recommendation = `${criticalIssues} critical issue(s) identified. Documents likely to be rejected. Correct discrepancies before presentation.`;
  }

  const result: LcDocumentaryOutput = {
    overallCompliance: {
      status: overallStatus,
      complianceScore,
      criticalIssues,
      warnings
    },
    documentResults,
    timingAnalysis: {
      presentationDeadline: presentationDeadline.toISOString().split('T')[0],
      daysRemaining,
      shipmentCompliance,
      staleDocs
    },
    missingDocuments,
    ucpArticlesApplied: Array.from(ucpArticlesApplied),
    recommendation,
    dataFreshness: now.toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcDocumentary');
  return result;
}
