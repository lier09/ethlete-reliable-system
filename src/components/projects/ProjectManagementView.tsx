import React, { useState } from 'react';
import { Project } from '../../types';
import {
  FolderKanban,
  Plus,
  Trash2,
  Copy,
  FlaskConical
} from 'lucide-react';

interface Props {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (id: string) => void;
  onSaveProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onNavigateToLab: () => void;
}

export const ProjectManagementView: React.FC<Props> = ({
  projects,
  activeProject,
  onSelectProject,
  onSaveProject,
  onDeleteProject,
  onNavigateToLab
}) => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [sport, setSport] = useState<string>('Rugby League (英式橄榄球)');
  const [testName, setTestName] = useState<string>('Countermovement Jump (CMJ)');
  const [device, setDevice] = useState<string>('ForceDecks FD4000 测力板');
  const [protocol, setProtocol] = useState<string>('双手叉腰双腿下蹲跳，下蹲深度自选');
  const [testInterval, setTestInterval] = useState<string>('7 天');
  const [cohortDescription, setCohortDescription] = useState<string>('U18 青训男子运动员 (N=20)');

  const handleCreateNew = () => {
    if (!name.trim()) return;
    const newProj: Project = {
      id: `PROJ-${Date.now().toString().slice(-4)}`,
      name,
      sport,
      testName,
      device,
      protocol,
      testInterval,
      cohortDescription,
      sessionCount: 2,
      trialCount: 2,
      aggregationMethod: 'mean',
      notes: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSaveProject(newProj);
    onSelectProject(newProj.id);
    setShowCreateModal(false);
    onNavigateToLab();
  };

  const handleDuplicate = (p: Project) => {
    const duplicated: Project = {
      ...p,
      id: `PROJ-${Date.now().toString().slice(-4)}`,
      name: `${p.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSaveProject(duplicated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            测试项目管理 (Project Management)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            管理不同运动专项、测试设备与受试人群的重测信度研究项目。
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          创建新测试项目
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(proj => {
          const isActive = activeProject?.id === proj.id;
          return (
            <div
              key={proj.id}
              className={`bg-white rounded-3xl border transition p-6 shadow-xs flex flex-col justify-between ${
                isActive
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    {proj.id}
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      proj.status === 'reference_built'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proj.status === 'analyzed'
                        ? 'bg-sky-100 text-sky-800'
                        : proj.status === 'data_imported'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {proj.status === 'reference_built'
                      ? '已建立 Reference'
                      : proj.status === 'analyzed'
                      ? '已完成统计分析'
                      : proj.status === 'data_imported'
                      ? '已导入数据'
                      : '草稿'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mb-3">
                  {proj.name}
                </h4>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">运动专项：</span>
                    <span className="font-bold text-slate-800">{proj.sport}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">测试动作：</span>
                    <span className="font-bold text-slate-800">{proj.testName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">测试仪器：</span>
                    <span className="font-medium text-slate-800 truncate max-w-[140px]">{proj.device}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">受试群体：</span>
                    <span className="font-bold text-blue-700 font-mono">
                      {proj.rawDataset && proj.rawDataset.length > 0
                        ? `n = ${new Set(proj.rawDataset.map(r => r.participant_id)).size} 人`
                        : '暂无数据'}
                    </span>
                  </div>
                  {proj.rawDataset && proj.rawDataset.length > 0 && (
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 font-mono">
                      <span>结构: {proj.sessionCount || 2}S × {proj.trialCount || 2}T</span>
                      <span>Obs: {proj.rawDataset.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDuplicate(proj)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition hover:bg-slate-100"
                    title="复制副本"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition hover:bg-rose-50"
                      title="删除项目"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => onSelectProject(proj.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                    >
                      设为当前
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onSelectProject(proj.id);
                      onNavigateToLab();
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    进入实验室
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">创建新可靠性测试项目</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">项目名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：职业足球队 10m/30m 冲刺重测可靠性研究"
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">体育专项</label>
                  <input
                    type="text"
                    value={sport}
                    onChange={e => setSport(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">测试动作</label>
                  <input
                    type="text"
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">测试仪器 / 设备</label>
                <input
                  type="text"
                  value={device}
                  onChange={e => setDevice(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">受试群体描述</label>
                <input
                  type="text"
                  value={cohortDescription}
                  onChange={e => setCohortDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                取消
              </button>
              <button
                onClick={handleCreateNew}
                disabled={!name.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20"
              >
                创建并进入实验室
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
