import {
  AggregatedPairData,
  MetricDirection,
  ReliabilityStats
} from '../types';

/**
 * Statistical engine for sports test-retest reliability calculations.
 * Strict mathematical implementation following Hopkins (2000), Weir (2005),
 * Bland & Altman (1986, 1999), McGraw & Wong (1996), and Shaw et al. (2026).
 *
 * Core Definitions:
 * - Difference: Diff_i = T2_i - T1_i
 * - Mean Bias: mean(Diff)
 * - SDdiff: sample SD(Diff) = sqrt( sum((Diff_i - MeanBias)^2) / (n - 1) )
 * - Typical Error (TE): SDdiff / sqrt(2)
 * - Pooled Mean: (mean(T1) + mean(T2)) / 2
 * - CV%: (TE / Pooled Mean) * 100
 * - Pooled SD: sqrt( ((n1 - 1)*SD1^2 + (n2 - 1)*SD2^2) / (n1 + n2 - 2) )
 * - ICC(A,1): Two-way mixed, absolute agreement, single measure
 * - SEM: Pooled SD * sqrt(1 - ICC_A) [Never equate SEM = TE]
 * - MDC95: SEM * 1.95996 * sqrt(2) [Always uses SEM, never direct TE]
 * - MDC%: (MDC95 / Pooled Mean) * 100
 * - Bland-Altman LoA: Mean Bias +/- 1.96 * SDdiff
 */

// ==========================================
// 1. Math & Distribution Utilities
// ==========================================

// Incomplete beta function regularized I_x(a, b)
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(b, a, 1 - x);
  }

  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  ) / a;

  let c = 1;
  let d = 1 / (1 - (a + b) * x / (a + 1));
  let h = d;

  for (let m = 1; m <= 100; m++) {
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;

    num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < 1e-10) break;
  }

  return factor * h;
}

// Lanczos approximation for Gamma(z)
export function lanczosGamma(z: number): number {
  const g = 7;
  const C = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109585720572,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * lanczosGamma(1 - z));
  }

  z -= 1;
  let x = C[0];
  for (let i = 1; i < g + 2; i++) {
    x += C[i] / (z + i);
  }

  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// Log gamma function
