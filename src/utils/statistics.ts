import {
  AggregatedPairData,
  MetricDirection,
  ReliabilityStats
} from '../types';

/**
 * Statistical Engine for Sports Test-Retest Reliability Analysis
 * Rigorous mathematical implementation adhering to:
 * - Hopkins (2000): Measures of reliability in sports medicine and science
 * - Weir (2005): Quantifying test-retest reliability using the ICC
 * - Koo & Li (2016): A Guideline of Selecting and Reporting Intraclass Correlation Coefficients
 * - McGraw & Wong (1996): Forming inferences about some intraclass correlation coefficients
 * - Shrout & Fleiss (1979): Intraclass correlations: uses in assessing rater reliability
 * - Bland & Altman (1986, 1999): Measuring agreement in method comparison studies
 * - McKay (1932) / Vangel (1996): Confidence intervals for a normal coefficient of variation
 * - Shaw et al. (2026): Contemporary monitoring and measurement error guidelines
 */

// ==========================================
// 1. Math & Probability Distribution Engine
// ==========================================

/**
 * Standard Normal (Gaussian) Cumulative Distribution Function
 */
export function normalCDF(z: number): number {
  if (isNaN(z)) return NaN;
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * Standard Normal Quantile Function (Inverse CDF) - Beasley-Springer-Moro / Acklam
 */
export function normalQuantile(p: number): number {
  if (p <= 0) return -8.0;
  if (p >= 1) return 8.0;

  // Coefficients in rational approximations
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/**
 * Natural log of Gamma function using Lanczos approximation (g=7)
 */
export function logGamma(z: number): number {
  if (z <= 0) return 0;
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

/**
 * Regularized Incomplete Beta Function I_x(a, b)
 */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry transformation if needed for faster convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(b, a, 1 - x);
  }

  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  ) / a;

  // Continued fraction using modified Lentz method
  let c = 1;
  let d = 1 / (1 - (a + b) * x / (a + 1));
  let h = d;

  for (let m = 1; m <= 200; m++) {
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

    if (Math.abs(del - 1) < 1e-12) break;
  }

  return factor * h;
}

/**
 * Student's t Cumulative Distribution Function
 */
export function studentTCDF(t: number, df: number): number {
  if (df <= 0) return 0.5;
  if (t === 0) return 0.5;
  const x = (t + Math.sqrt(t * t + df)) / (2 * Math.sqrt(t * t + df));
  return Math.max(0, Math.min(1, incompleteBeta(df / 2, df / 2, x)));
}

/**
 * Two-tailed critical value for Student's t distribution
 * @param df degrees of freedom
 * @param alpha significance level (e.g. 0.05 for 95% CI, 0.10 for 90% CI)
 */
export function getTCritical(df: number, alpha: number = 0.05): number {
  if (df <= 0) return 1.95996;
  const pTarget = 1 - alpha / 2;
  const z = normalQuantile(pTarget);
  // Cornish-Fisher expansion
  let t = z + (z * z * z + z) / (4 * df) + (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);

  // 3 steps Newton-Raphson refinement
  for (let i = 0; i < 4; i++) {
    const cdf = studentTCDF(t, df);
    const pdf = Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2)) /
      (Math.sqrt(Math.PI * df) * Math.pow(1 + (t * t) / df, (df + 1) / 2));
    const diff = cdf - pTarget;
    if (Math.abs(diff) < 1e-8 || pdf <= 0) break;
    t -= diff / pdf;
  }
  return Math.max(0.01, t);
}

/**
 * Chi-Square Cumulative Distribution Function
 */
export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 0;
  // Lower regularized gamma P(df/2, x/2)
  return incompleteBeta(df / 2, 1000000, x / (x + 2 * 1000000));
}

/**
 * Chi-Square Quantile Function (Inverse CDF) using Wilson-Hilferty + Newton refinement
 */
