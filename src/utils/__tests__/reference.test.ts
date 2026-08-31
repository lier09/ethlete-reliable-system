import { describe, it, expect } from 'vitest';
import { INITIAL_DEMO_REFERENCES } from '../demoData';
import { evaluateTrueChange } from '../rulesEngine';

describe('Reference Metadata and Lifecycle Tests', () => {
  it('Verifies initial references contain complete traceability metadata', () => {
    INITIAL_DEMO_REFERENCES.forEach(ref => {
      expect(ref.id).toBeDefined();
      expect(ref.version).toBeGreaterThanOrEqual(1);
      expect(ref.sport).toBeDefined();
      expect(ref.testName).toBeDefined();
      expect(ref.mdc95).toBeGreaterThan(0);
      expect(ref.sampleSize).toBeGreaterThanOrEqual(10);
      expect(ref.validityDisclaimer).toContain('Reliability does not establish validity');
    });
  });

  it('Calculates true change verdict against reference threshold', () => {
    const ref = INITIAL_DEMO_REFERENCES[0]; // CMJ Jump Height, MDC95 = 2.71 cm, higher_is_better
    const baseline = 40.0;
    
    // Test within noise
    const noiseRecord = evaluateTrueChange(ref, baseline, 41.5, 'ATH-001', 'Player 1');
    expect(noiseRecord.resultType).toBe('within_noise');
    expect(noiseRecord.upperThreshold).toBeCloseTo(42.71, 2);
    expect(noiseRecord.lowerThreshold).toBeCloseTo(37.29, 2);

    // Test true increase
    const increaseRecord = evaluateTrueChange(ref, baseline, 43.5, 'ATH-001', 'Player 1');
    expect(increaseRecord.resultType).toBe('true_improvement');
    expect(increaseRecord.resultExplanation).toContain('可检测升高');

    // Test true decrease
    const decreaseRecord = evaluateTrueChange(ref, baseline, 36.0, 'ATH-001', 'Player 1');
    expect(decreaseRecord.resultType).toBe('true_decline');
    expect(decreaseRecord.resultExplanation).toContain('可检测下降');
  });
});
