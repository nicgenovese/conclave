import type { LcEucpInput, LcEucpOutput, EucpArticleCompliance } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import {
  EUCP_ARTICLES,
  MLETR_JURISDICTIONS,
  SIGNATURE_ACCEPTANCE,
  PLATFORM_INTEROPERABILITY,
  isJurisdictionMletrCompliant
} from '../data/eucpMletr.js';

interface LcEucpContext {
  cache: CacheManager;
}

export async function handleLcEucp(
  input: LcEucpInput,
  ctx: LcEucpContext
): Promise<LcEucpOutput> {
  const cacheKey = ctx.cache.generateKey('lcEucp', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<LcEucpOutput>(cacheKey);
  if (cached) return cached;

  const now = new Date();

  // Analyze eUCP article compliance
  const articleCompliance: EucpArticleCompliance[] = [];

  // e3 - Format compliance
  const formats = new Set(input.electronicRecords.map(r => r.format));
  const acceptableFormats = ['pdf', 'xml', 'json', 'edifact'];
  const hasAcceptableFormat = input.electronicRecords.every(r => acceptableFormats.includes(r.format));

  articleCompliance.push({
    article: 'e3',
    description: 'Electronic record format',
    status: hasAcceptableFormat ? 'compliant' : 'non_compliant',
    issues: hasAcceptableFormat ? [] : ['One or more records in non-standard format']
  });

  // e4 - Presentation format
  const allFormatsValid = input.electronicRecords.every(r =>
    ['pdf', 'xml', 'json', 'edifact'].includes(r.format)
  );
  articleCompliance.push({
    article: 'e4',
    description: 'Format specification compliance',
    status: allFormatsValid ? 'compliant' : 'non_compliant',
    issues: allFormatsValid ? [] : ['Format may not be acceptable per LC terms']
  });

  // e5 - Presentation method
  const validPresentationMethods = ['swift', 'platform', 'blockchain'];
  const presentationValid = validPresentationMethods.includes(input.presentationMethod);
  articleCompliance.push({
    article: 'e5',
    description: 'Presentation method',
    status: presentationValid ? 'compliant' : 'warning',
    issues: presentationValid ? [] : ['Email presentation may have delivery/receipt issues']
  });

  // e6 - Examination (signature verification)
  const signedRecords = input.electronicRecords.filter(r => r.signatureType && r.signatureType !== 'none');
  const verifiableRecords = input.electronicRecords.filter(r => r.verifiable);
  const examinationStatus = verifiableRecords.length === input.electronicRecords.length
    ? 'compliant'
    : verifiableRecords.length > 0 ? 'warning' : 'non_compliant';

  articleCompliance.push({
    article: 'e6',
    description: 'Examination of electronic records',
    status: examinationStatus,
    issues: examinationStatus === 'compliant'
      ? []
      : [`${input.electronicRecords.length - verifiableRecords.length} record(s) not verifiable`]
  });

  // e8 - Originals and copies
  const hasTimestamps = input.electronicRecords.every(r => r.timestamp);
  articleCompliance.push({
    article: 'e8',
    description: 'Original/copy distinction',
    status: hasTimestamps ? 'compliant' : 'warning',
    issues: hasTimestamps ? [] : ['Timestamps missing - original status may be unclear']
  });

  // e9 - Date of issuance
  const hasDates = input.electronicRecords.every(r => r.timestamp);
  articleCompliance.push({
    article: 'e9',
    description: 'Date of issuance',
    status: hasDates ? 'compliant' : 'warning',
    issues: hasDates ? [] : ['Some records lack clear issuance date']
  });

  // e10 - Transport documents
  const transportDocs = input.electronicRecords.filter(r =>
    ['bill_of_lading', 'airway_bill', 'transport'].some(t => r.type.toLowerCase().includes(t))
  );
  const transportCompliance = transportDocs.length === 0 || transportDocs.every(r => r.verifiable);
  articleCompliance.push({
    article: 'e10',
    description: 'Electronic transport documents',
    status: transportCompliance ? 'compliant' : 'warning',
    issues: transportCompliance ? [] : ['Electronic transport documents should be verifiable']
  });

  // e11 - Corruption check
  articleCompliance.push({
    article: 'e11',
    description: 'Data integrity',
    status: 'compliant', // Assumed if records are readable
    issues: []
  });

  // Calculate overall eUCP compliance
  const nonCompliantArticles = articleCompliance.filter(a => a.status === 'non_compliant');
  const warningArticles = articleCompliance.filter(a => a.status === 'warning');
  const eucpCompliant = nonCompliantArticles.length === 0;
  const complianceScore = Math.max(0, 100 - nonCompliantArticles.length * 25 - warningArticles.length * 10);

  // Analyze electronic signatures
  const signatureTypes = [...new Set(signedRecords.map(r => r.signatureType).filter(Boolean))] as string[];
  const allSigned = signedRecords.length === input.electronicRecords.length;

  let validationStatus: 'verified' | 'unverified' | 'invalid' | 'mixed';
  if (verifiableRecords.length === input.electronicRecords.length) {
    validationStatus = 'verified';
  } else if (verifiableRecords.length === 0) {
    validationStatus = signedRecords.length > 0 ? 'unverified' : 'invalid';
  } else {
    validationStatus = 'mixed';
  }

  // Platform assessment
  const platformInfo = input.platformType
    ? PLATFORM_INTEROPERABILITY[input.platformType]
    : null;

  const platformAssessment = {
    type: input.platformType || null,
    interoperability: (platformInfo?.interoperability || 'unknown') as 'high' | 'moderate' | 'low' | 'unknown',
    risks: platformInfo?.risks || ['Platform type not specified']
  };

  // MLETR jurisdiction analysis
  const mletrAdopted: string[] = [];
  const mletrPending: string[] = [];
  const noRecognition: string[] = [];

  const jurisdictions = input.mletrJurisdictions || [];
  for (const code of jurisdictions) {
    const jurisdiction = MLETR_JURISDICTIONS[code.toUpperCase()];
    if (!jurisdiction) {
      noRecognition.push(code);
    } else if (jurisdiction.status === 'adopted') {
      mletrAdopted.push(jurisdiction.country);
    } else if (jurisdiction.status === 'pending' || jurisdiction.status === 'under_review') {
      mletrPending.push(jurisdiction.country);
    } else {
      noRecognition.push(jurisdiction.country);
    }
  }

  const mletrRecognized = mletrAdopted.length > 0 || jurisdictions.length === 0;

  // Generate recommendation
  let recommendation: string;

  if (eucpCompliant && mletrRecognized) {
    if (allSigned && validationStatus === 'verified') {
      recommendation = 'Electronic presentation appears fully compliant with eUCP requirements. All signatures verified.';
    } else {
      recommendation = 'Electronic presentation compliant with eUCP. Verify electronic signatures are acceptable per LC terms.';
    }
  } else if (eucpCompliant && !mletrRecognized) {
    recommendation = 'eUCP compliant but MLETR not adopted in relevant jurisdiction(s). Verify legal enforceability of electronic documents.';
  } else {
    const issues = nonCompliantArticles.map(a => a.article).join(', ');
    recommendation = `Non-compliant with eUCP articles: ${issues}. Address issues before electronic presentation.`;
  }

  if (input.presentationMethod === 'blockchain' && !mletrAdopted.includes('United Kingdom') && !mletrAdopted.includes('Singapore')) {
    recommendation += ' Blockchain presentation may have limited legal recognition in some jurisdictions.';
  }

  const result: LcEucpOutput = {
    overallCompliance: {
      eucpCompliant,
      mletrRecognized,
      complianceScore
    },
    articleCompliance,
    electronicSignatures: {
      allSigned,
      signatureTypes,
      validationStatus
    },
    platformAssessment,
    jurisdictionAnalysis: {
      mletrAdopted,
      mletrPending,
      noRecognition
    },
    recommendation,
    dataFreshness: now.toISOString()
  };

  ctx.cache.set(cacheKey, result, 'lcEucp');
  return result;
}
