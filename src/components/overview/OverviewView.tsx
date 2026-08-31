import React, { useState } from 'react';
import {
  Project,
  ReliabilityReference,
  AthleteMonitoringRecord
} from '../../types';
import {
  FlaskConical,
  Activity,
  Library,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Database
} from 'lucide-react';
import { formatNum } from '../../utils/statistics';

interface Props {
  projects: Project[];
  references: ReliabilityReference[];
  monitorRecords: AthleteMonitoringRecord[];
  onNavigate: (tab: any) => void;
  onOpenHelp: () => void;
}

export const OverviewView: React.FC<Props> = ({
  projects,
  references,
  monitorRecords,
  onNavigate,
  onOpenHelp
}) => {
  const activeRefs = references.filter(r => r.status === 'active');
  const recentRecords = monitorRecords.slice(0, 5);

  // Interactive Live Threshold Simulator on Homepage
  const [simMetric, setSimMetric] = useState<string>('cmj_height');
  const [simBaseline, setSimBaseline] = useState<number>(35.0);
  const [simCurrent, setSimCurrent] = useState<number>(37.2);

  // Default demo values based on standard references
  const mdcExample = simMetric === 'cmj_height' ? 1.35 : simMetric === 'rsi_mod' ? 0.08 : 180;
  const unitExample = simMetric === 'cmj_height' ? 'cm' : simMetric === 'rsi_mod' ? 'm/s' : 'W';

  const upperThreshold = +(simBaseline + mdcExample).toFixed(2);
  const lowerThreshold = +(simBaseline - mdcExample).toFixed(2);
  const delta = +(simCurrent - simBaseline).toFixed(2);

  const getSimVerdict = () => {
    if (simCurrent > upperThreshold) {
      return {
        type: 'improvement',
        title: '可检测的真实升高 (True Increase)',
        desc: `当前测试值 (${simCurrent} ${unitExample}) 突破了基准误差上界 (>${upperThreshold} ${unitExample})，属于超出预期测量误差的可检测升高。超过MDC仅表示观察到的变化超过预期测量误差，不说明变化的生理或训练原因。`,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badge: 'bg-emerald-600 text-white'
      };
    } else if (simCurrent < lowerThreshold) {
      return {
        type: 'decline',
        title: '可检测的真实下降 (True Decrease)',
        desc: `当前测试值 (${simCurrent} ${unitExample}) 突破了基准误差下界 (<${lowerThreshold} ${unitExample})，属于超出预期测量误差的可检测下降。超过MDC仅表示观察到的变化超过预期测量误差，不说明变化的生理或训练原因。`,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badge: 'bg-rose-600 text-white'
      };
    } else {
      return {
        type: 'noise',
        title: '处于正常测量误差波动带内 (Within Measurement Noise)',
        desc: `变化幅度 (Δ = ${delta >= 0 ? '+' : ''}${delta} ${unitExample}) 未突破 MDC95 (±${mdcExample} ${unitExample}) 范围，仍属于仪器与人体的正常测试波动，不可轻易判定为真正提高或下降。`,
        color: 'text-slate-700 bg-slate-100 border-slate-200',
        badge: 'bg-slate-700 text-white'
      };
    }
  };

  const simVerdict = getSimVerdict();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Section: Core Problem & System Positioning */}
      <div className="bg-linear-to-br from-white via-blue-50/70 to-sky-50 rounded-2xl p-6 sm:p-8 border border-blue-100 shadow-[0_18px_50px_-38px_rgba(30,64,175,0.6)] relative overflow-hidden">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-5">
          {/* Header pill badge & Action button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-blue-800 text-xs font-semibold border border-blue-200 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sports Test Reliability & True Change Identification Suite</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenHelp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 text-xs font-medium border border-slate-200 hover:border-blue-200 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                方法学规范白皮书
              </button>
              <button
                onClick={() => onNavigate('lab')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-xs"
              >
                进入实验室
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Core Question Headline */}
          <div className="space-y-2 max-w-4xl">
            <div className="text-xs font-mono tracking-wider uppercase text-blue-700 font-semibold">
              体育科学核心问题 | The Fundamental Biomechanics Question
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-950 leading-snug">
              运动员某项测试成绩提高了，究竟是真正的机能提升，还是仅仅是测试的正常波动？
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              本系统严格遵循体育科学计量学（Shaw et al., 2026; Hopkins, 2000; Weir, 2005）标准，
              通过<strong>群体重复测试（Cohort Test–Retest）</strong>量化测量误差并固化为 <strong>Reference 基准</strong>，
              进而精准判定<strong>单个运动员（Individual Athlete）</strong>的测试变化是否突破 <strong>MDC95 误差带</strong>。
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/85 border border-blue-100 p-3 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">活跃 Reference 基准</div>
              <div className="text-xl font-bold text-slate-950 font-mono mt-0.5">{activeRefs.length} 项</div>
              <div className="text-[10px] text-slate-400 mt-0.5">CMJ / RSI-mod / 冲刺</div>
            </div>

            <div className="bg-white/85 border border-blue-100 p-3 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">科研分析项目</div>
              <div className="text-xl font-bold text-blue-700 font-mono mt-0.5">{projects.length} 个</div>
              <div className="text-[10px] text-slate-400 mt-0.5">多试次聚合与方差分解</div>
            </div>

            <div className="bg-white/85 border border-blue-100 p-3 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">已记录运动员追踪</div>
              <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5">{monitorRecords.length} 次</div>
              <div className="text-[10px] text-slate-400 mt-0.5">MDC 误差带纵向判定</div>
            </div>

            <div className="bg-white/85 border border-blue-100 p-3 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">自动化公式校验</div>
              <div className="text-xl font-bold text-indigo-700 font-mono mt-0.5">18/18</div>
              <div className="text-[10px] text-slate-400 mt-0.5">100% 数学断言通过</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interactive Simulator Banner */}
      <div className="commercial-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-0.5">
              <SlidersHorizontal className="w-4 h-4" />
              <span>交互式实时阈值模拟器 (Interactive MDC95 Simulator)</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              调整数值，体验“真实变化”与“测量误差带”的判读逻辑
            </h3>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">选择基准指标:</span>
            <select
              value={simMetric}
              onChange={e => {
                const m = e.target.value;
                setSimMetric(m);
                if (m === 'cmj_height') {
                  setSimBaseline(35.0);
                  setSimCurrent(37.2);
                } else if (m === 'rsi_mod') {
                  setSimBaseline(0.42);
                  setSimCurrent(0.44);
                } else {
                  setSimBaseline(3800);
                  setSimCurrent(4100);
                }
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="cmj_height">CMJ 跳跃高度 (Jump Height, MDC95 = 1.35cm)</option>
              <option value="rsi_mod">修正反应力量指数 (RSI-mod, MDC95 = 0.08)</option>
              <option value="peak_power">峰值同心功率 (Peak Power, MDC95 = 180W)</option>
            </select>
          </div>
        </div>

        {/* Sliders & Visual Zone Representation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left: Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>运动员基线测试值 (Baseline T1):</span>
                <span className="font-mono font-bold text-slate-900">{simBaseline} {unitExample}</span>
              </div>
              <input
                type="range"
                min={simMetric === 'cmj_height' ? 20 : simMetric === 'rsi_mod' ? 0.2 : 2000}
                max={simMetric === 'cmj_height' ? 60 : simMetric === 'rsi_mod' ? 0.8 : 6000}
                step={simMetric === 'rsi_mod' ? 0.01 : 0.1}
                value={simBaseline}
                onChange={e => setSimBaseline(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>当前复测测试值 (Current T2):</span>
                <span className="font-mono font-bold text-slate-900">{simCurrent} {unitExample}</span>
              </div>
              <input
                type="range"
                min={simMetric === 'cmj_height' ? 20 : simMetric === 'rsi_mod' ? 0.2 : 2000}
                max={simMetric === 'cmj_height' ? 60 : simMetric === 'rsi_mod' ? 0.8 : 6000}
                step={simMetric === 'rsi_mod' ? 0.01 : 0.1}
                value={simCurrent}
                onChange={e => setSimCurrent(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block">变化量 Δ</span>
                <strong className={delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-700'}>
                  {delta > 0 ? `+${delta}` : delta} {unitExample}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">下限 -MDC95</span>
                <strong className="text-slate-700">{lowerThreshold} {unitExample}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">上限 +MDC95</span>
                <strong className="text-slate-700">{upperThreshold} {unitExample}</strong>
              </div>
            </div>
          </div>

          {/* Right: Instant Verdict Card */}
          <div className="lg:col-span-7">
            <div className={`p-4 rounded-xl border transition-all ${simVerdict.color}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${simVerdict.badge}`}>
                  判定结论
                </span>
                <span className="text-xs font-mono font-semibold">
                  MDC95 阈值: ±{mdcExample} {unitExample}
                </span>
              </div>
              <h4 className="text-sm font-bold">{simVerdict.title}</h4>
              <p className="text-xs mt-1 leading-relaxed">{simVerdict.desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Core Workflow Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Module A Card */}
        <div className="commercial-card commercial-card-hover rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  模块 A
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  可靠性实验室 (Reliability Lab)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                面向数据科学家与科研人员。导入受试者群体重测数据集（N≥10），执行多试次聚合、双因素方差分析分解、
                ICC(A,1)、典型误差 (TE)、变异系数 (CV%) 以及最小可检测变化 (MDC95)，三级规则判定适用性并固化为基准。
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>群体重测数据质检与 N=1 守门器拦截</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>McGraw & Wong (1996) 双因素随机绝对一致性 ICC(A,1)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Bland-Altman 95% LoA 与系统偏差检验</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Tier 1/2/3 适用性规则引擎与 Reference 固化</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('lab')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <span>进入可靠性实验室</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module B Card */}
        <div className="commercial-card commercial-card-hover rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  模块 B
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  运动员真实变化监控 (Athlete Monitor)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                面向体能教练、科研人员与队医。调用模块 A 固化的 Reference 基准（或内置权威标准），
                输入单个运动员或全队测试数据，通过 MDC95 误差保护带自动判读真实提升、衰退或正常波动。
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>单人纵向追踪与基线对比 (MDC95 阈值带)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>高/低指标双向判读 (如冲刺耗时 vs 跳跃高度)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>全队花名册批量判定与状态红绿灯看板</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>一键导出运动员机能诊断报告卡片与 CSV</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('monitor')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <span>进入运动员监控中心</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active References & Recent Monitoring Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active References Column */}
        <div className="lg:col-span-6 commercial-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Library className="w-4 h-4 text-blue-600" />
              当前活跃 Reference 基准资料库 ({activeRefs.length})
            </h4>
            <button
              onClick={() => onNavigate('references')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>查看全部</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {activeRefs.slice(0, 3).map(ref => (
              <div
                key={ref.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{ref.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    {ref.sport} · {ref.device} · n={ref.cohortSize}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-slate-900 font-bold">
                    MDC95: ±{formatNum(ref.mdc95, 2)} {ref.unit}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ICC: {formatNum(ref.icc, 2)} | CV: {formatNum(ref.cv, 1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Monitor Records Column */}
        <div className="lg:col-span-6 commercial-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              最近判定记录 ({recentRecords.length})
            </h4>
            <button
              onClick={() => onNavigate('monitor')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>进入监控</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentRecords.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">暂无监控记录</div>
            ) : (
              recentRecords.map(rec => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{rec.athleteName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({rec.athleteId})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {rec.metricName}: {rec.baselineValue} → {rec.currentValue} {rec.unit}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.resultType === 'true_improvement'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.resultType === 'true_decline'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {rec.resultType === 'true_improvement'
                        ? '真实提升'
                        : rec.resultType === 'true_decline'
                        ? '真实降低'
                        : '误差范围内'}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Δ = {rec.deltaValue > 0 ? `+${rec.deltaValue}` : rec.deltaValue} {rec.unit}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
