export type AppPortal = 'client' | 'console';

export type ClientNavTab = 'quick_eval' | 'team_roster' | 'standards_lookup';

export type ConsoleNavTab =
  | 'overview'
  | 'lab'
  | 'references'
  | 'projects'
  | 'testing'
  | 'settings';

export type NavTab = ConsoleNavTab | 'monitor';

export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';

export type TrialAggregationMethod = 'mean' | 'median' | 'best' | 'last';

export type SuitabilityTier = 'tier_1_recommended' | 'tier_2_caution' | 'tier_3_not_recommended';

export interface MetricDefinition {
  id: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  testName: string;
  description?: string;
}

export interface RawDataRow {
  participant_id: string;
  name?: string;
  age?: number;
  sex?: string;
  session: number; // 1, 2, 3...
  trial: number;   // 1, 2, 3...
  metric: string;
  value: number;
}

export interface AggregatedPairData {
  participantId: string;
  name: string;
  test1: number;
  test2: number;
  diff: number; // test2 - test1
  mean: number; // (test1 + test2) / 2
}

export interface ParseErrorDetail {
  line: number;
  participant_id?: string;
  session?: number | string;
  trial?: number | string;
  metric?: string;
  reason: string;
  rawContent?: string;
}

export interface QualificationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  details?: string;
}

export interface DataQualificationResult {
  isValid: boolean;
  canProceedToReliability: boolean;
  totalParticipants: number;
  sessionCount: number;
  availableSessions: number[];
  selectedSessionA: number;
  selectedSessionB: number;
  trialCountPerSession: number;
  expectedTrialsPerSession?: number;
  metricsFound: string[];
  pairedCountByMetric: Record<string, number>;
  issues: QualificationIssue[];
  isSingleParticipantError: boolean;
  parseErrors: ParseErrorDetail[];
  ignoredRowsCount: number;
  isExpertOverrideActive?: boolean;
  notes: string[];
}

export interface ReliabilityStats {
  metricId: string;
  metricName: string;
  unit: string;
  direction: MetricDirection;
  n: number;
  // Sessions Compared
  sessionsCompared: [number, number];
  // Test 1 & Test 2
  t1Mean: number;
  t1SD: number;
  t2Mean: number;
  t2SD: number;
  grandMean: number; // pooled_mean = (t1Mean + t2Mean) / 2
  pooledSD: number;  // pooled_SD = sqrt(((n-1)*SD1^2 + (n-1)*SD2^2) / (2n - 2))
  // Differences & Bias
  diffs: number[];   // T2_i - T1_i
  meanBias: number;  // mean(Diff)
  biasSD: number;    // sample SD(Diff) (SDdiff)
  biasSE: number;    // biasSD / sqrt(n)
  biasPercent: number; // (abs(meanBias) / grandMean) * 100
  biasToMdcRatio: number; // abs(meanBias) / mdc95
  biasEvaluation: 'pass' | 'caution' | 'fail';
  biasNote: string;
  bias95CILower: number;
  bias95CIUpper: number;
  pairedTStat: number;
  pairedTPValue: number;
  hasSignificantBias: boolean;
  // ICC Metadata & Values
  iccModel: 'two_way_mixed';
  iccDefinition: 'absolute_agreement' | 'consistency';
  iccMeasureType: 'single';
  iccCiMethod: 'mcgraw_wong_1996';
  iccA1: number; // Two-way mixed, single measure, absolute agreement
  iccA1Lower95: number;
  iccA1Upper95: number;
  iccC1: number; // Two-way mixed, single measure, consistency
  iccC1Lower95: number;
  iccC1Upper95: number;
  // Typical Error (TE)
  typicalError: number; // SDdiff / sqrt(2)
  typicalErrorLower95: number;
  typicalErrorUpper95: number;
  teMethod: 'sd_diff_div_sqrt2';
  teCiMethod: 'exact_chi_square';
  // Standard Error of Measurement (SEM)
  sem: number; // pooled_SD * sqrt(1 - iccA1)
  semMethod: 'pooled_sd_sqrt_1_minus_icc';
  // Coefficient of Variation (CV%)
  cvMean: number; // (TE / grandMean) * 100
  cvLower95: number;
  cvUpper95: number;
  cvMethod: 'te_div_pooled_mean';
  cvCiMethod: 'vangel_mckay_approx';
  // Minimum Detectable Change (MDC95/MDC90) & MDC%
  mdcConfidenceLevel: 90 | 95;
  mdc95: number; // SEM * z * sqrt(2)
  mdcPercent: number; // (MDC / grandMean) * 100
  mdcMethod: 'sem_times_z_times_sqrt2';
  // Bland-Altman
  loaLower: number; // meanBias - z * biasSD
  loaUpper: number; // meanBias + z * biasSD
  loaLowerCILower: number;
  loaLowerCIUpper: number;
  loaUpperCILower: number;
  loaUpperCIUpper: number;
  // Versioning
  analysisMethodVersion: 'v1.0';
  // Paired data for plotting
  pairs: AggregatedPairData[];
}

export interface SuitabilityEvaluation {
  metricId: string;
  metricName: string;
  tier: SuitabilityTier;
  tierLabel: string;
  isEligibleForReference: boolean;
  cautionWarning?: string; // Yellow warning for Tier 2 references
  overallScore: number; // 0-100
  summary: string;
  reasons: string[];
  detailedRationale: string[];
  strengths: string[];
  cautions: string[];
  decisionRulesTriggered: {
    rule: string;
    passed: boolean;
    observedValue: string;
    thresholdValue: string;
  }[];
  methodologicalNote: string;
  validityDisclaimer: string;
}

