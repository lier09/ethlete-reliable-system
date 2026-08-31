import React, { useState, useMemo } from 'react';
import {
  AthleteMonitoringRecord,
  ReliabilityReference,
  TrueChangeResultType
} from '../../types';
import { formatNum } from '../../utils/statistics';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Trash2,
  Share2,
  Calendar,
  Zap,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { AthleteReportCardModal } from './AthleteReportCardModal';

interface Props {
  monitoringRecords: AthleteMonitoringRecord[];
  references: ReliabilityReference[];
  onDeleteRecord: (id: string) => void;
  onNavigateToQuickEval: () => void;
  onNavigateToStandards: () => void;
}

export const TeamRosterMonitorView: React.FC<Props> = ({
  monitoringRecords,
  references,
  onDeleteRecord,
  onNavigateToQuickEval,
  onNavigateToStandards
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | TrueChangeResultType>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [selectedRecordForCard, setSelectedRecordForCard] = useState<AthleteMonitoringRecord | null>(null);

  // Metrics list
  const metricsList = useMemo(() => {
    const set = new Set<string>();
    monitoringRecords.forEach(r => set.add(r.metricName));
    return Array.from(set);
  }, [monitoringRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return monitoringRecords.filter(r => {
      const matchSearch =
        r.athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.athleteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referenceName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.resultType === statusFilter;
      const matchMetric = selectedMetric === 'all' || r.metricName === selectedMetric;
      return matchSearch && matchStatus && matchMetric;
    });
  }, [monitoringRecords, searchTerm, statusFilter, selectedMetric]);

  // Summary counts
  const stats = useMemo(() => {
    const total = monitoringRecords.length;
    const improvements = monitoringRecords.filter(r => r.resultType === 'true_improvement').length;
    const declines = monitoringRecords.filter(r => r.resultType === 'true_decline').length;
    const noise = monitoringRecords.filter(r => r.resultType === 'within_noise').length;
    const gainRate = total > 0 ? (improvements / total) * 100 : 0;
    const declineRate = total > 0 ? (declines / total) * 100 : 0;
    return { total, improvements, declines, noise, gainRate, declineRate };
  }, [monitoringRecords]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                队伍机能监控看板 (Team Performance Roster)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                基于科学 MDC₉₅ 误差阈值，集中管理全队运动员的纵向机能测试结论与状态红绿灯。
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToQuickEval}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            新增单人/批量测试
          </button>
        </div>
      </div>

      {/* Traffic Light Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Roster Tests */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            已评估测试总人次
          </div>
          <div className="text-3xl font-bold font-mono text-slate-800">
            {stats.total} <span className="text-sm font-normal text-slate-400 font-sans">人次</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            活跃动作基准: {references.filter(r => r.status === 'active').length} 项
          </div>
        </div>

        {/* True Improvement Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />突破测试误差提升</span>
            <span className="text-xs font-mono">{formatNum(stats.gainRate, 0)}%</span>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-700">
            {stats.improvements} <span className="text-sm font-normal text-emerald-600 font-sans">人</span>
          </div>
          <div className="text-[11px] text-emerald-600/90 font-medium mt-1">
            适应良好，突破最小可检测变化
          </div>
        </div>

        {/* Within Noise Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-slate-400">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5"><MinusCircle className="h-3.5 w-3.5" />正常测试波动 (在噪声内)</span>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-700">
            {stats.noise} <span className="text-sm font-normal text-slate-400 font-sans">人</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            属于测试仪器与生理随机波动
          </div>
        </div>

        {/* True Decline Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-rose-500">
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />真实超出误差下降</span>
            <span className="text-xs font-mono">{formatNum(stats.declineRate, 0)}%</span>
          </div>
          <div className="text-3xl font-bold font-mono text-rose-700">
            {stats.declines} <span className="text-sm font-normal text-rose-600 font-sans">人</span>
          </div>
          <div className="text-[11px] text-rose-600/90 font-medium mt-1">
            跌破误差下限，需结合负荷解释
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索运动员姓名、ID 或动作基准..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md transition ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部 ({monitoringRecords.length})
          </button>
          <button
            onClick={() => setStatusFilter('true_improvement')}
            className={`px-3 py-1 rounded-md transition ${
              statusFilter === 'true_improvement'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="mr-1 inline h-3 w-3" />突破提升 ({stats.improvements})
          </button>
          <button
            onClick={() => setStatusFilter('within_noise')}
            className={`px-3 py-1 rounded-md transition ${
              statusFilter === 'within_noise'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MinusCircle className="mr-1 inline h-3 w-3" />正常波动 ({stats.noise})
          </button>
          <button
            onClick={() => setStatusFilter('true_decline')}
            className={`px-3 py-1 rounded-md transition ${
              statusFilter === 'true_decline'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <AlertTriangle className="mr-1 inline h-3 w-3" />真实下降 ({stats.declines})
          </button>
        </div>

        {/* Metric Dropdown */}
        {metricsList.length > 0 && (
          <select
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
          >
            <option value="all">全部评估指标</option>
            {metricsList.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Athlete Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4">运动员信息</th>
                  <th className="py-3.5 px-4">评估指标与基准</th>
                  <th className="py-3.5 px-4 text-center">基线成绩 (Baseline)</th>
                  <th className="py-3.5 px-4 text-center">实测成绩 (Current)</th>
                  <th className="py-3.5 px-4 text-center">变化幅度 (Delta)</th>
                  <th className="py-3.5 px-4 text-center">MDC₉₅ 阈值</th>
                  <th className="py-3.5 px-4 text-center">判定结论</th>
                  <th className="py-3.5 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(rec => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Athlete info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                            {rec.athleteName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{rec.athleteName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {rec.athleteId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Metric info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{rec.metricName}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]" title={rec.referenceName}>
                          {rec.referenceName}
                        </div>
                      </td>

                      {/* Baseline */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-600">
                        {formatNum(rec.baselineValue, 2)} {rec.unit}
                      </td>

                      {/* Current */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                        {formatNum(rec.currentValue, 2)} {rec.unit}
                      </td>

                      {/* Delta */}
                      <td className="py-3.5 px-4 text-center">
                        <div
                          className={`font-mono font-bold ${
                            rec.resultType === 'true_improvement'
                              ? 'text-emerald-700'
                              : rec.resultType === 'true_decline'
                              ? 'text-rose-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {rec.delta >= 0 ? '+' : ''}
                          {formatNum(rec.delta, 2)} {rec.unit}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ({rec.deltaPercent >= 0 ? '+' : ''}
                          {formatNum(rec.deltaPercent, 1)}%)
                        </div>
                      </td>

                      {/* MDC95 */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        ±{formatNum(rec.mdc95, 2)} {rec.unit}
                      </td>

                      {/* Verdict Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            rec.resultType === 'true_improvement'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : rec.resultType === 'true_decline'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {rec.resultType === 'true_improvement' && <TrendingUp className="w-3 h-3" />}
                          {rec.resultType === 'true_decline' && <TrendingDown className="w-3 h-3" />}
                          {rec.resultType === 'within_noise' && <MinusCircle className="w-3 h-3" />}
                          {rec.resultLabel}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRecordForCard(rec)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="查看/分享反馈报告卡"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`确定删除运动员 ${rec.athleteName} 的此条测试记录吗？`)) {
                                onDeleteRecord(rec.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-semibold text-slate-600">暂无符合条件的运动员监控记录</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              可在上方的“快速判定仪”录入单人数据，或直接创建新的测试批次。
            </p>
            <button
              onClick={onNavigateToQuickEval}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              前往录入测试
            </button>
          </div>
        )}
      </div>

      {/* Shareable Card Modal */}
      {selectedRecordForCard && (
        <AthleteReportCardModal
          record={selectedRecordForCard}
          onClose={() => setSelectedRecordForCard(null)}
        />
      )}
    </div>
  );
};
