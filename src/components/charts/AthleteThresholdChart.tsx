import React from 'react';
import { AthleteMonitoringRecord } from '../../types';
import { formatNum } from '../../utils/statistics';

interface Props {
  record: AthleteMonitoringRecord;
}

export const AthleteThresholdChart: React.FC<Props> = ({ record }) => {
  const width = 580;
  const height = 280;
  const padding = { top: 30, right: 140, bottom: 40, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const { baselineValue, currentValue, mdc95, upperThreshold, lowerThreshold, unit, resultType } = record;

  const vals = [baselineValue, currentValue, upperThreshold, lowerThreshold];
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const span = maxVal - minVal || 1;
  const axisMin = minVal - span * 0.25;
  const axisMax = maxVal + span * 0.25;

  const yScale = (val: number) => padding.top + plotHeight - ((val - axisMin) / (axisMax - axisMin)) * plotHeight;
  const xBase = padding.left + plotWidth * 0.3;
  const xCurr = padding.left + plotWidth * 0.7;

  // Determine colors based on result
  const resultColor =
    resultType === 'true_improvement'
      ? '#059669' // Emerald
      : resultType === 'true_decline'
      ? '#e11d48' // Rose
      : '#64748b'; // Slate

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 relative shadow-sm flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
            个体真实变化判定与测量误差带 (True Change & MDC95 Noise Band)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            灰色阴影区域为基于特定 Reference 的预期测试噪声范围 [Baseline ± MDC95]
          </p>
        </div>
      </div>

      <div className="relative flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="#f8fafc"
            stroke="#e2e8f0"
          />

          {/* Shaded Measurement Noise Band [Baseline - MDC95, Baseline + MDC95] */}
          <rect
            x={padding.left}
            y={yScale(upperThreshold)}
            width={plotWidth}
            height={Math.max(0, yScale(lowerThreshold) - yScale(upperThreshold))}
            fill="#cbd5e1"
            fillOpacity="0.45"
          />

          {/* Baseline Reference Line */}
          <line
            x1={padding.left}
            y1={yScale(baselineValue)}
            x2={padding.left + plotWidth}
            y2={yScale(baselineValue)}
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Upper Threshold Line */}
          <line
            x1={padding.left}
            y1={yScale(upperThreshold)}
            x2={padding.left + plotWidth}
            y2={yScale(upperThreshold)}
            stroke="#059669"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yScale(upperThreshold) + 3}
            className="text-[10px] font-mono fill-emerald-700 font-semibold"
          >
            可检测升高阈值: {formatNum(upperThreshold, 2)} {unit}
          </text>

          {/* Lower Threshold Line */}
          <line
            x1={padding.left}
            y1={yScale(lowerThreshold)}
            x2={padding.left + plotWidth}
            y2={yScale(lowerThreshold)}
            stroke="#e11d48"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yScale(lowerThreshold) + 3}
            className="text-[10px] font-mono fill-rose-700 font-semibold"
          >
            可检测降低阈值: {formatNum(lowerThreshold, 2)} {unit}
          </text>

          {/* Baseline Text */}
          <text
            x={padding.left + plotWidth + 6}
            y={yScale(baselineValue) + 3}
            className="text-[10px] font-mono fill-slate-700 font-medium"
          >
            基线值 (Baseline): {formatNum(baselineValue, 2)} {unit}
          </text>

          {/* Connection line between Baseline and Current */}
          <line
            x1={xBase}
            y1={yScale(baselineValue)}
            x2={xCurr}
            y2={yScale(currentValue)}
            stroke={resultColor}
            strokeWidth="2.5"
          />

          {/* Baseline Point */}
          <circle
            cx={xBase}
            cy={yScale(baselineValue)}
            r="6"
            fill="#334155"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={xBase}
            y={yScale(baselineValue) - 10}
            textAnchor="middle"
            className="text-[11px] font-mono font-bold fill-slate-800"
          >
            {formatNum(baselineValue, 2)}
          </text>

          {/* Current Point */}
          <circle
            cx={xCurr}
            cy={yScale(currentValue)}
            r="7"
            fill={resultColor}
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={xCurr}
            y={yScale(currentValue) - 12}
            textAnchor="middle"
            className="text-[11px] font-mono font-bold"
            fill={resultColor}
          >
            {formatNum(currentValue, 2)} {unit} ({record.delta >= 0 ? '+' : ''}{formatNum(record.delta, 2)})
          </text>

          {/* Column labels */}
          <text x={xBase} y={height - 12} textAnchor="middle" className="text-xs font-semibold fill-slate-700">
            基线状态 Baseline
          </text>
          <text x={xCurr} y={height - 12} textAnchor="middle" className="text-xs font-semibold fill-slate-700">
            当前测试 Current ({record.date})
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 border border-slate-200 rounded p-2.5 mt-2">
        <div>
          <span className="text-slate-500">变化量 (Δ):</span>{' '}
          <span className="font-mono font-bold text-slate-800">
            {record.delta >= 0 ? '+' : ''}{formatNum(record.delta, 2)} {unit} ({record.deltaPercent >= 0 ? '+' : ''}{formatNum(record.deltaPercent, 1)}%)
          </span>
        </div>
        <div>
          <span className="text-slate-500">MDC95 阈值:</span>{' '}
          <span className="font-mono font-bold text-slate-800">
            ±{formatNum(mdc95, 2)} {unit}
          </span>
        </div>
        <div>
          <span className="text-slate-500">判定结果:</span>{' '}
          <span
            className={`font-semibold ${
              resultType === 'true_improvement'
                ? 'text-emerald-700'
                : resultType === 'true_decline'
                ? 'text-rose-700'
                : 'text-amber-700'
            }`}
          >
            {record.resultLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