export interface ReliabilityReference {
  id: string; // REF-2026-XXXX
  version: number;
  versionTag: string; // 'v1.0', 'v2.0'
  previousVersionId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'deprecated' | 'archived';
  projectId: string;
  projectName: string;
  sport: string;
  testName: string;
  metricId: string;
  metricName: string;
  unit: string;
  direction: MetricDirection;
  device: string;
  protocol: string;
  population: string;
  cohortDescription: string;
  sampleSize: number;
  sessionInterval: string;
  sessionsCount: number;
  sessionsCompared: [number, number];
  trialsPerSession: number;
  trialAggregation: TrialAggregationMethod;
  // ICC Metadata & Values
  iccModel: string; // 'two_way_mixed'
  iccDefinition: string; // 'absolute_agreement'
  iccMeasureType: string; // 'single'
  iccCiMethod: string; // 'mcgraw_wong_1996'
  iccA1: number;
  iccA1CI: [number, number];
  iccC1?: number;
  // TE
  teMethod: string; // 'sd_diff_div_sqrt2'
  typicalError: number;
  // CV%
  cvMethod: string; // 'te_div_pooled_mean'
  cvCiMethod: string; // 'vangel_mckay_approx'
  cv: number;
  cvCI: [number, number];
  // Bias
  meanBias: number;
  biasPercent?: number;
  biasToMdcRatio?: number;
  biasCI: [number, number];
  // Pooled SD & SEM
  pooledSD: number;
  semMethod: string; // 'pooled_sd_sqrt_1_minus_icc'
  sem: number;
  // MDC
  mdcConfidenceLevel: number; // 95
  mdcMethod: string; // 'sem_times_z_times_sqrt2'
  mdc95: number;
  mdcPercent: number;
  // Bland-Altman LoA
  loaLower: number;
  loaUpper: number;
  // Group Means
  t1Mean: number;
  t2Mean: number;
  grandMean: number;
  // Suitability details
  suitabilityTier: SuitabilityTier;
  suitabilityRationale: string;
  cautionWarning?: string;
  ruleVersion: string;
  dataVersion: string;
  analysisMethodVersion: string; // 'v1.0'
  decisionRuleVersion?: string; // 'v1.1'
  thresholdConfigSnapshot?: Record<string, any>;
  dataQualityStatus: 'clean' | 'parsed_with_warnings';
  dataQualityWarnings?: string[];
  validityDisclaimer: string;
  tags?: string[];
  notes?: string;
}

export type TrueChangeResultType =
  | 'true_improvement'
  | 'true_decline'
  | 'within_noise'
  | 'true_change_neutral';

export interface AthleteMonitoringRecord {
  id: string;
  athleteId: string;
  athleteName: string;
  date: string;
  referenceId: string;
  referenceVersion?: number;
  referenceName: string;
  metricName: string;
  unit: string;
  direction: MetricDirection;
  baselineValue: number;
  currentValue: number;
  delta: number; // current - baseline
  deltaPercent: number; // (delta / baseline) * 100
  mdc95: number;
  upperThreshold: number; // baseline + mdc95
  lowerThreshold: number; // baseline - mdc95
  resultType: TrueChangeResultType;
  resultLabel: string;
  resultExplanation: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  sport: string;
  testName: string;
  device: string;
  protocol: string;
  population?: string;
  testInterval: string;
  cohortDescription: string;
  sessionCount: number;
  trialCount: number;
  aggregationMethod: TrialAggregationMethod;
  selectedSessionA?: number;
  selectedSessionB?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'data_imported' | 'analyzed' | 'reference_built';
  rawDataset?: RawDataRow[];
  metricDefinitions?: MetricDefinition[];
  calculatedStats?: Record<string, ReliabilityStats>;
  evaluations?: Record<string, SuitabilityEvaluation>;
}

export interface SystemSettings {
  minCohortSize: number; // default 10
  iccRecommendedCutoff: number; // default 0.80 (pass)
  iccLowerBoundCutoff: number; // default 0.70 (pass)
  iccCautionCutoff?: number; // default 0.70
  iccLowerBoundCaution?: number; // default 0.60
  cvRecommendedCutoff: number; // default 8.0 (%) (pass)
  cvUpperBoundCutoff: number; // default 12.0 (%) (pass)
  cvCautionCutoff?: number; // default 14.0 (%)
  cvUpperBoundCaution?: number; // default 18.0 (%)
  mdcPercentCutoff: number; // default 15.0 (%) (pass)
  mdcPercentCaution?: number; // default 25.0 (%)
  biasPercentPass?: number; // default 2.0 (%) (pass)
  biasPercentCaution?: number; // default 5.0 (%) (caution)
  biasPercentCutoff: number; // default 5.0 (%) (legacy alias)
  confidenceLevel: 90 | 95; // default 95
  bootstrapResamples: number; // default 1000
  allowManualReferenceCreation: boolean; // default false
  organizationName: string;
  activeLanguage: 'zh-CN' | 'en';
  decisionRuleVersion?: string; // 'v1.1'
  analysisMethodVersion?: string; // 'v1.0'
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: 'project' | 'reference' | 'athlete_record' | 'settings';
  entityId: string;
  description: string;
  user: string;
}

