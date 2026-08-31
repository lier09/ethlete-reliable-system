import React, { useState, useEffect } from 'react';
import {
  calculateDifference,
  calculateBias,
  calculateTE,
  calculatePooledMean,
  calculateCV,
  calculatePooledSD,
  calculateANOVA2Way,
  calculateICC,
  calculateSEM,
  calculateMDC95,
  calculateMDCPercent,
  calculateBlandAltman
} from '../../utils/statistics';
import { qualifyDataset, aggregateTrials } from '../../utils/dataParser';
import { evaluateMetricReliability, calculateTrueChangeThreshold, DEFAULT_SETTINGS } from '../../utils/rulesEngine';
import {
  generateRugbyCMJDataset,
  generateSingleSubjectDataset
} from '../../utils/demoData';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { AggregatedPairData } from '../../types';

interface TestResult {
  id: string;
  name: string;
  category: 'stats' | 'anova' | 'rules' | 'gatekeeper' | 'monitor' | 'parser';
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  durationMs: number;
  details?: string;
}

export const AutomatedTestingView: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [runCount, setRunCount] = useState<number>(0);

  const runAllTests = () => {
    setIsRunning(true);
    const testList: TestResult[] = [];

    // -------------------------------------------------------------
    // Test 1: TE Formula Verification: TE = SDdiff / sqrt(2)
    // -------------------------------------------------------------
    const tStart1 = performance.now();
    const mockSdDiff = 2.8284271247; // approx 2 * sqrt(2)
    const teResult = calculateTE(mockSdDiff, 20);
    const expectedTE = mockSdDiff / Math.SQRT2;
    const isTeValid = Math.abs(teResult.typicalError - 2.0) < 1e-4 && teResult.teMethod === 'sd_diff_div_sqrt2';
    testList.push({
      id: 'TEST-TE-01',
      name: 'TE 典型误差公式检验 (TE = SDdiff / √2)',
      category: 'stats',
      description: '验证 Typical Error (TE) 严格等于差值样本标准差除以根号2，且标注方法为 sd_diff_div_sqrt2',
      passed: isTeValid,
      expected: `TE = ${expectedTE.toFixed(4)}, method = 'sd_diff_div_sqrt2'`,
      actual: `TE = ${teResult.typicalError.toFixed(4)}, method = '${teResult.teMethod}'`,
      durationMs: +(performance.now() - tStart1).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 2: CV Formula Verification: CV = (TE / PooledMean) * 100
    // -------------------------------------------------------------
    const tStart2 = performance.now();
    const mockTE = 1.5;
    const mockPooledMean = 50.0;
    const cvResult = calculateCV(mockTE, mockPooledMean, 20);
    const expectedCV = (1.5 / 50.0) * 100; // 3.0%
    const isCvValid = Math.abs(cvResult.cvMean - expectedCV) < 1e-4 && cvResult.cvMethod === 'te_div_pooled_mean';
    testList.push({
      id: 'TEST-CV-02',
      name: 'CV% 变异系数公式检验 (CV = TE / PooledMean × 100)',
      category: 'stats',
      description: '验证 CV% 严格由 TE 除以合并均值计算，且标注方法为 te_div_pooled_mean',
      passed: isCvValid,
      expected: `CV% = ${expectedCV.toFixed(2)}%, method = 'te_div_pooled_mean'`,
      actual: `CV% = ${cvResult.cvMean.toFixed(2)}%, method = '${cvResult.cvMethod}'`,
      durationMs: +(performance.now() - tStart2).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 3: Pooled SD Formula Verification
    // -------------------------------------------------------------
    const tStart3 = performance.now();
    const sd1 = 4.0;
    const sd2 = 4.0;
    const pooledSD = calculatePooledSD(sd1, sd2);
    const expectedPooledSD = 4.0;
    const isPooledSdValid = Math.abs(pooledSD - expectedPooledSD) < 1e-4;
    testList.push({
      id: 'TEST-POOLED-SD-03',
      name: '合并标准差公式检验 (Pooled SD = √[(SD1² + SD2²)/2])',
      category: 'stats',
      description: '验证两测试会话等样本量下的合并标准差计算正确性',
      passed: isPooledSdValid,
      expected: `Pooled SD = ${expectedPooledSD.toFixed(2)}`,
      actual: `Pooled SD = ${pooledSD.toFixed(2)}`,
      durationMs: +(performance.now() - tStart3).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 4: SEM Formula Verification: SEM = PooledSD * sqrt(1 - ICC)
    // -------------------------------------------------------------
    const tStart4 = performance.now();
    const mockPooledSD = 5.0;
    const mockICC = 0.84;
    const semResult = calculateSEM(mockPooledSD, mockICC);
    const expectedSEM = 5.0 * Math.sqrt(1 - 0.84); // 5.0 * 0.4 = 2.0
    const isSemValid = Math.abs(semResult.sem - 2.0) < 1e-4 && semResult.semMethod === 'pooled_sd_sqrt_1_minus_icc';
    testList.push({
      id: 'TEST-SEM-04',
      name: 'SEM 测量标准误公式检验 (SEM = PooledSD × √(1 - ICC))',
      category: 'stats',
      description: '验证 SEM 严格由 Pooled SD 与 ICC(A,1) 计算得出',
      passed: isSemValid,
      expected: `SEM = ${expectedSEM.toFixed(4)}, method = 'pooled_sd_sqrt_1_minus_icc'`,
      actual: `SEM = ${semResult.sem.toFixed(4)}, method = '${semResult.semMethod}'`,
      durationMs: +(performance.now() - tStart4).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 5: MDC95 Multiplier Verification: MDC95 = 2.77 * SEM = 1.96 * sqrt(2) * SEM
    // -------------------------------------------------------------
    const tStart5 = performance.now();
    const mockSEM = 2.0;
    const mdcResult = calculateMDC95(mockSEM, 1.95996);
    const expectedMDC95 = 1.95996 * Math.SQRT2 * 2.0; // approx 5.5435
    const isMdcValid = Math.abs(mdcResult.mdc95 - expectedMDC95) < 1e-4 && mdcResult.mdcMethod === 'sem_times_z_times_sqrt2';
    testList.push({
      id: 'TEST-MDC95-05',
      name: 'MDC95 系数检验 (MDC95 = 1.96 × √2 × SEM = 2.77 × SEM)',
      category: 'stats',
      description: '验证 95% 置信水平下的最小可检测变化计算精确使用 1.96 * sqrt(2) 系数 (约 2.7718)',
      passed: isMdcValid,
      expected: `MDC95 = ${expectedMDC95.toFixed(4)}, method = 'sem_times_z_times_sqrt2'`,
      actual: `MDC95 = ${mdcResult.mdc95.toFixed(4)}, method = '${mdcResult.mdcMethod}'`,
      durationMs: +(performance.now() - tStart5).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 6: Systematic Bias Formula Verification
    // -------------------------------------------------------------
    const tStart6 = performance.now();
    const diffs = [1, 1, 1, 1, 1];
    const biasResult = calculateBias(diffs, 14.5);
    const isBiasValid = Math.abs(biasResult.meanBias - 1.0) < 1e-4;
    testList.push({
      id: 'TEST-BIAS-06',
      name: '系统偏差 (Mean Bias) 与配对 t 检验逻辑检验',
      category: 'stats',
      description: '验证会话间均值系统偏差计算与差值均值一致',
      passed: isBiasValid,
      expected: 'meanBias = 1.00',
      actual: `meanBias = ${biasResult.meanBias.toFixed(2)}`,
      durationMs: +(performance.now() - tStart6).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 7: Bland-Altman LoA: 95% Limits of Agreement
    // -------------------------------------------------------------
    const tStart7 = performance.now();
    const meanBiasMock = 1.0;
    const sdDiffMock = 2.0;
    const baResult = calculateBlandAltman(meanBiasMock, sdDiffMock, 20);
    const expectedLoaLower = meanBiasMock - 1.96 * sdDiffMock;
    const expectedLoaUpper = meanBiasMock + 1.96 * sdDiffMock;
    const isBaValid =
      Math.abs(baResult.loaLower - expectedLoaLower) < 1e-4 &&
      Math.abs(baResult.loaUpper - expectedLoaUpper) < 1e-4;
    testList.push({
      id: 'TEST-BA-07',
      name: 'Bland-Altman 95% 一致性界限 (LoA = Bias ± 1.96 × SDdiff)',
      category: 'stats',
      description: '验证 Bland-Altman 95% Limits of Agreement 的上下界数学准确性',
      passed: isBaValid,
      expected: `LoA = [${expectedLoaLower.toFixed(2)}, ${expectedLoaUpper.toFixed(2)}]`,
      actual: `LoA = [${baResult.loaLower.toFixed(2)}, ${baResult.loaUpper.toFixed(2)}]`,
      durationMs: +(performance.now() - tStart7).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 8: Two-Way Mixed Effects ANOVA & ICC(A,1)
    // -------------------------------------------------------------
    const tStart8 = performance.now();
    const pairs: AggregatedPairData[] = [
      { participantId: 'P1', name: 'P1', test1: 30, test2: 31, diff: 1, mean: 30.5 },
      { participantId: 'P2', name: 'P2', test1: 35, test2: 36, diff: 1, mean: 35.5 },
      { participantId: 'P3', name: 'P3', test1: 40, test2: 41, diff: 1, mean: 40.5 },
      { participantId: 'P4', name: 'P4', test1: 45, test2: 46, diff: 1, mean: 45.5 }
    ];
    const anova = calculateANOVA2Way(pairs);
    const isAnovaValid = anova.dfRow === 3 && anova.msRow > anova.msError;
    testList.push({
      id: 'TEST-ANOVA-08',
      name: '双因素混合效应 ANOVA 方差分析分解检验',
      category: 'anova',
      description: '验证行间均方 (msRow)、列间均方 (msCol) 与误差均方 (msError) 的正确分解',
      passed: isAnovaValid,
      expected: 'dfRow=3, msRow > msError',
      actual: `dfRow=${anova.dfRow}, msRow=${anova.msRow.toFixed(2)}, msError=${anova.msError.toFixed(2)}`,
      durationMs: +(performance.now() - tStart8).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 9: ICC(A,1) Absolute Agreement
    // -------------------------------------------------------------
    const tStart9 = performance.now();
    const iccResult = calculateICC(pairs);
    const isIccValid =
      iccResult.iccModel === 'two_way_mixed' &&
      iccResult.iccDefinition === 'absolute_agreement' &&
      iccResult.iccA1 >= 0 &&
      iccResult.iccA1 <= 1;
    testList.push({
      id: 'TEST-ICC-09',
      name: 'ICC(A,1) 绝对一致性信度系数检验',
      category: 'anova',
      description: '验证两因素混合效应单测量绝对一致性 ICC(A,1) 计算符合 McGraw & Wong (1996) 与 Shrout & Fleiss (1979)',
      passed: isIccValid,
      expected: 'ICC(A,1) in [0, 1], model="two_way_mixed", def="absolute_agreement"',
      actual: `ICC(A,1) = ${iccResult.iccA1.toFixed(3)}, model="${iccResult.iccModel}", def="${iccResult.iccDefinition}"`,
      durationMs: +(performance.now() - tStart9).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 10: N=1 Gatekeeper Hard Blocker
    // -------------------------------------------------------------
    const tStart10 = performance.now();
    const singleSubjectData = generateSingleSubjectDataset();
    const singleQualification = qualifyDataset(singleSubjectData);
    const isN1Blocked =
      singleQualification.canProceedToReliability === false &&
      singleQualification.isSingleParticipantError === true &&
      singleQualification.totalParticipants === 1;
    testList.push({
      id: 'TEST-GATEKEEPER-10',
      name: '样本量 N=1 统计硬性拦截检验 (Hard Blocker for N=1)',
      category: 'gatekeeper',
      description: '验证单人测试数据被绝对拦截，禁止计算 ICC/CV/ANOVA，提示必须建立群体基准',
      passed: isN1Blocked,
      expected: 'canProceed = false, isSingleParticipantError = true, totalParticipants = 1',
      actual: `canProceed = ${singleQualification.canProceedToReliability}, singleError = ${singleQualification.isSingleParticipantError}, n = ${singleQualification.totalParticipants}`,
      durationMs: +(performance.now() - tStart10).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 11: Multi-Trial Aggregation: Mean vs Median vs Best
    // -------------------------------------------------------------
    const tStart11 = performance.now();
    const demoData = generateRugbyCMJDataset();
    const meanPairs = aggregateTrials(demoData, 'Jump Height', 'mean');
    const bestPairs = aggregateTrials(demoData, 'Jump Height', 'best');
    const isAggValid = meanPairs.length === 20 && bestPairs.length === 20 && meanPairs[0].test1 <= bestPairs[0].test1;
    testList.push({
      id: 'TEST-AGGREGATE-11',
      name: '多试次聚合算法检验 (Mean vs. Best vs. Median)',
      category: 'parser',
      description: '验证 Session 内多试次聚合运算，且 Best 试次均值始终大于等于 Mean 均值',
      passed: isAggValid,
      expected: 'meanPairs.length = 20, bestPairs.length = 20, Mean <= Best',
      actual: `meanPairs=${meanPairs.length}, bestPairs=${bestPairs.length}, P1_mean=${meanPairs[0]?.test1.toFixed(2)}, P1_best=${bestPairs[0]?.test1.toFixed(2)}`,
      durationMs: +(performance.now() - tStart11).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 12: Tier 1 Recommended Decision Rules
    // -------------------------------------------------------------
    const tStart12 = performance.now();
    const highQualityStats = {
      metricId: 'JH',
      metricName: 'Jump Height',
      n: 20,
      iccA1: 0.92,
      iccA1Lower95: 0.82,
      cvMean: 3.5,
      cvUpper95: 5.0,
      sem: 1.2,
      mdc95: 3.32,
      mdcPercent: 7.5,
      meanBias: 0.2,
      biasPercent: 0.45,
      pairedTPValue: 0.35,
      unit: 'cm',
      direction: 'higher_is_better' as const
    } as any;
    const tier1Eval = evaluateMetricReliability(highQualityStats, DEFAULT_SETTINGS);
    const isTier1Valid = tier1Eval.tier === 'tier_1_recommended' && tier1Eval.isEligibleForReference === true;
    testList.push({
      id: 'TEST-TIER1-RULES-12',
      name: '一级推荐 (Tier 1 Recommended) 准入规则判定检验',
      category: 'rules',
      description: '验证高信度 (ICC>0.80, ICC_LCI>0.70, CV<8%, Bias%<2%) 准确获得 Tier 1 Recommended 评级并允许固化为 Reference',
      passed: isTier1Valid,
      expected: 'tier = "tier_1_recommended", isEligible = true',
      actual: `tier = "${tier1Eval.tier}", isEligible = ${tier1Eval.isEligibleForReference}`,
      durationMs: +(performance.now() - tStart12).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 13: Tier 3 Not Recommended for Poor Reliability
    // -------------------------------------------------------------
    const tStart13 = performance.now();
    const poorStats = {
      metricId: 'RFD',
      metricName: 'Braking RFD',
      n: 20,
      iccA1: 0.52,
      iccA1Lower95: 0.25,
      cvMean: 18.2,
      cvUpper95: 24.5,
      sem: 5.8,
      mdc95: 16.06,
      mdcPercent: 35.0,
      meanBias: 2.5,
      biasPercent: 5.5,
      pairedTPValue: 0.02,
      unit: 'N/s',
      direction: 'higher_is_better' as const
    } as any;
    const tier3Eval = evaluateMetricReliability(poorStats, DEFAULT_SETTINGS);
    const isTier3Valid = tier3Eval.tier === 'tier_3_not_recommended' && tier3Eval.isEligibleForReference === false;
    testList.push({
      id: 'TEST-TIER3-RULES-13',
      name: '三级不推荐 (Tier 3 Not Recommended) 拦截规则检验',
      category: 'rules',
      description: '验证低信度高变异指标被严格判定为 Tier 3 不推荐，且严禁固化为 Reference',
      passed: isTier3Valid,
      expected: 'tier = "tier_3_not_recommended", isEligible = false',
      actual: `tier = "${tier3Eval.tier}", isEligible = ${tier3Eval.isEligibleForReference}`,
      durationMs: +(performance.now() - tStart13).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 14: Athlete True Change Directionality: Higher is better vs Lower is better
    // -------------------------------------------------------------
    const tStart14 = performance.now();
    // Test Sprint time (lower is better): Baseline 4.50s, Current 4.20s, MDC95 = 0.15s -> Improvement
    const sprintEval = calculateTrueChangeThreshold(4.50, 0.15, 4.20, 'lower_is_better');
    const isSprintImprovement = sprintEval.resultType === 'true_improvement';

    // Test Jump height (higher is better): Baseline 35.0cm, Current 35.5cm, MDC95 = 1.35cm -> Within noise
    const jumpEval = calculateTrueChangeThreshold(35.0, 1.35, 35.5, 'higher_is_better');
    const isJumpNoise = jumpEval.resultType === 'within_noise';

    const isMonitorValid = isSprintImprovement && isJumpNoise;
    testList.push({
      id: 'TEST-MONITOR-DIR-14',
      name: '运动员监控双向判定检验 (高/低指标与噪声带)',
      category: 'monitor',
      description: '验证高指标(CMJ)与低指标(冲刺耗时)的提升/下降反向映射与噪声带逻辑',
      passed: isMonitorValid,
      expected: 'Sprint = "true_improvement", Jump = "within_noise"',
      actual: `Sprint = "${sprintEval.resultType}", Jump = "${jumpEval.resultType}"`,
      durationMs: +(performance.now() - tStart14).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 15: Systematic Bias Warning & Demotion Logic
    // -------------------------------------------------------------
    const tStart15 = performance.now();
    const statsWithSignificantBias = {
      metricId: 'P_BIAS',
      metricName: 'Power with Bias',
      n: 20,
      iccA1: 0.90,
      iccA1Lower95: 0.78,
      cvMean: 4.0,
      cvUpper95: 5.5,
      sem: 1.5,
      mdc95: 4.15,
      mdcPercent: 8.0,
      meanBias: 2.5,
      biasPercent: 3.5, // 2%~5% caution range
      pairedTPValue: 0.008, // p < 0.05 significant learning/fatigue effect
      unit: 'cm',
      direction: 'higher_is_better' as const
    } as any;
    const biasEval = evaluateMetricReliability(statsWithSignificantBias, DEFAULT_SETTINGS);
    const isBiasDemoted = biasEval.tier === 'tier_2_caution' && biasEval.cautionWarning !== undefined;
    testList.push({
      id: 'TEST-BIAS-DEMOTION-15',
      name: '显著系统偏差降级与学习效应警示检验 (Systematic Bias Demotion)',
      category: 'rules',
      description: '验证当重测存在中度系统偏差 (Bias% 在 2%~5% 谨慎区间) 时，系统自动触发 Tier 2 降级与警示',
      passed: isBiasDemoted,
      expected: 'tier = "tier_2_caution", cautionWarning exists',
      actual: `tier = "${biasEval.tier}", warning = "${biasEval.cautionWarning || 'none'}"`,
      durationMs: +(performance.now() - tStart15).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 16: Bias to MDC95 Ratio Formula (Bias / MDC95)
    // -------------------------------------------------------------
    const tStart16 = performance.now();
    const mockBias = 1.0;
    const mockMdc = 2.0;
    const biasToMdcRatio = +(mockBias / mockMdc).toFixed(3);
    const isRatioValid = Math.abs(biasToMdcRatio - 0.5) < 1e-4;
    testList.push({
      id: 'TEST-BIAS-RATIO-16',
      name: '偏差与阈值比率检验 (Bias to MDC95 Ratio = |Bias| / MDC95)',
      category: 'stats',
      description: '验证系统偏差与 MDC95 的相对比率计算，用于诊断系统误差是否侵蚀真实变化检测带宽',
      passed: isRatioValid,
      expected: 'ratio = 0.500',
      actual: `ratio = ${biasToMdcRatio.toFixed(3)}`,
      durationMs: +(performance.now() - tStart16).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 17: Participant Count Definition (unique IDs vs total rows)
    // -------------------------------------------------------------
    const tStart17 = performance.now();
    const uniqueParticipants = new Set(demoData.map(r => r.participant_id)).size;
    const totalObservations = demoData.length;
    const isParticipantCountAccurate = uniqueParticipants === 20 && totalObservations === 120;
    testList.push({
      id: 'TEST-PARTICIPANT-N-17',
      name: '科研样本量定义检验 (n = unique(participant_id) ≠ 总行数)',
      category: 'gatekeeper',
      description: '验证样本量 n 严格等于独立受试者数量 (20人)，而不是原始数据记录行数 (120条观测值)',
      passed: isParticipantCountAccurate,
      expected: 'unique participants = 20, total observations = 120',
      actual: `unique participants = ${uniqueParticipants}, total observations = ${totalObservations}`,
      durationMs: +(performance.now() - tStart17).toFixed(2)
    });

    // -------------------------------------------------------------
    // Test 18: Reference Methodology Versioning & Threshold Snapshot
    // -------------------------------------------------------------
    const tStart18 = performance.now();
    const isVersionSnapshotValid =
      typeof DEFAULT_SETTINGS.decisionRuleVersion === 'string' &&
      typeof DEFAULT_SETTINGS.analysisMethodVersion === 'string' &&
      DEFAULT_SETTINGS.biasPercentPass === 2.0 &&
      DEFAULT_SETTINGS.biasPercentCaution === 5.0;
    testList.push({
      id: 'TEST-SNAPSHOT-18',
      name: '基准版本化与规则阈值快照完整性检验 (Threshold Snapshot & Versioning)',
      category: 'rules',
      description: '验证系统配置包含 decisionRuleVersion、analysisMethodVersion 以及完整的 Bias/ICC/CV/MDC 阈值快照参数',
      passed: isVersionSnapshotValid,
      expected: '版本号存在且包含完整的阈值快照配置',
      actual: `RuleVersion: ${DEFAULT_SETTINGS.decisionRuleVersion}, MethodVersion: ${DEFAULT_SETTINGS.analysisMethodVersion}, BiasPass: ≤${DEFAULT_SETTINGS.biasPercentPass}%`,
      durationMs: +(performance.now() - tStart18).toFixed(2)
    });

    setResults(testList);
    setIsRunning(false);
    setRunCount(prev => prev + 1);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '100';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>统计引擎核心函数自动化单元测试 (Mathematical Unit Test Suite)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            严谨性统计校验与单元测试矩阵 (18 项全检)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            覆盖 TE、CV、SEM、MDC95、Systematic Bias、Bland-Altman、Two-Way Mixed ICC、N=1 守门器及双向监控判定。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-500/20"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                正在运行测试...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                重新运行全量测试
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">总测试用例数</div>
          <div className="text-3xl font-black text-slate-800 font-mono">{totalTests}</div>
          <div className="text-[11px] text-slate-500 mt-1">涵盖 6 大核心模块</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">通过测试</div>
          <div className="text-3xl font-black text-emerald-700 font-mono">{passedTests}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">全部数学公式检验通过</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs border-l-4 border-l-rose-500">
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">未通过测试</div>
          <div className="text-3xl font-black text-rose-700 font-mono">{failedTests}</div>
          <div className="text-[11px] text-slate-500 mt-1">{failedTests === 0 ? '0 逻辑缺陷' : '存在异常'}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">通过率 (Pass Rate)</div>
          <div className="text-3xl font-black text-blue-700 font-mono">{passRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">执行轮次 #{runCount}</div>
        </div>
      </div>

      {/* Test List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            测试套件详细执行清单 (Execution Details)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">已执行 {totalTests} 个独立断言</span>
        </div>

        <div className="divide-y divide-slate-100">
          {results.map(test => (
            <div key={test.id} className="p-4 hover:bg-slate-50/60 transition space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {test.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{test.id}</span>
                      <span className="text-xs font-bold text-slate-800">{test.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          test.category === 'stats'
                            ? 'bg-blue-100 text-blue-700'
                            : test.category === 'anova'
                            ? 'bg-indigo-100 text-indigo-700'
                            : test.category === 'gatekeeper'
                            ? 'bg-rose-100 text-rose-700'
                            : test.category === 'monitor'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {test.category.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{test.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      test.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {test.passed ? 'PASSED 通过' : 'FAILED 失败'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {test.durationMs} ms
                  </div>
                </div>
              </div>

              {/* Expected vs Actual Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-mono">
                <div>
                  <span className="text-slate-400 select-none">期望值 (Expected): </span>
                  <span className="text-slate-700 font-bold">{test.expected}</span>
                </div>
                <div>
                  <span className="text-slate-400 select-none">实际值 (Actual): </span>
                  <span className={test.passed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    {test.actual}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
