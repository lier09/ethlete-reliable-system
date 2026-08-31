import React from 'react';
import { Project } from '../../types';
import { Database, Plus, Sparkles, ArrowRight, Activity, ShieldCheck } from 'lucide-react';

interface Props {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (id: string) => void;
  onCreateNewProject: () => void;
  onLoadDemoData: () => void;
  onResetDefaults: () => void;
  onSwitchPortal?: () => void;
}

export const Header: React.FC<Props> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateNewProject,
  onLoadDemoData,
  onSwitchPortal
}) => {
  const getParticipantCount = (p: Project | null | undefined): number => {
    if (!p?.rawDataset || p.rawDataset.length === 0) return 0;
    return new Set(p.rawDataset.map(r => r.participant_id)).size;
  };

  const getStatusBadge = (status?: Project['status']) => {
    switch (status) {
      case 'reference_built':
        return { label: 'Reference 基准已固化', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'analyzed':
        return { label: '信度分析已完成', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'data_imported':
        return { label: '数据集就绪', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: '草稿项目', class: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  const badge = getStatusBadge(activeProject?.status);
  const activeParticipantN = getParticipantCount(activeProject);
  const rawObsCount = activeProject?.rawDataset?.length || 0;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 sticky top-0">
      {/* Left: Project Selector & Rigorous Participant Metadata */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <select
            value={activeProject?.id || ''}
            onChange={e => onSelectProject(e.target.value)}
            className="text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer max-w-[220px] sm:max-w-xs truncate transition"
          >
            {projects.map(p => {
              const n = getParticipantCount(p);
              return (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sport} · n={n})
                </option>
              );
            })}
          </select>
        </div>

        {activeProject && (
          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Rigorous Independent Participants Display */}
            <div
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium flex items-center gap-1.5"
              title={`独立受试者数量: n = ${activeParticipantN} | 测试轮次 Sessions: ${activeProject.sessionCount || 2} | 每轮试次 Trials: ${activeProject.trialCount || 2} | 原始观测行数: ${rawObsCount}`}
            >
              <span className="font-sans text-[11px] text-slate-500">受试者:</span>
              <strong className="text-slate-900 font-bold">n = {activeParticipantN}</strong>
            </div>

            {/* Observation Breakdown Chips */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 font-sans">
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                Sessions: <strong>{activeProject.sessionCount || 2}</strong>
              </span>
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                Trials: <strong>{activeProject.trialCount || 2}</strong>
              </span>
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-600">
                Obs: <strong>{rawObsCount}</strong>
              </span>
            </div>

            <div className={`hidden md:inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border items-center gap-1.5 ${badge.class}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{badge.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Quick actions & user */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onSwitchPortal && (
          <button
            onClick={onSwitchPortal}
            className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 px-3 py-1.5 rounded-lg transition font-semibold"
            title="切换到教练与运动员实战操作端"
          >
            <span>教练实战端</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          </button>
        )}

        <button
          onClick={onLoadDemoData}
          className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition font-medium"
          title="载入 Shaw et al. (2026) 青年橄榄球 CMJ 20人重测标准示范数据"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">载入</span> CMJ 示范数据
        </button>

        <button
          onClick={onCreateNewProject}
          className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition font-semibold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          新建项目
        </button>
      </div>
    </header>
  );
};
