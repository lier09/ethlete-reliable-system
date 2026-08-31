import {
  ReliabilityStats,
  SuitabilityEvaluation,
  SuitabilityTier,
  SystemSettings,
  ReliabilityReference,
  AthleteMonitoringRecord,
  TrueChangeResultType,
  MetricDirection
} from '../types';
import { formatNum } from './statistics';

export const DEFAULT_SETTINGS: SystemSettings = {
  minCohortSize: 10,
  iccRecommendedCutoff: 0.80,
  iccLowerBoundCutoff: 0.70,
  iccCautionCutoff: 0.70,
  iccLowerBoundCaution: 0.60,
  cvRecommendedCutoff: 8.0,
  cvUpperBoundCutoff: 12.0,
  cvCautionCutoff: 14.0,
  cvUpperBoundCaution: 18.0,
  mdcPercentCutoff: 15.0,
  mdcPercentCaution: 25.0,
  biasPercentPass: 2.0,
  biasPercentCaution: 5.0,
  biasPercentCutoff: 5.0,
  confidenceLevel: 95,
  bootstrapResamples: 1000,
  allowManualReferenceCreation: false,
  organizationName: '体育科研与高水平运动表现实验室',
  activeLanguage: 'zh-CN',
  decisionRuleVersion: 'v1.1',
  analysisMethodVersion: 'v1.0'
};

/**
 * Hierarchical Monitoring Suitability Evaluation Engine (监控适用性分层评价引擎)
 *
 * Rules Hierarchy (规则层级):
 * 0. Pre-condition (前提条件): Cohort Sample Size (决定估计稳定性，不与信度等权混同)
 * 1. Level 1 Core Reliability (一级核心信度指标):
 *    - ICC(A,1) Point Estimate (≥ 0.80) & 95% CI Lower Bound (≥ 0.70)
 *    - CV% Mean (≤ 8.0%) & 95% CI Upper Bound (≤ 12.0%)
 * 2. Level 2 Core Sensitivity & Validity (二级核心变化检测能力与系统偏差):
 *    - MDC% (≤ 15.0% 默认经验规则)
 *    - Systematic Bias Magnitude (≤ 2.0% PASS, 2.0%~5.0% CAUTION, > 5.0% FAIL; P值作为辅助统计证据)
 * 3. Diagnostic Check (诊断性检查):
 *    - Bland-Altman LoA 离群点比例与结构检查 (不作为主要加分项)
 *
 * Returns suitability tier, monitoring suitability score, reasons, strengths, cautions, and audit notes.
 */
