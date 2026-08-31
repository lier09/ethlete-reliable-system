import React, { useState } from 'react';
import {
  AthleteMonitoringRecord,
  ReliabilityReference,
  TrueChangeResultType
} from '../../types';
import { AthleteThresholdChart } from '../charts/AthleteThresholdChart';
import { exportAthleteMonitoringCSV } from '../../utils/exportUtils';
import { formatNum } from '../../utils/statistics';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Info,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  FileSpreadsheet,
  Zap,
  Target
} from 'lucide-react';

interface Props {
  references: ReliabilityReference[];
  monitoringRecords: AthleteMonitoringRecord[];
  onSaveRecord: (record: AthleteMonitoringRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNavigateToLab: () => void;
}

export const AthleteMonitorView: React.FC<Props> = ({
  references,
  monitoringRecords,
  onSaveRecord,
  onDeleteRecord,
  onNavigateToLab
}) => {
  const activeRefs = references.filter(r => r.status === 'active');
  const [selectedRefId, setSelectedRefId] = useState<string>(activeRefs[0]?.id || '');

  // Single athlete input state
  const [athleteName, setAthleteName] = useState<string>('王凯 (Kai Wang)');
  const [athleteId, setAthleteId] = useState<string>('ATH-089');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [baselineInput, setBaselineInput] = useState<string>('38.0');
  const [currentInput, setCurrentInput] = useState<string>('41.5');
  const [selectedRecord, setSelectedRecord] = useState<AthleteMonitoringRecord | null>(
    monitoringRecords[0] || null
  );

  // Batch athlete input state
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchCSV, setBatchCSV] = useState<string>(
    `athlete_id,athlete_name,baseline,current,date\nATH-101,张博文,38.2,40.8,2026-03-30\nATH-102,李俊杰,44.5,45.1,2026-03-30\nATH-103,王晨阳,35.8,33.2,2026-03-30\nATH-104,刘子轩,41.2,43.9,2026-03-30`
  );

  const selectedRef = references.find(r => r.id === selectedRefId) || activeRefs[0];

