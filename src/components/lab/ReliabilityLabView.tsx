import React, { useState } from 'react';
import {
  MetricDefinition,
  Project,
  RawDataRow,
  ReliabilityReference,
  ReliabilityStats,
  SuitabilityEvaluation,
  SystemSettings,
  TrialAggregationMethod
} from '../../types';
import {
  qualifyDataset,
  parseCSVData,
  aggregateTrials
} from '../../utils/dataParser';
import { calculateReliability, formatNum } from '../../utils/statistics';
import { evaluateSuitability } from '../../utils/rulesEngine';
import {
  generateRugbyCMJDataset,
  generateSingleSubjectDataset,
  DEMO_METRIC_DEFINITIONS
} from '../../utils/demoData';
import {
  exportReliabilityTableCSV,
  generatePrintableReportHTML
} from '../../utils/exportUtils';
import { BlandAltmanChart } from '../charts/BlandAltmanChart';
import { ScatterIdentityChart } from '../charts/ScatterIdentityChart';
import { IndividualSlopeChart } from '../charts/IndividualSlopeChart';
import {
  FlaskConical,
  Upload,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  BarChart3,
  BookmarkPlus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  Printer,
  Sparkles,
  Info,
  ShieldAlert,
  ShieldCheck,
  Sliders
} from 'lucide-react';

interface Props {
  project: Project;
  settings: SystemSettings;
  onSaveProject: (project: Project) => void;
  onSaveReference: (ref: ReliabilityReference) => void;
  onNavigateToMonitor: () => void;
}