export function getChiSquareQuantile(df: number, p: number): number {
  if (df <= 0) return 0;
  if (p <= 0.0001) p = 0.0001;
  if (p >= 0.9999) p = 0.9999;

  const z = normalQuantile(p);
  // Wilson-Hilferty transformation
  const term = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df));
  let x = df * Math.pow(Math.max(0.0001, term), 3);

  // Binary search / bisection refinement for exact convergence
  let low = Math.max(0.0001, x * 0.5);
  let high = x * 1.5 + 2;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const pMid = chiSquareCDF(mid, df);
    if (Math.abs(pMid - p) < 1e-7) {
      x = mid;
      break;
    }
    if (pMid < p) low = mid;
    else high = mid;
    x = (low + high) / 2;
  }
  return Math.max(0.001, x);
}

/**
 * F-distribution Cumulative Distribution Function
 */
export function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 0;
  const x = (df1 * f) / (df1 * f + df2);
  return incompleteBeta(df1 / 2, df2 / 2, x);
}

/**
 * Exact F-distribution Quantile Function (Inverse CDF)
 */
export function getFQuantile(df1: number, df2: number, p: number): number {
  if (df1 <= 0 || df2 <= 0) return 1.0;
  if (p <= 0.0001) p = 0.0001;
  if (p >= 0.9999) p = 0.9999;

  // Paulson's approximation
  const z = normalQuantile(p);
  const d1 = 2 / (9 * df1);
  const d2 = 2 / (9 * df2);
  const h1 = 1 - d1;
  const h2 = 1 - d2;
  const term1 = h1 * h2;
  const term2 = z * Math.sqrt(d1 * h2 * h2 + d2 * h1 * h1 - d1 * d2 * z * z);
  const denom = h2 * h2 - d2 * z * z;
  let fInit = denom > 0 ? Math.pow(Math.max(0.01, (term1 + term2) / denom), 3) : 1.0;

  // Bisection refinement
  let low = Math.max(0.0001, fInit * 0.2);
  let high = Math.max(10.0, fInit * 3.0);
  for (let i = 0; i < 25; i++) {
    const mid = (low + high) / 2;
    const cdf = fCDF(mid, df1, df2);
    if (Math.abs(cdf - p) < 1e-7) {
      return mid;
    }
    if (cdf < p) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

// ==========================================
// 2. Core Statistical Functions
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
export function calculateBias(
  diffs: number[],
  grandMean: number = 0,
  confidenceLevel: 90 | 95 = 95
): {
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
  const alpha = confidenceLevel === 90 ? 0.10 : 0.05;
  const tCrit = getTCritical(df, alpha);
  const bias95CILower = meanBias - tCrit * biasSE;
  const bias95CIUpper = meanBias + tCrit * biasSE;

  let pairedTStat = 0;
  let pairedTPValue = 1.0;
  let hasSignificantBias = false;

  if (biasSE > 1e-12) {
    pairedTStat = meanBias / biasSE;
    const tCDF = studentTCDF(Math.abs(pairedTStat), df);
    pairedTPValue = Math.max(0, Math.min(1, 2 * (1 - tCDF)));
    hasSignificantBias = pairedTPValue < alpha;
  } else {
    // Edge case: SDdiff = 0 (all subjects had identical changes)
    if (Math.abs(meanBias) > 1e-9) {
      pairedTStat = meanBias > 0 ? 999999 : -999999;
      pairedTPValue = 0.0;
      hasSignificantBias = true;
    } else {
      pairedTStat = 0;
      pairedTPValue = 1.0;
      hasSignificantBias = false;
    }
  }

  // Bias % relative to grand mean
  const biasPercent = grandMean !== 0 ? (Math.abs(meanBias) / Math.abs(grandMean)) * 100 : 0;

  let biasEvaluation: 'pass' | 'caution' | 'fail' = 'pass';
  let biasNote = '';

  if (biasPercent <= 2.0) {
    biasEvaluation = 'pass';
    if (hasSignificantBias) {
      biasNote = 'Statistically significant but practically small systematic bias (统计学显著但实际偏差微小 ≤2%)';
    } else {
      biasNote = 'Practically negligible systematic bias without statistical significance (实际偏差微小 ≤2%)';
    }
  } else if (biasPercent <= 5.0) {
    biasEvaluation = 'caution';
    biasNote = hasSignificantBias
      ? 'Statistically significant and moderate systematic bias (2%~5%) (中度系统偏差，可能存在熟悉化效应或测试间隔影响)'
      : 'Moderate systematic bias without strong statistical significance (2%~5%) (中度系统偏差)';
  } else {
    biasEvaluation = 'fail';
    biasNote = 'Substantial systematic bias (>5%); test protocol or interval needs optimization (显著系统偏差 >5%，建议重新标定测试间隔或熟悉化流程)';
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
 * Exact Confidence Interval derived from Chi-Square distribution:
 * TE * sqrt(df / chiSq(1 - alpha/2, df)) to TE * sqrt(df / chiSq(alpha/2, df))
 */
export function calculateTE(
  sdDiff: number,
  n: number = 20,
  confidenceLevel: 90 | 95 = 95
): {
  typicalError: number;
  typicalErrorLower95: number;
  typicalErrorUpper95: number;
  teMethod: 'sd_diff_div_sqrt2';
} {
  const typicalError = sdDiff / Math.SQRT2;
  const df = Math.max(1, n - 1);
  const alpha = confidenceLevel === 90 ? 0.10 : 0.05;

  const chiSqUpper = getChiSquareQuantile(df, 1 - alpha / 2);
  const chiSqLower = getChiSquareQuantile(df, alpha / 2);

  const typicalErrorLower95 = chiSqUpper > 0 ? typicalError * Math.sqrt(df / chiSqUpper) : typicalError * 0.7;
  const typicalErrorUpper95 = chiSqLower > 0 ? typicalError * Math.sqrt(df / chiSqLower) : typicalError * 1.5;

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
 * CV = (TE / pooled_mean) * 100
 * Exact Confidence Interval via McKay's Method / Vangel (1996)
 */
export function calculateCV(
  te: number,
  pooledMean: number,
  n: number = 20,
  confidenceLevel: 90 | 95 = 95
): {
  cvMean: number;
  cvLower95: number;
  cvUpper95: number;
  cvMethod: 'te_div_pooled_mean';
} {
  if (!isFinite(pooledMean) || Math.abs(pooledMean) < 1e-6 || !isFinite(te) || te < 0) {
    return {
      cvMean: NaN,
      cvLower95: NaN,
      cvUpper95: NaN,
      cvMethod: 'te_div_pooled_mean'
    };
  }

  const cvMean = (te / Math.abs(pooledMean)) * 100;
  const df = Math.max(1, n - 1);
  const alpha = confidenceLevel === 90 ? 0.10 : 0.05;

  const u1 = getChiSquareQuantile(df, 1 - alpha / 2); // Upper chi-sq quantile for lower bound
  const u2 = getChiSquareQuantile(df, alpha / 2);     // Lower chi-sq quantile for upper bound

  const c = cvMean / 100;

  // McKay's approximation (Vangel 1996, The American Statistician)
  const denomLower = Math.sqrt(Math.max(0.001, ((u1 / (df + 1)) - 1) * c * c + (u1 / df)));
  const denomUpper = Math.sqrt(Math.max(0.001, ((u2 / (df + 1)) - 1) * c * c + (u2 / df)));

  const cvLower95 = denomLower > 0 ? (c / denomLower) * 100 : cvMean * 0.7;
  const cvUpper95 = denomUpper > 0 ? (c / denomUpper) * 100 : cvMean * 1.5;

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
  const dfCol = 1; // 2 sessions -> k - 1 = 1
  const dfError = n - 1; // (n - 1) * (k - 1) = n - 1
  const dfTotal = 2 * n - 1;

  const msRow = dfRow > 0 ? ssRow / dfRow : 0;
  const msCol = dfCol > 0 ? ssCol / dfCol : 0;
  const msError = dfError > 0 ? ssError / dfError : 0;

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
 * Model: Two-Way Mixed Effects, Single Measure (k=2)
 * Absolute Agreement: ICC(A,1)
 * Consistency: ICC(C,1)
 * Confidence Interval: McGraw & Wong (1996) / Shrout & Fleiss (1979)
 * Note: Confidence interval can mathematically span negative values and is NOT artificially clamped to 0.
 */
export function calculateICC(
  pairs: AggregatedPairData[],
  confidenceLevel: 90 | 95 = 95
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
  const k = 2;

  // ICC(A,1) - Absolute Agreement
  const iccADenom = msRows + (k - 1) * msError + (k / n) * (msCols - msError);
  let iccA1 = iccADenom > 1e-12 ? (msRows - msError) / iccADenom : 0;
  iccA1 = Math.max(-1, Math.min(1, iccA1));

  // ICC(C,1) - Consistency
  const iccCDecom = msRows + (k - 1) * msError;
  let iccC1 = iccCDecom > 1e-12 ? (msRows - msError) / iccCDecom : 0;
  iccC1 = Math.max(-1, Math.min(1, iccC1));

  // Confidence Intervals for k = 2
  const alpha = confidenceLevel === 90 ? 0.10 : 0.05;
  const fObs = msError > 1e-12 ? msRows / msError : 1;

  // Exact F quantiles for (n-1, n-1)
  const fUpper = getFQuantile(n - 1, n - 1, 1 - alpha / 2);
  const fLower = 1 / fUpper;

  // ICC(C,1) exact bounds
  let iccC1Lower95 = (fObs * fLower - 1) / (fObs * fLower + k - 1);
  let iccC1Upper95 = (fObs * fUpper - 1) / (fObs * fUpper + k - 1);
  iccC1Lower95 = Math.max(-1, Math.min(1, iccC1Lower95));
  iccC1Upper95 = Math.max(-1, Math.min(1, iccC1Upper95));

  // ICC(A,1) exact bounds (McGraw & Wong 1996, Formula 8 & 11)
  // For k=2, dfRow = n-1, dfCol = 1, dfError = n-1:
  const f1 = fUpper;
  const f2 = fUpper;

  const numL = n * (msRows - f1 * msError);
  const denL = f1 * (k * msCols + (k * n - k - n) * msError) + n * msRows;
  let iccA1Lower95 = denL > 1e-12 ? numL / denL : iccC1Lower95;

  const numU = n * (f2 * msRows - msError);
  const denU = (k * msCols + (k * n - k - n) * msError) + n * f2 * msRows;
  let iccA1Upper95 = denU > 1e-12 ? numU / denU : iccC1Upper95;

  // Allow negative lower bounds, bounded strictly within [-1, 1]
  iccA1Lower95 = Math.max(-1, Math.min(1, iccA1Lower95));
  iccA1Upper95 = Math.max(-1, Math.min(1, iccA1Upper95));

  if (iccA1Lower95 > iccA1Upper95) {
    const tmp = iccA1Lower95;
    iccA1Lower95 = iccA1Upper95;
    iccA1Upper95 = tmp;
  }

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
 * Note: Never equated directly to TE.
 */
export function calculateSEM(
  pooledSD: number,
  iccA1: number
): {
  sem: number;
  semMethod: 'pooled_sd_sqrt_1_minus_icc';
} {
  const boundedICC = Math.max(-1, Math.min(1, iccA1));
  const sem = pooledSD * Math.sqrt(Math.max(0, 1 - boundedICC));
  return {
    sem,
    semMethod: 'pooled_sd_sqrt_1_minus_icc'
  };
}

/**
 * 2.10 Calculate Minimal Detectable Change (MDC)
 * MDC = SEM * z * sqrt(2)
 * For 95% Confidence: z = 1.959964
 * For 90% Confidence: z = 1.6448536
 */
export function calculateMDC95(
  sem: number,
  zOrConfidenceLevel: number = 95
): {
  mdc95: number;
  mdcMethod: 'sem_times_z_times_sqrt2';
  mdcConfidenceLevel: 90 | 95;
} {
  let z = 1.959964;
  let confLevel: 90 | 95 = 95;

  if (zOrConfidenceLevel === 90) {
    z = 1.6448536;
    confLevel = 90;
  } else if (zOrConfidenceLevel === 95) {
    z = 1.959964;
    confLevel = 95;
  } else if (typeof zOrConfidenceLevel === 'number' && zOrConfidenceLevel > 0 && zOrConfidenceLevel < 5) {
    z = zOrConfidenceLevel;
    confLevel = Math.abs(z - 1.64485) < 0.1 ? 90 : 95;
  }

  const mdc95 = sem * z * Math.SQRT2;
  return {
    mdc95,
    mdcMethod: 'sem_times_z_times_sqrt2',
    mdcConfidenceLevel: confLevel
  };
}

/**
 * 2.11 Calculate MDC% (Sensitivity)
 * MDC% = (MDC / pooled_mean) * 100
 * When abs(pooled_mean) < epsilon, returns NaN (not 0), indicating percentage metric is not applicable.
 */
export function calculateMDCPercent(mdc: number, pooledMean: number): number {
  if (!isFinite(pooledMean) || Math.abs(pooledMean) < 1e-6 || !isFinite(mdc) || mdc < 0) {
    return NaN;
  }
  return (mdc / Math.abs(pooledMean)) * 100;
}

/**
 * 2.12 Calculate Bland-Altman Limits of Agreement (LoA)
 * Lower LoA = Mean Bias - z * SDdiff
 * Upper LoA = Mean Bias + z * SDdiff
 */
export function calculateBlandAltman(
  meanBias: number,
  sdDiff: number,
  n: number,
  confidenceLevel: 90 | 95 = 95
): {
  loaLower: number;
  loaUpper: number;
  loaLowerCILower: number;
  loaLowerCIUpper: number;
  loaUpperCILower: number;
  loaUpperCIUpper: number;
} {
  const z = confidenceLevel === 90 ? 1.6448536 : 1.959964;
  const loaLower = meanBias - z * sdDiff;
  const loaUpper = meanBias + z * sdDiff;

  const df = Math.max(1, n - 1);
  const alpha = confidenceLevel === 90 ? 0.10 : 0.05;
  const tCrit = getTCritical(df, alpha);
  // Standard error of LoA limit (Bland & Altman 1999)
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
  direction: MetricDirection = 'higher_is_better',
  confidenceLevel: 90 | 95 = 95,
  sessionsCompared: [number, number] = [1, 2]
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

  // 2. Pooled Mean
  const grandMean = calculatePooledMean(t1Mean, t2Mean);

  // 3. Difference & Systematic Bias
  const diffs = calculateDifference(t1Values, t2Values);
  const biasStats = calculateBias(diffs, grandMean, confidenceLevel);

  // 4. Typical Error (TE = SDdiff / sqrt(2))
  const teStats = calculateTE(biasStats.sdDiff, n, confidenceLevel);

  // 5. CV% (TE / grandMean * 100)
  const cvStats = calculateCV(teStats.typicalError, grandMean, n, confidenceLevel);

  // 6. Two-Way Mixed ANOVA & ICC (ICC(A,1) and ICC(C,1))
  const iccStats = calculateICC(pairs, confidenceLevel);

  // 7. Pooled SD
  const pooledSD = calculatePooledSD(t1SD, t2SD, n, n);

  // 8. SEM = pooled_SD * sqrt(1 - ICC_A)
  const semStats = calculateSEM(pooledSD, iccStats.iccA1);

  // 9. MDC (SEM * z * sqrt(2))
  const mdcStats = calculateMDC95(semStats.sem, confidenceLevel);
  const mdcPercent = calculateMDCPercent(mdcStats.mdc95, grandMean);
  const biasToMdcRatio = mdcStats.mdc95 > 0 ? Math.abs(biasStats.meanBias) / mdcStats.mdc95 : 0;

  // 10. Bland-Altman Limits of Agreement
  const baStats = calculateBlandAltman(biasStats.meanBias, biasStats.sdDiff, n, confidenceLevel);

  return {
    metricId,
    metricName,
    unit,
    direction,
    n,
    sessionsCompared,
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
    iccCiMethod: 'mcgraw_wong_1996',
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
    teCiMethod: 'exact_chi_square',
    sem: semStats.sem,
    semMethod: semStats.semMethod,
    cvMean: cvStats.cvMean,
    cvLower95: cvStats.cvLower95,
    cvUpper95: cvStats.cvUpper95,
    cvMethod: cvStats.cvMethod,
    cvCiMethod: 'vangel_mckay_approx',
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