  const handleEvaluateIndividual = () => {
    if (!selectedRef) return;
    const base = parseFloat(baselineInput);
    const curr = parseFloat(currentInput);
    if (isNaN(base) || isNaN(curr)) {
      alert('请输入有效的基线值与当前测试值');
      return;
    }

    const delta = curr - base;
    const deltaPercent = base !== 0 ? (delta / base) * 100 : 0;
    const upperThreshold = base + selectedRef.mdc95;
    const lowerThreshold = base - selectedRef.mdc95;

    let resultType: TrueChangeResultType;
    let resultLabel: string;
    let resultExplanation: string;

    const isHigherBetter = selectedRef.direction === 'higher_is_better';
    const isLowerBetter = selectedRef.direction === 'lower_is_better';

    if (isHigherBetter) {
      if (curr > upperThreshold) {
        resultType = 'true_improvement';
        resultLabel = '可检测的真实升高 (True Improvement)';
        resultExplanation = `当前值 (${formatNum(curr, 2)} ${selectedRef.unit}) 高于可检测升高阈值 (${formatNum(upperThreshold, 2)} ${selectedRef.unit})，其变化量 (+${formatNum(delta, 2)} ${selectedRef.unit}) 显著超过了预期测试测量误差 (MDC95 = ${formatNum(selectedRef.mdc95, 2)} ${selectedRef.unit})。`;
      } else if (curr < lowerThreshold) {
        resultType = 'true_decline';
        resultLabel = '可检测的真实降低 (True Decline)';
        resultExplanation = `当前值 (${formatNum(curr, 2)} ${selectedRef.unit}) 低于可检测降低阈值 (${formatNum(lowerThreshold, 2)} ${selectedRef.unit})，其下降幅度 (${formatNum(delta, 2)} ${selectedRef.unit}) 超过了预期测量误差。`;
      } else {
        resultType = 'within_noise';
        resultLabel = '处于预期测量误差范围 (Within Noise)';
        resultExplanation = `当前值 (${formatNum(curr, 2)} ${selectedRef.unit}) 处于 [${formatNum(lowerThreshold, 2)} ~ ${formatNum(upperThreshold, 2)} ${selectedRef.unit}] 误差带内，变化幅度 (${delta >= 0 ? '+' : ''}${formatNum(delta, 2)} ${selectedRef.unit}) 未达到 MDC95 阈值，无法区分是真实机能变化还是正常测试波动。`;
      }
    } else if (isLowerBetter) {
      // Lower is better (e.g. Sprint time)
      if (curr < lowerThreshold) {
        resultType = 'true_improvement';
        resultLabel = '可检测的真实改善 (耗时显著缩短)';
        resultExplanation = `由于测试指标为耗时（越短越好），当前成绩 (${formatNum(curr, 2)} ${selectedRef.unit}) 突破了可检测降低阈值 (${formatNum(lowerThreshold, 2)} ${selectedRef.unit})，耗时缩短幅度 (${formatNum(delta, 2)} ${selectedRef.unit}) 超过了预期测量误差。`;
      } else if (curr > upperThreshold) {
        resultType = 'true_decline';
        resultLabel = '可检测的真实下降 (耗时显著增加)';
        resultExplanation = `当前耗时 (${formatNum(curr, 2)} ${selectedRef.unit}) 高于可检测升高阈值 (${formatNum(upperThreshold, 2)} ${selectedRef.unit})，耗时增加幅度 (+${formatNum(delta, 2)} ${selectedRef.unit}) 超过了预期测量误差。`;
      } else {
        resultType = 'within_noise';
        resultLabel = '处于预期测量误差范围 (Within Noise)';
        resultExplanation = `当前成绩处于 [${formatNum(lowerThreshold, 2)} ~ ${formatNum(upperThreshold, 2)} ${selectedRef.unit}] 测量噪声带内，未检测到超过测量误差的变化。`;
      }
    } else {
      // Neutral
      if (curr > upperThreshold) {
        resultType = 'true_change_neutral';
        resultLabel = '可检测的真实升高 (中性指标)';
        resultExplanation = `当前数值突破了上限阈值，变化幅度超过 MDC95。`;
      } else if (curr < lowerThreshold) {
        resultType = 'true_change_neutral';
        resultLabel = '可检测的真实降低 (中性指标)';
        resultExplanation = `当前数值突破了下限阈值，变化幅度超过 MDC95。`;
      } else {
        resultType = 'within_noise';
        resultLabel = '处于预期测量误差范围 (Within Noise)';
        resultExplanation = `数值变动处于正常测试波动区间。`;
      }
    }

    const record: AthleteMonitoringRecord = {
      id: `REC-${Date.now().toString().slice(-6)}`,
      athleteId: athleteId || `ATH-${Date.now().toString().slice(-4)}`,
      athleteName: athleteName || '未命名运动员',
      date: testDate,
      referenceId: selectedRef.id,
      referenceName: selectedRef.name,
      metricName: selectedRef.metricName,
      unit: selectedRef.unit,
      direction: selectedRef.direction,
      baselineValue: base,
      currentValue: curr,
      delta,
      deltaPercent,
      mdc95: selectedRef.mdc95,
      upperThreshold,
      lowerThreshold,
      resultType,
      resultLabel,
      resultExplanation,
      createdAt: new Date().toISOString()
    };

    onSaveRecord(record);
    setSelectedRecord(record);
  };

  const handleBatchProcess = () => {
    if (!selectedRef) return;
    const lines = batchCSV.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 4) continue;

      const aId = parts[0];
      const aName = parts[1];
      const base = parseFloat(parts[2]);
      const curr = parseFloat(parts[3]);
      const date = parts[4] || testDate;

      if (isNaN(base) || isNaN(curr)) continue;

      const delta = curr - base;
      const deltaPercent = base !== 0 ? (delta / base) * 100 : 0;
      const upperThreshold = base + selectedRef.mdc95;
      const lowerThreshold = base - selectedRef.mdc95;

      let resultType: TrueChangeResultType;
      let resultLabel: string;
      let resultExplanation: string;

      const isHigherBetter = selectedRef.direction === 'higher_is_better';
      const isLowerBetter = selectedRef.direction === 'lower_is_better';

