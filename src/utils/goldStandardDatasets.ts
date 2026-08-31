import { AggregatedPairData, MetricDirection, ReliabilityStats } from '../types';
import { calculateReliability } from './statistics';

export interface GoldStandardDataset {
  id: string;
  name: string;
  category: string;
  description: string;
  referenceSource: string; // e.g. "R irr::icc / psych::ICC v2.4 / SPSS v29 benchmark"
  unit: string;
  direction: MetricDirection;
  t1: number[];
  t2: number[];
  expected: {
    n: number;
    t1Mean: number;
    t2Mean: number;
    grandMean: number;
    meanBias: number;
    biasSD: number; // SDdiff
    typicalError: number; // TE
    cvMean: number; // CV%
    pooledSD: number;
    iccA1: number; // ICC(A,1)
    iccA1Lower95: number;
    iccA1Upper95: number;
    iccC1?: number;
    sem: number;
    mdc95: number;
    mdcPercent: number;
    loaLower: number;
    loaUpper: number;
  };
  tolerance: {
    icc: number;
    cv: number;
    te: number;
    sem: number;
    mdc: number;
    bias: number;
    loa: number;
  };
}

/**
 * 10 Gold-Standard Benchmark Datasets for Sports Test-Retest Reliability
 * Verified against McGraw & Wong (1996), Hopkins (2000), and Weir (2005) standard formulations.
 */
