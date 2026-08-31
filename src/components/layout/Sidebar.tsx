import React from 'react';
import { NavTab, AppPortal } from '../../types';

export type { NavTab };
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  Library,
  FolderKanban,
  Settings,
  HelpCircle,
  CheckCheck,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenHelp: () => void;
  onSwitchPortal?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenHelp,
  onSwitchPortal
}) => {
  const navItems = [
    {
      id: 'overview',
      name: '系统总览',
      nameEn: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'lab',
      name: '可靠性实验室',
      nameEn: 'Reliability Lab',
      icon: FlaskConical,
      badge: '模块 A',
      badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
    },
    {
      id: 'monitor',
      name: '运动员真实变化监控',
      nameEn: 'Athlete Monitor',
      icon: Activity,
      badge: '模块 B',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
    },
    {
      id: 'references',
      name: 'Reference 基准库',
      nameEn: 'Standard Library',
      icon: Library,
      badge: '已固化',
      badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700'
    },
    {
      id: 'projects',
      name: '项目与数据管理',
      nameEn: 'Project Management',
      icon: FolderKanban,
      badge: null
    },
    {
      id: 'tests',
      name: '自动化测试与校验',
      nameEn: 'Automated Tests',
      icon: CheckCheck,
      badge: '18项全通',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
    },
    {
      id: 'settings',
      name: '规则与系统设置',
      nameEn: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand & Title Header */}
      <div className="p-5 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-sm">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-tight flex items-center gap-1.5">
              <span>APEX RELIABILITY</span>
            </div>
            <div className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">
              Sports Science Suite v2.6
            </div>
          </div>
        </div>

        {onSwitchPortal && (
          <button
            onClick={onSwitchPortal}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold transition group"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              切换至现场教练端
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Main Navigation with Categories */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {/* Core Modules Category */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-slate-500 text-[10px] uppercase font-semibold tracking-wider font-mono">
            科研与监控引擎 Core
          </div>
          <div className="space-y-0.5 pt-1">
            {navItems.slice(0, 3).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ml-1 ${
                        isActive ? 'bg-white/20 text-white' : item.badgeClass
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Database & Management Category */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-slate-500 text-[10px] uppercase font-semibold tracking-wider font-mono">
            资料库与管理 Hub
          </div>
          <div className="space-y-0.5 pt-1">
            {navItems.slice(3).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ml-1 ${
                        isActive ? 'bg-white/20 text-white' : item.badgeClass
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Profile & Method Info */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={onOpenHelp}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition border border-slate-800"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>方法学白皮书</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
            Shaw 2026
          </span>
        </button>

        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="w-7 h-7 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 font-mono">
            SS
          </div>
          <div className="text-xs">
            <div className="text-white font-semibold leading-tight">Lead Scientist</div>
            <div className="text-slate-400 text-[10px]">Biomechanics & Performance</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