export function evaluateMetricReliability(
  stats: ReliabilityStats,
  settings: SystemSettings = DEFAULT_SETTINGS
): SuitabilityEvaluation {
  const rules = [];
  const reasons: string[] = [];
  const detailedRationale: string[] = [];
  const strengths: string[] = [];
  const cautions: string[] = [];

  // -------------------------------------------------------------
  // Layer 0: Sample Size (Estimation Stability Pre-condition)
  // -------------------------------------------------------------
  let sampleStatus: 'pass' | 'caution' | 'fail' = 'pass';
  if (stats.n >= settings.minCohortSize) {
    sampleStatus = 'pass';
  } else if (stats.n >= 6) {
    sampleStatus = 'caution';
  } else {
    sampleStatus = 'fail';
  }

  rules.push({
    rule: '[前提条件] 受试者样本量要求 (Cohort Sample Size)',
    passed: sampleStatus === 'pass',
    observedValue: `n = ${stats.n}`,
    thresholdValue: `≥ ${settings.minCohortSize} (达标), 6~${settings.minCohortSize - 1} (需谨慎), < 6 (拦截)`
  });

  if (sampleStatus === 'pass') {
    strengths.push(`样本量充足 (n = ${stats.n} ≥ ${settings.minCohortSize})，统计估计稳定性良好。`);
    reasons.push(`样本量达标 (n=${stats.n})`);
  } else if (sampleStatus === 'caution') {
    cautions.push(`样本量偏小 (n = ${stats.n} < ${settings.minCohortSize})，置信区间较宽，估计存在一定不确定性。`);
    reasons.push(`样本量偏小 (n=${stats.n} < ${settings.minCohortSize})`);
  } else {
    cautions.push(`样本量过小 (n = ${stats.n} < 6)，无法支持可靠性估计。`);
    reasons.push(`样本量严重不足 (n=${stats.n})`);
  }

  // -------------------------------------------------------------
  // Layer 1 (Level 1 Core): Relative Reliability - ICC(A,1) & 95% CI
  // -------------------------------------------------------------
  let iccStatus: 'pass' | 'caution' | 'fail' = 'pass';
  const iccPointPass = stats.iccA1 >= settings.iccRecommendedCutoff;
  const iccLowerPass = stats.iccA1Lower95 >= settings.iccLowerBoundCutoff;
  const iccCautionCutoff = settings.iccCautionCutoff ?? 0.70;
  const iccLowerCautionCutoff = settings.iccLowerBoundCaution ?? 0.60;

  if (iccPointPass && iccLowerPass) {
    iccStatus = 'pass';
  } else if (stats.iccA1 >= iccCautionCutoff || stats.iccA1Lower95 >= iccLowerCautionCutoff) {
    iccStatus = 'caution';
  } else {
    iccStatus = 'fail';
  }

  rules.push({
    rule: '[一级核心] 相对可靠性 ICC(A,1) 点估计与95%CI下限',
    passed: iccStatus === 'pass',
    observedValue: `${formatNum(stats.iccA1, 2)} [95%CI: ${formatNum(stats.iccA1Lower95, 2)} ~ ${formatNum(stats.iccA1Upper95, 2)}]`,
    thresholdValue: `点估计 ≥ ${settings.iccRecommendedCutoff} 且 下限 ≥ ${settings.iccLowerBoundCutoff}`
  });

  if (stats.iccA1Lower95 >= 0.90) {
    strengths.push(`ICC 95%CI下限极佳 (≥0.90)，受试者排序与一致性极度稳定。`);
    reasons.push('ICC 95%CI下限极佳 (≥0.90)');
  } else if (iccStatus === 'pass') {
    strengths.push(`相对可靠性良好 [ICC(A,1) = ${formatNum(stats.iccA1, 2)}]，组内变异显著小于组间变异。`);
    reasons.push(`ICC(A,1) 达标 (${formatNum(stats.iccA1, 2)})`);
  } else if (iccStatus === 'caution') {
    cautions.push(`ICC处于中度可用范围 (${formatNum(stats.iccA1, 2)}, 95%CI下限: ${formatNum(stats.iccA1Lower95, 2)})，区分能力中等。`);
    reasons.push(`ICC相对信度中度 (${formatNum(stats.iccA1, 2)})`);
  } else {
    cautions.push(`ICC相对可靠性不足 (${formatNum(stats.iccA1, 2)} < ${settings.iccRecommendedCutoff})，指标区分能力较弱。`);
    reasons.push(`ICC相对信度不足 (${formatNum(stats.iccA1, 2)})`);
  }

  // -------------------------------------------------------------
  // Layer 1 (Level 1 Core): Absolute Reliability - CV% & 95% CI
  // -------------------------------------------------------------
  let cvStatus: 'pass' | 'caution' | 'fail' = 'pass';
  const cvPointPass = stats.cvMean <= settings.cvRecommendedCutoff;
  const cvUpperPass = stats.cvUpper95 <= settings.cvUpperBoundCutoff;
  const cvCautionCutoff = settings.cvCautionCutoff ?? 14.0;
  const cvUpperCautionCutoff = settings.cvUpperBoundCaution ?? 18.0;

  if (cvPointPass && cvUpperPass) {
    cvStatus = 'pass';
  } else if (stats.cvMean <= cvCautionCutoff && stats.cvUpper95 <= cvUpperCautionCutoff) {
    cvStatus = 'caution';
  } else {
    cvStatus = 'fail';
  }

  rules.push({
    rule: '[一级核心] 绝对变异度 CV% 均值与95%CI上限',
    passed: cvStatus === 'pass',
    observedValue: `${formatNum(stats.cvMean, 1)}% [95%CI: ${formatNum(stats.cvLower95, 1)}% ~ ${formatNum(stats.cvUpper95, 1)}%]`,
    thresholdValue: `均值 ≤ ${settings.cvRecommendedCutoff}% 且 上限 ≤ ${settings.cvUpperBoundCutoff}%`
  });

  if (stats.cvUpper95 <= 5.0) {
    strengths.push(`CV% 95%CI上限极低 (≤5.0%)，绝对测量误差极其微小。`);
    reasons.push('CV% 95%CI上限极低 (≤5.0%)');
  } else if (cvStatus === 'pass') {
    strengths.push(`绝对测量误差较小 (CV = ${formatNum(stats.cvMean, 1)}%)，重测内变异性受控。`);
    reasons.push(`CV% 点估计与95%CI上限受控 (${formatNum(stats.cvMean, 1)}%)`);
  } else if (cvStatus === 'caution') {
    cautions.push(`CV% 处于中度受控范围 (${formatNum(stats.cvMean, 1)}%，95%CI上限 ${formatNum(stats.cvUpper95, 1)}%)，测试可能存在一定波动。`);
    reasons.push(`CV% 处于中度范围 (${formatNum(stats.cvMean, 1)}%)`);
  } else {
    cautions.push(`CV% 偏高 (${formatNum(stats.cvMean, 1)}% > ${settings.cvRecommendedCutoff}%)，受试者自身内部测试变异过大。`);
    reasons.push(`CV% 偏高 (${formatNum(stats.cvMean, 1)}% > ${cvCautionCutoff}%)`);
  }

  // -------------------------------------------------------------
  // Layer 2 (Level 2 Core): Sensitivity to True Change - MDC%
  // Heuristic rule: MDC% <= 15% (default configurable screening threshold)
  // -------------------------------------------------------------
  let mdcStatus: 'pass' | 'caution' | 'fail' = 'pass';
  const mdcPassCutoff = settings.mdcPercentCutoff ?? 15.0;
  const mdcCautionCutoff = settings.mdcPercentCaution ?? 25.0;

  if (stats.mdcPercent <= mdcPassCutoff) {
    mdcStatus = 'pass';
  } else if (stats.mdcPercent <= mdcCautionCutoff) {
    mdcStatus = 'caution';
  } else {
    mdcStatus = 'fail';
  }

  rules.push({
    rule: '[二级核心] 最小可检测真实变化比例 MDC% (默认经验规则)',
    passed: mdcStatus === 'pass',
    observedValue: `${formatNum(stats.mdcPercent, 1)}% (MDC95 = ±${formatNum(stats.mdc95, 2)} ${stats.unit})`,
    thresholdValue: `≤ ${mdcPassCutoff}% (推荐), ${mdcPassCutoff}%~${mdcCautionCutoff}% (需谨慎), > ${mdcCautionCutoff}% (不推荐)`
  });

  if (mdcStatus === 'pass') {
    strengths.push(`较低的MDC95和MDC%表明，该指标对超过测量误差的个体变化具有较好的检测能力 (MDC95占均值 ${formatNum(stats.mdcPercent, 1)}% ≤ ${mdcPassCutoff}%)。`);
    reasons.push(`MDC% 充足敏锐 (${formatNum(stats.mdcPercent, 1)}% ≤ ${mdcPassCutoff}%)`);
  } else if (mdcStatus === 'caution') {
    cautions.push(`MDC95占平均水平比例偏大 (${formatNum(stats.mdcPercent, 1)}%)，需要中等程度改变才能超出测量误差。`);
    reasons.push(`MDC% 偏大 (${formatNum(stats.mdcPercent, 1)}%)`);
  } else {
    cautions.push(`MDC95占平均水平比例过大 (${formatNum(stats.mdcPercent, 1)}% > ${mdcCautionCutoff}%)，微小机能改变将被测试误差掩盖。`);
    reasons.push(`MDC% 过大 (${formatNum(stats.mdcPercent, 1)}% > ${mdcCautionCutoff}%)`);
  }

  // -------------------------------------------------------------
  // Layer 2 (Level 2 Core): Systematic Bias Magnitude & P-Value
  // Magnitude Priority:
  // bias_percent <= 2.0% -> PASS
  // 2.0% < bias_percent <= 5.0% -> CAUTION
  // bias_percent > 5.0% -> FAIL
  // P-value is auxiliary evidence; P < 0.05 alone does NOT trigger FAIL.
  // -------------------------------------------------------------
  const biasPercent = Math.abs(stats.biasPercent);
  const biasToMdcRatio = stats.biasToMdcRatio !== undefined
    ? stats.biasToMdcRatio
    : (stats.mdc95 > 0 ? Math.abs(stats.meanBias) / stats.mdc95 : 0);

  const biasPassLimit = settings.biasPercentPass ?? 2.0;
  const biasCautionLimit = settings.biasPercentCaution ?? 5.0;

  let biasStatus: 'pass' | 'caution' | 'fail' = 'pass';
  if (biasPercent <= biasPassLimit) {
    biasStatus = 'pass';
  } else if (biasPercent <= biasCautionLimit) {
    biasStatus = 'caution';
  } else {
    biasStatus = 'fail';
  }

  rules.push({
    rule: '[二级核心] 系统性测量偏差实际幅度与统计显著性 (Systematic Bias & P-Value)',
    passed: biasStatus === 'pass',
    observedValue: `Mean Bias = ${stats.meanBias >= 0 ? '+' : ''}${formatNum(stats.meanBias, 2)} ${stats.unit} (Bias% = ${formatNum(biasPercent, 2)}%, Bias/MDC95 = ${formatNum(biasToMdcRatio, 2)}, p = ${formatNum(stats.pairedTPValue, 3)})`,
    thresholdValue: `实际偏差 ≤ ${biasPassLimit}% (PASS), ${biasPassLimit}%~${biasCautionLimit}% (CAUTION), > ${biasCautionLimit}% (FAIL); P值反映统计证据但不单独决定合格性`
  });

  if (biasStatus === 'pass') {
    if (stats.pairedTPValue < 0.05) {
      strengths.push(`统计学显著但实际偏差微小 (Statistically significant but practically small systematic bias: p = ${formatNum(stats.pairedTPValue, 3)}, Bias% = ${formatNum(biasPercent, 2)}% ≤ ${biasPassLimit}%, 占MDC95的 ${formatNum(biasToMdcRatio, 2)})，不影响日常监控使用。`);
      reasons.push(`系统偏差微小受控 (Bias% = ${formatNum(biasPercent, 2)}% ≤ ${biasPassLimit}%, p = ${formatNum(stats.pairedTPValue, 3)})`);
    } else {
      strengths.push(`未检测到显著系统性偏差 (Mean Bias = ${formatNum(stats.meanBias, 2)} ${stats.unit}, Bias% = ${formatNum(biasPercent, 2)}%, p = ${formatNum(stats.pairedTPValue, 3)})。`);
      reasons.push(`系统偏差微小 (Bias% = ${formatNum(biasPercent, 2)}%)`);
    }
  } else if (biasStatus === 'caution') {
    cautions.push(`检测到中度系统偏差 (Bias% = ${formatNum(biasPercent, 2)}% 处于 ${biasPassLimit}%~${biasCautionLimit}% 之间, Bias/MDC95 = ${formatNum(biasToMdcRatio, 2)}, p = ${formatNum(stats.pairedTPValue, 3)})，追踪微小纵向改变时建议结合其他指标。`);
    reasons.push(`中度系统偏差 (Bias% = ${formatNum(biasPercent, 2)}%)`);
  } else {
    cautions.push(`检测到显著过大的系统偏差 (Bias% = ${formatNum(biasPercent, 2)}% > ${biasCautionLimit}%, p = ${formatNum(stats.pairedTPValue, 3)})，提示可能存在明显的学习效应或测试疲劳。`);
    reasons.push(`系统偏差过大 (Bias% = ${formatNum(biasPercent, 2)}% > ${biasCautionLimit}%)`);
  }

  // -------------------------------------------------------------
  // Layer 3 (Diagnostic Check): Bland-Altman LoA & Outliers
  // 95% LoA expects ~95% points inside by definition.
  // This serves as diagnostic check (not an equal-weight primary score booster).
  // -------------------------------------------------------------
  const outlierCount = stats.pairs ? stats.pairs.filter(p => {
    const diff = p.test2 - p.test1;
    return diff < stats.loaLower || diff > stats.loaUpper;
  }).length : 0;
  const outlierRatio = stats.n > 0 ? (outlierCount / stats.n) * 100 : 0;
  const baDiagnosticPass = outlierRatio <= 10;

  rules.push({
    rule: '[诊断性检查] Bland-Altman 95% 一致性区间与界外分布 (Diagnostic LoA)',
    passed: baDiagnosticPass,
    observedValue: `界外点数: ${outlierCount}/${stats.n} (${formatNum(outlierRatio, 1)}%) [LoA: ${formatNum(stats.loaLower, 2)} ~ ${formatNum(stats.loaUpper, 2)} ${stats.unit}]`,
    thresholdValue: `95%界限外点数 ≤ 10% (诊断性监测，不作核心加权项)`
  });

  if (!baDiagnosticPass) {
    cautions.push(`Bland-Altman 95% 界限外离群点比例偏高 (${formatNum(outlierRatio, 1)}% > 10%)，提示存在异常值或可能存在异方差分布。`);
  }

  // -------------------------------------------------------------
  // Tier Decision & Score Synthesis (Hierarchically Weighted)
  // Total: 100 Points
  // - ICC (Level 1 Core): 35 points
  // - CV% (Level 1 Core): 35 points
  // - MDC% (Level 2 Core): 15 points
  // - Systematic Bias (Level 2 Core): 10 points
  // - Sample Size Stability: 5 points
  // -------------------------------------------------------------
  let tier: SuitabilityTier;
  let tierLabel: string;
  let isEligibleForReference: boolean;
  let cautionWarning: string | undefined = undefined;
  let overallScore = 0;

  // 1. ICC Score (max 35)
  let iccScore = 0;
  if (stats.iccA1 >= 0.90 && stats.iccA1Lower95 >= 0.80) iccScore = 35;
  else if (stats.iccA1 >= settings.iccRecommendedCutoff && stats.iccA1Lower95 >= settings.iccLowerBoundCutoff) iccScore = 30;
  else if (stats.iccA1 >= 0.70 || stats.iccA1Lower95 >= 0.60) iccScore = 20;
  else if (stats.iccA1 >= 0.50) iccScore = 10;
  else iccScore = 0;

  // 2. CV Score (max 35)
  let cvScore = 0;
  if (stats.cvMean <= 5.0 && stats.cvUpper95 <= 8.0) cvScore = 35;
  else if (stats.cvMean <= settings.cvRecommendedCutoff && stats.cvUpper95 <= settings.cvUpperBoundCutoff) cvScore = 30;
  else if (stats.cvMean <= 14.0 && stats.cvUpper95 <= 18.0) cvScore = 20;
  else if (stats.cvMean <= 16.0) cvScore = 10;
  else cvScore = 0;

  // 3. MDC% Score (max 15)
  let mdcScore = 0;
  if (stats.mdcPercent <= 8.0) mdcScore = 15;
  else if (stats.mdcPercent <= mdcPassCutoff) mdcScore = 12;
  else if (stats.mdcPercent <= mdcCautionCutoff) mdcScore = 6;
  else mdcScore = 0;

  // 4. Bias Score (max 10)
  let biasScore = 0;
  if (biasPercent <= biasPassLimit) biasScore = 10;
  else if (biasPercent <= biasCautionLimit) biasScore = 5;
  else biasScore = 0;

  // 5. Sample Size Stability (max 5)
  let sampleScore = 0;
  if (sampleStatus === 'pass') sampleScore = 5;
  else if (sampleStatus === 'caution') sampleScore = 2;
  else sampleScore = 0;

  overallScore = Math.min(100, Math.max(0, iccScore + cvScore + mdcScore + biasScore + sampleScore));

  // Critical Core Fail Check
  const hasCriticalFail =
    sampleStatus === 'fail' ||
    iccStatus === 'fail' ||
    cvStatus === 'fail' ||
    mdcStatus === 'fail' ||
    biasStatus === 'fail';

  const cautionCount = [sampleStatus, iccStatus, cvStatus, mdcStatus, biasStatus].filter(s => s === 'caution').length;

  // Tier 1: Recommended for Monitoring (Core metrics all PASS, no major bias)
  if (!hasCriticalFail && cautionCount === 0) {
    tier = 'tier_1_recommended';
    tierLabel = '推荐用于纵向监控 (Tier 1 - Recommended)';
    isEligibleForReference = true;
    detailedRationale.push(
      `核心信度指标全面达标：重复测量展现出优秀的相对信度 [ICC(A,1) = ${formatNum(stats.iccA1, 2)}] 与绝对精度 [CV = ${formatNum(stats.cvMean, 1)}%]，系统偏差极小 (Bias% = ${formatNum(biasPercent, 2)}% ≤ ${biasPassLimit}%)。在当前标准化测试方案下，MDC95 = ±${formatNum(stats.mdc95, 2)} ${stats.unit} (占均值 ${formatNum(stats.mdcPercent, 1)}%)。较低的MDC95和MDC%表明，该指标对超过测量误差的个体变化具有较好的检测能力，能够识别幅度超过MDC95的个体机能变化，推荐建立基准并作为日常纵向监控核心指标。`
    );
  }
  // Tier 2: Use with Caution (Has caution items, but no severe critical fails)
  else if (!hasCriticalFail) {
    tier = 'tier_2_caution';
    tierLabel = '可采用但需谨慎 (Tier 2 - Use with Caution)';
    isEligibleForReference = true; // Tier 2 allows Reference creation with caution warning
    cautionWarning = 'Use with caution; interpret longitudinal changes together with other relevant metrics. (谨慎使用：该指标存在一定测量学限制，建议结合其他指标及实际情境解释)';
    detailedRationale.push(
      `指标信度整体可用 (ICC = ${formatNum(stats.iccA1, 2)}, CV = ${formatNum(stats.cvMean, 1)}%)，但存在 ${cautionCount} 项边缘谨慎指标 (如样本量不足、置信区间较宽、MDC%偏大或存在 ${biasPassLimit}%~${biasCautionLimit}% 中度系统偏差)。系统允许建立基准参考值 (Reference)，但提示在日常监控中谨慎使用，纵向变化判定建议结合其他相关指标综合解释。`
    );
  }
  // Tier 3: Not Recommended as Primary Monitoring Metric (Has critical fail)
  else {
    tier = 'tier_3_not_recommended';
    tierLabel = '不推荐作为主要监控指标 (Tier 3 - Not Recommended)';
    isEligibleForReference = false; // Strictly prohibited by default
    detailedRationale.push(
      `存在关键可靠性缺陷：指标测量噪声过大 (CV = ${formatNum(stats.cvMean, 1)}%)、相对信度不足 (ICC = ${formatNum(stats.iccA1, 2)})、MDC%过大 (${formatNum(stats.mdcPercent, 1)}%) 或存在 >${biasCautionLimit}% 严重系统偏差。微小的真实机能改变将被测试误差掩盖，系统禁止建立基准参考值，不适宜作为纵向机能疲劳与适应判定的主要指标。`
    );
  }

  const summary = `${tierLabel} (规则符合度: ${overallScore}/100)`;
  const methodologicalNote = `P值反映是否存在统计学系统性差异的证据，而系统偏差的实际影响幅度需单独评估 (P value indicates statistical evidence of a systematic difference, but the practical magnitude of the bias is evaluated separately)。信度计算基于 Hopkins (2000) 典型误差 (TE)、Weir (2005) 测量标准误 (SEM) 与 McGraw & Wong (1996) ICC(A,1) 绝对一致性模型。95% 最小真实变化阈值计算公式为 MDC₉₅ = SEM × 1.96 × √2。`;

  return {
    metricId: stats.metricId,
    metricName: stats.metricName,
    tier,
    tierLabel,
    isEligibleForReference,
    cautionWarning,
    overallScore,
    summary,
    reasons,
    detailedRationale,
    strengths,
    cautions,
    decisionRulesTriggered: rules,
    methodologicalNote
  };
}

