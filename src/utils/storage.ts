import {
  AthleteMonitoringRecord,
  AuditLogEntry,
  Project,
  ReliabilityReference,
  SystemSettings
} from '../types';
import {
  DEMO_METRIC_DEFINITIONS,
  generateRugbyCMJDataset,
  INITIAL_DEMO_PROJECT,
  INITIAL_DEMO_REFERENCES
} from './demoData';
import { DEFAULT_SETTINGS, evaluateSuitability } from './rulesEngine';
import { aggregateTrials } from './dataParser';
import { calculateReliability } from './statistics';

export const DEFAULT_SYSTEM_SETTINGS = DEFAULT_SETTINGS;

const STORAGE_KEYS = {
  PROJECTS: 'sports_reliability_projects_v1',
  ACTIVE_PROJECT_ID: 'sports_reliability_active_project_id_v1',
  REFERENCES: 'sports_reliability_references_v1',
  MONITOR_RECORDS: 'sports_reliability_monitor_records_v1',
  SETTINGS: 'sports_reliability_settings_v1',
  AUDIT_LOGS: 'sports_reliability_audit_logs_v1'
};

// Initialize default state in localStorage
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    const defaultProject = { ...INITIAL_DEMO_PROJECT };
    // Pre-calculate stats & evaluations for the demo project
    if (defaultProject.rawDataset && defaultProject.metricDefinitions) {
      const stats: Record<string, any> = {};
      const evals: Record<string, any> = {};
      for (const m of defaultProject.metricDefinitions) {
        const pairs = aggregateTrials(defaultProject.rawDataset, m.name, defaultProject.aggregationMethod);
        if (pairs.length >= 2) {
          const s = calculateReliability(pairs, m.id, m.name, m.unit, m.direction);
          stats[m.id] = s;
          evals[m.id] = evaluateSuitability(s, DEFAULT_SETTINGS);
        }
      }
      defaultProject.calculatedStats = stats;
      defaultProject.evaluations = evals;
    }

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([defaultProject]));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, defaultProject.id);
  }

  if (!localStorage.getItem(STORAGE_KEYS.REFERENCES)) {
    localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(INITIAL_DEMO_REFERENCES));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MONITOR_RECORDS)) {
    const initialRecords: AthleteMonitoringRecord[] = [
      {
        id: 'REC-2026-001',
        athleteId: 'ATH-RUGBY-101',
        athleteName: '王凯 (Kai Wang)',
        date: '2026-03-28',
        referenceId: 'REF-2026-CMJ-JH',
        referenceName: '青年橄榄球运动员 CMJ 跳跃高度可靠性参考',
        metricName: 'Jump Height',
        unit: 'cm',
        direction: 'higher_is_better',
        baselineValue: 38.0,
        currentValue: 41.5,
        delta: 3.5,
        deltaPercent: 9.21,
        mdc95: 2.11,
        upperThreshold: 40.11,
        lowerThreshold: 35.89,
        resultType: 'true_improvement',
        resultLabel: '可检测的真实升高 (True Improvement)',
        resultExplanation: '当前值 (41.5 cm) 高于可检测升高阈值 (40.11 cm)，变化量 (+3.5 cm) 显著超过预期测量误差 (MDC95 = 2.11 cm)。',
        createdAt: '2026-03-28T10:00:00.000Z'
      },
      {
        id: 'REC-2026-002',
        athleteId: 'ATH-RUGBY-102',
        athleteName: '张立 (Li Zhang)',
        date: '2026-03-28',
        referenceId: 'REF-2026-CMJ-JH',
        referenceName: '青年橄榄球运动员 CMJ 跳跃高度可靠性参考',
        metricName: 'Jump Height',
        unit: 'cm',
        direction: 'higher_is_better',
        baselineValue: 42.0,
        currentValue: 43.1,
        delta: 1.1,
        deltaPercent: 2.62,
        mdc95: 2.11,
        upperThreshold: 44.11,
        lowerThreshold: 39.89,
        resultType: 'within_noise',
        resultLabel: '处于预期测量误差范围 (Within Noise)',
        resultExplanation: '当前值 (43.1 cm) 处于 [39.89 cm ~ 44.11 cm] 误差带内，变化幅度 (+1.1 cm) 未达到 MDC95 (2.11 cm)，无法区分是真实机能提升还是正常测试波动。',
        createdAt: '2026-03-28T10:15:00.000Z'
      },
      {
        id: 'REC-2026-003',
        athleteId: 'ATH-RUGBY-103',
        athleteName: '赵雷 (Lei Zhao)',
        date: '2026-03-28',
        referenceId: 'REF-2026-SPRINT-10M',
        referenceName: '田径与足球运动员 10m 加速耗时可靠性参考',
        metricName: '10 m Sprint',
        unit: 's',
        direction: 'lower_is_better',
        baselineValue: 1.74,
        currentValue: 1.66,
        delta: -0.08,
        deltaPercent: -4.6,
        mdc95: 0.061,
        upperThreshold: 1.801,
        lowerThreshold: 1.679,
        resultType: 'true_improvement',
        resultLabel: '可检测的真实改善 (耗时显著缩短)',
        resultExplanation: '由于耗时越低越好，当前成绩 (1.66 s) 低于可检测降低阈值 (1.679 s)，提速幅度 (-0.08 s) 超过了测量误差 (MDC95 = 0.061 s)。',
        createdAt: '2026-03-28T11:00:00.000Z'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.MONITOR_RECORDS, JSON.stringify(initialRecords));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    const initialLogs: AuditLogEntry[] = [
      {
        id: 'LOG-001',
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_INIT',
        entityType: 'project',
        entityId: 'proj-demo-cmj-01',
        description: '系统初始化完成，预置青训梯队CMJ测试重测信度标定项目与Reference资料库。',
        user: 'System Admin'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialLogs));
  }
}

