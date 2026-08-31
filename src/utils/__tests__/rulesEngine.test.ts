import { describe, it, expect } from 'vitest';
import { evaluateMetricReliability, calculateTrueChangeThreshold } from '../rulesEngine';
import { ReliabilityStats } from '../../types';

describe('Rules Engine & Evaluation Suitability Tests', () => {
  it('Assigns Tier 1 to highly reliable metrics', () => {
    const mockStats = {
      metricId: 'M1',
      metricName: 'Jump Height',
      unit: 'cm',
      direction: 'higher_is_better' as const,
      n: 20,
      iccA1: 0.94,
      iccA1Lower95: 0.86,
      iccA1Upper95: 0.98,
      cvMean: 2.5,
      cvLower95: 1.8,
      cvUpper95: 3.4,
      typicalError: 0.8,
      sem: 0.82,
      mdc95: 2.27,
      mdcPercent: 5.6,
      meanBias: 0.2,
      biasPercent: 0.5,
      pairedTPValue: 0.45,
      t1Mean: 40.0,
      t2Mean: 40.2,
      grandMean: 40.1,
      sdDiff: 1.13,
      pooledSD: 3.35,
      outlierCount: 0,
      outlierRatio: 0,
      confidenceLevel: 95 as const,
      iccModel: 'two_way_random' as const,
      iccDefinition: 'absolute_agreement' as const,
      iccMeasureType: 'single' as const,
      iccCiMethod: 'mcgraw_wong_1996' as const,
      teMethod: 'sd_diff_div_sqrt2' as const,
      cvMethod: 'te_div_pooled_mean' as const,
      cvCiMethod: 'vangel_mckay_approx' as const,
      semMethod: 'pooled_sd_sqrt_1_minus_icc' as const,
      mdcMethod: 'sem_times_z_times_sqrt2' as const,
      mdcConfidenceLevel: 95 as const,
      analysisMethodVersion: 'v1.0',
      pairs: []
    };

    const res = evaluateMetricReliability(mockStats as unknown as ReliabilityStats);
    expect(res.tier).toBe('tier_1_recommended');
    expect(res.isEligibleForReference).toBe(true);
    expect(res.overallScore).toBeGreaterThanOrEqual(85);
  });

  it('Demotes Tier 2 metrics and strictly blocks them from being saved as Reference', () => {
    const mockStatsTier2 = {
      metricId: 'M2',
      metricName: 'Variable Agility',
      unit: 's',
      direction: 'lower_is_better' as const,
      n: 20,
      iccA1: 0.72,
      iccA1Lower95: 0.45,
      iccA1Upper95: 0.86,
      cvMean: 11.5,
      cvLower95: 8.5,
      cvUpper95: 15.2,
      typicalError: 0.35,
      sem: 0.36,
      mdc95: 1.0,
      mdcPercent: 18.0,
      meanBias: 0.1,
      biasPercent: 3.2,
      pairedTPValue: 0.08,
      t1Mean: 3.2,
      t2Mean: 3.1,
      grandMean: 3.15,
      sdDiff: 0.49,
      pooledSD: 0.68,
      outlierCount: 0,
      outlierRatio: 0,
      confidenceLevel: 95 as const,
      iccModel: 'two_way_random' as const,
      iccDefinition: 'absolute_agreement' as const,
      iccMeasureType: 'single' as const,
      iccCiMethod: 'mcgraw_wong_1996' as const,
      teMethod: 'sd_diff_div_sqrt2' as const,
      cvMethod: 'te_div_pooled_mean' as const,
      cvCiMethod: 'vangel_mckay_approx' as const,
      semMethod: 'pooled_sd_sqrt_1_minus_icc' as const,
      mdcMethod: 'sem_times_z_times_sqrt2' as const,
      mdcConfidenceLevel: 95 as const,
      analysisMethodVersion: 'v1.0',
      pairs: []
    };

    const res = evaluateMetricReliability(mockStatsTier2 as unknown as ReliabilityStats);
    expect(res.tier).toBe('tier_2_caution');
    expect(res.isEligibleForReference).toBe(false);
  });

  it('Uses strictly neutral interpretation in calculateTrueChangeThreshold without diagnostic overreach', () => {
    const verdict = calculateTrueChangeThreshold(40.0, 2.5, 45.0, 'higher_is_better', 'cm');
    expect(verdict.resultType).toBe('true_improvement');
    expect(verdict.resultLabel).toContain('可检测升高');
    expect(verdict.resultExplanation).toContain('超过MDC仅表示观察到的变化超过预期测量误差，不说明变化的生理或训练原因');
  });
});