// Alias for compatibility
export const evaluateSuitability = evaluateMetricReliability;

/**
 * Calculate True Change Thresholds and Verdict for an Athlete.
 * Upper Detectable Threshold = Baseline + MDC95
 * Lower Detectable Threshold = Baseline - MDC95
 *
 * Strict Interpretation Rule:
 * MDC only determines whether the observed change exceeds expected measurement error.
 * It does NOT automatically assert physiological adaptation, fatigue, or injury.
 */
export function calculateTrueChangeThreshold(
  baselineValue: number,
  mdc95: number,
  currentValue: number,
  direction: MetricDirection = 'higher_is_better'
): {
  upperThreshold: number;
  lowerThreshold: number;
  delta: number;
  deltaPercent: number;
  resultType: TrueChangeResultType;
  resultLabel: string;
  resultExplanation: string;
} {
  const delta = currentValue - baselineValue;
  const deltaPercent = baselineValue !== 0 ? (delta / baselineValue) * 100 : 0;
  const upperThreshold = baselineValue + mdc95;
  const lowerThreshold = baselineValue - mdc95;

  let resultType: TrueChangeResultType = 'within_noise';
  let resultLabel = '在正常测量噪声范围内 (Within Measurement Error)';
  let resultExplanation = '';

  if (direction === 'higher_is_better') {
    if (currentValue > upperThreshold) {
      resultType = 'true_improvement';
      resultLabel = '真实升高 / 表现提升 (True Improvement)';
      resultExplanation = `实测值较基线变化量 (+${formatNum(delta, 2)}) 超过 95% 最小真实变化阈值 (MDC₉₅ = ±${formatNum(mdc95, 2)})。该变化已超出预期测量误差；其训练、生理或表现意义仍需结合实际情境解释。`;
    } else if (currentValue < lowerThreshold) {
      resultType = 'true_decline';
      resultLabel = '真实下降 / 表现衰退 (True Decline)';
      resultExplanation = `实测值较基线变化量 (${formatNum(delta, 2)}) 跌破 95% 最小真实变化下限 (MDC₉₅ = ±${formatNum(mdc95, 2)})。该变化已超出预期测量误差；提示可能存在显著疲劳或机能下降，需结合训练负荷综合研判。`;
    } else {
      resultType = 'within_noise';
      resultLabel = '在预期测量误差范围内 (Within Measurement Error)';
      resultExplanation = `变化量 (${delta >= 0 ? '+' : ''}${formatNum(delta, 2)}) 未超出 95% 最小真实变化阈值 (±${formatNum(mdc95, 2)})。属于正常测试与生物学随机波动范围，尚不能确证为超出误差的真实改变。`;
    }
  } else if (direction === 'lower_is_better') {
    if (currentValue < lowerThreshold) {
      resultType = 'true_improvement';
      resultLabel = '真实缩短 / 表现提升 (True Improvement)';
      resultExplanation = `实测用时/测试值缩短 ${formatNum(Math.abs(delta), 2)}，已超出 95% 最小真实变化阈值 (MDC₉₅ = ±${formatNum(mdc95, 2)})。该变化已超出预期测量误差，可信确认为能力提升。`;
    } else if (currentValue > upperThreshold) {
      resultType = 'true_decline';
      resultLabel = '真实增加 / 表现衰退 (True Decline)';
      resultExplanation = `实测用时/测试值增加 +${formatNum(delta, 2)}，已超出 95% 误差阈值 (MDC₉₅ = ±${formatNum(mdc95, 2)})。该变化超出预期测量误差，提示测试表现出现真实衰退或存在疲劳积累。`;
    } else {
      resultType = 'within_noise';
      resultLabel = '在预期测量误差范围内 (Within Measurement Error)';
      resultExplanation = `变化量 (${delta >= 0 ? '+' : ''}${formatNum(delta, 2)}) 处于预期测量误差 (±${formatNum(mdc95, 2)}) 范围之内，属于正常测试波动。`;
    }
  } else {
    // Neutral metric
    if (currentValue > upperThreshold) {
      resultType = 'true_change_neutral';
      resultLabel = '真实升高 (True Increase)';
      resultExplanation = `实测值升高 +${formatNum(delta, 2)}，已超出 95% 测量误差阈值 (±${formatNum(mdc95, 2)})。该变化超出预期测量误差，具体影响需结合实际情境分析。`;
    } else if (currentValue < lowerThreshold) {
      resultType = 'true_change_neutral';
      resultLabel = '真实降低 (True Decrease)';
      resultExplanation = `实测值降低 ${formatNum(delta, 2)}，已超出 95% 测量误差阈值 (±${formatNum(mdc95, 2)})。该变化超出预期测量误差，具体影响需结合实际情境分析。`;
    } else {
      resultType = 'within_noise';
      resultLabel = '在预期测量误差范围内 (Within Measurement Error)';
      resultExplanation = `变化量在正常预期测试误差之内。`;
    }
  }

  return {
    upperThreshold,
    lowerThreshold,
    delta,
    deltaPercent,
    resultType,
    resultLabel,
    resultExplanation
  };
}

/**
 * Full athlete monitoring record evaluator
 */
export function evaluateTrueChange(
  reference: ReliabilityReference,
  baselineValue: number,
  currentValue: number,
  athleteId: string = 'ATH-001',
  athleteName: string = '运动员',
  date: string = new Date().toISOString().split('T')[0],
  notes?: string
): AthleteMonitoringRecord {
  const {
    upperThreshold,
    lowerThreshold,
    delta,
    deltaPercent,
    resultType,
    resultLabel,
    resultExplanation
  } = calculateTrueChangeThreshold(
    baselineValue,
    reference.mdc95,
    currentValue,
    reference.direction
  );

  return {
    id: `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    athleteId,
    athleteName,
    date,
    referenceId: reference.id,
    referenceName: `${reference.metricName} (${reference.sport} - ${reference.testName})`,
    metricName: reference.metricName,
    unit: reference.unit,
    direction: reference.direction,
    baselineValue,
    currentValue,
    delta,
    deltaPercent,
    mdc95: reference.mdc95,
    upperThreshold,
    lowerThreshold,
    resultType,
    resultLabel,
    resultExplanation,
    notes,
    createdAt: new Date().toISOString()
  };
}
