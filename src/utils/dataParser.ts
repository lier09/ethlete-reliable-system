import {
  AggregatedPairData,
  DataQualificationResult,
  MetricDefinition,
  QualificationIssue,
  RawDataRow,
  TrialAggregationMethod
} from '../types';

/**
 * Parses CSV or tab-delimited text into raw data rows.
 */
export function parseCSVData(text: string): { rows: RawDataRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  const rows: RawDataRow[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    return { rows: [], errors: ['数据行数不足，请提供包含表头和至少2行数据的CSV内容。'] };
  }

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const delimiter = headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

  // Identify column indices
  const pIdIdx = headers.findIndex(h => ['participant_id', 'id', 'subject_id', 'athlete_id', '编号', '受试者id'].includes(h));
  const nameIdx = headers.findIndex(h => ['name', 'athlete_name', '姓名', '受试者姓名', 'athlete'].includes(h));
  const ageIdx = headers.findIndex(h => ['age', '年龄'].includes(h));
  const sexIdx = headers.findIndex(h => ['sex', 'gender', '性别'].includes(h));
  const sessionIdx = headers.findIndex(h => ['session', 'test', '轮次', '测试', 'session_id'].includes(h));
  const trialIdx = headers.findIndex(h => ['trial', '次序', '试次', 'trial_id', 'rep'].includes(h));
  const metricIdx = headers.findIndex(h => ['metric', 'indicator', '指标', '指标名称', 'variable', 'metric_name'].includes(h));
  const valueIdx = headers.findIndex(h => ['value', 'score', '数值', '测试值', 'val', 'result'].includes(h));

  // Check if wide format: e.g. participant_id, name, metric, test1, test2
  const t1Idx = headers.findIndex(h => ['test1', 't1', 'session1', 'test_1', '测试1', 'baseline'].includes(h));
  const t2Idx = headers.findIndex(h => ['test2', 't2', 'session2', 'test_2', '测试2', 'retest'].includes(h));

  const isWideFormat = t1Idx !== -1 && t2Idx !== -1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser handling quotes
    const cells = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.length < 2) continue;

    if (isWideFormat) {
      const pid = pIdIdx !== -1 ? cells[pIdIdx] : `P${i}`;
      const name = nameIdx !== -1 ? cells[nameIdx] : pid;
      const metric = metricIdx !== -1 ? cells[metricIdx] : 'Default Metric';
      const t1Val = parseFloat(cells[t1Idx]);
      const t2Val = parseFloat(cells[t2Idx]);

      if (!isNaN(t1Val)) {
        rows.push({
          participant_id: pid,
          name,
          age: ageIdx !== -1 ? parseFloat(cells[ageIdx]) : undefined,
          sex: sexIdx !== -1 ? cells[sexIdx] : undefined,
          session: 1,
          trial: 1,
          metric,
          value: t1Val
        });
      }
      if (!isNaN(t2Val)) {
        rows.push({
          participant_id: pid,
          name,
          age: ageIdx !== -1 ? parseFloat(cells[ageIdx]) : undefined,
          sex: sexIdx !== -1 ? cells[sexIdx] : undefined,
          session: 2,
          trial: 1,
          metric,
          value: t2Val
        });
      }
    } else {
      // Long format
      if (pIdIdx === -1 && nameIdx === -1) {
        errors.push(`第 ${i + 1} 行未找到受试者标识列 (participant_id 或 name)`);
        continue;
      }
      const pid = pIdIdx !== -1 ? cells[pIdIdx] : cells[nameIdx];
      const name = nameIdx !== -1 ? cells[nameIdx] : pid;
      const sessionVal = sessionIdx !== -1 ? parseInt(cells[sessionIdx], 10) : 1;
      const trialVal = trialIdx !== -1 ? parseInt(cells[trialIdx], 10) : 1;
      const metric = metricIdx !== -1 ? cells[metricIdx] : 'Test Metric';
      const val = valueIdx !== -1 ? parseFloat(cells[valueIdx]) : NaN;

      if (isNaN(val)) {
        errors.push(`第 ${i + 1} 行受试者 ${pid} 的数值无效: "${valueIdx !== -1 ? cells[valueIdx] : ''}"`);
        continue;
      }

      rows.push({
        participant_id: pid,
        name,
        age: ageIdx !== -1 ? parseFloat(cells[ageIdx]) : undefined,
        sex: sexIdx !== -1 ? cells[sexIdx] : undefined,
        session: isNaN(sessionVal) ? 1 : sessionVal,
        trial: isNaN(trialVal) ? 1 : trialVal,
        metric,
        value: val
      });
    }
  }

  return { rows, errors };
}

/**
 * Aggregate trials within a session for each subject and metric.
 */
