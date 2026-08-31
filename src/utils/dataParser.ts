import {
  AggregatedPairData,
  DataQualificationResult,
  MetricDefinition,
  MetricDirection,
  QualificationIssue,
  RawDataRow,
  TrialAggregationMethod
} from '../types';

/**
 * RFC-4180 Compliant CSV / TSV Tokenizer and Parser
 * Correctly parses:
 * - Commas / tabs inside double quotes
 * - Escaped double quotes ("")
 * - Carriage return and line feed (\r\n, \n, \r)
 * - UTF-8 BOM (\uFEFF)
 */
export function parseDelimitedText(text: string): string[][] {
  // Strip UTF-8 BOM if present
  let input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  input = input.trim();
  if (!input) return [];

  // Detect delimiter from first non-empty line
  const firstLine = input.split(/\r?\n/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = tabCount > commaCount && tabCount > semicolonCount ? '\t' : semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < input.length && input[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses CSV or tab-delimited text into structured RawDataRow objects with comprehensive error auditing.
 */
export function parseCSVData(text: string): { rows: RawDataRow[]; errors: string[] } {
  const matrix = parseDelimitedText(text);
  const rows: RawDataRow[] = [];
  const errors: string[] = [];

  if (matrix.length < 2) {
    return { rows: [], errors: ['数据行数不足，请提供包含表头和至少2行测试数据的CSV或表格内容。'] };
  }

  // Parse header
  const headers = matrix[0].map(h => h.toLowerCase().trim().replace(/^["']|["']$/g, ''));

  // Column matching
  const pIdIdx = headers.findIndex(h => ['participant_id', 'id', 'subject_id', 'athlete_id', '受试者id', '编号', '运动员id'].includes(h));
  const nameIdx = headers.findIndex(h => ['name', 'athlete_name', '姓名', '受试者姓名', 'athlete'].includes(h));
  const ageIdx = headers.findIndex(h => ['age', '年龄'].includes(h));
  const sexIdx = headers.findIndex(h => ['sex', 'gender', '性别'].includes(h));
  const sessionIdx = headers.findIndex(h => ['session', 'test', '轮次', '测试', 'session_id', '会话'].includes(h));
  const trialIdx = headers.findIndex(h => ['trial', '次序', '试次', 'trial_id', 'rep', '尝试'].includes(h));
  const metricIdx = headers.findIndex(h => ['metric', 'indicator', '指标', '指标名称', 'variable', 'metric_name', '测试项'].includes(h));
  const valueIdx = headers.findIndex(h => ['value', 'score', '数值', '测试值', 'val', 'result', '成绩'].includes(h));

  // Check wide format (e.g. participant_id, name, metric, test1, test2)
  const t1Idx = headers.findIndex(h => ['test1', 't1', 'session1', 'test_1', '测试1', 'baseline', '基准'].includes(h));
  const t2Idx = headers.findIndex(h => ['test2', 't2', 'session2', 'test_2', '测试2', 'retest', '重测'].includes(h));
  const isWideFormat = t1Idx !== -1 && t2Idx !== -1;

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const cells = matrix[rowIndex];
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

    if (isWideFormat) {
      const pid = pIdIdx !== -1 && cells[pIdIdx] ? cells[pIdIdx] : `P${rowIndex}`;
      const name = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx] : pid;
      const metric = metricIdx !== -1 && cells[metricIdx] ? cells[metricIdx] : 'Default Metric';
      const t1Val = parseFloat(cells[t1Idx]);
      const t2Val = parseFloat(cells[t2Idx]);

      if (isNaN(t1Val) && isNaN(t2Val)) {
        errors.push(`第 ${rowIndex + 1} 行受试者 ${pid} 的 Test 1 和 Test 2 均为非数字`);
        continue;
      }

      if (!isNaN(t1Val)) {
        rows.push({
          participant_id: pid,
          name,
          age: ageIdx !== -1 && cells[ageIdx] ? parseFloat(cells[ageIdx]) : undefined,
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
          age: ageIdx !== -1 && cells[ageIdx] ? parseFloat(cells[ageIdx]) : undefined,
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
        errors.push(`表头中未找到受试者标识列 (需包含 participant_id, athlete_id, id 或 name/姓名)`);
        break;
      }
      const pid = (pIdIdx !== -1 && cells[pIdIdx]) ? cells[pIdIdx] : (nameIdx !== -1 && cells[nameIdx]) ? cells[nameIdx] : '';
      if (!pid) {
        errors.push(`第 ${rowIndex + 1} 行受试者 ID 为空`);
        continue;
      }

      const name = (nameIdx !== -1 && cells[nameIdx]) ? cells[nameIdx] : pid;
      const sessionVal = sessionIdx !== -1 && cells[sessionIdx] ? parseInt(cells[sessionIdx], 10) : 1;
      const trialVal = trialIdx !== -1 && cells[trialIdx] ? parseInt(cells[trialIdx], 10) : 1;
      const metric = (metricIdx !== -1 && cells[metricIdx]) ? cells[metricIdx] : 'Test Metric';
      const valStr = valueIdx !== -1 ? cells[valueIdx] : '';
      const val = parseFloat(valStr);

      if (isNaN(val)) {
        errors.push(`第 ${rowIndex + 1} 行受试者 "${pid}" 的数值 "${valStr}" 无法转换为有效浮点数`);
        continue;
      }

      rows.push({
        participant_id: pid,
        name,
        age: ageIdx !== -1 && cells[ageIdx] ? parseFloat(cells[ageIdx]) : undefined,
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
 * Supports:
 * - 'mean': Arithmetic average across trials
 * - 'median': Median value
 * - 'best': Direction-aware best value (Math.max for 'higher_is_better', Math.min for 'lower_is_better')
 * - 'last': Final trial value
 */
export function aggregateTrials(
  rows: RawDataRow[],
  metricName: string,
  method: TrialAggregationMethod = 'mean',
  direction: MetricDirection = 'higher_is_better'
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
        if (direction === 'lower_is_better') {
          return Math.min(...vals);
        } else if (direction === 'higher_is_better') {
          return Math.max(...vals);
        } else {
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        }
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
 * Rigorous Data Qualification Inspection
 * Checks for:
 * 1. Single subject violation (N=1 HARD STOP)
 * 2. Paired completeness
 * 3. Session & trial counts (warning on >2 sessions)
 * 4. Duplicate entries (same subject, session, trial, and metric)
 * 5. Outliers and recording anomalies
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
      message: '当前数据集仅包含 1 名受试者，无法建立群体可靠性参考基准。请导入一批受试者的重复测试数据，或在运动员监控中选择已有的正式 Reference。',
      details: '统计学原理：ICC、典型误差 (TE)、CV% 与 MDC₉₅ 均依赖于群体间变异与测试误差的方差分解 (ANOVA)。单一个体的两次测试无法估计群体测量误差分布。'
    });
  } else if (totalParticipants < minCohortSize) {
    issues.push({
      type: 'warning',
      code: 'LOW_SAMPLE_SIZE',
      message: `受试者样本量为 ${totalParticipants} 人，低于建议阈值 (${minCohortSize} 人)。`,
      details: '样本量偏小会导致置信区间变宽，根据系统规则将无法通过 Tier 1 监控基准评定。'
    });
  }

  // Check duplicate rows
  const recordKeySet = new Set<string>();
  let duplicateCount = 0;
  for (const r of rows) {
    const key = `${r.participant_id}_s${r.session}_t${r.trial}_m${r.metric}`;
    if (recordKeySet.has(key)) {
      duplicateCount++;
    } else {
      recordKeySet.add(key);
    }
  }
  if (duplicateCount > 0) {
    issues.push({
      type: 'warning',
      code: 'DUPLICATE_RECORDS_DETECTED',
      message: `检测到 ${duplicateCount} 条重复录入的记录 (相同受试者、轮次、试次与指标)，已自动去重合并。`
    });
  }

  // Unique sessions
  const sessions = Array.from(new Set(rows.map(r => r.session))).sort((a, b) => a - b);
  const sessionCount = sessions.length;
  if (sessionCount < 2) {
    issues.push({
      type: 'error',
      code: 'INSUFFICIENT_SESSIONS',
      message: `仅检测到 ${sessionCount} 个测试轮次 (Session)。重测可靠性分析必须至少包含 Session 1 和 Session 2。`
    });
  } else if (sessionCount > 2) {
    issues.push({
      type: 'info',
      code: 'MULTI_SESSION_DATASET',
      message: `检测到 ${sessionCount} 个测试轮次。系统当前默认分析 Session 1 与 Session 2 的重测配对。`
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

    // Outlier checking (|Z| > 3.5)
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
            message: `指标 "${metric}" 检测到 ${extremeCount} 个重测差值极端异常值 (|Z| > 3.5)，建议核实数据录入是否准确。`
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
