import React from 'react';
import { AthleteMonitoringRecord } from '../../types';
import { formatNum } from '../../utils/statistics';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Activity,
  Award,
  Calendar,
  User,
  Zap
} from 'lucide-react';

interface Props {
  record: AthleteMonitoringRecord;
  onClose: () => void;
}

export const AthleteReportCardModal: React.FC<Props> = ({ record, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-linear-to-r from-white to-blue-50 text-slate-950 p-5 flex items-center justify-between border-b border-blue-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">
              STR
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                运动员机能评定与真实变化反馈卡
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Athlete Performance & True Change Report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-blue-100 text-slate-600 flex items-center justify-center transition border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {/* Athlete Info Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center">
                {record.athleteName.slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{record.athleteName}</div>
                <div className="text-xs text-slate-500 font-mono">ID: {record.athleteId}</div>
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="text-slate-400">测试评估日期</div>
              <div className="font-semibold text-slate-800 font-mono">{record.date}</div>
            </div>
          </div>

          {/* Metric & Verdict Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              record.resultType === 'true_improvement'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : record.resultType === 'true_decline'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-950'
            }`}
          >
            <div>
              <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                评估指标: {record.metricName}
              </div>
              <div className="text-lg font-black mt-0.5">{record.resultLabel}</div>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-bold">
                {record.delta >= 0 ? '+' : ''}
                {formatNum(record.delta, 2)} {record.unit}
              </div>
              <div className="text-[11px] font-mono opacity-80">
                ({record.deltaPercent >= 0 ? '+' : ''}
                {formatNum(record.deltaPercent, 1)}%)
              </div>
            </div>
          </div>

          {/* Key Data Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">基线成绩 (Baseline)</div>
              <div className="text-base font-black font-mono text-slate-900 mt-1">
                {formatNum(record.baselineValue, 2)} <span className="text-xs font-normal text-slate-500">{record.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200">
              <div className="text-[10px] text-blue-700 font-bold">本次实测 (Current)</div>
              <div className="text-base font-black font-mono text-blue-950 mt-1">
                {formatNum(record.currentValue, 2)} <span className="text-xs font-normal text-blue-700">{record.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">MDC₉₅ 误差阈值</div>
              <div className="text-base font-black font-mono text-slate-900 mt-1">
                ±{formatNum(record.mdc95, 2)} <span className="text-xs font-normal text-slate-500">{record.unit}</span>
              </div>
            </div>
          </div>

          {/* Scientific Explanation & Coach Guidance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 leading-relaxed">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              科学判定说明：
            </div>
            <p className="text-slate-600 text-[11px]">
              {record.resultExplanation}
            </p>
            {record.notes && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                <strong>教练备注:</strong> {record.notes}
              </div>
            )}
          </div>

          {/* Footer watermark & ref */}
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono">
            <span>官方标定基准: {record.referenceName}</span>
            <span>Sports Test Reliability Engine 2026</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            打印 / 另存为 PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