// Storage Operations with Version Chain & Provenance Tracking
export function loadProjects(): Project[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return raw ? JSON.parse(raw) : [INITIAL_DEMO_PROJECT];
  } catch {
    return [INITIAL_DEMO_PROJECT];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function getProjects(): Project[] {
  return loadProjects();
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.push({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveProjects(projects);
  addAuditLog('SAVE_PROJECT', 'project', project.id, `更新或创建项目: ${project.name}`);
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjects(projects);
  addAuditLog('DELETE_PROJECT', 'project', id, `删除项目 ID: ${id}`);
}

export function loadActiveProjectId(): string {
  initializeStorage();
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID) || INITIAL_DEMO_PROJECT.id;
}

export function saveActiveProjectId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
}

export function getActiveProjectId(): string {
  return loadActiveProjectId();
}

export function setActiveProjectId(id: string): void {
  saveActiveProjectId(id);
}

export function getActiveProject(): Project | null {
  const activeId = loadActiveProjectId();
  const projects = loadProjects();
  return projects.find(p => p.id === activeId) || projects[0] || null;
}

export function loadReferences(): ReliabilityReference[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFERENCES);
    return raw ? JSON.parse(raw) : INITIAL_DEMO_REFERENCES;
  } catch {
    return INITIAL_DEMO_REFERENCES;
  }
}

export function saveReferences(references: ReliabilityReference[]): void {
  localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(references));
}

export function getReferences(): ReliabilityReference[] {
  return loadReferences();
}

/**
 * Saves a Reliability Reference with automatic version chain tracking (v1, v2, v3).
 * If a reference with the same metricId & projectId already exists, creates a new version
 * and links previousVersionId.
 */
