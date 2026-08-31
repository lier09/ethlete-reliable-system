import { describe, it, expect } from 'vitest';
import { GOLD_STANDARD_DATASETS, validateDatasetAgainstGoldStandard } from './goldStandardDatasets';
import {
  calculateBias,
  calculateBlandAltman,
  calculateCV,
  calculateICC,
  calculateMDC95,
  calculateMDCPercent,
  calculatePooledMean,
  calculatePooledSD,
  calculateReliability,
  calculateSEM,
  calculateTE,
  getFQuantile,
  getTCritical
} from './statistics';
import { evaluateMetricReliability, calculateTrueChangeThreshold } from './rulesEngine';
import { parseCSVData, qualifyDataset, aggregateTrials } from './dataParser';

describe('Gold Standard Reliability Engine Verification (10 Benchmark Datasets)', () => {
  GOLD_STANDARD_DATASETS.forEach(dataset => {
    it(`Validates ${dataset.name} within scientific tolerance`, () => {
      const report = validateDatasetAgainstGoldStandard(dataset);
      
      report.itemResults.forEach(item => {
        expect(
          item.passed,
          `Failed on metric: ${item.metric} in dataset "${dataset.name}". Expected: ${item.expected}, Actual: ${item.actual}, Diff: ${item.diff}, Tolerance: ${item.tolerance}`
        ).toBe(true);
      });

      expect(report.passed).toBe(true);
    });
  });
});

describe('Statistical Formula Unit Tests', () => {
  it('Verifies F-distribution and Student-t quantiles', () => {
    // Two-tailed alpha = 0.05 on large df is z = 1.95996
    const tLarge = getTCritical(10000, 0.05);
    expect(tLarge).toBeCloseTo(1.96, 2);

    // t(4) at alpha = 0.05 two-tailed is ~2.776
    const t4 = getTCritical(4, 0.05);
    expect(t4).toBeCloseTo(2.776, 2);

    // F(10, 10) at p = 0.95 is ~2.978
    const f10_10 = getFQuantile(10, 10, 0.95);
    expect(f10_10).toBeCloseTo(2.978, 1);
  });

  it('Verifies negative ICC is preserved and not artificially clamped to 0', () => {
    const dataset = GOLD_STANDARD_DATASETS.find(d => d.id === 'GOLD-04-NEGATIVE-ICC')!;
    const report = validateDatasetAgainstGoldStandard(dataset);
    expect(report.actualStats.iccA1).toBeLessThan(0);
    expect(report.actualStats.iccA1Lower95).toBeLessThan(0);
  });

  it('Verifies Zero SDdiff handled cleanly without crashing or NaN', () => {
    const dataset = GOLD_STANDARD_DATASETS.find(d => d.id === 'GOLD-08-ZERO-SDDIFF')!;
    const report = validateDatasetAgainstGoldStandard(dataset);
    expect(report.actualStats.biasSD).toBe(0);
    expect(report.actualStats.typicalError).toBe(0);
    expect(report.actualStats.cvMean).toBe(0);
    expect(report.passed).toBe(true);
  });

  it('Verifies SEM and MDC formulas', () => {
    const pooledSD = 10;
    const icc = 0.84;
    const semStats = calculateSEM(pooledSD, icc);
    // SEM = 10 * sqrt(1 - 0.84) = 10 * 0.4 = 4.0
    expect(semStats.sem).toBeCloseTo(4.0, 4);

    const mdcStats = calculateMDC95(semStats.sem, 95);
    // MDC95 = 4.0 * 1.96 * sqrt(2) = 11.0874
    expect(mdcStats.mdc95).toBeCloseTo(11.0874, 3);
  });
});