export function logGamma(z: number): number {
  const g = 7;
  const C = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109585720572,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let x = C[0];
  for (let i = 1; i < g + 2; i++) {
    x += C[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Approximate Student's t cumulative distribution function
export function studentTCDF(t: number, df: number): number {
  if (df <= 0) return 0.5;
  const x = (t + Math.sqrt(t * t + df)) / (2 * Math.sqrt(t * t + df));
  return incompleteBeta(df / 2, df / 2, x);
}

// Cumulative distribution function for F distribution
export function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  const x = (df1 * f) / (df1 * f + df2);
  return incompleteBeta(df1 / 2, df2 / 2, x);
}

// Student t critical value for two-tailed alpha=0.05
export function getTCritical(df: number, alpha: number = 0.05): number {
  if (df <= 0) return 1.96;
  const z = alpha === 0.05 ? 1.95996 : 1.64485;
  const a = (z * z + 1) / (4 * df);
  const b = (5 * Math.pow(z, 4) + 16 * z * z + 3) / (96 * df * df);
  return z + a * z + b * z;
}

// F-distribution quantile approximation
export function getFQuantile(df1: number, df2: number, p: number): number {
  if (df1 <= 0 || df2 <= 0) return 1;
  const z = p === 0.975 ? 1.95996 : p === 0.025 ? -1.95996 : 1.64485;
  const d1 = 2 / (9 * df1);
  const d2 = 2 / (9 * df2);
  const h1 = 1 - d1;
  const h2 = 1 - d2;
  const term1 = h1 * h2;
  const term2 = z * Math.sqrt(d1 * h2 * h2 + d2 * h1 * h1 - d1 * d2 * z * z);
  const denom = h2 * h2 - d2 * z * z;
  if (denom <= 0) return 1;
  const w = (term1 + term2) / denom;
  return Math.max(0.001, Math.pow(w, 3));
}

// ==========================================
// 2. Decoupled Core Statistical Functions
// ==========================================

/**
 * 2.1 Calculate Pairwise Differences (T2_i - T1_i)
 */
export function calculateDifference(t1: number[], t2: number[]): number[] {
  if (t1.length !== t2.length) {
    throw new Error('T1 and T2 arrays must have identical length.');
  }
  return t2.map((val, idx) => val - t1[idx]);
}

/**
 * 2.2 Calculate Systematic Bias and Paired Differences
 * Mean Bias = mean(Diff)
 * SDdiff = sample SD(Diff)
 */
export function calculateBias(diffs: number[], grandMean: number = 0): {
  meanBias: number;
  sdDiff: number;
  biasSE: number;
  biasPercent: number;
  biasEvaluation: 'pass' | 'caution' | 'fail';
  biasNote: string;
  bias95CILower: number;
  bias95CIUpper: number;
  pairedTStat: number;
  pairedTPValue: number;
  hasSignificantBias: boolean;
} {
  const n = diffs.length;
  if (n < 2) {
    throw new Error('Bias calculation requires at least 2 difference values.');
  }

  const meanBias = diffs.reduce((a, b) => a + b, 0) / n;
  const biasVar = diffs.reduce((acc, d) => acc + Math.pow(d - meanBias, 2), 0) / (n - 1);
  const sdDiff = Math.sqrt(Math.max(0, biasVar));
  const biasSE = sdDiff / Math.sqrt(n);

  const df = n - 1;
  const tCrit = getTCritical(df, 0.05);
  const bias95CILower = meanBias - tCrit * biasSE;
  const bias95CIUpper = meanBias + tCrit * biasSE;

  const pairedTStat = biasSE > 0 ? meanBias / biasSE : 0;
  const tCDF = studentTCDF(Math.abs(pairedTStat), df);
  const pairedTPValue = Math.max(0, Math.min(1, 2 * (1 - tCDF)));
  const hasSignificantBias = pairedTPValue < 0.05;

  // Practical bias magnitude relative to grand mean
  const biasPercent = grandMean !== 0 ? (Math.abs(meanBias) / grandMean) * 100 : 0;

  // Practical magnitude classification:
  // <= 2% -> PASS
  // 2% ~ 5% -> CAUTION
  // > 5% -> FAIL
  let biasEvaluation: 'pass' | 'caution' | 'fail' = 'pass';
  let biasNote = '';

  if (biasPercent <= 2.0) {
    biasEvaluation = 'pass';
    if (hasSignificantBias) {
      biasNote = 'Statistically significant but practically small systematic bias (统计学显著但实际偏差微小)';
    } else {
      biasNote = 'Practically negligible systematic bias without statistical evidence (无统计显著性且实际偏差微小)';
    }
  } else if (biasPercent <= 5.0) {
    biasEvaluation = 'caution';
    biasNote = hasSignificantBias
      ? 'Statistically significant and moderate systematic bias (2%~5%) (统计学显著且呈中度系统偏差)'
      : 'Moderate systematic bias without strong statistical evidence (中度系统偏差，统计证据不足)';
  } else {
    biasEvaluation = 'fail';
    biasNote = 'Substantial systematic bias (>5%); indicates possible learning effect or fatigue (显著系统偏差 >5%，提示可能存在明显学习或疲劳效应)';
  }

  return {
    meanBias,
    sdDiff,
    biasSE,
    biasPercent,
    biasEvaluation,
    biasNote,
    bias95CILower,
    bias95CIUpper,
    pairedTStat,
    pairedTPValue,
    hasSignificantBias
  };
}

/**
 * 2.3 Calculate Typical Error (TE)
 * TE = SDdiff / sqrt(2)
 */
export function calculateTE(sdDiff: number, n: number = 20): {
  typicalError: number;
  typicalErrorLower95: number;
  typicalErrorUpper95: number;
  teMethod: 'sd_diff_div_sqrt2';
} {
  const typicalError = sdDiff / Math.sqrt(2);
  const df = Math.max(1, n - 1);
  const teChiSqLower = df / (df + 1.96 * Math.sqrt(2 * df));
  const teChiSqUpper = df / Math.max(0.1, df - 1.96 * Math.sqrt(2 * df));
  const typicalErrorLower95 = typicalError * Math.sqrt(Math.max(0.01, teChiSqLower));
  const typicalErrorUpper95 = typicalError * Math.sqrt(Math.max(0.01, teChiSqUpper));

  return {
    typicalError,
    typicalErrorLower95,
    typicalErrorUpper95,
    teMethod: 'sd_diff_div_sqrt2'
  };
}

/**
 * 2.4 Calculate Pooled Mean
 * pooled_mean = (mean(T1) + mean(T2)) / 2
 */
export function calculatePooledMean(t1Mean: number, t2Mean: number): number {
  return (t1Mean + t2Mean) / 2;
}

/**
 * 2.5 Calculate Coefficient of Variation (CV%)
 * V1 Standard: CV = (TE / pooled_mean) * 100
 */
export function calculateCV(te: number, pooledMean: number, n: number = 20): {
  cvMean: number;
  cvLower95: number;
  cvUpper95: number;
  cvMethod: 'te_div_pooled_mean';
} {
  const cvMean = pooledMean !== 0 ? (te / Math.abs(pooledMean)) * 100 : 0;
  const df = Math.max(1, n - 1);
  const teChiSqLower = df / (df + 1.96 * Math.sqrt(2 * df));
  const teChiSqUpper = df / Math.max(0.1, df - 1.96 * Math.sqrt(2 * df));

  const cvLower95 = cvMean * Math.sqrt(Math.max(0.01, teChiSqLower));
  const cvUpper95 = cvMean * Math.sqrt(Math.max(0.01, teChiSqUpper));

  return {
    cvMean,
    cvLower95,
    cvUpper95,
    cvMethod: 'te_div_pooled_mean'
  };
}

/**
 * 2.6 Calculate Pooled Standard Deviation (Pooled SD)
 * pooled_SD = sqrt( ((n1 - 1)*SD1^2 + (n2 - 1)*SD2^2) / (n1 + n2 - 2) )
 */
export function calculatePooledSD(
  t1SD: number,
  t2SD: number,
  n1: number = 20,
  n2: number = 20
): number {
  const denom = n1 + n2 - 2;
  if (denom <= 0) return (t1SD + t2SD) / 2;
  const num = (n1 - 1) * Math.pow(t1SD, 2) + (n2 - 1) * Math.pow(t2SD, 2);
  return Math.sqrt(Math.max(0, num / denom));
}

/**
 * 2.7 Two-Way Mixed ANOVA for ICC decomposition
 */
export interface ANOVA2WayResult {
  ssTotal: number;
  ssRow: number;
  ssCol: number;
  ssError: number;
  msRow: number;
  msCol: number;
  msError: number;
  dfRow: number;
  dfCol: number;
  dfError: number;
  dfTotal: number;
}

export function calculateANOVA2Way(pairs: AggregatedPairData[]): ANOVA2WayResult {
  const n = pairs.length;
  const t1Values = pairs.map(p => p.test1);
  const t2Values = pairs.map(p => p.test2);
  const rowMeans = pairs.map(p => (p.test1 + p.test2) / 2);
  const t1Mean = t1Values.reduce((a, b) => a + b, 0) / n;
  const t2Mean = t2Values.reduce((a, b) => a + b, 0) / n;
  const overallMean = (t1Values.reduce((a, b) => a + b, 0) + t2Values.reduce((a, b) => a + b, 0)) / (2 * n);

  let ssTotal = 0;
  for (let i = 0; i < n; i++) {
    ssTotal += Math.pow(t1Values[i] - overallMean, 2) + Math.pow(t2Values[i] - overallMean, 2);
  }

  const ssRow = 2 * rowMeans.reduce((acc, rm) => acc + Math.pow(rm - overallMean, 2), 0);
  const ssCol = n * (Math.pow(t1Mean - overallMean, 2) + Math.pow(t2Mean - overallMean, 2));
  const ssError = Math.max(0, ssTotal - ssRow - ssCol);

  const dfRow = n - 1;
  const dfCol = 1;
  const dfError = n - 1;
  const dfTotal = 2 * n - 1;

  const msRow = ssRow / dfRow;
  const msCol = ssCol / dfCol;
  const msError = ssError / dfError;

  return {
    ssTotal,
    ssRow,
    ssCol,
    ssError,
    msRow,
    msCol,
    msError,
    dfRow,
    dfCol,
    dfError,
    dfTotal
  };
}

/**
 * 2.8 Calculate Intraclass Correlation Coefficient (ICC)
 * Model: Two-Way Mixed Effects
 * Definition: Absolute Agreement (ICC(A,1)) and Consistency (ICC(C,1))
 * Measure Type: Single Measure
 */
export function calculateICC(
  pairs: AggregatedPairData[]
): {
  iccA1: number;
  iccA1Lower95: number;
  iccA1Upper95: number;
  iccC1: number;
  iccC1Lower95: number;
  iccC1Upper95: number;
  anova: ANOVA2WayResult;
  iccModel: 'two_way_mixed';
  iccDefinition: 'absolute_agreement';
  iccMeasureType: 'single';
} {
  const n = pairs.length;
  if (n < 2) {
    throw new Error('ICC calculation requires at least 2 subjects.');
  }

  const anova = calculateANOVA2Way(pairs);
  const msRows = anova.msRow;
  const msCols = anova.msCol;
  const msError = anova.msError;

  // ICC(A,1) - Absolute Agreement
  const iccADenom = msRows + msError + (2 / n) * (msCols - msError);
  let iccA1 = iccADenom > 0 ? (msRows - msError) / iccADenom : 0;
  iccA1 = Math.max(-1, Math.min(1, iccA1));

  // ICC(C,1) - Consistency
  const iccCDecom = msRows + msError;
  let iccC1 = iccCDecom > 0 ? (msRows - msError) / iccCDecom : 0;
  iccC1 = Math.max(-1, Math.min(1, iccC1));

  // 95% Confidence Interval for ICC(A,1) & ICC(C,1)
  const fRatio = msError > 0 ? msRows / msError : 1;
  const fUpper = getFQuantile(n - 1, n - 1, 0.975);

  let iccC1Lower95 = Math.max(0, (fRatio / fUpper - 1) / (fRatio / fUpper + 1));
  let iccC1Upper95 = Math.min(1, (fRatio * fUpper - 1) / (fRatio * fUpper + 1));

  const seApprox = Math.sqrt(Math.max(0, (2 * Math.pow(1 - iccA1, 2) * Math.pow(1 + iccA1, 2)) / Math.max(1, n - 1)));
  let iccA1Lower95 = Math.max(0, iccA1 - 1.96 * seApprox);
  let iccA1Upper95 = Math.min(1, iccA1 + 1.96 * seApprox);

  return {
    iccA1,
    iccA1Lower95,
    iccA1Upper95,
    iccC1,
    iccC1Lower95,
    iccC1Upper95,
    anova,
    iccModel: 'two_way_mixed',
    iccDefinition: 'absolute_agreement',
    iccMeasureType: 'single'
  };
}

/**
 * 2.9 Calculate Standard Error of Measurement (SEM)
 * SEM = pooled_SD * sqrt(1 - ICC_A)
 * Crucial: SEM is computed independently from pooled_SD and ICC_A, never assigned from TE!
 */
export function calculateSEM(
  pooledSD: number,
  iccA1: number
): {
  sem: number;
  semMethod: 'pooled_sd_sqrt_1_minus_icc';
} {
  const boundedICC = Math.max(0, Math.min(1, iccA1));
  const sem = pooledSD * Math.sqrt(Math.max(0, 1 - boundedICC));
  return {
    sem,
    semMethod: 'pooled_sd_sqrt_1_minus_icc'
  };
}

/**
 * 2.10 Calculate Minimal Detectable Change (MDC95)
 * MDC95 = SEM * 1.95996 * sqrt(2)
 * Principle: sqrt(2) combines pre-post error, 1.96 gives 95% confidence level.
 * Always calls SEM.
 */
export function calculateMDC95(
  sem: number,
  z: number = 1.95996
): {
  mdc95: number;
  mdcMethod: 'sem_times_z_times_sqrt2';
  mdcConfidenceLevel: 95;
} {
  const mdc95 = sem * z * Math.sqrt(2);
  return {
    mdc95,
    mdcMethod: 'sem_times_z_times_sqrt2',
    mdcConfidenceLevel: 95
  };
}

/**
 * 2.11 Calculate MDC% (Sensitivity)
 * MDC% = (MDC95 / pooled_mean) * 100
 */
export function calculateMDCPercent(mdc95: number, pooledMean: number): number {
  return pooledMean !== 0 ? (mdc95 / Math.abs(pooledMean)) * 100 : 0;
}

/**
 * 2.12 Calculate Bland-Altman Limits of Agreement (LoA)
 * Lower LoA = Mean Bias - 1.96 * SDdiff
 * Upper LoA = Mean Bias + 1.96 * SDdiff
 */
export function calculateBlandAltman(
  meanBias: number,
  sdDiff: number,
  n: number
): {
  loaLower: number;
  loaUpper: number;
  loaLowerCILower: number;
  loaLowerCIUpper: number;
  loaUpperCILower: number;
  loaUpperCIUpper: number;
} {
  const loaLower = meanBias - 1.96 * sdDiff;
  const loaUpper = meanBias + 1.96 * sdDiff;

  const df = Math.max(1, n - 1);
  const tCrit = getTCritical(df, 0.05);
  const loaSE = Math.sqrt((3 * Math.pow(sdDiff, 2)) / Math.max(1, n));

  const loaLowerCILower = loaLower - tCrit * loaSE;
  const loaLowerCIUpper = loaLower + tCrit * loaSE;
  const loaUpperCILower = loaUpper - tCrit * loaSE;
  const loaUpperCIUpper = loaUpper + tCrit * loaSE;

  return {
    loaLower,
    loaUpper,
    loaLowerCILower,
    loaLowerCIUpper,
    loaUpperCILower,
    loaUpperCIUpper
  };
}

// ==========================================
// 3. Complete Reliability Pipeline
// ==========================================

export function calculateReliability(
  pairs: AggregatedPairData[],
  metricId: string,
  metricName: string,
  unit: string,
  direction: MetricDirection = 'higher_is_better'
): ReliabilityStats {
  const n = pairs.length;
  if (n < 2) {
    throw new Error('Reliability analysis requires at least 2 paired subjects.');
  }

  // 1. Session values & sample statistics
  const t1Values = pairs.map(p => p.test1);
  const t2Values = pairs.map(p => p.test2);

  const t1Mean = t1Values.reduce((a, b) => a + b, 0) / n;
  const t2Mean = t2Values.reduce((a, b) => a + b, 0) / n;

  const t1Var = t1Values.reduce((acc, v) => acc + Math.pow(v - t1Mean, 2), 0) / (n - 1);
  const t2Var = t2Values.reduce((acc, v) => acc + Math.pow(v - t2Mean, 2), 0) / (n - 1);
  const t1SD = Math.sqrt(Math.max(0, t1Var));
  const t2SD = Math.sqrt(Math.max(0, t2Var));

  // 2. Pooled Mean (V1 standard)
  const grandMean = calculatePooledMean(t1Mean, t2Mean);

  // 3. Difference & Systematic Bias
  const diffs = calculateDifference(t1Values, t2Values);
  const biasStats = calculateBias(diffs, grandMean);

  // 4. Typical Error (TE = SDdiff / sqrt(2))
  const teStats = calculateTE(biasStats.sdDiff, n);

  // 5. CV% (V1: TE / grandMean * 100)
  const cvStats = calculateCV(teStats.typicalError, grandMean, n);

  // 6. Two-Way Mixed ANOVA & ICC (ICC(A,1) and ICC(C,1))
  const iccStats = calculateICC(pairs);

  // 7. Pooled SD
  const pooledSD = calculatePooledSD(t1SD, t2SD, n, n);

  // 8. SEM = pooled_SD * sqrt(1 - ICC_A) [Never equate SEM = TE]
  const semStats = calculateSEM(pooledSD, iccStats.iccA1);

  // 9. MDC95 = SEM * 1.95996 * sqrt(2)
  const mdcStats = calculateMDC95(semStats.sem);
  const mdcPercent = calculateMDCPercent(mdcStats.mdc95, grandMean);
  const biasToMdcRatio = mdcStats.mdc95 > 0 ? Math.abs(biasStats.meanBias) / mdcStats.mdc95 : 0;

  // 10. Bland-Altman Limits of Agreement
  const baStats = calculateBlandAltman(biasStats.meanBias, biasStats.sdDiff, n);

  return {
    metricId,
    metricName,
    unit,
    direction,
    n,
    t1Mean,
    t1SD,
    t2Mean,
    t2SD,
    grandMean,
    pooledSD,
    diffs,
    meanBias: biasStats.meanBias,
    biasSD: biasStats.sdDiff,
    biasSE: biasStats.biasSE,
    biasPercent: biasStats.biasPercent,
    biasToMdcRatio,
    biasEvaluation: biasStats.biasEvaluation,
    biasNote: biasStats.biasNote,
    bias95CILower: biasStats.bias95CILower,
    bias95CIUpper: biasStats.bias95CIUpper,
    pairedTStat: biasStats.pairedTStat,
    pairedTPValue: biasStats.pairedTPValue,
    hasSignificantBias: biasStats.hasSignificantBias,
    iccModel: iccStats.iccModel,
    iccDefinition: iccStats.iccDefinition,
    iccMeasureType: iccStats.iccMeasureType,
    iccA1: iccStats.iccA1,
    iccA1Lower95: iccStats.iccA1Lower95,
    iccA1Upper95: iccStats.iccA1Upper95,
    iccC1: iccStats.iccC1,
    iccC1Lower95: iccStats.iccC1Lower95,
    iccC1Upper95: iccStats.iccC1Upper95,
    typicalError: teStats.typicalError,
    typicalErrorLower95: teStats.typicalErrorLower95,
    typicalErrorUpper95: teStats.typicalErrorUpper95,
    teMethod: teStats.teMethod,
    sem: semStats.sem,
    semMethod: semStats.semMethod,
    cvMean: cvStats.cvMean,
    cvLower95: cvStats.cvLower95,
    cvUpper95: cvStats.cvUpper95,
    cvMethod: cvStats.cvMethod,
    mdcConfidenceLevel: mdcStats.mdcConfidenceLevel,
    mdc95: mdcStats.mdc95,
    mdcPercent,
    mdcMethod: mdcStats.mdcMethod,
    loaLower: baStats.loaLower,
    loaUpper: baStats.loaUpper,
    loaLowerCILower: baStats.loaLowerCILower,
    loaLowerCIUpper: baStats.loaLowerCIUpper,
    loaUpperCILower: baStats.loaUpperCILower,
    loaUpperCIUpper: baStats.loaUpperCIUpper,
    analysisMethodVersion: 'v1.0',
    pairs
  };
}

/**
 * Format helper for numbers to ensure crisp, scientific reporting.
 */
export function formatNum(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return val.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
