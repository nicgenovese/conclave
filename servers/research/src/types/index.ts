import { z } from 'zod';

// ========== Common Schemas ==========

export const DecisionSchema = z.enum(['go', 'no-go', 'conditional']);
export type Decision = z.infer<typeof DecisionSchema>;

export const LearningTypeSchema = z.enum(['patterns', 'red-flags', 'market-cycles', 'success-factors']);
export type LearningType = z.infer<typeof LearningTypeSchema>;

export const RiskCategorySchema = z.enum(['smart-contract', 'economic', 'governance', 'operational', 'market']);
export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

// ========== Input Schemas ==========

export const SearchMemosInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol name required'),
  keywords: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  }).optional(),
  limit: z.number().min(1).max(50).default(10)
});
export type SearchMemosInput = z.infer<typeof SearchMemosInputSchema>;

export const GetDecisionsInputSchema = z.object({
  protocol: z.string().optional(),
  sector: z.string().optional(),
  outcome: DecisionSchema.optional(),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).optional(),
  limit: z.number().min(1).max(50).default(10)
});
export type GetDecisionsInput = z.infer<typeof GetDecisionsInputSchema>;

export const GetLearningsInputSchema = z.object({
  learningType: LearningTypeSchema,
  sector: z.string().optional(),
  limit: z.number().min(1).max(50).default(20)
});
export type GetLearningsInput = z.infer<typeof GetLearningsInputSchema>;

export const GetRedFlagsInputSchema = z.object({
  sector: z.string().optional(),
  riskCategory: RiskCategorySchema.optional(),
  materialized: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20)
});
export type GetRedFlagsInput = z.infer<typeof GetRedFlagsInputSchema>;

export const GetAnalogousCasesInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol name required'),
  sector: z.string().optional(),
  thesis: z.string().optional(),
  riskProfile: z.enum(['aggressive', 'balanced', 'conservative']).optional(),
  limit: z.number().min(1).max(10).default(5)
});
export type GetAnalogousCasesInput = z.infer<typeof GetAnalogousCasesInputSchema>;

export const ArchiveDecisionInputSchema = z.object({
  protocol: z.string().min(1),
  sector: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  decision: DecisionSchema,
  conviction: z.number().min(1).max(10),
  rationale: z.string().min(10),
  memoPath: z.string().optional(),
  riskAssessment: z.object({
    categories: z.record(z.string(), z.number().min(1).max(5)),
    overallRating: z.number().min(1).max(5)
  }).optional(),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  conditions: z.array(z.object({
    condition: z.string(),
    trigger: z.string()
  })).optional()
});
export type ArchiveDecisionInput = z.infer<typeof ArchiveDecisionInputSchema>;

export const PreloadContextInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol name required'),
  sector: z.string().optional(),
  includeAnalogous: z.boolean().default(true),
  includeRedFlags: z.boolean().default(true),
  includeLearnings: z.boolean().default(true),
  analogousLimit: z.number().min(1).max(10).default(3)
});
export type PreloadContextInput = z.infer<typeof PreloadContextInputSchema>;

// ========== Output Types ==========

export interface MemoSearchResult {
  id: string;
  protocol: string;
  date: string;
  title: string;
  excerpt: string;
  path: string;
  matchScore: number;
  tags: string[];
}

export interface SearchMemosOutput {
  totalResults: number;
  memos: MemoSearchResult[];
  searchPerformed: string;
}

export interface DecisionRecord {
  id: string;
  protocol: string;
  date: string;
  decision: Decision;
  conviction: number;
  rationale: string;
  sectors: string[];
  riskRating?: Severity;
  followUpDate?: string;
  outcome?: {
    realized: boolean;
    result: string;
    postMortemDate?: string;
  };
}

export interface GetDecisionsOutput {
  decisions: DecisionRecord[];
  totalCount: number;
  searchPerformed: string;
}

export interface LearningItem {
  id: string;
  title: string;
  description: string;
  relatedProtocols: string[];
  frequency: number;
  confidence: Confidence;
  tags: string[];
  createdDate: string;
  lastUpdated: string;
}

export interface GetLearningsOutput {
  learningType: LearningType;
  items: LearningItem[];
  lastUpdated: string;
}

export interface RedFlagInstance {
  protocol: string;
  date: string;
  materialized: boolean;
  outcome: string;
}

export interface RedFlag {
  id: string;
  title: string;
  description: string;
  riskCategory: RiskCategory;
  severityRating: Severity;
  historicalInstances: RedFlagInstance[];
  detectionMethods: string[];
  mitigationStrategies: string[];
  firstDocumented: string;
  frequency: number;
}

export interface GetRedFlagsOutput {
  redFlags: RedFlag[];
  totalCount: number;
}

export interface AnalogousCase {
  protocol: string;
  date: string;
  similarityScore: number;
  similarityReasons: string[];
  decision: Decision;
  conviction: number;
  outcome: {
    realized: boolean;
    result: string;
    timeToResolution?: string;
  };
  applicableLessons: string[];
}

export interface GetAnalogousCasesOutput {
  targetProtocol: string;
  analogousCases: AnalogousCase[];
}

export interface ArchiveDecisionOutput {
  success: boolean;
  decisionId: string;
  storagePath: string;
  timestamp: string;
  message: string;
}

export interface PreloadContextOutput {
  protocol: string;
  sector: string | null;
  generatedAt: string;
  priorDecisions: {
    found: boolean;
    count: number;
    decisions: Array<{
      date: string;
      decision: Decision;
      conviction: number;
      rationale: string;
      outcome?: string;
    }>;
  };
  analogousCases: {
    found: boolean;
    count: number;
    cases: Array<{
      protocol: string;
      sector: string;
      decision: Decision;
      conviction: number;
      similarityReason: string;
      keyLearning: string;
    }>;
  };
  sectorLearnings: {
    successPatterns: Array<{
      title: string;
      description: string;
      confidence: Confidence;
    }>;
    warningIndicators: Array<{
      title: string;
      description: string;
      confidence: Confidence;
    }>;
  };
  redFlagsToWatch: Array<{
    title: string;
    description: string;
    severity: Severity;
    category: RiskCategory;
    detectionMethod: string;
    mitigation: string;
  }>;
  contextSummary: string;
}

// ========== Archive Document Types ==========

export interface MemoFrontmatter {
  protocol: string;
  date: string;
  title: string;
  tags: string[];
  decision?: Decision;
  conviction?: number;
}

export interface DecisionFrontmatter {
  protocol: string;
  date: string;
  decision: Decision;
  conviction: number;
  sectors: string[];
  riskRating?: Severity;
  nextReviewDate?: string;
  conditions?: Array<{ condition: string; trigger: string }>;
}

export interface ArchiveDocument {
  path: string;
  frontmatter: Record<string, unknown>;
  content: string;
  type: 'memo' | 'decision' | 'postmortem' | 'learning';
}

// ========== Index Types ==========

export interface SearchIndexEntry {
  id: string;
  type: 'memo' | 'decision' | 'postmortem' | 'learning';
  protocol?: string;
  date?: string;
  path: string;
  title: string;
  tags: string[];
  sector?: string;
  keywords?: string[];
}

export interface SearchIndex {
  version: string;
  lastUpdated: string;
  documentCount: number;
  documents: SearchIndexEntry[];
}