export const GOLD_STANDARD_DATASETS: GoldStandardDataset[] = [
  // Dataset 1: High ICC, Low Error (CMJ Jump Height, N=15)
  {
    id: 'GOLD-01-HIGH-ICC',
    name: '1. 高信度低误差基准数据集 (High ICC, Low Error - CMJ Height)',
    category: 'high_icc',
    description: '15名运动员CMJ跳跃高度重复测试，呈现优异的相对信度与极低变异度',
    referenceSource: 'R irr::icc (twoway, agreement, single) / Weir (2005)',
    unit: 'cm',
    direction: 'higher_is_better',
    t1: [38.2, 42.5, 35.1, 48.0, 39.4, 44.2, 36.8, 41.0, 45.6, 37.9, 43.3, 40.1, 46.7, 34.5, 42.0],
    t2: [38.8, 42.1, 35.5, 48.6, 39.0, 44.8, 36.5, 41.4, 46.1, 38.2, 43.0, 40.5, 47.1, 34.9, 42.4],
    expected: {
      n: 15,
      t1Mean: 41.02,
      t2Mean: 41.26,
      grandMean: 41.14,
      meanBias: 0.24,
      biasSD: 0.3795,
      typicalError: 0.2683,
      cvMean: 0.6522,
      pooledSD: 4.1547,
      iccA1: 0.9944,
      iccA1Lower95: 0.9836,
      iccA1Upper95: 0.9981,
      iccC1: 0.9958,
      sem: 0.3096,
      mdc95: 0.8582,
      mdcPercent: 2.086,
      loaLower: -0.5038,
      loaUpper: 0.9838
    },
    tolerance: { icc: 0.005, cv: 0.05, te: 0.01, sem: 0.02, mdc: 0.05, bias: 0.01, loa: 0.02 }
  },

  // Dataset 2: Moderate ICC (Peak Power / kg, N=12)
  {
    id: 'GOLD-02-MODERATE-ICC',
    name: '2. 中等信度数据集 (Moderate ICC - Peak Power W/kg)',
    category: 'moderate_icc',
    description: '12名运动员峰值功率输出，呈现中等偏高信度 (ICC ~0.96)',
    referenceSource: 'R psych::ICC / McGraw & Wong (1996)',
    unit: 'W/kg',
    direction: 'higher_is_better',
    t1: [52.0, 58.0, 61.0, 48.0, 65.0, 56.0, 50.0, 63.0, 49.0, 60.0, 54.0, 59.0],
    t2: [53.5, 57.0, 62.5, 50.0, 63.5, 57.5, 49.0, 64.5, 51.0, 59.0, 55.5, 58.0],
    expected: {
      n: 12,
      t1Mean: 56.25,
      t2Mean: 56.75,
      grandMean: 56.50,
      meanBias: 0.50,
      biasSD: 1.4302,
      typicalError: 1.0113,
      cvMean: 1.7899,
      pooledSD: 5.4314,
      iccA1: 0.9640,
      iccA1Lower95: 0.8806,
      iccA1Upper95: 0.9895,
      iccC1: 0.9653,
      sem: 1.0301,
      mdc95: 2.8552,
      mdcPercent: 5.053,
      loaLower: -2.3031,
      loaUpper: 3.3031
    },
    tolerance: { icc: 0.01, cv: 0.05, te: 0.02, sem: 0.05, mdc: 0.05, bias: 0.01, loa: 0.02 }
  },

  // Dataset 3: Low ICC (<0.50, Subjective RPE or Noisy Indicator, N=10)
  {
    id: 'GOLD-03-LOW-ICC',
    name: '3. 低信度高噪声数据集 (Low ICC < 0.50 - Unreliable Metric)',
    category: 'low_icc',
    description: '10名受试者高噪声指标，重测秩次发生较大扰动',
    referenceSource: 'R irr::icc / Shrout & Fleiss (1979)',
    unit: 'pts',
    direction: 'higher_is_better',
    t1: [10.0, 14.0, 11.0, 15.0, 12.0, 16.0, 13.0, 11.5, 14.5, 13.5],
    t2: [13.5, 11.0, 14.0, 12.5, 15.0, 12.0, 15.5, 14.0, 12.0, 15.0],
    expected: {
      n: 10,
      t1Mean: 13.05,
      t2Mean: 13.45,
      grandMean: 13.25,
      meanBias: 0.40,
      biasSD: 2.9981,
      typicalError: 2.1200,
      cvMean: 16.0001,
      pooledSD: 1.7232,
      iccA1: -0.5865,
      iccA1Lower95: -1.0,
      iccA1Upper95: 0.1380,
      iccC1: -0.5136,
      sem: 2.1705,
      mdc95: 6.0163,
      mdcPercent: 45.406,
      loaLower: -5.4763,
      loaUpper: 6.2763
    },
    tolerance: { icc: 0.05, cv: 0.2, te: 0.05, sem: 0.08, mdc: 0.1, bias: 0.02, loa: 0.05 }
  },

  // Dataset 4: Negative ICC (Inverted Ranks, N=6)
  {
    id: 'GOLD-04-NEGATIVE-ICC',
    name: '4. 负信度极端数据集 (Negative ICC - Inverted Rank Order)',
    category: 'negative_icc',
    description: '受试者间真实变异远小于测试内噪声，ICC出现负值，检验置信区间下限不被非法截断为0',
    referenceSource: 'R irr::icc (twoway mixed single)',
    unit: 'a.u.',
    direction: 'higher_is_better',
    t1: [20.0, 20.2, 19.8, 20.1, 19.9, 20.0],
    t2: [25.0, 15.0, 26.0, 14.0, 25.5, 14.5],
    expected: {
      n: 6,
      t1Mean: 20.00,
      t2Mean: 20.00,
      grandMean: 20.00,
      meanBias: 0.00,
      biasSD: 6.1530,
      typicalError: 4.3509,
      cvMean: 21.7543,
      pooledSD: 4.2732,
      iccA1: -0.0444,
      iccA1Lower95: -1.0,
      iccA1Upper95: 0.7719,
      iccC1: -0.0367,
      sem: 4.3669,
      mdc95: 12.1042,
      mdcPercent: 60.521,
      loaLower: -12.0598,
      loaUpper: 12.0598
    },
    tolerance: { icc: 0.02, cv: 0.5, te: 0.05, sem: 0.1, mdc: 0.3, bias: 0.02, loa: 0.1 }
  },

  // Dataset 5: Noticeable Systematic Bias (Learning effect / fatigue, N=12)
  {
    id: 'GOLD-05-SYSTEMATIC-BIAS',
    name: '5. 显著系统偏差数据集 (Noticeable Systematic Bias - Learning Effect)',
    category: 'systematic_bias',
    description: '12名受试者重测均呈现约10%~15%的整体提升 (T2显著高于T1)',
    referenceSource: 'R stats::t.test paired / irr::icc',
    unit: 'reps',
    direction: 'higher_is_better',
    t1: [100.0, 105.0, 110.0, 95.0, 120.0, 115.0, 108.0, 102.0, 118.0, 98.0, 112.0, 106.0],
    t2: [115.0, 121.0, 126.0, 110.0, 134.0, 130.0, 122.0, 117.0, 133.0, 113.0, 127.0, 120.0],
    expected: {
      n: 12,
      t1Mean: 107.4167,
      t2Mean: 122.3333,
      grandMean: 114.8750,
      meanBias: 14.9167,
      biasSD: 0.6686,
      typicalError: 0.4727,
      cvMean: 0.4115,
      pooledSD: 7.8728,
      iccA1: 0.3565,
      iccA1Lower95: 0.1370,
      iccA1Upper95: 0.6584,
      iccC1: 0.9964,
      sem: 6.3153,
      mdc95: 17.5047,
      mdcPercent: 15.238,
      loaLower: 13.6063,
      loaUpper: 16.2270
    },
    tolerance: { icc: 0.05, cv: 0.05, te: 0.02, sem: 0.1, mdc: 0.2, bias: 0.02, loa: 0.05 }
  },

  // Dataset 6: Extremely Low CV (<1%, Body Mass or High Precision Sprint, N=10)
  {
    id: 'GOLD-06-EXTREMELY-LOW-CV',
    name: '6. 极低变异度数据集 (Ultra-low CV < 1% - Calibrated Mass)',
    category: 'low_cv',
    description: '10名运动员校准电子秤连续两次称重，变异度低于0.1%',
    referenceSource: 'Hopkins (2000) / Vangel (1996)',
    unit: 'kg',
    direction: 'neutral',
    t1: [70.2, 75.1, 80.4, 68.3, 85.0, 72.6, 78.9, 82.1, 69.5, 76.8],
    t2: [70.3, 75.0, 80.5, 68.2, 85.1, 72.7, 78.8, 82.2, 69.4, 76.9],
    expected: {
      n: 10,
      t1Mean: 75.89,
      t2Mean: 75.91,
      grandMean: 75.90,
      meanBias: 0.02,
      biasSD: 0.1033,
      typicalError: 0.0730,
      cvMean: 0.0962,
      pooledSD: 5.7392,
      iccA1: 0.9998,
      iccA1Lower95: 0.9994,
      iccA1Upper95: 1.0000,
      iccC1: 0.9998,
      sem: 0.0707,
      mdc95: 0.1960,
      mdcPercent: 0.258,
      loaLower: -0.1824,
      loaUpper: 0.2224
    },
    tolerance: { icc: 0.001, cv: 0.01, te: 0.005, sem: 0.01, mdc: 0.02, bias: 0.005, loa: 0.01 }
  },

  // Dataset 7: High CV (>20%, Agility Decision Time or Noisy Task, N=10)
  {
    id: 'GOLD-07-HIGH-CV',
    name: '7. 高变异度数据集 (High CV > 20% - Highly Variable Task)',
    category: 'high_cv',
    description: '10名受试者高随机性敏捷决策测试，个体间与个体内波动均极大',
    referenceSource: 'Hopkins (2000) / Weir (2005)',
    unit: 's',
    direction: 'lower_is_better',
    t1: [2.1, 4.5, 3.2, 5.1, 2.9, 4.2, 3.6, 2.3, 4.8, 3.8],
    t2: [3.8, 2.6, 4.9, 3.3, 4.6, 2.2, 5.3, 3.9, 3.0, 5.6],
    expected: {
      n: 10,
      t1Mean: 3.65,
      t2Mean: 3.92,
      grandMean: 3.785,
      meanBias: 0.27,
      biasSD: 1.8476,
      typicalError: 1.3064,
      cvMean: 34.5156,
      pooledSD: 1.0945,
      iccA1: -0.4785,
      iccA1Lower95: -0.9541,
      iccA1Upper95: 0.2533,
      iccC1: -0.4248,
      sem: 1.3308,
      mdc95: 3.6886,
      mdcPercent: 97.454,
      loaLower: -3.3511,
      loaUpper: 3.8911
    },
    tolerance: { icc: 0.05, cv: 0.5, te: 0.05, sem: 0.08, mdc: 0.1, bias: 0.02, loa: 0.05 }
  },

  // Dataset 8: All Differences Identical (Zero SDdiff, N=8)
  {
    id: 'GOLD-08-ZERO-SDDIFF',
    name: '8. 恒定差值临界数据集 (Constant Differences, SDdiff = 0, N=8)',
    category: 'zero_error',
    description: '所有8名受试者重测成绩均精准提高 2.0 单位，SDdiff=0, TE=0, CV=0, 验证极端临界条件除以零保护',
    referenceSource: 'Mathematical Proof / Theoretical Boundary Case',
    unit: 'cm',
    direction: 'higher_is_better',
    t1: [20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0],
    t2: [22.0, 27.0, 32.0, 37.0, 42.0, 47.0, 52.0, 57.0],
    expected: {
      n: 8,
      t1Mean: 37.5,
      t2Mean: 39.5,
      grandMean: 38.5,
      meanBias: 2.0,
      biasSD: 0.0,
      typicalError: 0.0,
      cvMean: 0.0,
      pooledSD: 12.2474,
      iccA1: 0.9868,
      iccA1Lower95: 0.9376,
      iccA1Upper95: 0.9973,
      iccC1: 1.0000,
      sem: 1.4049,
      mdc95: 3.8941,
      mdcPercent: 10.114,
      loaLower: 2.0,
      loaUpper: 2.0
    },
    tolerance: { icc: 0.01, cv: 0.01, te: 0.001, sem: 0.05, mdc: 0.05, bias: 0.001, loa: 0.001 }
  },

  // Dataset 9: Small Sample Size (N=5, degrees of freedom t/F quantiles verification)
  {
    id: 'GOLD-09-SMALL-SAMPLE',
    name: '9. 小样本自由度检验数据集 (Small Sample Size, N=5)',
    category: 'small_sample',
    description: '5名受试者样本，验证自由度计算的准确性',
    referenceSource: 'Exact Student t / F Distribution Tables',
    unit: 'm',
    direction: 'higher_is_better',
    t1: [12.0, 15.0, 18.0, 14.0, 16.0],
    t2: [12.5, 14.8, 18.2, 14.4, 15.9],
    expected: {
      n: 5,
      t1Mean: 15.0,
      t2Mean: 15.16,
      grandMean: 15.08,
      meanBias: 0.16,
      biasSD: 0.3050,
      typicalError: 0.2156,
      cvMean: 1.4300,
      pooledSD: 2.1671,
      iccA1: 0.9894,
      iccA1Lower95: 0.9026,
      iccA1Upper95: 0.9989,
      iccC1: 0.9901,
      sem: 0.2235,
      mdc95: 0.6196,
      mdcPercent: 4.109,
      loaLower: -0.4377,
      loaUpper: 0.7577
    },
    tolerance: { icc: 0.01, cv: 0.05, te: 0.01, sem: 0.02, mdc: 0.05, bias: 0.01, loa: 0.02 }
  },

  // Dataset 10: Dataset with Severe Outlier (N=12 with 1 prominent recording error)
  {
    id: 'GOLD-10-OUTLIER-DATASET',
    name: '10. 含极端离群值数据集 (Severe Outlier Dataset, N=12)',
    category: 'outlier',
    description: '12名受试者中11名测试稳定，第12名出现异常飙升 (+28单位)，检验鲁棒性与异常捕捉',
    referenceSource: 'Robust Statistics / Bland & Altman (1999)',
    unit: 'cm',
    direction: 'higher_is_better',
    t1: [50.0, 52.0, 48.0, 55.0, 51.0, 49.0, 53.0, 50.0, 52.0, 47.0, 54.0, 50.0],
    t2: [51.0, 53.0, 49.0, 54.0, 50.0, 50.0, 52.0, 51.0, 53.0, 48.0, 55.0, 78.0],
    expected: {
      n: 12,
      t1Mean: 50.9167,
      t2Mean: 53.6667,
      grandMean: 52.2917,
      meanBias: 2.7500,
      biasSD: 8.0014,
      typicalError: 5.6579,
      cvMean: 10.8198,
      pooledSD: 5.8604,
      iccA1: 0.0658,
      iccA1Lower95: -0.4789,
      iccA1Upper95: 0.5902,
      iccC1: 0.0679,
      sem: 5.6643,
      mdc95: 15.7004,
      mdcPercent: 30.025,
      loaLower: -12.9325,
      loaUpper: 18.4325
    },
    tolerance: { icc: 0.05, cv: 0.2, te: 0.05, sem: 0.1, mdc: 0.2, bias: 0.05, loa: 0.1 }
  }
];

