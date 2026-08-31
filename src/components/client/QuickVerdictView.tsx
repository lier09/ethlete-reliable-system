import React, { useState, useEffect, useMemo } from 'react';
import {
  ReliabilityReference,
  AthleteMonitoringRecord,
  TrueChangeResultType
} from '../../types';
import { evaluateTrueChange } from '../../utils/rulesEngine';
import { formatNum } from '../../utils/statistics';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  User,
  ShieldCheck,
  Share2,
  RotateCcw,
  Sparkles,
  Award,
  ArrowRight,
  Info,
  Calendar
} from 'lucide-react';
import { AthleteReportCardModal } from './AthleteReportCardModal';

interface Props {
  references: ReliabilityReference[];
  onSaveRecord: (record: AthleteMonitoringRecord) => void;
  onNavigateToStandards: () => void;
  onNavigateToConsoleLab?: () => void;
}

export const QuickVerdictView: React.FC<Props> = ({
  references,
  onSaveRecord,
  onNavigateToStandards,
  onNavigateToConsoleLab
}) => {
  const activeRefs = useMemo(
    () => references.filter(r => r.status === 'active'),
    [references]
  );

  // Selected Reference
  const [selectedRefId, setSelectedRefId] = useState<string>(
    activeRefs[0]?.id || ''
  );

  // Form inputs
  const [athleteName, setAthleteName] = useState<string>('张明 (Zhang Ming)');
  const [athleteId, setAthleteId] = useState<string>('ATH-001');
  const [baselineInput, setBaselineInput] = useState<string>('38.5');
  const [currentInput, setCurrentInput] = useState<string>('41.8');
  const [testDate, setTestDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('夏训第四周机能评估测验');

  // UI state
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<AthleteMonitoringRecord | null>(null);

  // Active Reference object
  const currentRef = activeRefs.find(r => r.id === selectedRefId) || activeRefs[0] || null;

  // Auto update defaults if reference changes
  useEffect(() => {
    if (currentRef) {
      if (currentRef.metricId.includes('sprint') || currentRef.metricId.includes('10m') || currentRef.metricId.includes('30m')) {
        setBaselineInput('4.15');
        setCurrentInput('4.02');
      } else if (currentRef.metricId.includes('rsi')) {
        setBaselineInput('1.85');
        setCurrentInput('2.12');
      } else if (currentRef.metricId.includes('power')) {
        setBaselineInput('3450');
        setCurrentInput('3720');
      } else {
        setBaselineInput('38.5');
        setCurrentInput('41.8');
      }
    }
  }, [selectedRefId]);

  // Parse numbers
  const baseline = parseFloat(baselineInput);
  const currentVal = parseFloat(currentInput);
  const isValidInputs = !isNaN(baseline) && !isNaN(currentVal) && baseline > 0 && currentRef !== null;

  // Evaluate true change result
  const evalResult = useMemo(() => {
    if (!isValidInputs || !currentRef) return null;
    return evaluateTrueChange(
      currentRef,
      baseline,
      currentVal,
      athleteId || 'ATH-GUEST',
      athleteName || '运动员',
      testDate,
      notes
    );
  }, [isValidInputs, currentRef, baseline, currentVal, athleteId, athleteName, testDate, notes]);

  const handleSave = () => {
    if (!evalResult) return;
    onSaveRecord(evalResult);
    setLastSavedRecord(evalResult);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetForNext = () => {
    setAthleteName('');
    setAthleteId(`ATH-${Math.floor(100 + Math.random() * 900)}`);
    if (currentRef) {
      setBaselineInput(baselineInput); // keep baseline or reset
      setCurrentInput('');
    }
    setNotes('');
  };

  // Quick preset sample athletes
  const handleLoadPreset = (preset: 'gain' | 'noise' | 'drop') => {
    if (!currentRef) return;
    if (preset === 'gain') {
      setAthleteName('李强 (Li Qiang)');
      setAthleteId('ATH-008');
      const base = currentRef.grandMean || 38.0;
      setBaselineInput(base.toFixed(1));
      const delta = currentRef.direction === 'lower_is_better' ? - (currentRef.mdc95 * 1.3) : (currentRef.mdc95 * 1.4);
      setCurrentInput((base + delta).toFixed(1));
      setNotes('机能高峰期，速度爆发力显著增长');
    } else if (preset === 'noise') {
      setAthleteName('王伟 (Wang Wei)');
      setAthleteId('ATH-012');
      const base = currentRef.grandMean || 38.0;
      setBaselineInput(base.toFixed(1));
      const delta = (currentRef.mdc95 * 0.3) * (currentRef.direction === 'lower_is_better' ? -1 : 1);
      setCurrentInput((base + delta).toFixed(1));
      setNotes('表现稳定，轻微正常波动');
    } else {
      setAthleteName('陈洋 (Chen Yang)');
      setAthleteId('ATH-019');
      const base = currentRef.grandMean || 38.0;
      setBaselineInput(base.toFixed(1));
      const delta = currentRef.direction === 'lower_is_better' ? (currentRef.mdc95 * 1.3) : - (currentRef.mdc95 * 1.4);
      setCurrentInput((base + delta).toFixed(1));
      setNotes('连续三周大负荷，有明显神经肌肉疲劳迹象');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner: Sports Field Context */}
      <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold tracking-wide border border-blue-400/30">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            实战教练端 · 极速真实变化判定
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            运动员个体真实变化判定仪 (True Change Evaluator)
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            输入运动员的前后测成绩，系统将基于经科学标定的 <strong className="text-blue-300 font-mono">MDC₉₅ 测量误差阈值</strong>，自动过滤测试噪声与测量误差，判定是否发生**真实提升**、**正常波动**或**真实超出误差下降**。
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-2 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            快速示范案例：
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLoadPreset('gain')}
              className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-medium transition"
            >
              🟢 真实突破提升
            </button>
            <button
              onClick={() => handleLoadPreset('noise')}
              className="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-medium transition"
            >
              ⚪ 正常测试波动
            </button>
            <button
              onClick={() => handleLoadPreset('drop')}
              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 rounded-lg text-xs font-medium transition"
            >
              🔴 真实超出误差下降
            </button>
          </div>
        </div>
      </div>

      {/* Main Form & Live Result Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test & Athlete Inputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Reference Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                第一步：选择科学标定基准 (Reference)
              </label>
              <button
                onClick={onNavigateToStandards}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                查看全部基准 →
              </button>
            </div>

            {activeRefs.length > 0 ? (
              <select
                value={selectedRefId}
                onChange={e => setSelectedRefId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                {activeRefs.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.metricName} ({r.sport} - {r.testName}) | MDC: ±{formatNum(r.mdc95, 2)} {r.unit}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  当前尚无活跃的 Reference 基准，请在控制端建立并固化基准。
                </div>
              </div>
            )}

            {currentRef && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">动作测试协议:</span>
                  <span className="font-semibold text-slate-800">{currentRef.testName} ({currentRef.sport})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">测试设备:</span>
                  <span className="font-medium text-slate-700">{currentRef.device}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">MDC₉₅ 测量误差阈值:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    ±{formatNum(currentRef.mdc95, 2)} {currentRef.unit} ({formatNum(currentRef.mdcPercent, 1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">信度评级 (Tier):</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {currentRef.suitabilityTier === 'tier_1_recommended' ? 'Tier 1 黄金标准' : 'Tier 2 谨慎监控'} (ICC {formatNum(currentRef.iccA1, 2)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Athlete & Test Value Input */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              第二步：输入受试运动员与测试成绩
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">运动员姓名</label>
                <input
                  type="text"
                  value={athleteName}
                  onChange={e => setAthleteName(e.target.value)}
                  placeholder="例如: 张明"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">运动员编号 (ID)</label>
                <input
                  type="text"
                  value={athleteId}
                  onChange={e => setAthleteId(e.target.value)}
                  placeholder="例如: ATH-001"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  基线成绩 (Baseline) <span className="text-slate-400 font-normal">[{currentRef?.unit}]</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baselineInput}
                  onChange={e => setBaselineInput(e.target.value)}
                  placeholder="如 38.5"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-700 mb-1">
                  本次实测成绩 (Current) <span className="text-blue-500 font-normal">[{currentRef?.unit}]</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  placeholder="如 41.8"
                  className="w-full bg-blue-50/50 border border-blue-300 rounded-lg p-2.5 text-sm font-bold font-mono text-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">测试日期</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={e => setTestDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">阶段备注 (可选)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="如: 赛季前集训阶段"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={handleResetForNext}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                清空录入下一人
              </button>

              <button
                onClick={handleSave}
                disabled={!evalResult}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                存入运动员机能档案
              </button>
            </div>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-between animate-fade-in">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  已成功归档并更新至队伍机能红绿灯看板！
                </span>
                <button
                  onClick={() => {
                    if (evalResult) {
                      setLastSavedRecord(evalResult);
                      setShowCardModal(true);
                    }
                  }}
                  className="text-emerald-900 underline font-bold hover:text-emerald-950 text-[11px]"
                >
                  预览分享卡 →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Instant Live Verdict Card & Visual Gauge (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {evalResult && currentRef ? (
            <div className="space-y-5">
              {/* Verdict Header Status Card */}
              <div
                className={`rounded-2xl p-6 border shadow-md transition-all ${
                  evalResult.resultType === 'true_improvement'
                    ? 'bg-linear-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white border-emerald-700/60 shadow-emerald-950/20'
                    : evalResult.resultType === 'true_decline'
                    ? 'bg-linear-to-br from-rose-900 via-rose-950 to-slate-950 text-white border-rose-700/60 shadow-rose-950/20'
                    : 'bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 text-white border-slate-700 shadow-slate-900/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full animate-ping ${
                          evalResult.resultType === 'true_improvement'
                            ? 'bg-emerald-400'
                            : evalResult.resultType === 'true_decline'
                            ? 'bg-rose-400'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      <span className="text-xs font-mono uppercase tracking-widest text-slate-300">
                        实时判定结论 (Real-Time Verdict)
                      </span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">
                      {evalResult.resultLabel}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">变化幅度 (Delta)</div>
                    <div className="text-2xl font-black font-mono mt-0.5">
                      {evalResult.delta >= 0 ? '+' : ''}
                      {formatNum(evalResult.delta, 2)}{' '}
                      <span className="text-sm font-normal opacity-80">{evalResult.unit}</span>
                    </div>
                    <div className="text-xs font-mono font-bold opacity-90">
                      ({evalResult.deltaPercent >= 0 ? '+' : ''}
                      {formatNum(evalResult.deltaPercent, 1)}%)
                    </div>
                  </div>
                </div>

                {/* Plain-Language Explanation */}
                <div className="mt-4 p-4 rounded-xl bg-black/30 border border-white/10 text-xs leading-relaxed space-y-2">
                  <p className="text-slate-200">
                    <strong className="text-white">科学结论：</strong> {evalResult.resultExplanation}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    该动作的 95% 最小真实变化阈值为{' '}
                    <strong className="text-blue-300 font-mono">±{formatNum(evalResult.mdc95, 2)} {evalResult.unit}</strong>
                    。当前变化量 <strong className="text-white font-mono">{formatNum(Math.abs(evalResult.delta), 2)} {evalResult.unit}</strong>{' '}
                    {Math.abs(evalResult.delta) >= evalResult.mdc95
                      ? '已超过测量误差，有 95% 置信度代表真实机能状态改变。'
                      : '位于测量噪声范围内，属日常正常生理/仪器波动。'}
                  </p>
                </div>
              </div>

              {/* Visual Error Band & Threshold Meter */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    测量误差带与当前成绩指示尺 (Noise Band Gauge)
                  </h4>
                  <span className="text-xs font-mono text-slate-500">
                    Baseline: {formatNum(evalResult.baselineValue, 2)} {evalResult.unit}
                  </span>
                </div>

                {/* Graphic Meter Container */}
                <div className="relative py-8 px-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  {/* Threshold Badges on top */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-3 px-2">
                    <span className="text-rose-600 font-semibold">
                      下限阈值: {formatNum(evalResult.lowerThreshold, 2)} {evalResult.unit}
                    </span>
                    <span className="text-slate-800 font-bold bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200">
                      基线: {formatNum(evalResult.baselineValue, 2)}
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      上限阈值: {formatNum(evalResult.upperThreshold, 2)} {evalResult.unit}
                    </span>
                  </div>

                  {/* Horizontal Bar Graphic */}
                  <div className="relative h-7 bg-slate-200 rounded-full flex items-center overflow-hidden border border-slate-300">
                    {/* Lower Danger/Decline Zone */}
                    <div className="h-full bg-rose-100/90 w-[25%] border-r border-rose-300 flex items-center justify-center text-[10px] text-rose-700 font-bold">
                      {evalResult.direction === 'higher_is_better' ? '真实衰退区' : '真实突破区'}
                    </div>

                    {/* Middle Noise Zone (Baseline ± MDC) */}
                    <div className="h-full bg-slate-300/80 w-[50%] flex items-center justify-center text-[10px] text-slate-700 font-bold border-r border-slate-400">
                      ±MDC₉₅ 测量噪声区间 ({formatNum(evalResult.mdc95, 2)} {evalResult.unit})
                    </div>

                    {/* Upper Gain Zone */}
                    <div className="h-full bg-emerald-100/90 w-[25%] flex items-center justify-center text-[10px] text-emerald-700 font-bold">
                      {evalResult.direction === 'higher_is_better' ? '真实突破区' : '真实衰退区'}
                    </div>
                  </div>

                  {/* Current Score Marker Pointer */}
                  <div className="mt-4 flex items-center justify-between text-xs px-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                      <span className="font-semibold text-slate-800">
                        本次测试实测值: <strong className="font-mono text-blue-700">{formatNum(evalResult.currentValue, 2)} {evalResult.unit}</strong>
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      判定边界: ±{formatNum(evalResult.mdc95, 2)} {evalResult.unit}
                    </span>
                  </div>
                </div>

                {/* Coach Decision Card */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Award className="w-4 h-4 text-blue-600" />
                    体能教练实战建议 (Coach Action Recommendation)
                  </div>
                  <div className="text-xs text-blue-950 leading-relaxed">
                    {evalResult.resultType === 'true_improvement' && (
                      <p>
                        🟢 <strong>突破提升确认：</strong> 实测表现已超出 95% 最小真实变化阈值 (MDC₉₅)，确认为突破测试误差的真实表现提升。具体适应机制可结合阶段负荷及专项测试周期综合解释。
                      </p>
                    )}
                    {evalResult.resultType === 'within_noise' && (
                      <p>
                        ⚪ <strong>正常误差范围：</strong> 表现波动处于预期测量误差带 (±MDC₉₅) 内，属于日常测试与生物学正常随机波动。不建议据此判定机能改变或盲目调整训练计划。
                      </p>
                    )}
                    {evalResult.resultType === 'true_decline' && (
                      <p>
                        🔴 <strong>真实下降提示：</strong> 检测到超过预期测量误差的真实下降。注意：该变化不代表单一原因诊断，变化原因需结合训练负荷、RPE自觉疲劳度、睡眠质量、HRV心率变异度、肌肉酸痛与伤病情况综合解释。
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => {
                      setLastSavedRecord(evalResult);
                      setShowCardModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    生成运动员专属反馈报告卡 (Shareable Card)
                  </button>

                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    一键保存记录
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Activity className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-600">请输入完整的基线值与实测值</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                左侧填入测试数据后，系统将实时计算真实变化结论并绘制误差指示尺。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Shareable Card Modal */}
      {showCardModal && lastSavedRecord && (
        <AthleteReportCardModal
          record={lastSavedRecord}
          onClose={() => setShowCardModal(false)}
        />
      )}
    </div>
  );
};
