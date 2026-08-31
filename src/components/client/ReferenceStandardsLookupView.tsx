import React, { useState, useMemo } from 'react';
import { ReliabilityReference } from '../../types';
import { formatNum } from '../../utils/statistics';
import {
  BookOpen,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Sliders,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

interface Props {
  references: ReliabilityReference[];
  onSelectReferenceForEval: (refId: string) => void;
  onNavigateToConsoleLab: () => void;
}

export const ReferenceStandardsLookupView: React.FC<Props> = ({
  references,
  onSelectReferenceForEval,
  onNavigateToConsoleLab
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const sportsList = useMemo(() => {
    const s = new Set<string>();
    references.forEach(r => s.add(r.sport));
    return Array.from(s);
  }, [references]);

  const filtered = useMemo(() => {
    return references.filter(r => {
      const matchSearch =
        r.metricName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.device.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSport = selectedSport === 'all' || r.sport === selectedSport;
      return matchSearch && matchSport;
    });
  }, [references, searchTerm, selectedSport]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                已认证测试动作与误差基准库 (Performance Reference Standards)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                教练员可在此查询不同运动专项各指标的科学信度、最小可检测变化 (MDC₉₅) 及标准化测试规范。
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToConsoleLab}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          进入控制端标定新基准
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索动作名称、指标、测试设备或运动项目..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">运动专项:</span>
          <select
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
          >
            <option value="all">全部运动项目 ({references.length})</option>
            {sportsList.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Standards Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(ref => {
          return (
            <div
              key={ref.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-300 transition group"
            >
              <div className="space-y-4">
                {/* Header tag */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {ref.sport} · {ref.testName}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug group-hover:text-blue-600 transition-colors">
                      {ref.metricName}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      ref.suitabilityTier === 'tier_1_recommended'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {ref.suitabilityTier === 'tier_1_recommended' ? 'Tier 1 黄金标准' : 'Tier 2 谨慎监控'}
                  </span>
                </div>

                {/* Key Metric Highlights */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">MDC₉₅ 最小真实变化</div>
                    <div className="text-lg font-black font-mono text-blue-700 mt-0.5">
                      ±{formatNum(ref.mdc95, 2)}{' '}
                      <span className="text-xs font-normal text-slate-500 font-sans">{ref.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">占均值 {formatNum(ref.mdcPercent, 1)}%</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">信度 ICC / 变异度</div>
                    <div className="text-lg font-black font-mono text-slate-800 mt-0.5">
                      {formatNum(ref.iccA1, 2)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-mono font-bold">CV = {formatNum(ref.cv, 1)}%</div>
                  </div>
                </div>

                {/* Protocol Info */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">测量仪器设备:</span>
                    <span className="font-medium text-slate-800">{ref.device}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">标定受试样本:</span>
                    <span className="font-mono text-slate-800 font-bold">N = {ref.sampleSize} 人</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">试次聚合方式:</span>
                    <span className="text-slate-700 font-medium">{ref.trialAggregation.toUpperCase()}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed mt-2">
                    <strong>测试规范：</strong> {ref.protocol || '标准双测验协议，间隔48小时。'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-3 border-t border-slate-100">
                <button
                  onClick={() => onSelectReferenceForEval(ref.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  立即使用此基准评估运动员
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