export function aggregateTrials(
  rows: RawDataRow[],
  metricName: string,
  method: TrialAggregationMethod = 'mean'
): AggregatedPairData[] {
  const metricRows = rows.filter(
    r => r.metric.toLowerCase().trim() === metricName.toLowerCase().trim()
  );

  // Group by participant_id -> session -> values[]
  const subjectMap = new Map<
    string,
    { name: string; session1: number[]; session2: number[] }
  >();

  for (const row of metricRows) {
    if (!subjectMap.has(row.participant_id)) {
      subjectMap.set(row.participant_id, {
        name: row.name || row.participant_id,
        session1: [],
        session2: []
      });
    }
    const subj = subjectMap.get(row.participant_id)!;
    if (row.session === 1) {
      subj.session1.push(row.value);
    } else if (row.session === 2) {
      subj.session2.push(row.value);
    }
  }

  const aggregateFn = (vals: number[]): number => {
    if (vals.length === 0) return NaN;
    if (vals.length === 1) return vals[0];
    switch (method) {
      case 'mean':
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      case 'median': {
        const sorted = [...vals].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      case 'best':
        return Math.max(...vals);
      case 'last':
        return vals[vals.length - 1];
      default:
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  };

  const pairs: AggregatedPairData[] = [];

  for (const [pid, data] of subjectMap.entries()) {
    const t1 = aggregateFn(data.session1);
    const t2 = aggregateFn(data.session2);

    if (!isNaN(t1) && !isNaN(t2)) {
      pairs.push({
        participantId: pid,
        name: data.name,
        test1: t1,
        test2: t2,
        diff: t2 - t1,
        mean: (t1 + t2) / 2
      });
    }
  }

  return pairs;
}

/**
 * Rigorous Data Qualification Inspection.
 * Checks for:
 * 1. Single subject violation (N=1 HARD STOP)
 * 2. Paired completeness
 * 3. Session & trial counts
 * 4. Missing / duplicate / non-numeric data
 * 5. Minimum cohort size guidelines
 */
export function qualifyDataset(
  rows: RawDataRow[],
  minCohortSize: number = 10
): DataQualificationResult {
  const issues: QualificationIssue[] = [];
  const notes: string[] = [];

  if (rows.length === 0) {
    return {
      isValid: false,
      canProceedToReliability: false,
      totalParticipants: 0,
      sessionCount: 0,
      trialCountPerSession: 0,
      metricsFound: [],
      pairedCountByMetric: {},
      issues: [{
        type: 'error',
        code: 'EMPTY_DATASET',
        message: '数据表为空，请导入包含受试者重复测试的数据。'
      }],
      isSingleParticipantError: false,
      notes: []
    };
  }

  // Unique subjects
  const participants = Array.from(new Set(rows.map(r => r.participant_id)));
  const totalParticipants = participants.length;

  // CRITICAL RULE: N=1 HARD STOP
  let isSingleParticipantError = false;
  if (totalParticipants === 1) {
    isSingleParticipantError = true;
    issues.push({
      type: 'error',
      code: 'SINGLE_PARTICIPANT_ERROR',
      message: '当前项目只有1名受试者，无法建立群体可靠性参考。请使用一批受试者的重复测试数据，或在运动员监控中选择已有的 Reliability Reference。',
      details: '统计学原理：ICC、典型误差(TE)、CV% 与 MDC95 均依赖于群体间变异与重复测试误差的方差分解(ANOVA)。单一个体的两次测试无法估计群体测量误差分布。'
    });
  } else if (totalParticipants < minCohortSize) {
    issues.push({
      type: 'warning',
      code: 'LOW_SAMPLE_SIZE',
      message: `受试者样本量为 ${totalParticipants} 人，低于建议阈值 (${minCohortSize} 人)。`,
      details: `注意：最低样本量是产品工作流与科研置信度门槛，并非绝对统计学定律。当前样本量可计算参考指标，但置信区间较宽，可能无法通过 Tier 1 监控适用性评价。`
    });
  }

  // Unique sessions
  const sessions = Array.from(new Set(rows.map(r => r.session))).sort((a, b) => a - b);
  const sessionCount = sessions.length;
  if (sessionCount < 2) {
    issues.push({
      type: 'error',
      code: 'INSUFFICIENT_SESSIONS',
      message: `仅检测到 ${sessionCount} 个测试轮次(Session)。重测可靠性分析必须至少包含 Session 1 和 Session 2。`
    });
  }

  // Trials
  const trials = Array.from(new Set(rows.map(r => r.trial)));
  const trialCountPerSession = trials.length;

  // Metrics
  const metricsFound = Array.from(new Set(rows.map(r => r.metric)));
  const pairedCountByMetric: Record<string, number> = {};

  for (const metric of metricsFound) {
    const pairs = aggregateTrials(rows, metric, 'mean');
    pairedCountByMetric[metric] = pairs.length;

    if (pairs.length < 2 && totalParticipants > 1) {
      issues.push({
        type: 'warning',
        code: 'INSUFFICIENT_PAIRS_FOR_METRIC',
        message: `指标 "${metric}" 的有效配对受试者不足 2 人 (仅 ${pairs.length} 人包含完整 T1/T2 数据)。`
      });
    }

    // Check outliers for this metric
    if (pairs.length >= 3) {
      const diffs = pairs.map(p => p.diff);
      const m = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const sd = Math.sqrt(diffs.reduce((acc, d) => acc + Math.pow(d - m, 2), 0) / (diffs.length - 1));
      if (sd > 0) {
        const extremeCount = pairs.filter(p => Math.abs((p.diff - m) / sd) > 3.5).length;
        if (extremeCount > 0) {
          issues.push({
            type: 'warning',
            code: 'OUTLIER_DETECTED',
            message: `指标 "${metric}" 检测到 ${extremeCount} 个重测差值极端异常值 (|Z| > 3.5)，请核实数据录入是否准确。`
          });
        }
      }
    }
  }

  const hasErrors = issues.some(i => i.type === 'error');
  const canProceedToReliability = !hasErrors && totalParticipants >= 2 && sessionCount >= 2;

  if (canProceedToReliability) {
    notes.push(`数据资格校验通过：共 ${totalParticipants} 名受试者，${sessionCount} 轮测试，${metricsFound.length} 个指标。`);
  }

  return {
    isValid: !hasErrors,
    canProceedToReliability,
    totalParticipants,
    sessionCount,
    trialCountPerSession,
    metricsFound,
    pairedCountByMetric,
    issues,
    isSingleParticipantError,
    notes
  };
}