      if (isHigherBetter) {
        if (curr > upperThreshold) {
          resultType = 'true_improvement';
          resultLabel = '可检测的真实升高 (True Improvement)';
          resultExplanation = `当前值突破升高阈值，变化幅度超过 MDC95 (${formatNum(selectedRef.mdc95, 2)} ${selectedRef.unit})。`;
        } else if (curr < lowerThreshold) {
          resultType = 'true_decline';
          resultLabel = '可检测的真实降低 (True Decline)';
          resultExplanation = `当前值低于降低阈值，下降幅度超过测量误差。`;
        } else {
          resultType = 'within_noise';
          resultLabel = '处于预期测量误差范围 (Within Noise)';
          resultExplanation = `变动处于正常测试波动区间。`;
        }
      } else if (isLowerBetter) {
        if (curr < lowerThreshold) {
          resultType = 'true_improvement';
          resultLabel = '可检测的真实改善 (耗时显著缩短)';
          resultExplanation = `耗时突破降低阈值，提速幅度超过测量误差。`;
        } else if (curr > upperThreshold) {
          resultType = 'true_decline';
          resultLabel = '可检测的真实下降 (耗时显著延长)';
          resultExplanation = `耗时高于升高阈值，下降幅度超过测量误差。`;
        } else {
          resultType = 'within_noise';
          resultLabel = '处于预期测量误差范围 (Within Noise)';
          resultExplanation = `处于测量噪声带内。`;
        }
      } else {
        resultType = curr > upperThreshold || curr < lowerThreshold ? 'true_change_neutral' : 'within_noise';
        resultLabel = resultType === 'true_change_neutral' ? '可检测真实变化 (中性)' : '处于预期测量误差范围';
        resultExplanation = `中性指标变动评估。`;
      }

      const rec: AthleteMonitoringRecord = {
        id: `REC-${Date.now().toString().slice(-6)}-${i}`,
        athleteId: aId,
        athleteName: aName,
        date,
        referenceId: selectedRef.id,
        referenceName: selectedRef.name,
        metricName: selectedRef.metricName,
        unit: selectedRef.unit,
        direction: selectedRef.direction,
        baselineValue: base,
        currentValue: curr,
        delta,
        deltaPercent,
        mdc95: selectedRef.mdc95,
        upperThreshold,
        lowerThreshold,
        resultType,
        resultLabel,
        resultExplanation,
        createdAt: new Date().toISOString()
      };