export function saveReference(ref: ReliabilityReference): ReliabilityReference {
  const refs = loadReferences();
  const existingSameMetric = refs.filter(r => r.metricId === ref.metricId && r.projectId === ref.projectId);

  let version = ref.version || 1;
  let previousVersionId = ref.previousVersionId;

  if (existingSameMetric.length > 0 && !refs.some(r => r.id === ref.id)) {
    const highestVersion = Math.max(...existingSameMetric.map(r => r.version || 1));
    version = highestVersion + 1;
    const latestExisting = existingSameMetric.sort((a, b) => (b.version || 1) - (a.version || 1))[0];
    previousVersionId = latestExisting.id;
    // Mark previous versions as archived/superseded if active
    if (latestExisting.status === 'active') {
      latestExisting.status = 'deprecated';
      latestExisting.updatedAt = new Date().toISOString();
    }
  }

  const versionTag = ref.versionTag || `v${version}.0`;

  const updatedRef: ReliabilityReference = {
    ...ref,
    version,
    versionTag,
    previousVersionId,
    createdAt: ref.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const idx = refs.findIndex(r => r.id === ref.id);
  if (idx >= 0) {
    refs[idx] = updatedRef;
  } else {
    refs.unshift(updatedRef);
  }

  saveReferences(refs);
  addAuditLog(
    'SAVE_REFERENCE',
    'reference',
    updatedRef.id,
    `固化并建立 Reliability Reference (${versionTag}): ${updatedRef.name} [MDC95 = ±${updatedRef.mdc95} ${updatedRef.unit}]`
  );
  return updatedRef;
}

export function deprecateReference(id: string): void {
  const refs = loadReferences();
  const target = refs.find(r => r.id === id);
  if (target) {
    target.status = 'deprecated';
    target.updatedAt = new Date().toISOString();
    saveReferences(refs);
    addAuditLog('DEPRECATE_REFERENCE', 'reference', id, `停用 Reliability Reference: ${target.name} (${target.versionTag || 'v1.0'})`);
  }
}

export function loadMonitoringRecords(): AthleteMonitoringRecord[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MONITOR_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMonitoringRecords(records: AthleteMonitoringRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.MONITOR_RECORDS, JSON.stringify(records));
}

export function getMonitoringRecords(): AthleteMonitoringRecord[] {
  return loadMonitoringRecords();
}

export function saveMonitoringRecord(record: AthleteMonitoringRecord): void {
  const records = loadMonitoringRecords();
  records.unshift(record);
  saveMonitoringRecords(records);
  addAuditLog('SAVE_ATHLETE_RECORD', 'athlete_record', record.id, `记录运动员 ${record.athleteName} 真实变化判定: ${record.resultLabel}`);
}

export function deleteMonitoringRecord(id: string): void {
  const records = loadMonitoringRecords().filter(r => r.id !== id);
  saveMonitoringRecords(records);
}

export function loadSettings(): SystemSettings {
  initializeStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getSettings(): SystemSettings {
  return loadSettings();
}

export function saveSettings(settings: SystemSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  addAuditLog('UPDATE_SETTINGS', 'settings', 'system_config', `更新系统决策规则配置`);
}

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAuditLog(action: string, entityType: AuditLogEntry['entityType'], entityId: string, description: string): void {
  try {
    const logs = getAuditLogs();
    logs.unshift({
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      description,
      user: '当前操作员 (Lead Sport Scientist)'
    });
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Audit log error', e);
  }
}

// Storage Service Interface for Clean Architecture & Future Backend Migration
export interface IStorageService {
  getProjects(): Project[];
  saveProject(project: Project): void;
  deleteProject(id: string): void;
  getReferences(): ReliabilityReference[];
  saveReference(ref: ReliabilityReference): ReliabilityReference;
  deprecateReference(id: string): void;
  getMonitoringRecords(): AthleteMonitoringRecord[];
  saveMonitoringRecord(record: AthleteMonitoringRecord): void;
  deleteMonitoringRecord(id: string): void;
  getSettings(): SystemSettings;
  saveSettings(settings: SystemSettings): void;
  getAuditLogs(): AuditLogEntry[];
}

export const LocalStorageService: IStorageService = {
  getProjects,
  saveProject,
  deleteProject,
  getReferences,
  saveReference,
  deprecateReference,
  getMonitoringRecords,
  saveMonitoringRecord,
  deleteMonitoringRecord,
  getSettings,
  saveSettings,
  getAuditLogs
};

export function resetToDefaultSeeds() {
  localStorage.removeItem(STORAGE_KEYS.PROJECTS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
  localStorage.removeItem(STORAGE_KEYS.REFERENCES);
  localStorage.removeItem(STORAGE_KEYS.MONITOR_RECORDS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  initializeStorage();
  return {
    projects: loadProjects(),
    references: loadReferences(),
    settings: loadSettings(),
    activeProjectId: loadActiveProjectId()
  };
}

export function resetToDemoDefaults(): void {
  resetToDefaultSeeds();
}