export const ReliabilityLabView: React.FC<Props> = ({
  project,
  settings,
  onSaveProject,
  onSaveReference,
  onNavigateToMonitor
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [rawCSVInput, setRawCSVInput] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [showReferenceModal, setShowReferenceModal] = useState<boolean>(false);
  const [referenceSuccessMsg, setReferenceSuccessMsg] = useState<string | null>(null);

  // Editable project setup fields
  const [projectName, setProjectName] = useState(project.name);
  const [sport, setSport] = useState(project.sport);
  const [testName, setTestName] = useState(project.testName);
  const [device, setDevice] = useState(project.device);
  const [protocol, setProtocol] = useState(project.protocol);
  const [testInterval, setTestInterval] = useState(project.testInterval);
  const [cohortDescription, setCohortDescription] = useState(project.cohortDescription);
  const [sessionCount, setSessionCount] = useState(project.sessionCount || 2);
  const [trialCount, setTrialCount] = useState(project.trialCount || 2);
  const [aggregationMethod, setAggregationMethod] = useState<TrialAggregationMethod>(project.aggregationMethod || 'mean');
  const [notes, setNotes] = useState(project.notes || '');

  // Dataset & stats
  const dataset = project.rawDataset || [];
  const metrics = project.metricDefinitions || DEMO_METRIC_DEFINITIONS.cmj;
  const calculatedStats: Record<string, ReliabilityStats> = project.calculatedStats || {};
  const evaluations = project.evaluations || {};

  // Qualification result
  const qualification = qualifyDataset(dataset, settings.minCohortSize);

  // Active selected metric stats
  const currentMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];
  const activeStats: ReliabilityStats | undefined = currentMetric ? calculatedStats[currentMetric.id] : undefined;
  const activeEvaluation: SuitabilityEvaluation | undefined = currentMetric ? evaluations[currentMetric.id] : undefined;

  // Step 1: Save project settings
  const handleSaveSetup = () => {
    const updated: Project = {
      ...project,
      name: projectName,
      sport,
      testName,
      device,
      protocol,
      testInterval,
      cohortDescription,
      sessionCount,
      trialCount,
      aggregationMethod,
      notes,
      updatedAt: new Date().toISOString()
    };
    onSaveProject(updated);
    setActiveStep(2);
  };

  // Step 2: Handle data import
  const handleImportCSV = () => {
    if (!rawCSVInput.trim()) return;
    const { rows, errors } = parseCSVData(rawCSVInput);
    if (errors.length > 0 && rows.length === 0) {
      alert(`导入错误:\n${errors.join('\n')}`);
      return;
    }

    // Auto-detect metrics from data
    const metricNames = Array.from(new Set(rows.map(r => r.metric)));
    const newMetricDefs: MetricDefinition[] = metricNames.map(name => {
      const existing = metrics.find(m => m.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      const lower = name.toLowerCase();
      const isTime = lower.includes('time') || lower.includes('sprint') || lower.includes('t50') || lower.includes('耗时');
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        unit: isTime ? 's' : '单位',
        direction: isTime ? 'lower_is_better' : 'higher_is_better',
        testName: testName || '运动能力测试',
        description: '用户自定义导入指标'
      };
    });

    const updated: Project = {
      ...project,
      rawDataset: rows,
      metricDefinitions: newMetricDefs,
      status: 'data_imported',
      calculatedStats: undefined,
      evaluations: undefined
    };
    onSaveProject(updated);
    if (newMetricDefs.length > 0) {
      setSelectedMetricId(newMetricDefs[0].id);
    }
    setActiveStep(3);
  };

  const handleLoadDemoDataset = (type: 'cmj' | 'single') => {
    let rows: RawDataRow[] = [];
    let defs = metrics;
    if (type === 'cmj') {
      rows = generateRugbyCMJDataset();
      defs = DEMO_METRIC_DEFINITIONS.cmj;
    } else if (type === 'single') {
      rows = generateSingleSubjectDataset();
      defs = [DEMO_METRIC_DEFINITIONS.cmj[0]];
    }

    const updated: Project = {
      ...project,
      rawDataset: rows,
      metricDefinitions: defs,
      status: 'data_imported',
      calculatedStats: undefined,
      evaluations: undefined
    };
    onSaveProject(updated);
    if (defs.length > 0) {
      setSelectedMetricId(defs[0].id);
    }
    setActiveStep(3);
  };

  // Step 4: Calculate Reliability for all metrics
  const handleCalculateAllReliability = () => {
    if (!qualification.canProceedToReliability) return;

    const statsMap: Record<string, ReliabilityStats> = {};
    for (const m of metrics) {
      const pairs = aggregateTrials(dataset, m.name, aggregationMethod);
      if (pairs.length >= 2) {
        statsMap[m.id] = calculateReliability(pairs, m.id, m.name, m.unit, m.direction);
      }
    }

    const updated: Project = {
      ...project,
      calculatedStats: statsMap,
      status: 'analyzed'
    };
    onSaveProject(updated);
    if (metrics.length > 0 && (!selectedMetricId || !statsMap[selectedMetricId])) {
      setSelectedMetricId(metrics[0].id);
    }
    setActiveStep(4);
  };

  // Step 6: Evaluate Suitability
  const handleEvaluateSuitability = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const evalsMap: Record<string, SuitabilityEvaluation> = {};
      for (const [mId, stats] of Object.entries(calculatedStats)) {
        evalsMap[mId] = evaluateSuitability(stats, settings);
      }

      const updated: Project = {
        ...project,
        evaluations: evalsMap
      };
      onSaveProject(updated);
      setIsEvaluating(false);
      setActiveStep(6);
    }, 300);
  };

  // Step 7: Create Reliability Reference
  const handleConfirmCreateReference = () => {
    if (!activeStats || !activeEvaluation || !activeEvaluation.isEligibleForReference) return;

    const refId = `REF-${new Date().getFullYear()}-${currentMetric.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newReference: ReliabilityReference = {
      id: refId,
      version: 1,
      versionTag: 'v1.0',
      name: `${project.sport} ${currentMetric.name} 可靠性参考 (MDC95=${formatNum(activeStats.mdc95, 2)} ${activeStats.unit})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      projectId: project.id,
      projectName: project.name,
      sport: project.sport,
      testName: project.testName,
      metricId: currentMetric.id,
      metricName: currentMetric.name,
      unit: currentMetric.unit,
      direction: currentMetric.direction,
      device: project.device,
      protocol: project.protocol,
      population: project.cohortDescription,
      cohortDescription: project.cohortDescription,
      sampleSize: activeStats.n,
      sessionInterval: project.testInterval,
      sessionsCount: project.sessionCount,
      sessionsCompared: [project.sessionCount >= 2 ? 1 : 1, project.sessionCount >= 2 ? 2 : 2],
      trialsPerSession: project.trialCount,
      trialAggregation: project.aggregationMethod,
      iccModel: activeStats.iccModel,
      iccDefinition: activeStats.iccDefinition,
      iccMeasureType: activeStats.iccMeasureType,
      iccCiMethod: activeStats.iccCiMethod || 'mcgraw_wong_1996',
      iccA1: activeStats.iccA1,
      iccA1CI: [activeStats.iccA1Lower95, activeStats.iccA1Upper95],
      iccC1: activeStats.iccC1,
      teMethod: activeStats.teMethod,
      typicalError: activeStats.typicalError,
      cvMethod: activeStats.cvMethod,
      cvCiMethod: activeStats.cvCiMethod || 'vangel_mckay_approx',
      cv: activeStats.cvMean,
      cvCI: [activeStats.cvLower95, activeStats.cvUpper95],
      meanBias: activeStats.meanBias,
      biasCI: [activeStats.bias95CILower, activeStats.bias95CIUpper],
      biasPercent: activeStats.biasPercent,
      biasToMdcRatio: activeStats.biasToMdcRatio,
      cautionWarning: activeEvaluation.cautionWarning,
      pooledSD: activeStats.pooledSD,
      semMethod: activeStats.semMethod,
      sem: activeStats.sem,
      mdcConfidenceLevel: activeStats.mdcConfidenceLevel,
      mdcMethod: activeStats.mdcMethod,
      mdc95: activeStats.mdc95,
      mdcPercent: activeStats.mdcPercent,
      loaLower: activeStats.loaLower,
      loaUpper: activeStats.loaUpper,
      t1Mean: activeStats.t1Mean,
      t2Mean: activeStats.t2Mean,
      grandMean: activeStats.grandMean,
      suitabilityTier: activeEvaluation.tier,
      suitabilityRationale: activeEvaluation.detailedRationale.join(' '),
      ruleVersion: `Ruleset ${settings.decisionRuleVersion || 'v1.1'} (${settings.confidenceLevel}% CI)`,
      dataVersion: 'v1.0-verified',
      analysisMethodVersion: settings.analysisMethodVersion || 'v1.0',
      decisionRuleVersion: settings.decisionRuleVersion || 'v1.1',
      dataQualityStatus: 'clean',
      validityDisclaimer: activeEvaluation.validityDisclaimer || 'Reliability does not establish validity: 本重测信度与MDC95仅证明测试结果在同等条件下的重复一致性与测量噪声水平，并不自动证明该指标能够有效反映专项运动表现、疲劳机理或损伤风险（结构效度/效标效度）。',
      thresholdConfigSnapshot: {
        minCohortSize: settings.minCohortSize,
        iccRecommendedCutoff: settings.iccRecommendedCutoff,
        iccLowerBoundCutoff: settings.iccLowerBoundCutoff,
        cvRecommendedCutoff: settings.cvRecommendedCutoff,
        cvUpperBoundCutoff: settings.cvUpperBoundCutoff,
        mdcPercentCutoff: settings.mdcPercentCutoff,
        biasPercentPass: settings.biasPercentPass ?? 2.0,
        biasPercentCaution: settings.biasPercentCaution ?? 5.0,
        confidenceLevel: settings.confidenceLevel
      },
      tags: [project.sport, currentMetric.name, 'ForcePlate/Timing']
    };

    onSaveReference(newReference);
    const updatedProj: Project = { ...project, status: 'reference_built' };
    onSaveProject(updatedProj);

    setReferenceSuccessMsg(`成功固化 Reliability Reference：[${newReference.id}] ${newReference.name}！已同步至 Reference 资料库与运动员监控模块。`);
    setShowReferenceModal(false);
  };

  const stepsList = [
    { num: 1, title: '建立项目', desc: '设定协议与聚合规则' },
    { num: 2, title: '导入群体数据', desc: 'CSV/Excel 长宽格式' },
    { num: 3, title: '数据资格检查', desc: '样本量与 N=1 拦截' },
    { num: 4, title: '计算可靠性', desc: 'ANOVA/ICC/CV/MDC' },
    { num: 5, title: '统计报告', desc: 'Bland-Altman与散点图' },
    { num: 6, title: '监控适用性评价', desc: '三级准入判定' },
    { num: 7, title: '建立 Reference', desc: '固化特定基准' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Workflow Step Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1">
          {stepsList.map(step => {
            const isCurrent = activeStep === step.num;
            const isPassed = activeStep > step.num;
            return (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition shrink-0 ${
                  isCurrent
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : isPassed
                    ? 'hover:bg-slate-50 text-slate-700'
                    : 'opacity-60 text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isPassed ? <CheckCircle className="w-3.5 h-3.5" /> : step.num}
                </div>
                <div>
                  <div className={`text-xs font-bold leading-tight ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                    {step.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {step.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification Banner */}
      {referenceSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-start justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-xs">Reference 建立成功！</div>
              <div className="text-xs text-emerald-800 mt-0.5">{referenceSuccessMsg}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToMonitor}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold transition"
            >
              前往运动员监控
            </button>
            <button
              onClick={() => setReferenceSuccessMsg(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 px-2 py-1"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: PROJECT SETUP */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              步骤 1：建立可靠性测试项目 (Project Specification)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              定义受试人群、体育专项、标准化测试动作、测试仪器及试次聚合规则。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">项目名称 *</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：青训学院英式橄榄球 CMJ 测试重测信度标定"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">体育项目 / 专项 *</label>
              <input
                type="text"
                value={sport}
                onChange={e => setSport(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：Rugby League (英式橄榄球)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">测试动作名称 *</label>
              <input
                type="text"
                value={testName}
                onChange={e => setTestName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：Countermovement Jump (CMJ)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">测试设备 / 仪器 *</label>
              <input
                type="text"
                value={device}
                onChange={e => setDevice(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：ForceDecks FD4000 测力板 (1000Hz)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">标准化测试操作协议 (Protocol) *</label>
              <input
                type="text"
                value={protocol}
                onChange={e => setProtocol(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：双手叉腰双腿下蹲跳，下蹲深度由运动员自选，试次间休息60秒"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">测试重测时间间隔 *</label>
              <input
                type="text"
                value={testInterval}
                onChange={e => setTestInterval(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：7 天 (测试前48小时无高强度离心力量训练)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">受试群体描述 (Cohort Description) *</label>
              <input
                type="text"
                value={cohortDescription}
                onChange={e => setCohortDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：U18-U21 青训学院男子橄榄球运动员 (N=20, 18.2±1.1岁)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Session 数量与 Trial 数量</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="2"
                  value={sessionCount}
                  onChange={e => setSessionCount(parseInt(e.target.value) || 2)}
                  className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-center font-mono"
                  placeholder="2 轮 Session"
                />
                <input
                  type="number"
                  min="1"
                  value={trialCount}
                  onChange={e => setTrialCount(parseInt(e.target.value) || 2)}
                  className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-center font-mono"
                  placeholder="每轮 2 次 Trial"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                多 Trial 聚合方式 (Aggregation Method) *
              </label>
              <select
                value={aggregationMethod}
                onChange={e => setAggregationMethod(e.target.value as TrialAggregationMethod)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="mean">平均值 (Mean of Trials) - 推荐，误差最小</option>
                <option value="median">中位数 (Median of Trials) - 抗偶发失误</option>
                <option value="best">最好成绩 (Best Trial) - 适用冲刺/单次极限</option>
                <option value="last">最后一次 (Last Trial) - 适用稳定态</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">研究备注与方法学背景</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="参考 Shaw et al. (2026) 方案，用于建立纵向发展最小可检测变化界限..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveSetup}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              保存并进入数据导入
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: DATA IMPORT */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                步骤 2：导入群体重复测试数据 (Import Cohort Test–Retest Data)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                支持标准长格式 (participant_id, name, session, trial, metric, value) 或宽格式 (T1, T2)。
              </p>
            </div>

            {/* Quick Demo Preload Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLoadDemoDataset('cmj')}
                className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg font-medium transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                载入 CMJ 20人标准重测数据 (Shaw 2026)
              </button>

              <button
                onClick={() => handleLoadDemoDataset('single')}
                className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg font-medium transition"
                title="载入仅1名受试者的数据，测试系统的 N=1 硬性拦截能力"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                载入 N=1 异常数据 (测试拦截)
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                直接粘贴 CSV 或制表符分隔数据 (Paste CSV Data)
              </label>
              <textarea
                value={rawCSVInput}
                onChange={e => setRawCSVInput(e.target.value)}
                rows={8}
                placeholder={`participant_id,name,age,sex,session,trial,metric,value\nP01,张博文,18,Male,1,1,Jump Height,38.0\nP01,张博文,18,Male,1,2,Jump Height,38.4\nP01,张博文,18,Male,2,1,Jump Height,38.1\nP01,张博文,18,Male,2,2,Jump Height,38.5\nP02,李俊杰,19,Male,1,1,Jump Height,44.2\n...`}
                className="w-full border border-slate-300 rounded-lg p-3 font-mono text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {dataset.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">当前已载入数据：</span>
                  <span className="text-slate-600">
                    共 {dataset.length} 条记录，{Array.from(new Set(dataset.map(d => d.participant_id))).length} 名受试者，{Array.from(new Set(dataset.map(d => d.metric))).length} 个指标。
                  </span>
                </div>
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-medium transition"
                >
                  查看资格检查
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
            <button
              onClick={handleImportCSV}
              disabled={!rawCSVInput.trim() && dataset.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              解析并进行数据资格检查
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: DATA QUALIFICATION CHECK (Including N=1 Hard Stop) */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              步骤 3：数据资格与完整性检查 (Data Qualification Inspection)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              验证群体受试者配对完整性、样本量门槛与 N=1 严禁规则。
            </p>
          </div>

          {/* CRITICAL N=1 HARD ERROR BANNER (MANDATED IN SECTION 2) */}
          {qualification.isSingleParticipantError && (
            <div className="bg-rose-50 border-2 border-rose-500 p-5 rounded-xl text-rose-900 space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-950">
                    ❌ 严重拦截：单受试者数据违规 (Single Participant Error)
                  </h4>
                  <p className="text-xs text-rose-900 font-semibold mt-1">
                    “当前项目只有1名受试者，无法建立群体可靠性参考。请使用一批受试者的重复测试数据，或在运动员监控中选择已有的 Reliability Reference。”
                  </p>
                  <p className="text-xs text-rose-800 mt-2 leading-relaxed">
                    <strong>统计学根基解释：</strong>
                    组内相关系数 (ICC)、典型误差 (TE) 及 MDC95 的本质是利用群体重复测试数据进行两因素随机方差分解 (Two-Way Mixed ANOVA)。
                    单一个人仅有两次测试，无法区分受试者间真实变异与测试随机误差，因此在数学上完全不具备建立可靠性基准的前提条件。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-rose-200">
                <button
                  onClick={() => handleLoadDemoDataset('cmj')}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition"
                >
                  切换为 20人 CMJ 标准群体数据
                </button>
                <button
                  onClick={onNavigateToMonitor}
                  className="px-3.5 py-1.5 bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 rounded-lg text-xs font-semibold transition"
                >
                  直接使用 Reference 进行单人监控
                </button>
              </div>
            </div>
          )}

          {/* General Qualification Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-slate-500 text-[11px]">受试者总数 (Cohort n)</div>
              <div className={`text-lg font-bold font-mono mt-0.5 ${qualification.totalParticipants < 2 ? 'text-rose-600' : qualification.totalParticipants < settings.minCohortSize ? 'text-amber-600' : 'text-emerald-700'}`}>
                {qualification.totalParticipants} 人
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">建议门槛: ≥ {settings.minCohortSize} 人</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-slate-500 text-[11px]">测试轮次 (Sessions)</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {qualification.sessionCount} 轮
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">要求: 包含 Session 1 & 2</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-slate-500 text-[11px]">检测到指标数量</div>
              <div className="text-lg font-bold font-mono text-blue-700 mt-0.5">
                {qualification.metricsFound.length} 个
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{metrics.map(m => m.name).join(', ')}</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-slate-500 text-[11px]">试次聚合方式</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {aggregationMethod.toUpperCase()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">按 {aggregationMethod} 聚合试次</div>
            </div>
          </div>

          {/* Qualification Issues Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">校验项明细与审查日志：</h4>
            <div className="space-y-1.5">
              {qualification.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    issue.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : issue.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  {issue.type === 'error' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{issue.message}</div>
                    {issue.details && <div className="text-[11px] mt-0.5 opacity-90">{issue.details}</div>}
                  </div>
                </div>
              ))}
              {qualification.issues.length === 0 && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  所有受试者配对完整，未检测到缺失值或单受试者异常，符合可靠性计算标准。
                </div>
              )}
            </div>
          </div>

          {/* Aggregated T1 vs T2 Preview Table */}
          {metrics.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>试次聚合后配对数据预览 (Aggregated Test 1 vs Test 2 Preview)</span>
                <span className="text-slate-500 font-normal">指标: {metrics[0].name}</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2 pl-4">受试者 ID</th>
                      <th className="p-2">姓名</th>
                      <th className="p-2">Test 1 聚合值</th>
                      <th className="p-2">Test 2 聚合值</th>
                      <th className="p-2">差值 (T2 - T1)</th>
                      <th className="p-2 pr-4">两轮均值</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregateTrials(dataset, metrics[0].name, aggregationMethod).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 pl-4 font-mono font-medium text-slate-800">{p.participantId}</td>
                        <td className="p-2 text-slate-700">{p.name}</td>
                        <td className="p-2 font-mono text-slate-800">{formatNum(p.test1, 2)}</td>
                        <td className="p-2 font-mono text-slate-800">{formatNum(p.test2, 2)}</td>
                        <td className={`p-2 font-mono font-semibold ${p.diff > 0 ? 'text-teal-700' : p.diff < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                          {p.diff >= 0 ? '+' : ''}{formatNum(p.diff, 2)}
                        </td>
                        <td className="p-2 pr-4 font-mono text-slate-600">{formatNum(p.mean, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              重新上传数据
            </button>
            <button
              onClick={handleCalculateAllReliability}
              disabled={!qualification.canProceedToReliability}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              数据资格通过，计算重测可靠性统计
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4 & 5: RELIABILITY STATS REPORT & VISUALIZATION */}
      {/* ========================================================================= */}
      {(activeStep === 4 || activeStep === 5) && (
        <div className="space-y-6">
          {/* Top Metric Tabs & Export Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-600 mr-1">选择指标:</span>
              {metrics.map(m => {
                const isSel = m.id === currentMetric?.id;
                const stats = calculatedStats[m.id];
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMetricId(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{m.name}</span>
                    {stats && (
                      <span className={`text-[10px] font-mono px-1 rounded ${isSel ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                        ICC {formatNum(stats.iccA1, 2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportReliabilityTableCSV(calculatedStats, evaluations)}
                className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                导出 CSV 统计表
              </button>
              <button
                onClick={() => {
                  const html = generatePrintableReportHTML(project, calculatedStats, evaluations);
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(html);
                    w.document.close();
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                打印 / PDF 预览
              </button>
            </div>
          </div>

          {activeStats ? (
            <>
              {/* Sleek Interface Primary Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Relative Reliability ICC */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    相对可靠性 ICC (A,1)
                  </div>
                  <div className="text-3xl font-bold text-slate-800 font-mono tracking-tight">
                    {formatNum(activeStats.iccA1, 3)}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1 font-mono">
                    95% CI [{formatNum(activeStats.iccA1Lower95, 2)} - {formatNum(activeStats.iccA1Upper95, 2)}]
                  </div>
                </div>

                {/* 2. Absolute Reliability CV% */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    绝对可靠性 CV (%)
                  </div>
                  <div className="text-3xl font-bold text-slate-800 font-mono tracking-tight">
                    {formatNum(activeStats.cvMean, 2)}%
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">
                    典型误差 (TE): {formatNum(activeStats.typicalError, 2)} {activeStats.unit}
                  </div>
                </div>

                {/* 3. True Change Threshold MDC95 */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                    真实变化阈值 MDC95
                  </div>
                  <div className="text-3xl font-bold text-slate-800 font-mono tracking-tight">
                    ±{formatNum(activeStats.mdc95, 2)}{' '}
                    <span className="text-sm font-normal text-slate-400 font-sans">{activeStats.unit}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold mt-1 font-mono">
                    MDC% = {formatNum(activeStats.mdcPercent, 1)}%
                  </div>
                </div>

                {/* 4. Monitoring Suitability Evaluation */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                    监控适用性评价
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 leading-tight">
                    {activeEvaluation?.tier === 'tier_1_recommended'
                      ? '推荐用于纵向监控'
                      : activeEvaluation?.tier === 'tier_2_caution'
                      ? '谨慎使用 (需多试次平均)'
                      : activeEvaluation?.tier === 'tier_3_not_recommended'
                      ? '不推荐用于监控'
                      : '待运行科学规则评估'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold mt-1">
                    {activeEvaluation
                      ? activeEvaluation.tierLabel
                      : '点击下方评估进入三级准入判定'}
                  </div>
                </div>
              </div>

              {/* Secondary Statistical Precision Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">测量标准误 SEM</div>
                  <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                    {formatNum(activeStats.sem, 2)} <span className="text-xs font-normal text-slate-500">{activeStats.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">SDpool × √(1-ICC)</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">系统偏差 Bias (幅度优先)</div>
                  <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                    {activeStats.meanBias >= 0 ? '+' : ''}{formatNum(activeStats.meanBias, 2)} {activeStats.unit}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Bias: {formatNum(activeStats.biasPercent, 2)}% · p={formatNum(activeStats.pairedTPValue, 3)}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Test 1 均值 ± SD</div>
                  <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                    {formatNum(activeStats.t1Mean, 1)} ± {formatNum(activeStats.t1SD, 1)}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Test 2 均值 ± SD</div>
                  <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                    {formatNum(activeStats.t2Mean, 1)} ± {formatNum(activeStats.t2SD, 1)}
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BlandAltmanChart stats={activeStats} />
                <ScatterIdentityChart stats={activeStats} />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <IndividualSlopeChart stats={activeStats} />
              </div>

              {/* Complete Summary Table for all metrics in this project */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    本项目全部指标重测可靠性汇总统计表 (Full Metrics Summary)
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 pl-4">指标名称</th>
                        <th className="p-2.5">单位</th>
                        <th className="p-2.5">样本量 n</th>
                        <th className="p-2.5">Test 1 均值±SD</th>
                        <th className="p-2.5">Test 2 均值±SD</th>
                        <th className="p-2.5">ICC(A,1) [95%CI]</th>
                        <th className="p-2.5">CV% [95%CI]</th>
                        <th className="p-2.5">SEM</th>
                        <th className="p-2.5">MDC95 (阈值)</th>
                        <th className="p-2.5">MDC%</th>
                        <th className="p-2.5 pr-4">系统偏差 Bias (p值)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {Object.values(calculatedStats).map(s => (
                        <tr key={s.metricId} className={s.metricId === currentMetric.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                          <td className="p-2.5 pl-4 font-sans font-semibold text-slate-900">{s.metricName}</td>
                          <td className="p-2.5 text-slate-600">{s.unit}</td>
                          <td className="p-2.5 text-slate-800">{s.n}</td>
                          <td className="p-2.5 text-slate-700">{formatNum(s.t1Mean, 1)} ± {formatNum(s.t1SD, 1)}</td>
                          <td className="p-2.5 text-slate-700">{formatNum(s.t2Mean, 1)} ± {formatNum(s.t2SD, 1)}</td>
                          <td className="p-2.5 font-bold text-blue-900">
                            {formatNum(s.iccA1, 2)} <span className="text-[10px] text-slate-500 font-normal">[{formatNum(s.iccA1Lower95, 2)}-{formatNum(s.iccA1Upper95, 2)}]</span>
                          </td>
                          <td className="p-2.5 text-slate-800">
                            {formatNum(s.cvMean, 1)}% <span className="text-[10px] text-slate-500 font-normal">[{formatNum(s.cvLower95, 1)}%-{formatNum(s.cvUpper95, 1)}%]</span>
                          </td>
                          <td className="p-2.5 text-slate-800">{formatNum(s.sem, 2)}</td>
                          <td className="p-2.5 font-bold text-emerald-800">±{formatNum(s.mdc95, 2)}</td>
                          <td className="p-2.5 text-slate-800">{formatNum(s.mdcPercent, 1)}%</td>
                          <td className="p-2.5 pr-4 text-slate-700">
                            {s.meanBias >= 0 ? '+' : ''}{formatNum(s.meanBias, 2)} <span className="text-[10px] text-slate-400">({formatNum(s.pairedTPValue, 3)})</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action to proceed to Suitability Evaluation */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-blue-950">
                    统计报告已完成。进入步骤 6 进行监控适用性科学评估
                  </h4>
                  <p className="text-xs text-blue-800 mt-1">
                    系统将运行多维度科学规则引擎，结合 ICC 置信下限、CV 置信上限与 MDC% 综合评估是否允许建立 Reference。
                  </p>
                </div>
                <button
                  onClick={handleEvaluateSuitability}
                  disabled={isEvaluating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isEvaluating ? '正在评估中...' : '评估是否适合监控'}
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">请先点击“计算可靠性”以生成统计报告。</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6 & 7: SUITABILITY EVALUATION & CREATE REFERENCE */}
      {/* ========================================================================= */}
      {activeStep === 6 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  步骤 6：监控适用性评价 (Monitoring Suitability Evaluation)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  基于分层科学规则引擎输出三级判定：推荐 (Tier 1) / 需谨慎 (Tier 2) / 不建议 (Tier 3)。
                </p>
              </div>
            </div>

            {/* Configurable Rules Banner */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>方法学规则说明 (Default configurable rules)：</strong>
                以下阈值为系统默认预设监控适用性规则（ICC ≥ {settings.iccRecommendedCutoff} / 95%CI下限 ≥ {settings.iccLowerBoundCutoff}、CV ≤ {settings.cvRecommendedCutoff}% / 95%CI上限 ≤ {settings.cvUpperBoundCutoff}%、MDC% ≤ {settings.mdcPercentCutoff}%、Bias% ≤ 2%），不同运动专项、受试群体及测试指标可前往<strong>系统设置 (Settings)</strong> 按需调整。
              </div>
            </div>

            {/* Metric Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {metrics.map(m => {
                const ev = evaluations[m.id];
                const isSel = m.id === currentMetric?.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMetricId(m.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                      isSel
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{m.name}</span>
                    {ev && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          ev.tier === 'tier_1_recommended'
                            ? 'bg-emerald-500 text-white'
                            : ev.tier === 'tier_2_caution'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {ev.tier === 'tier_1_recommended' ? 'Tier 1 推荐' : ev.tier === 'tier_2_caution' ? 'Tier 2 谨慎' : 'Tier 3 不推荐'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeEvaluation && activeStats && (
              <div className="space-y-6">
                {/* Result Hero Card for Active Metric */}
                <div
                  className={`p-6 rounded-xl border-2 space-y-4 ${
                    activeEvaluation.tier === 'tier_1_recommended'
                      ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                      : activeEvaluation.tier === 'tier_2_caution'
                      ? 'bg-amber-50/70 border-amber-500 text-amber-950'
                      : 'bg-rose-50/70 border-rose-500 text-rose-950'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${
                          activeEvaluation.tier === 'tier_1_recommended'
                            ? 'bg-emerald-600'
                            : activeEvaluation.tier === 'tier_2_caution'
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                      >
                        {activeEvaluation.tier === 'tier_1_recommended' ? 'T1' : activeEvaluation.tier === 'tier_2_caution' ? 'T2' : 'T3'}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-75">
                          {currentMetric.name} · 适用性结论
                        </div>
                        <h4 className="text-lg font-black">{activeEvaluation.tierLabel}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="text-right font-mono text-xs cursor-help bg-white/60 px-3 py-1.5 rounded-lg border border-current/20"
                        title="该分数基于当前预设的监控适用性规则生成，仅用于辅助比较，不代表测量可靠性的概率或百分比。"
                      >
                        <div className="opacity-75 text-[11px] font-sans font-semibold">Monitoring Suitability Score</div>
                        <div className="text-sm font-black flex items-center justify-end gap-1">
                          <span>{activeEvaluation.overallScore} / 100</span>
                          <span className="text-[10px] font-normal font-sans opacity-70">(规则符合度)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed font-medium bg-white/70 p-3.5 rounded-lg border border-current/20">
                    {activeEvaluation.detailedRationale.join(' ')}
                  </p>

                  {/* Scientific Stats Evidence List */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-white/80 p-2.5 rounded border border-current/20">
                      <span className="text-[10px] opacity-75 block font-sans">ICC(A,1) & 95%CI</span>
                      <strong>{formatNum(activeStats.iccA1, 2)}</strong> [{formatNum(activeStats.iccA1Lower95, 2)}~{formatNum(activeStats.iccA1Upper95, 2)}]
                    </div>
                    <div className="bg-white/80 p-2.5 rounded border border-current/20">
                      <span className="text-[10px] opacity-75 block font-sans">CV% & 95%CI</span>
                      <strong>{formatNum(activeStats.cvMean, 1)}%</strong> [{formatNum(activeStats.cvLower95, 1)}%~{formatNum(activeStats.cvUpper95, 1)}%]
                    </div>
                    <div className="bg-white/80 p-2.5 rounded border border-current/20">
                      <span className="text-[10px] opacity-75 block font-sans">MDC95 (物理单位)</span>
                      <strong>{formatNum(activeStats.mdc95, 2)} {activeStats.unit}</strong>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded border border-current/20">
                      <span className="text-[10px] opacity-75 block font-sans">MDC% (占均值比)</span>
                      <strong>{formatNum(activeStats.mdcPercent, 1)}%</strong>
                    </div>
                  </div>

                  {/* Scientific Disclaimer (Item 12) */}
                  <div className="p-3 bg-white/85 rounded-lg border border-current/20 text-[11px] leading-relaxed text-slate-700">
                    <strong>⚖️ 科学免责与范畴边界 (Scientific Scope Disclaimer)：</strong>
                    “推荐用于纵向监控”仅表示该指标在当前测试条件下具有较好的测量可靠性和真实变化检测能力，不等同于证明其具有疲劳、训练适应或专项表现诊断效度。实际应用中应结合运动专项需求与先验背景综合判断。
                  </div>

                  {/* Tier 2 Caution Warning Banner if applicable */}
                  {activeEvaluation.cautionWarning && (
                    <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-950 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>使用警示 (Caution Note)：</strong>
                        <span>{activeEvaluation.cautionWarning}</span>
                      </div>
                    </div>
                  )}

                  {/* Systematic Bias Comprehensive Evaluation Box */}
                  <div className="bg-white/90 p-3.5 rounded-lg border border-current/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-bold text-slate-800">系统性重测偏差多维审查 (Systematic Bias Multi-Evaluation)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          activeStats.biasPercent <= 2.0
                            ? 'bg-emerald-100 text-emerald-800'
                            : activeStats.biasPercent <= 5.0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {activeStats.biasPercent <= 2.0 ? 'PASS (≤2%)' : activeStats.biasPercent <= 5.0 ? 'CAUTION (2%~5%)' : 'FAIL (>5%)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-slate-800">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Mean Bias</span>
                        <strong>{activeStats.meanBias >= 0 ? '+' : ''}{formatNum(activeStats.meanBias, 2)} {activeStats.unit}</strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Bias % (占均值比)</span>
                        <strong>{formatNum(activeStats.biasPercent, 2)}%</strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Bias / MDC95 比例</span>
                        <strong>{formatNum(activeStats.biasToMdcRatio || (activeStats.mdc95 > 0 ? Math.abs(activeStats.meanBias) / activeStats.mdc95 : 0), 2)}</strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans block">配对 t 检验 P 值</span>
                        <strong>p = {formatNum(activeStats.pairedTPValue, 3)}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 font-sans leading-relaxed border-t border-slate-100 pt-2 mt-1">
                      💡 <strong>统计与实际解释：</strong>
                      P值反映是否存在统计学系统性差异的证据，而系统偏差的实际影响幅度需单独评估 (P value indicates statistical evidence of a systematic difference, but the practical magnitude of the bias is evaluated separately)。
                      {activeStats.pairedTPValue < 0.05 && activeStats.biasPercent <= 2.0 && (
                        <span className="text-emerald-800 font-medium ml-1">
                          当前处于“统计学显著但实际偏差微小 (Statistically significant but practically small systematic bias)”状态，不影响作为监控基准。
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Decision Rules Triggered */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">
                    决策规则触发清单 (Decision Engine Rules):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activeEvaluation.decisionRulesTriggered.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          rule.passed ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{rule.rule}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            观测值: {rule.observedValue} (要求: {rule.thresholdValue})
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            rule.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}
                        >
                          {rule.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reference Creation Action Box */}
                <div className="p-5 rounded-xl border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      步骤 7：建立 Reliability Reference 固化基准
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeEvaluation.isEligibleForReference
                        ? `指标 "${currentMetric.name}" 已完全符合纵向监控标准，可固化为独立参考基准。`
                        : `该指标当前未通过监控适用性评价，系统不会建立 MDC Reference，以避免产生虚假的测量精确性。`}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowReferenceModal(true)}
                    disabled={!activeEvaluation.isEligibleForReference}
                    className={`px-6 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                      activeEvaluation.isEligibleForReference
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }`}
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    建立 Reliability Reference
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE REFERENCE MODAL */}
      {showReferenceModal && activeStats && activeEvaluation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  确认固化 Reliability Reference 基准
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  将锁定此人群、仪器与协议下的测量信度与 MDC95 阈值
                </p>
              </div>
              <button
                onClick={() => setShowReferenceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div><span className="text-slate-500 font-sans">指标名称：</span><strong>{currentMetric.name}</strong></div>
                  <div><span className="text-slate-500 font-sans">物理单位：</span><strong>{activeStats.unit}</strong></div>
                  <div><span className="text-slate-500 font-sans">体育专项：</span>{project.sport}</div>
                  <div><span className="text-slate-500 font-sans">测试仪器：</span>{project.device}</div>
                  <div><span className="text-slate-500 font-sans">样本量：</span>n = {activeStats.n} 人</div>
                  <div><span className="text-slate-500 font-sans">重测间隔：</span>{project.testInterval}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-[10px] text-blue-700">ICC(A,1)</div>
                  <div className="text-base font-bold font-mono text-blue-950 mt-0.5">
                    {formatNum(activeStats.iccA1, 3)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-[10px] text-blue-700">CV%</div>
                  <div className="text-base font-bold font-mono text-blue-950 mt-0.5">
                    {formatNum(activeStats.cvMean, 1)}%
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] text-emerald-800 font-semibold">MDC95 阈值</div>
                  <div className="text-base font-bold font-mono text-emerald-950 mt-0.5">
                    ±{formatNum(activeStats.mdc95, 2)} {activeStats.unit}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r text-[11px] text-amber-900 leading-relaxed">
                <strong>方法学提示：</strong>
                该 Reference 仅代表特定的“受试人群 × 测试设备 × 标准化协议 × 试次聚合规则”。
                请勿无条件迁移至其他年龄段、不同品牌设备或不同测试间隔。
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-2">
              <button
                onClick={() => setShowReferenceModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleConfirmCreateReference}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                确认建立并保存至资料库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