describe('Data Qualification and Parsing Integrity Tests', () => {
  it('Strictly enforces N=1 hard stop', () => {
    const singleSubjectData = [
      { participant_id: 'P1', session: 1, trial: 1, metric: 'CMJ', value: 40 },
      { participant_id: 'P1', session: 2, trial: 1, metric: 'CMJ', value: 42 }
    ];
    const qualification = qualifyDataset(singleSubjectData);
    expect(qualification.isValid).toBe(false);
    expect(qualification.canProceedToReliability).toBe(false);
    expect(qualification.isSingleParticipantError).toBe(true);
    expect(qualification.issues.some(i => i.code === 'SINGLE_PARTICIPANT_ERROR')).toBe(true);
  });

  it('Captures malformed and non-numeric rows instead of silently dropping them', () => {
    const csvWithCorruptData = `participant_id,session,trial,metric,value
P1,1,1,CMJ,40.5
P1,2,1,CMJ,42.0
P2,1,1,CMJ,N/A
P2,2,1,CMJ,38.5
P3,0,1,CMJ,35.0
`;
    const parseRes = parseCSVData(csvWithCorruptData);
    expect(parseRes.parseErrors.length).toBeGreaterThan(0);
    expect(parseRes.parseErrors.some(e => e.participant_id === 'P2')).toBe(true);

    const qualification = qualifyDataset(parseRes.rows, 10, 1, 2, parseRes.parseErrors);
    expect(qualification.isValid).toBe(false);
    expect(qualification.issues.some(i => i.code === 'PARSING_MALFORMED_DATA')).toBe(true);
  });

  it('Rejects partially numeric, infinite, and non-integer control fields', () => {
    const csvWithUnsafeNumbers = `participant_id,session,trial,metric,value
P1,1,1,CMJ,40cm
P1,2abc,1,CMJ,42
P2,1,1.5,CMJ,38
P2,2,1,CMJ,Infinity
`;
    const parseRes = parseCSVData(csvWithUnsafeNumbers);
    expect(parseRes.rows).toHaveLength(0);
    expect(parseRes.parseErrors).toHaveLength(4);
    expect(parseRes.errors.some(error => error.includes('40cm'))).toBe(true);
    expect(parseRes.errors.some(error => error.includes('Infinity'))).toBe(true);
  });

  it('Hard-stops duplicate observations because they alter trial aggregation', () => {
    const duplicateRows = [
      { participant_id: 'P1', session: 1, trial: 1, metric: 'CMJ', value: 40 },
      { participant_id: 'P1', session: 1, trial: 1, metric: 'CMJ', value: 41 },
      { participant_id: 'P1', session: 2, trial: 1, metric: 'CMJ', value: 42 },
      { participant_id: 'P2', session: 1, trial: 1, metric: 'CMJ', value: 38 },
      { participant_id: 'P2', session: 2, trial: 1, metric: 'CMJ', value: 39 }
    ];
    const qualification = qualifyDataset(duplicateRows);
    expect(qualification.canProceedToReliability).toBe(false);
    expect(qualification.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'error', code: 'DUPLICATE_RECORDS_DETECTED' })
    ]));
  });

  it('Allows selection between any two sessions in multi-session data', () => {
    const threeSessionData = [
      { participant_id: 'P1', session: 1, trial: 1, metric: 'CMJ', value: 40 },
      { participant_id: 'P1', session: 2, trial: 1, metric: 'CMJ', value: 42 },
      { participant_id: 'P1', session: 3, trial: 1, metric: 'CMJ', value: 45 },
      { participant_id: 'P2', session: 1, trial: 1, metric: 'CMJ', value: 35 },
      { participant_id: 'P2', session: 2, trial: 1, metric: 'CMJ', value: 36 },
      { participant_id: 'P2', session: 3, trial: 1, metric: 'CMJ', value: 39 }
    ];
    // Pair Session 1 and Session 3
    const pairs13 = aggregateTrials(threeSessionData, 'CMJ', 'mean', 'higher_is_better', 1, 3);
    expect(pairs13.length).toBe(2);
    expect(pairs13[0].test1).toBe(40);
    expect(pairs13[0].test2).toBe(45);
    expect(pairs13[0].diff).toBe(5);
  });
});

