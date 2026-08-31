import React, { useState } from 'react';
import {
  ReliabilityReference,
  AthleteMonitoringRecord,
  ClientNavTab,
  AppPortal
} from '../../types';
import { QuickVerdictView } from './QuickVerdictView';
import { TeamRosterMonitorView } from './TeamRosterMonitorView';
import { ReferenceStandardsLookupView } from './ReferenceStandardsLookupView';
import {
  Zap,
  Users,
  BookOpen,
  Sliders,
  HelpCircle,
  Activity,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface Props {
  references: ReliabilityReference[];
  monitoringRecords: AthleteMonitoringRecord[];
  onSaveMonitoringRecord: (record: AthleteMonitoringRecord) => void;
  onDeleteMonitoringRecord: (id: string) => void;
  onSwitchPortal: (portal: AppPortal) => void;
  onOpenHelp: () => void;
}

export const ClientPortal: React.FC<Props> = ({
  references,
  monitoringRecords,
  onSaveMonitoringRecord,
  onDeleteMonitoringRecord,
  onSwitchPortal,
  onOpenHelp
}) => {
  const [activeClientTab, setActiveClientTab] = useState<ClientNavTab>('quick_eval');

  const handleSelectReferenceForEval = (refId: string) => {
    setActiveClientTab('quick_eval');
  };

  return (
    <div className="app-canvas min-h-screen flex flex-col text-slate-900">
      {/* Client Modern Athletic Header */}
      <header className="bg-white/90 text-slate-900 border-b border-blue-100 sticky top-0 z-40 shadow-[0_10px_30px_-28px_rgba(30,64,175,0.65)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Portal Tag */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-blue-200">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-950 leading-tight">
                    运动员真实变化判定终端
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    用户端 · 教练实战
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono hidden sm:block">
                  Sports Performance & True Change Field Hub
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveClientTab('quick_eval')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-semibold ${
                  activeClientTab === 'quick_eval'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-900 hover:bg-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                极速变化判定仪
              </button>

              <button
                onClick={() => setActiveClientTab('team_roster')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-semibold ${
                  activeClientTab === 'team_roster'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-900 hover:bg-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                队伍机能看板
                {monitoringRecords.length > 0 && (
                  <span className="ml-1 text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono">
                    {monitoringRecords.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveClientTab('standards_lookup')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-semibold ${
                  activeClientTab === 'standards_lookup'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-900 hover:bg-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                动作基准速查
              </button>
            </nav>

            {/* Right: Switch to Control Console & Help */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenHelp}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition border border-slate-200"
                title="查看使用手册与判定原理"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden lg:inline">判定指南</span>
              </button>

              {/* Portal Switcher Button */}
              <button
                onClick={() => onSwitchPortal('console')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs group"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-45 transition-transform" />
                <span>进入科研控制中台</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Sub-Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-blue-100 bg-white/92 py-2 px-3 text-xs">
          <button
            onClick={() => setActiveClientTab('quick_eval')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold ${
              activeClientTab === 'quick_eval' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <Zap className="w-3 h-3" />
            快速判定
          </button>
          <button
            onClick={() => setActiveClientTab('team_roster')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold ${
              activeClientTab === 'team_roster' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <Users className="w-3 h-3" />
            队伍看板
          </button>
          <button
            onClick={() => setActiveClientTab('standards_lookup')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold ${
              activeClientTab === 'standards_lookup' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            基准速查
          </button>
        </div>
      </header>

      {/* Client Main Body Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {activeClientTab === 'quick_eval' && (
          <QuickVerdictView
            references={references}
            onSaveRecord={onSaveMonitoringRecord}
            onNavigateToStandards={() => setActiveClientTab('standards_lookup')}
            onNavigateToConsoleLab={() => onSwitchPortal('console')}
          />
        )}

        {activeClientTab === 'team_roster' && (
          <TeamRosterMonitorView
            monitoringRecords={monitoringRecords}
            references={references}
            onDeleteRecord={onDeleteMonitoringRecord}
            onNavigateToQuickEval={() => setActiveClientTab('quick_eval')}
            onNavigateToStandards={() => setActiveClientTab('standards_lookup')}
          />
        )}

        {activeClientTab === 'standards_lookup' && (
          <ReferenceStandardsLookupView
            references={references}
            onSelectReferenceForEval={handleSelectReferenceForEval}
            onNavigateToConsoleLab={() => onSwitchPortal('console')}
          />
        )}
      </main>
    </div>
  );
};
