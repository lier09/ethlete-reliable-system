import { describe, it, expect } from 'vitest';
import { parseCSVData, qualifyDataset, aggregateTrials } from '../dataParser';

describe('Data Parser and Qualification Audit Tests', () => {
  it('Parses standard CSV formatted data accurately', () => {
    const csv = `participant_id,name,session,trial,metric,value
P01,Zhang,1,1,CMJ,42.5
P01,Zhang,1,2,CMJ,43.5
P01,Zhang,2,1,CMJ,44.0
P01,Zhang,2,2,CMJ,44.2
P02,Li,1,1,CMJ,38.0
P02,Li,1,2,CMJ,38.4
P02,Li,2,1,CMJ,39.0
P02,Li,2,2,CMJ,39.2`;

    const res = parseCSVData(csv);
    expect(res.errors.length).toBe(0);
    expect(res.parseErrors.length).toBe(0);
    expect(res.rows.length).toBe(8);

    const qualification = qualifyDataset(res.rows, 2, 1, 2, res.parseErrors);
    expect(qualification.isValid).toBe(true);
    expect(qualification.canProceedToReliability).toBe(true);
    expect(qualification.totalParticipants).toBe(2);
    expect(qualification.sessionCount).toBe(2);
  });

  it('Catches non-numeric and illegal characters as blocking parse errors', () => {
    const csv = `participant_id,session,trial,metric,value
P01,1,1,CMJ,42.5
P01,2,1,CMJ,error_val
P02,1,1,CMJ,38.0
P02,2,1,CMJ,39.0`;

    const res = parseCSVData(csv);
    expect(res.parseErrors.length).toBe(1);
    expect(res.parseErrors[0].line).toBe(3);
    expect(res.parseErrors[0].participant_id).toBe('P01');

    const qualification = qualifyDataset(res.rows, 2, 1, 2, res.parseErrors);
    expect(qualification.isValid).toBe(false);
    expect(qualification.canProceedToReliability).toBe(false);
  });

  it('Prohibits best aggregation for neutral direction metrics', () => {
    const rows = [
      { participant_id: 'P01', session: 1, trial: 1, metric: 'Angle', value: 5 },
      { participant_id: 'P01', session: 1, trial: 2, metric: 'Angle', value: 8 },
      { participant_id: 'P01', session: 2, trial: 1, metric: 'Angle', value: 6 },
      { participant_id: 'P01', session: 2, trial: 2, metric: 'Angle', value: 7 }
    ];

    expect(() => {
      aggregateTrials(rows, 'Angle', 'best', 'neutral', 1, 2);
    }).toThrow();
  });

  it('Supports custom 2-session selection in multi-session data', () => {
    const rows = [
      { participant_id: 'P01', session: 1, trial: 1, metric: 'CMJ', value: 40 },
      { participant_id: 'P01', session: 2, trial: 1, metric: 'CMJ', value: 42 },
      { participant_id: 'P01', session: 3, trial: 1, metric: 'CMJ', value: 45 },
      { participant_id: 'P02', session: 1, trial: 1, metric: 'CMJ', value: 35 },
      { participant_id: 'P02', session: 2, trial: 1, metric: 'CMJ', value: 37 },
      { participant_id: 'P02', session: 3, trial: 1, metric: 'CMJ', value: 39 }
    ];

    const pairs23 = aggregateTrials(rows, 'CMJ', 'mean', 'higher_is_better', 2, 3);
    expect(pairs23.length).toBe(2);
    expect(pairs23[0].test1).toBe(42);
    expect(pairs23[0].test2).toBe(45);
    expect(pairs23[0].diff).toBe(3);
  });
});
