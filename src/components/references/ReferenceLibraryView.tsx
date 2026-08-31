import React, { useState } from 'react';
import { ReliabilityReference } from '../../types';
import { formatNum } from '../../utils/statistics';
import {
  Library,
  Search,
  Filter,
  Activity,
  FileJson,
  Plus,
  AlertTriangle
} from 'lucide-react';

interface Props {
  references: ReliabilityReference[];
  onUpdateReference: (ref: ReliabilityReference) => void;
  onNavigateToLab: () => void;
  onNavigateToMonitor: () => void;
}

export const ReferenceLibraryView: React.FC<Props> = ({
  references,
  onUpdateReference,
  onNavigateToLab,
  onNavigateToMonitor
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [selectedRef, setSelectedRef] = useState<ReliabilityReference | null>(
    references[0] || null
  );

  const sports = Array.from(new Set(references.map(r => r.sport)));

  const filtered = references.filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.metricName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSport = sportFilter === 'all' || r.sport === sportFilter;
    return matchSearch && matchSport;
  });

  const toggleArchive = (ref: ReliabilityReference) => {
    const updated: ReliabilityReference = {
      ...ref,
      status: ref.status === 'active' ? 'archived' : 'active',
      updatedAt: new Date().toISOString()
    };
    onUpdateReference(updated);
    if (selectedRef?.id === ref.id) {
      setSelectedRef(updated);
    }
  };

  const exportJSON = (ref: ReliabilityReference) => {
    const blob = new Blob([JSON.stringify(ref, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ref.id}_reliability_reference.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Library className="w-5 h-5 text-blue-600" />
            Reliability Reference 基准资料库 (Reference Library)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            固化特定人群、设备、协议与试次聚合下的信度参数与 MDC95 阈值，供运动员监控模块调用。
          </p>
        </div>

        <button
          onClick={onNavigateToLab}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          前往实验室建立新 Reference
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索基准名称、指标、测试设备或编号..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600 font-bold">运动专项:</span>
          <select
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-semibold"
          >
            <option value="all">全部专项 ({references.length})</option>
            {sports.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Reference Cards + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cards List */}
        <div className="lg:col-span-7 space-y-3.5">
          {filtered.map(ref => {
            const isSelected = selectedRef?.id === ref.id;
            const isArchived = ref.status === 'archived';
            return (
              <div
                key={ref.id}
                onClick={() => setSelectedRef(ref)}
                className={`p-5 rounded-2xl border transition cursor-pointer relative shadow-xs ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                    : isArchived
                    ? 'border-slate-200 bg-slate-50/60 opacity-60'
                    : 'border-slate-200/90 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {ref.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{ref.name}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      {ref.sport} · {ref.testName} · 设备: {ref.device} · 样本量 n={ref.sampleSize}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isArchived
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isArchived ? '已归档' : '生效中 (Active)'}
                  </span>
                </div>

                {/* Statistical Snapshot Badges */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 font-mono text-xs">
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block font-sans">ICC(A,1)</span>
                    <strong className="text-slate-900">{formatNum(ref.iccA1, 2)}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block font-sans">变异系数 CV%</span>
                    <strong className="text-slate-900">{formatNum(ref.cv, 1)}%</strong>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block font-sans font-bold">MDC95 阈值</span>
                    <strong className="text-emerald-950">±{formatNum(ref.mdc95, 2)} {ref.unit}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Full Reference Spec Sheet */}
        <div className="lg:col-span-5">
          {selectedRef ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">REFERENCE SPECIFICATION SHEET</div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedRef.name}</h4>
                </div>
                <button
                  onClick={() => toggleArchive(selectedRef)}
                  className={`text-xs px-3 py-1.5 rounded-xl transition font-bold border ${
                    selectedRef.status === 'active'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                  }`}
                >
                  {selectedRef.status === 'active' ? '归档基准' : '恢复激活'}
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Core Parameters Table */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">基准 ID：</span>
                    <span className="font-bold text-slate-900">{selectedRef.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">指标名称与单位：</span>
                    <span className="font-bold text-slate-900">{selectedRef.metricName} ({selectedRef.unit})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">指标方向：</span>
                    <span className="font-bold text-slate-900">
                      {selectedRef.direction === 'higher_is_better' ? '越高越好 (Higher is better)' : '越低越好 (Lower is better)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">体育专项：</span>
                    <span className="text-slate-800 font-sans">{selectedRef.sport}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">测试仪器：</span>
                    <span className="text-slate-800 font-sans">{selectedRef.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">测试动作协议：</span>
                    <span className="text-slate-800 font-sans text-right max-w-[200px] truncate">{selectedRef.protocol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">标定样本量：</span>
                    <span className="text-slate-800">n = {selectedRef.sampleSize} 人</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">重测时间间隔：</span>
                    <span className="text-slate-800 font-sans">{selectedRef.sessionInterval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">试次聚合方式：</span>
                    <span className="text-slate-800 font-bold uppercase">{selectedRef.trialAggregation}</span>
                  </div>
                </div>

                {/* Statistical Details */}
                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-sans">两因素绝对信度 ICC(A,1)</div>
                    <div className="font-bold text-slate-900 text-sm">{formatNum(selectedRef.iccA1, 3)}</div>
                    <div className="text-[9px] text-slate-400 font-sans">95%CI: [{formatNum(selectedRef.iccA1CI[0], 2)} - {formatNum(selectedRef.iccA1CI[1], 2)}]</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-sans">个体变异系数 CV%</div>
                    <div className="font-bold text-slate-900 text-sm">{formatNum(selectedRef.cv, 1)}%</div>
                    <div className="text-[9px] text-slate-400 font-sans">95%CI: [{formatNum(selectedRef.cvCI[0], 1)}% - {formatNum(selectedRef.cvCI[1], 1)}%]</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-sans">测量标准误 SEM</div>
                    <div className="font-bold text-slate-900 text-sm">{formatNum(selectedRef.sem, 2)} {selectedRef.unit}</div>
                    <div className="text-[9px] text-slate-400 font-sans">{selectedRef.semMethod || 'pooled_sd_sqrt_1_minus_icc'}</div>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 font-sans font-bold">最小可检测变化 MDC95</div>
                    <div className="font-bold text-emerald-950 text-sm">±{formatNum(selectedRef.mdc95, 2)} {selectedRef.unit}</div>
                    <div className="text-[9px] text-emerald-700 font-sans">占均值 {formatNum(selectedRef.mdcPercent, 1)}% (2.77×SEM)</div>
                  </div>

                  {selectedRef.typicalError !== undefined && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-500 font-sans">典型误差 TE (SDdiff/√2)</div>
                      <div className="font-bold text-slate-900 text-sm">{formatNum(selectedRef.typicalError, 2)} {selectedRef.unit}</div>
                    </div>
                  )}

                  {selectedRef.meanBias !== undefined && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-500 font-sans">重测系统偏差 Mean Bias</div>
                      <div className="font-bold text-slate-900 text-sm">
                        {selectedRef.meanBias >= 0 ? '+' : ''}{formatNum(selectedRef.meanBias, 2)} {selectedRef.unit}
                      </div>
                      {selectedRef.biasPercent !== undefined && (
                        <div className="text-[9px] text-slate-500 font-sans">
                          占均值 {formatNum(selectedRef.biasPercent, 2)}%
                          {selectedRef.biasToMdcRatio !== undefined ? ` · Bias/MDC95: ${formatNum(selectedRef.biasToMdcRatio, 2)}` : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedRef.cautionWarning && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>使用警示 (Caution)：</strong>
                      <span className="ml-1">{selectedRef.cautionWarning}</span>
                    </div>
                  </div>
                )}

                {selectedRef.loaLower !== undefined && selectedRef.loaUpper !== undefined && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs font-mono">
                    <span className="text-[10px] text-slate-500 font-sans block">Bland-Altman 95% 一致性界限 (LoA)</span>
                    <span className="font-bold text-slate-800">[{formatNum(selectedRef.loaLower, 2)} ~ {formatNum(selectedRef.loaUpper, 2)} {selectedRef.unit}]</span>
                  </div>
                )}

                {/* Versioning & Threshold Snapshot Box */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between font-sans text-slate-500 font-bold border-b border-slate-200/60 pb-1">
                    <span>方法学与决策规则版本 (Methodology Versioning)</span>
                    <span className="text-blue-700">{selectedRef.ruleVersion || 'Ruleset v1.1'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-slate-700 pt-0.5">
                    <div>分析方法版本: {selectedRef.analysisMethodVersion || 'v1.0'}</div>
                    <div>决策规则版本: {selectedRef.decisionRuleVersion || 'v1.1'}</div>
                  </div>
                  {selectedRef.thresholdConfigSnapshot && (
                    <div className="pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-600 font-sans">
                      <span className="font-bold block text-slate-700 mb-0.5">固化时阈值快照 (Threshold Snapshot):</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[10px]">
                        <span>ICC 要求: ≥{selectedRef.thresholdConfigSnapshot.iccRecommendedCutoff} (下限 ≥{selectedRef.thresholdConfigSnapshot.iccLowerBoundCutoff})</span>
                        <span>CV 要求: ≤{selectedRef.thresholdConfigSnapshot.cvRecommendedCutoff}% (上限 ≤{selectedRef.thresholdConfigSnapshot.cvUpperBoundCutoff}%)</span>
                        <span>MDC% 阈值: ≤{selectedRef.thresholdConfigSnapshot.mdcPercentCutoff}%</span>
                        <span>Bias% 阈值: ≤{selectedRef.thresholdConfigSnapshot.biasPercentPass || 2}%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600">
                  <strong>适用性审查依据：</strong>
                  <p className="mt-0.5">{selectedRef.suitabilityRationale}</p>
                </div>

                {/* Scientific Disclaimer */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-[11px] text-emerald-950 leading-relaxed">
                  <strong>⚖️ 科学范畴界定：</strong>
                  “推荐用于纵向监控”仅代表该指标在当前测试条件下具有较好的测量可靠性和真实变化检测能力，不等同于证明其具有疲劳、训练适应或专项表现诊断效度。
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => exportJSON(selectedRef)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  导出 JSON
                </button>

                <button
                  onClick={onNavigateToMonitor}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  在监控中使用此基准
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-slate-400">
              请从左侧选择 Reference 查看完整规格说明
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