      onSaveRecord(rec);
      if (i === 1) setSelectedRecord(rec);
    }

    setShowBatchModal(false);
  };

  if (activeRefs.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center max-w-2xl mx-auto space-y-5 shadow-xs my-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          暂无已激活的 Reliability Reference 基准
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          系统核心统计规则要求：<strong>必须先在“可靠性实验室”中通过一批受试者的重复测试数据建立并通过评估的 Reliability Reference，随后才能用于判断单个运动员。</strong>
        </p>
        <div className="pt-2">
          <button
            onClick={onNavigateToLab}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition shadow-md shadow-blue-500/20"
          >
            前往可靠性实验室建立 Reference
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Selector Card: Select Reliability Reference */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
              入口 B · 个体判定引擎
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              运动员监控与真实变化判定 (Athlete Monitor & True Change Evaluation)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              批量导入评估 (CSV)
            </button>
            <button
              onClick={() => exportAthleteMonitoringCSV(monitoringRecords)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              导出监控记录 CSV
            </button>
          </div>
        </div>

        {/* Reference Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1.5">
              选用已有 Reliability Reference (基准基线) *
            </label>
            <select
              value={selectedRef?.id || ''}
              onChange={e => setSelectedRefId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
            >
              {activeRefs.map(ref => (
                <option key={ref.id} value={ref.id}>
                  [{ref.id}] {ref.name} (MDC95 = ±{formatNum(ref.mdc95, 2)} {ref.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedRef && (
            <div className="bg-emerald-50/80 border border-emerald-200/90 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-emerald-800 font-medium">基准 MDC95 (95% 置信真实阈值)</div>
                <div className="text-base font-black font-mono text-emerald-950">
                  ±{formatNum(selectedRef.mdc95, 2)} {selectedRef.unit}
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-emerald-800">
                <div>ICC: {formatNum(selectedRef.iccA1, 2)}</div>
                <div>CV: {formatNum(selectedRef.cv, 1)}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Reference Eligibility & Scope Constraints */}
        {selectedRef && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-800">适用协议范围：</span>
              <span>
                {selectedRef.sport} · {selectedRef.testName} · 设备: {selectedRef.device} · 人群: {selectedRef.cohortDescription} (n={selectedRef.sampleSize})
              </span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              规则版本: {selectedRef.ruleVersion}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Input Form + Result Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Athlete Input */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-emerald-600" />
            输入运动员基线与当前测试值
          </h4>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">运动员姓名 *</label>
              <input
                type="text"
                value={athleteName}
                onChange={e => setAthleteName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="例如：王凯 (Kai Wang)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">运动员编号 (ID)</label>
                <input
                  type="text"
                  value={athleteId}
                  onChange={e => setAthleteId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono"
                  placeholder="ATH-089"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">当前测试日期</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={e => setTestDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="block font-bold text-slate-800 mb-1">
                  基线值 (Baseline) [{selectedRef?.unit}] *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baselineInput}
                  onChange={e => setBaselineInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="38.0"
                />
                <div className="text-[10px] text-slate-500 mt-1">前期稳定测试均值/基线</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="block font-bold text-slate-800 mb-1">
                  当前值 (Current) [{selectedRef?.unit}] *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="41.5"
                />
                <div className="text-[10px] text-slate-500 mt-1">本次监测测试成绩</div>
              </div>
            </div>

            {/* Live Threshold Preview */}
            {selectedRef && !isNaN(parseFloat(baselineInput)) && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] font-mono space-y-1">
                <div className="text-slate-600 font-sans font-bold">当前基线下真实变化门槛：</div>
                <div className="flex items-center justify-between text-emerald-800">
                  <span>可检测升高阈值 (Upper Threshold):</span>
                  <strong>{formatNum(parseFloat(baselineInput) + selectedRef.mdc95, 2)} {selectedRef.unit}</strong>
                </div>
                <div className="flex items-center justify-between text-rose-800">
                  <span>可检测降低阈值 (Lower Threshold):</span>
                  <strong>{formatNum(parseFloat(baselineInput) - selectedRef.mdc95, 2)} {selectedRef.unit}</strong>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleEvaluateIndividual}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            执行真实变化判定 (Calculate True Change)
          </button>
        </div>

        {/* Right Area: Result Hero & Visual Chart */}
        <div className="lg:col-span-7 space-y-4">
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Result Status Banner */}
              <div
                className={`p-6 rounded-3xl border space-y-3.5 shadow-xs ${
                  selectedRecord.resultType === 'true_improvement'
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : selectedRecord.resultType === 'true_decline'
                    ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                    : 'bg-slate-50/80 border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedRecord.resultType === 'true_improvement' ? (
                      <TrendingUp className="w-7 h-7 text-emerald-600" />
                    ) : selectedRecord.resultType === 'true_decline' ? (
                      <TrendingDown className="w-7 h-7 text-rose-600" />
                    ) : (
                      <Minus className="w-7 h-7 text-slate-600" />
                    )}
                    <div>
                      <div className="text-xs opacity-75 font-semibold">
                        {selectedRecord.athleteName} ({selectedRecord.athleteId}) · {selectedRecord.metricName}
                      </div>
                      <h4 className="text-base sm:text-lg font-black">{selectedRecord.resultLabel}</h4>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-[10px] opacity-75 font-sans">变化量 (Δ)</div>
                    <div className="text-lg sm:text-xl font-black">
                      {selectedRecord.delta >= 0 ? '+' : ''}{formatNum(selectedRecord.delta, 2)} {selectedRecord.unit}
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed font-medium bg-white/90 p-3.5 rounded-2xl border border-current/15">
                  {selectedRecord.resultExplanation}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-current/15">
                    <span className="text-[10px] opacity-75 block font-sans">基线值 (Baseline)</span>
                    <strong>{formatNum(selectedRecord.baselineValue, 2)} {selectedRecord.unit}</strong>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-current/15">
                    <span className="text-[10px] opacity-75 block font-sans">当前值 (Current)</span>
                    <strong>{formatNum(selectedRecord.currentValue, 2)} {selectedRecord.unit}</strong>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-current/15">
                    <span className="text-[10px] opacity-75 block font-sans">可检测升高阈值</span>
                    <strong>{formatNum(selectedRecord.upperThreshold, 2)} {selectedRecord.unit}</strong>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-current/15">
                    <span className="text-[10px] opacity-75 block font-sans">可检测降低阈值</span>
                    <strong>{formatNum(selectedRecord.lowerThreshold, 2)} {selectedRecord.unit}</strong>
                  </div>
                </div>
              </div>

              {/* Visual Threshold SVG Chart */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
                <AthleteThresholdChart record={selectedRecord} />
              </div>

              {/* Mandatory Interpretation Boundary Disclaimer */}
              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  科学解释边界 (Methodological Interpretation Boundary)
                </div>
                <p className="text-[11px] leading-relaxed">
                  “超过 MDC95 表示观察到的测试变化超过了当前协议下的预期测量误差（p &lt; 0.05），但不自动说明变化原因或实际重要性。严禁直接定性为疲劳、损伤或适应，必须结合训练负荷与主观状态综合研判。”
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center text-slate-400">
              请在左侧输入运动员测试数据后点击“执行真实变化判定”
            </div>
          )}
        </div>
      </div>

      {/* Monitoring History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            运动员真实变化监控判定历史清单 ({monitoringRecords.length})
          </h4>
          <span className="text-xs text-slate-500">点击行可切换图表查看</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 pl-4">测试日期</th>
                <th className="p-3">运动员姓名 (ID)</th>
                <th className="p-3">监测指标</th>
                <th className="p-3">基线值 Baseline</th>
                <th className="p-3">当前值 Current</th>
                <th className="p-3">变化量 (Δ)</th>
                <th className="p-3">MDC95 阈值</th>
                <th className="p-3">判定结果</th>
                <th className="p-3">所用 Reference</th>
                <th className="p-3 pr-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {monitoringRecords.map(rec => {
                const isSelected = selectedRecord?.id === rec.id;
                return (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`cursor-pointer transition ${isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-3 pl-4 text-slate-600">{rec.date}</td>
                    <td className="p-3 font-sans font-bold text-slate-900">
                      {rec.athleteName} <span className="text-[10px] text-slate-500 font-normal">({rec.athleteId})</span>
                    </td>
                    <td className="p-3 font-sans text-slate-700">{rec.metricName}</td>
                    <td className="p-3 text-slate-800">{formatNum(rec.baselineValue, 2)} {rec.unit}</td>
                    <td className="p-3 text-slate-800">{formatNum(rec.currentValue, 2)} {rec.unit}</td>
                    <td className="p-3 font-bold">
                      <span className={rec.delta > 0 ? 'text-teal-700' : rec.delta < 0 ? 'text-rose-700' : 'text-slate-600'}>
                        {rec.delta >= 0 ? '+' : ''}{formatNum(rec.delta, 2)} ({rec.deltaPercent >= 0 ? '+' : ''}{formatNum(rec.deltaPercent, 1)}%)
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">±{formatNum(rec.mdc95, 2)}</td>
                    <td className="p-3 font-sans">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          rec.resultType === 'true_improvement'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.resultType === 'true_decline'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {rec.resultType === 'true_improvement' ? '真实改善' : rec.resultType === 'true_decline' ? '真实下降' : '测量噪声内'}
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-500 truncate max-w-[150px]">
                      {rec.referenceName}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteRecord(rec.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50"
                        title="删除记录"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Input Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                批量导入运动员测试数据 (Batch CSV Evaluation)
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                输入格式：<code>athlete_id, athlete_name, baseline, current, date</code>
              </p>
              <textarea
                value={batchCSV}
                onChange={e => setBatchCSV(e.target.value)}
                rows={8}
                className="w-full border border-slate-200 rounded-2xl p-3.5 font-mono text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="text-[11px] text-slate-500">
                将统一应用当前选定的 Reference: <strong>{selectedRef?.name}</strong> (MDC95 = ±{formatNum(selectedRef?.mdc95, 2)} {selectedRef?.unit})
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                取消
              </button>
              <button
                onClick={handleBatchProcess}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20"
              >
                开始批量计算并添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
