import React, { useState, useEffect } from 'react';
import {
  Project,
  ReliabilityReference,
  AthleteMonitoringRecord,
  SystemSettings,
  AppPortal,
  NavTab
} from './types';
import {
  loadProjects,
  saveProjects,
  loadReferences,
  saveReferences,
  loadMonitoringRecords,
  saveMonitoringRecords,
  loadSettings,
  saveSettings,
  loadActiveProjectId,
  saveActiveProjectId,
  resetToDefaultSeeds
} from './utils/storage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HelpModal } from './components/layout/HelpModal';
import { ClientPortal } from './components/client/ClientPortal';
import { OverviewView } from './components/overview/OverviewView';
import { ReliabilityLabView } from './components/lab/ReliabilityLabView';
import { AthleteMonitorView } from './components/monitor/AthleteMonitorView';
import { ReferenceLibraryView } from './components/references/ReferenceLibraryView';
import { ProjectManagementView } from './components/projects/ProjectManagementView';
import { AutomatedTestingView } from './components/testing/AutomatedTestingView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  // Dual Portal Mode: 'client' (User/Coach/Athlete Field Hub) vs 'console' (Scientist/Admin Workspace)
  const [portalMode, setPortalMode] = useState<AppPortal>(() => {
    const saved = localStorage.getItem('str_portal_mode');
    return (saved as AppPortal) || 'console';
  });

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Save portalMode to localStorage
  useEffect(() => {
    localStorage.setItem('str_portal_mode', portalMode);
  }, [portalMode]);

  // Core Data States
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => loadActiveProjectId());
  const [references, setReferences] = useState<ReliabilityReference[]>(() => loadReferences());
  const [monitoringRecords, setMonitoringRecords] = useState<AthleteMonitoringRecord[]>(() =>
    loadMonitoringRecords()
  );
  const [settings, setSettings] = useState<SystemSettings>(() => loadSettings());

  // Save side effects
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    saveReferences(references);
  }, [references]);

  useEffect(() => {
    saveMonitoringRecords(monitoringRecords);
  }, [monitoringRecords]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Derived active project
  const activeProject =
    projects.find(p => p.id === activeProjectId) || projects[0] || null;

  // Handlers
  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
  };

  const handleSaveProject = (updated: Project) => {
    setProjects(prev => {
      const exists = prev.some(p => p.id === updated.id);
      if (exists) {
        return prev.map(p => (p.id === updated.id ? updated : p));
      } else {
        return [updated, ...prev];
      }
    });
    setActiveProjectId(updated.id);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activeProjectId === id && filtered.length > 0) {
        setActiveProjectId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleSaveReference = (newRef: ReliabilityReference) => {
    setReferences(prev => {
      const exists = prev.some(r => r.id === newRef.id);
      if (exists) {
        return prev.map(r => (r.id === newRef.id ? newRef : r));
      } else {
        return [newRef, ...prev];
      }
    });
  };

  const handleSaveMonitoringRecord = (rec: AthleteMonitoringRecord) => {
    setMonitoringRecords(prev => [rec, ...prev]);
  };

  const handleDeleteMonitoringRecord = (id: string) => {
    setMonitoringRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleResetDefaults = () => {
    if (window.confirm('确定要重置并重新加载所有标准示范数据吗？')) {
      const { projects: p, references: r, settings: s, activeProjectId: ap } = resetToDefaultSeeds();
      setProjects(p);
      setReferences(r);
      setSettings(s);
      setActiveProjectId(ap);
      setMonitoringRecords([]);
      setActiveTab('overview');
    }
  };

  const handleCreateNewProject = () => {
    setActiveTab('projects');
  };

  return (
    <>
      {portalMode === 'client' ? (
        <ClientPortal
          references={references}
          monitoringRecords={monitoringRecords}
          onSaveMonitoringRecord={handleSaveMonitoringRecord}
          onDeleteMonitoringRecord={handleDeleteMonitoringRecord}
          onSwitchPortal={setPortalMode}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      ) : (
        <div className="app-canvas flex h-screen w-screen overflow-hidden font-sans text-slate-900 antialiased">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenHelp={() => setIsHelpOpen(true)}
            onSwitchPortal={() => setPortalMode('client')}
            activeReferencesCount={references.filter(r => r.status === 'active').length}
          />

          {/* Main Container */}
          <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
            {/* Header */}
            <Header
              projects={projects}
              activeProject={activeProject}
              onSelectProject={handleSelectProject}
              onCreateNewProject={handleCreateNewProject}
              onLoadDemoData={() => {
                setActiveTab('lab');
              }}
              onResetDefaults={handleResetDefaults}
              onSwitchPortal={() => setPortalMode('client')}
            />

            <nav
              aria-label="移动端科研控制台导航"
              className="lg:hidden shrink-0 overflow-x-auto border-b border-blue-100 bg-white/92 px-3 py-2 backdrop-blur-xl"
            >
              <div className="flex min-w-max items-center gap-1.5">
                {([
                  ['overview', '总览'],
                  ['lab', '可靠性实验室'],
                  ['monitor', '运动员监控'],
                  ['references', '基准库'],
                  ['projects', '项目'],
                  ['testing', '自动化校验'],
                  ['settings', '设置']
                ] as Array<[NavTab, string]>).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Dynamic Page Content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {activeTab === 'overview' && (
                <OverviewView
                  projects={projects}
                  references={references}
                  monitorRecords={monitoringRecords}
                  onNavigate={setActiveTab}
                  onOpenHelp={() => setIsHelpOpen(true)}
                />
              )}

              {activeTab === 'lab' && activeProject && (
                <ReliabilityLabView
                  project={activeProject}
                  settings={settings}
                  onSaveProject={handleSaveProject}
                  onSaveReference={handleSaveReference}
                  onNavigateToMonitor={() => setActiveTab('monitor')}
                />
              )}

              {activeTab === 'monitor' && (
                <AthleteMonitorView
                  references={references}
                  monitoringRecords={monitoringRecords}
                  onSaveRecord={handleSaveMonitoringRecord}
                  onDeleteRecord={handleDeleteMonitoringRecord}
                  onNavigateToLab={() => setActiveTab('lab')}
                />
              )}

              {activeTab === 'references' && (
                <ReferenceLibraryView
                  references={references}
                  onUpdateReference={handleSaveReference}
                  onNavigateToLab={() => setActiveTab('lab')}
                  onNavigateToMonitor={() => setActiveTab('monitor')}
                />
              )}

              {activeTab === 'projects' && (
                <ProjectManagementView
                  projects={projects}
                  activeProject={activeProject}
                  onSelectProject={handleSelectProject}
                  onSaveProject={handleSaveProject}
                  onDeleteProject={handleDeleteProject}
                  onNavigateToLab={() => setActiveTab('lab')}
                />
              )}

              {activeTab === 'testing' && <AutomatedTestingView />}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onSaveSettings={setSettings}
                  onOpenHelp={() => setIsHelpOpen(true)}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Scientific Methodology Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
