import {
  AggregatedPairData,
  DataQualificationResult,
  MetricDefinition,
  MetricDirection,
  ParseErrorDetail,
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

export interface ParseResult {
  rows: RawDataRow[];
  errors: string[];
  parseErrors: ParseErrorDetail[];
  totalLines: number;
  ignoredCount: number;
}

/**
 * Parses CSV or tab-delimited text into structured RawDataRow objects with comprehensive error auditing.
 * Never silently drops rows - all malformed rows are audited into parseErrors.
 */
export function parseCSVData(text: string): ParseResult {
  const matrix = parseDelimitedText(text);
  const rows: RawDataRow[] = [];
  const errors: string[] = [];
  const parseErrors: ParseErrorDetail[] = [];
  let ignoredCount = 0;

  if (matrix.length < 2) {
    const err = '数据行数不足，请提供包含表头和至少2行测试数据的CSV或表格内容。';
    errors.push(err);
    return { rows: [], errors: [err], parseErrors: [], totalLines: matrix.length, ignoredCount: 0 };
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
    const lineNum = rowIndex + 1;
    const rawLineStr = cells.join(',');

    if (cells.length === 0 || (cells.length === 1 && !cells[0])) {
      continue;
    }

    if (isWideFormat) {
      const pid = pIdIdx !== -1 && cells[pIdIdx] ? cells[pIdIdx].trim() : `P${rowIndex}`;
      const name = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx].trim() : pid;
      const metric = metricIdx !== -1 && cells[metricIdx] ? cells[metricIdx].trim() : 'Default Metric';
      const t1Raw = cells[t1Idx];
      const t2Raw = cells[t2Idx];
      const t1Val = parseFloat(t1Raw);
      const t2Val = parseFloat(t2Raw);

      if (isNaN(t1Val) && isNaN(t2Val)) {
        const reason = `第 ${lineNum} 行受试者 ${pid} 的 Test 1 ("${t1Raw}") 和 Test 2 ("${t2Raw}") 均为非有效数值`;
        errors.push(reason);
        parseErrors.push({
          line: lineNum,
          participant_id: pid,
          metric,
          reason,
          rawContent: rawLineStr
        });
        ignoredCount++;
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
      } else {
        parseErrors.push({
          line: lineNum,
          participant_id: pid,
          session: 1,
          metric,
          reason: `第 ${lineNum} 行受试者 ${pid} 的 Test 1 ("${t1Raw}") 缺失或非数字`,
          rawContent: rawLineStr
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
      } else {
        parseErrors.push({
          line: lineNum,
          participant_id: pid,
          session: 2,
          metric,
          reason: `第 ${lineNum} 行受试者 ${pid} 的 Test 2 ("${t2Raw}") 缺失或非数字`,
          rawContent: rawLineStr
        });
      }
    } else {
      // Long format
      if (pIdIdx === -1 && nameIdx === -1) {
        const reason = `表头中未找到受试者标识列 (需包含 participant_id, athlete_id, id 或 name/姓名)`;
        errors.push(reason);
        parseErrors.push({ line: 1, reason, rawContent: matrix[0].join(',') });
        break;
      }
      const pid = (pIdIdx !== -1 && cells[pIdIdx]) ? cells[pIdIdx].trim() : (nameIdx !== -1 && cells[nameIdx]) ? cells[nameIdx].trim() : '';
      if (!pid) {
        const reason = `第 ${lineNum} 行受试者 ID 为空`;
        errors.push(reason);
        parseErrors.push({ line: lineNum, reason, rawContent: rawLineStr });
        ignoredCount++;
        continue;
      }

      const name = (nameIdx !== -1 && cells[nameIdx]) ? cells[nameIdx].trim() : pid;
      const sessionRaw = sessionIdx !== -1 ? cells[sessionIdx] : '1';
      const trialRaw = trialIdx !== -1 ? cells[trialIdx] : '1';
      const sessionVal = parseInt(sessionRaw, 10);
      const trialVal = parseInt(trialRaw, 10);
      const metric = (metricIdx !== -1 && cells[metricIdx]) ? cells[metricIdx].trim() : 'Test Metric';
      const valStr = valueIdx !== -1 ? cells[valueIdx] : '';
      const val = parseFloat(valStr);

      if (isNaN(val)) {
        const reason = `第 ${lineNum} 行受试者 "${pid}" 指标 "${metric}" 的数值 "${valStr}" 无法转换为有效浮点数`;
        errors.push(reason);
        parseErrors.push({
          line: lineNum,
          participant_id: pid,
          session: sessionRaw,
          trial: trialRaw,
          metric,
          reason,
          rawContent: rawLineStr
        });
        ignoredCount++;
        continue;
      }

      if (isNaN(sessionVal) || sessionVal < 1) {
        const reason = `第 ${lineNum} 行受试者 "${pid}" 的测试轮次 Session ("${sessionRaw}") 必须为正整数`;
        errors.push(reason);
        parseErrors.push({ line: lineNum, participant_id: pid, session: sessionRaw, reason, rawContent: rawLineStr });
        ignoredCount++;
        continue;
      }

      if (isNaN(trialVal) || trialVal < 1) {
        const reason = `第 ${lineNum} 行受试者 "${pid}" 的测试试次 Trial ("${trialRaw}") 必须为正整数`;
        errors.push(reason);
        parseErrors.push({ line: lineNum, participant_id: pid, trial: trialRaw, reason, rawContent: rawLineStr });
        ignoredCount++;
        continue;
      }

      rows.push({
        participant_id: pid,
        name,
        age: ageIdx !== -1 && cells[ageIdx] ? parseFloat(cells[ageIdx]) : undefined,
        sex: sexIdx !== -1 ? cells[sexIdx] : undefined,
        session: sessionVal,
        trial: trialVal,
        metric,
        value: val
      });
    }
  }

  return { rows, errors, parseErrors, totalLines: matrix.length - 1, ignoredCount };
}

/**
 * Aggregate trials within a session for each subject and metric.
 * Supports comparing any two specified sessions (sessionA vs sessionB).
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
  direction: MetricDirection = 'higher_is_better',
  sessionA: number = 1,
  sessionB: number = 2
): AggregatedPairData[] {
  const metricRows = rows.filter(
    r => r.metric.toLowerCase().trim() === metricName.toLowerCase().trim()
  );

  // Group by participant_id -> session -> values[]
  const subjectMap = new Map<
    string,
    { name: string; sessionA: number[]; sessionB: number[] }
  >();

  for (const row of metricRows) {
    if (!subjectMap.has(row.participant_id)) {
      subjectMap.set(row.participant_id, {
        name: row.name || row.participant_id,
        sessionA: [],
        sessionB: []
      });
    }
    const subj = subjectMap.get(row.participant_id)!;
    if (row.session === sessionA) {
      subj.sessionA.push(row.value);
    } else if (row.session === sessionB) {
      subj.sessionB.push(row.value);
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
          throw new Error('Neutral metrics do not have a universally defined best value. Please select mean/median or define a custom aggregation rule. (中性指标不存在统一的“最佳值”方向，请选择均值、中位数或自定义聚合规则。)');
        }
      case 'last':
        return vals[vals.length - 1];
      default:
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  };

  const pairs: AggregatedPairData[] = [];

  for (const [pid, data] of subjectMap.entries()) {
    const t1 = aggregateFn(data.sessionA);
    const t2 = aggregateFn(data.sessionB);

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
 * 3. Session selection & counts (warning on >2 sessions, strictly comparing sessionA vs sessionB)
 * 4. Duplicate entries (same subject, session, trial, and metric)
 * 5. Trial integrity (missing trials like 1, 3 without 2, or mismatched trial count across subjects)
 * 6. Outliers and recording anomalies
 * 7. Parse error audit integration
 */
export function qualifyDataset(
  rows: RawDataRow[],
  minCohortSize: number = 10,
  selectedSessionA: number = 1,
  selectedSessionB: number = 2,
  parseErrors: ParseErrorDetail[] = []
): DataQualificationResult {
  const issues: QualificationIssue[] = [];
  const notes: string[] = [];

  // Integrate parse errors
  if (parseErrors.length > 0) {
    issues.push({
      type: 'error',
      code: 'PARSING_MALFORMED_DATA',
      message: `检测到 ${parseErrors.length} 处数据格式/解析错误（如非数字、非法轮次/试次），系统已拦截进入分析。`,
      details: parseErrors.slice(0, 5).map(e => `行 ${e.line}: ${e.reason}`).join('; ') + (parseErrors.length > 5 ? ` 等共 ${parseErrors.length} 处` : '')
    });
  }

  if (rows.length === 0) {
    return {
      isValid: false,
      canProceedToReliability: false,
      totalParticipants: 0,
      sessionCount: 0,
      availableSessions: [],
      selectedSessionA,
      selectedSessionB,
      trialCountPerSession: 0,
      metricsFound: [],
      pairedCountByMetric: {},
      issues: issues.length > 0 ? issues : [{
        type: 'error',
        code: 'EMPTY_DATASET',
        message: '数据表为空，请导入包含受试者重复测试的数据。'
      }],
      isSingleParticipantError: false,
      parseErrors,
      ignoredRowsCount: parseErrors.length,
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

  // Unique sessions
  const availableSessions = Array.from(new Set(rows.map(r => r.session))).sort((a, b) => a - b);
  const sessionCount = availableSessions.length;

  if (sessionCount < 2) {
    issues.push({
      type: 'error',
      code: 'INSUFFICIENT_SESSIONS',
      message: `仅检测到 ${sessionCount} 个测试轮次 (Session)。重测可靠性分析必须至少包含 2 个测试轮次。`
    });
  } else if (sessionCount > 2) {
    issues.push({
      type: 'info',
      code: 'MULTI_SESSION_DATASET',
      message: `检测到 ${sessionCount} 个测试轮次 (Sessions: ${availableSessions.join(', ')})。当前 V1 分析比对选定的 Session ${selectedSessionA} 与 Session ${selectedSessionB}。`
    });
  }

  if (!availableSessions.includes(selectedSessionA) || !availableSessions.includes(selectedSessionB)) {
    issues.push({
      type: 'error',
      code: 'SELECTED_SESSION_NOT_FOUND',
      message: `选定的比对轮次 Session ${selectedSessionA} 或 Session ${selectedSessionB} 在数据集中不存在。可用轮次: ${availableSessions.join(', ')}。`
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
      message: `检测到 ${duplicateCount} 条重复录入的记录 (相同受试者、轮次、试次与指标)，请检查数据源。`
    });
  }

  // Check Trial Integrity (e.g., missing trials in sequence, mismatched trials)
  const trials = Array.from(new Set(rows.map(r => r.trial))).sort((a, b) => a - b);
  const trialCountPerSession = trials.length;

  // Check if any subject has gaps in trials
  const metricGroups = Array.from(new Set(rows.map(r => r.metric)));
  let hasMissingTrialSequence = false;
  for (const p of participants) {
    for (const s of availableSessions) {
      for (const m of metricGroups) {
        const subRows = rows.filter(r => r.participant_id === p && r.session === s && r.metric === m);
        if (subRows.length > 0) {
          const subTrials = subRows.map(r => r.trial).sort((a, b) => a - b);
          for (let idx = 0; idx < subTrials.length; idx++) {
            if (subTrials[idx] !== idx + 1) {
              hasMissingTrialSequence = true;
              break;
            }
          }
        }
      }
      if (hasMissingTrialSequence) break;
    }
    if (hasMissingTrialSequence) break;
  }

  if (hasMissingTrialSequence) {
    issues.push({
      type: 'warning',
      code: 'TRIAL_SEQUENCE_GAP',
      message: '检测到部分受试者的试次序号不连续 (例如存在试次1和3但缺失试次2)，试次聚合将按实际存在的试次计算。'
    });
  }

  // Metrics check
  const metricsFound = Array.from(new Set(rows.map(r => r.metric)));
  const pairedCountByMetric: Record<string, number> = {};

  for (const metric of metricsFound) {
    const pairs = aggregateTrials(rows, metric, 'mean', 'higher_is_better', selectedSessionA, selectedSessionB);
    pairedCountByMetric[metric] = pairs.length;

    if (pairs.length < 2 && totalParticipants > 1) {
      issues.push({
        type: 'error',
        code: 'INSUFFICIENT_PAIRS_FOR_METRIC',
        message: `指标 "${metric}" 在 Session ${selectedSessionA} 与 Session ${selectedSessionB} 之间的有效配对受试者不足 2 人 (仅 ${pairs.length} 人包含完整两轮数据)。`
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
    notes.push(`数据资格校验通过：共 ${totalParticipants} 名受试者，对比 Session ${selectedSessionA} 与 Session ${selectedSessionB}，${metricsFound.length} 个指标。`);
  }

  return {
    isValid: !hasErrors,
    canProceedToReliability,
    totalParticipants,
    sessionCount,
    availableSessions,
    selectedSessionA,
    selectedSessionB,
    trialCountPerSession,
    metricsFound,
    pairedCountByMetric,
    issues,
    isSingleParticipantError,
    parseErrors,
    ignoredRowsCount: parseErrors.length,
    notes
  };
}