describe('Rules Engine & Interpretation Boundary Tests', () => {
  it('Evaluates Tier 2 references as strictly ineligible for Athlete Monitor Reference', () => {
    const stats = calculateReliability(
      [
        { participantId: 'P1', name: 'P1', test1: 10, test2: 13, diff: 3, mean: 11.5 },
        { participantId: 'P2', name: 'P2', test1: 12, test2: 15, diff: 3, mean: 13.5 },
        { participantId: 'P3', name: 'P3', test1: 14, test2: 11, diff: -3, mean: 12.5 },
        { participantId: 'P4', name: 'P4', test1: 16, test2: 12, diff: -4, mean: 14.0 },
        { participantId: 'P5', name: 'P5', test1: 11, test2: 14, diff: 3, mean: 12.5 },
        { participantId: 'P6', name: 'P6', test1: 13, test2: 10, diff: -3, mean: 11.5 }
      ],
      'M1',
      'Test Metric',
      'pts'
    );
    const evalResult = evaluateMetricReliability(stats);
    expect(evalResult.tier).not.toBe('tier_1_recommended');
    expect(evalResult.isEligibleForReference).toBe(false);
    expect(evalResult.validityDisclaimer).toContain('Reliability does not establish validity');
  });

  it('Neutral wording in calculateTrueChangeThreshold without diagnostic claims', () => {
    const result = calculateTrueChangeThreshold(40, 2.5, 45, 'higher_is_better', 'cm');
    expect(result.resultType).toBe('true_improvement');
    expect(result.resultLabel).toContain('可检测升高');
    expect(result.resultExplanation).toContain('超过MDC仅表示观察到的变化超过预期测量误差，不说明变化的生理或训练原因');
    expect(result.resultExplanation).not.toContain('疲劳程度');
    expect(result.resultExplanation).not.toContain('伤病恢复完成');
  });

  it('Verifies near-zero pooled mean returns NaN for CV and MDC% and fails Tier 1 qualification', () => {
    const cvResult = calculateCV(0.5, 0.0000001, 20);
    expect(isNaN(cvResult.cvMean)).toBe(true);
    expect(isNaN(cvResult.cvUpper95)).toBe(true);

    const mdcPercent = calculateMDCPercent(1.38, 0.0000001);
    expect(isNaN(mdcPercent)).toBe(true);

    const statsNearZero = calculateReliability(
      [
        { participantId: 'P1', name: 'P1', test1: -0.05, test2: 0.05, diff: 0.1, mean: 0.0 },
        { participantId: 'P2', name: 'P2', test1: 0.03, test2: -0.03, diff: -0.06, mean: 0.0 },
        { participantId: 'P3', name: 'P3', test1: -0.02, test2: 0.02, diff: 0.04, mean: 0.0 },
        { participantId: 'P4', name: 'P4', test1: 0.04, test2: -0.04, diff: -0.08, mean: 0.0 }
      ],
      'M_ZERO',
      'Zero Mean Deviation',
      'deg'
    );

    const evalResult = evaluateMetricReliability(statsNearZero);
    expect(evalResult.tier).not.toBe('tier_1_recommended');
    expect(evalResult.isEligibleForReference).toBe(false);
  });

  it('Verifies neutral direction prohibits best aggregation and throws error', () => {
    const testRows = [
      { participant_id: 'P1', session: 1, trial: 1, metric: 'Angle', value: 10 },
      { participant_id: 'P1', session: 1, trial: 2, metric: 'Angle', value: 12 },
      { participant_id: 'P1', session: 2, trial: 1, metric: 'Angle', value: 11 },
      { participant_id: 'P1', session: 2, trial: 2, metric: 'Angle', value: 13 }
    ];

    expect(() => {
      aggregateTrials(testRows, 'Angle', 'best', 'neutral', 1, 2);
    }).toThrow(/Neutral metrics do not have a universally defined best value/);
  });
});