export interface ValidationItemResult {
  metric: string;
  expected: number;
  actual: number;
  diff: number;
  tolerance: number;
  passed: boolean;
}

export interface DatasetValidationReport {
  datasetId: string;
  datasetName: string;
  category: string;
  passed: boolean;
  itemResults: ValidationItemResult[];
  actualStats: ReliabilityStats;
}

/**
 * Validate a dataset against its gold-standard expected answers
 */
export function validateDatasetAgainstGoldStandard(dataset: GoldStandardDataset): DatasetValidationReport {
  const pairs: AggregatedPairData[] = dataset.t1.map((val, idx) => ({
    participantId: `P${idx + 1}`,
    name: `Participant ${idx + 1}`,
    test1: val,
    test2: dataset.t2[idx],
    diff: dataset.t2[idx] - val,
    mean: (val + dataset.t2[idx]) / 2
  }));

  const actual = calculateReliability(
    pairs,
    dataset.id,
    dataset.name,
    dataset.unit,
    dataset.direction,
    95
  );

  const itemResults: ValidationItemResult[] = [
    {
      metric: 'n',
      expected: dataset.expected.n,
      actual: actual.n,
      diff: Math.abs(actual.n - dataset.expected.n),
      tolerance: 0,
      passed: actual.n === dataset.expected.n
    },
    {
      metric: 'meanBias',
      expected: dataset.expected.meanBias,
      actual: actual.meanBias,
      diff: Math.abs(actual.meanBias - dataset.expected.meanBias),
      tolerance: dataset.tolerance.bias,
      passed: Math.abs(actual.meanBias - dataset.expected.meanBias) <= dataset.tolerance.bias
    },
    {
      metric: 'biasSD (SDdiff)',
      expected: dataset.expected.biasSD,
      actual: actual.biasSD,
      diff: Math.abs(actual.biasSD - dataset.expected.biasSD),
      tolerance: dataset.tolerance.bias,
      passed: Math.abs(actual.biasSD - dataset.expected.biasSD) <= dataset.tolerance.bias
    },
    {
      metric: 'typicalError (TE)',
      expected: dataset.expected.typicalError,
      actual: actual.typicalError,
      diff: Math.abs(actual.typicalError - dataset.expected.typicalError),
      tolerance: dataset.tolerance.te,
      passed: Math.abs(actual.typicalError - dataset.expected.typicalError) <= dataset.tolerance.te
    },
    {
      metric: 'cvMean (CV%)',
      expected: dataset.expected.cvMean,
      actual: actual.cvMean,
      diff: Math.abs(actual.cvMean - dataset.expected.cvMean),
      tolerance: dataset.tolerance.cv,
      passed: Math.abs(actual.cvMean - dataset.expected.cvMean) <= dataset.tolerance.cv
    },
    {
      metric: 'iccA1',
      expected: dataset.expected.iccA1,
      actual: actual.iccA1,
      diff: Math.abs(actual.iccA1 - dataset.expected.iccA1),
      tolerance: dataset.tolerance.icc,
      passed: Math.abs(actual.iccA1 - dataset.expected.iccA1) <= dataset.tolerance.icc
    },
    {
      metric: 'iccA1Lower95',
      expected: dataset.expected.iccA1Lower95,
      actual: actual.iccA1Lower95,
      diff: Math.abs(actual.iccA1Lower95 - dataset.expected.iccA1Lower95),
      tolerance: dataset.tolerance.icc,
      passed: Math.abs(actual.iccA1Lower95 - dataset.expected.iccA1Lower95) <= dataset.tolerance.icc
    },
    {
      metric: 'iccA1Upper95',
      expected: dataset.expected.iccA1Upper95,
      actual: actual.iccA1Upper95,
      diff: Math.abs(actual.iccA1Upper95 - dataset.expected.iccA1Upper95),
      tolerance: dataset.tolerance.icc,
      passed: Math.abs(actual.iccA1Upper95 - dataset.expected.iccA1Upper95) <= dataset.tolerance.icc
    },
    {
      metric: 'sem',
      expected: dataset.expected.sem,
      actual: actual.sem,
      diff: Math.abs(actual.sem - dataset.expected.sem),
      tolerance: dataset.tolerance.sem,
      passed: Math.abs(actual.sem - dataset.expected.sem) <= dataset.tolerance.sem
    },
    {
      metric: 'mdc95',
      expected: dataset.expected.mdc95,
      actual: actual.mdc95,
      diff: Math.abs(actual.mdc95 - dataset.expected.mdc95),
      tolerance: dataset.tolerance.mdc,
      passed: Math.abs(actual.mdc95 - dataset.expected.mdc95) <= dataset.tolerance.mdc
    },
    {
      metric: 'loaLower',
      expected: dataset.expected.loaLower,
      actual: actual.loaLower,
      diff: Math.abs(actual.loaLower - dataset.expected.loaLower),
      tolerance: dataset.tolerance.loa,
      passed: Math.abs(actual.loaLower - dataset.expected.loaLower) <= dataset.tolerance.loa
    },
    {
      metric: 'loaUpper',
      expected: dataset.expected.loaUpper,
      actual: actual.loaUpper,
      diff: Math.abs(actual.loaUpper - dataset.expected.loaUpper),
      tolerance: dataset.tolerance.loa,
      passed: Math.abs(actual.loaUpper - dataset.expected.loaUpper) <= dataset.tolerance.loa
    }
  ];

  const passed = itemResults.every(r => r.passed);

  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    category: dataset.category,
    passed,
    itemResults,
    actualStats: actual
  };
}

/**
 * Execute full battery of Gold Standard statistical validation
 */
export function runAllGoldStandardValidations(): DatasetValidationReport[] {
  return GOLD_STANDARD_DATASETS.map(dataset => validateDatasetAgainstGoldStandard(dataset));
}
