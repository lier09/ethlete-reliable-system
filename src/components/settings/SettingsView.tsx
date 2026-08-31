import React, { useState } from 'react';
import { SystemSettings } from '../../types';
import { DEFAULT_SYSTEM_SETTINGS } from '../../utils/storage';
import {
  Settings,
  RotateCcw,
  CheckCircle,
  BookOpen,
  ShieldCheck,
  Building2,
  Lock,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
  onOpenHelp: () => void;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  onSaveSettings,
  onOpenHelp
}) => {
  const [current, setCurrent] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = () => {
    onSaveSettings(current);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    setCurrent(DEFAULT_SYSTEM_SETTINGS);
    onSaveSettings(DEFAULT_SYSTEM_SETTINGS);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            系统参数与方法学规则配置 (Scientific Rules & Settings)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            配置样本量准入门槛、置信区间级别、三级监控适用性阈值与显著性判定标准。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenHelp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
            方法学手册
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认规则
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-blue-500/20"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            保存配置
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          系统规则参数已成功更新并应用至所有计算与评价模块！
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Sample Size & Confidence */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            样本量守门器与置信水平
          </h4>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                群体最小受试者数量门槛 (Minimum Cohort n)
              </label>
              <input
                type="number"
                min="2"
                max="50"
                value={current.minCohortSize}
                onChange={e => setCurrent({ ...current, minCohortSize: parseInt(e.target.value) || 10 })}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                行业推荐标准为 10 人。低于此人数系统将发出样本量警告；若仅为 1 人则硬性拦截可靠性计算。
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                统计置信区间 (Confidence Interval Level)
              </label>
              <select
                value={current.confidenceLevel}
                onChange={e => setCurrent({ ...current, confidenceLevel: (parseInt(e.target.value) as 90 | 95) || 95 })}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold"
              >
                <option value="90">90% 置信区间 (Z = 1.645)</option>
                <option value="95">95% 置信区间 (Z = 1.960) - 行业金标准</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                所属机构 / 实验室名称 (Organization Name)
              </label>
              <input
                type="text"
                value={current.organizationName}
                onChange={e => setCurrent({ ...current, organizationName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Tier 1 Recommended Cutoffs */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            一级推荐 (Tier 1 Recommended) 准入阈值
          </h4>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                ICC(A,1) 均值要求下限 (Recommended Cutoff)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={current.iccRecommendedCutoff}
                onChange={e => setCurrent({ ...current, iccRecommendedCutoff: parseFloat(e.target.value) || 0.85 })}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                默认 ≥ 0.85 为优秀可靠性基准。
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                ICC 95%CI 下限要求 (Lower Bound Cutoff)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.4"
                max="1.0"
                value={current.iccLowerBoundCutoff}
                onChange={e => setCurrent({ ...current, iccLowerBoundCutoff: parseFloat(e.target.value) || 0.70 })}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                要求 ICC 95% 置信区间下限 ≥ 0.70，杜绝假阳性高信度。
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                变异系数 CV% 均值上限 (Recommended Cutoff)
              </label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="25.0"
                value={current.cvRecommendedCutoff}
                onChange={e => setCurrent({ ...current, cvRecommendedCutoff: parseFloat(e.target.value) || 5.0 })}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                推荐 CV% ≤ 5.0%，低于 10% 可入选次级推荐。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
