import React, { useState } from 'react';
import { ReliabilityStats } from '../../types';
import { formatNum } from '../../utils/statistics';

interface Props {
  stats: ReliabilityStats;
}

export const IndividualSlopeChart: React.FC<Props> = ({ stats }) => {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);

  const width = 640;
  const height = 360;
  const padding = { top: 30, right: 60, bottom: 40, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const pairs = stats.pairs;
  if (!pairs || pairs.length === 0) return null;

  const allVals = pairs.flatMap(p => [p.test1, p.test2]);
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const span = maxVal - minVal || 1;
  const axisMin = Math.max(0, minVal - span * 0.1);
  const axisMax = maxVal + span * 0.1;

  const yScale = (val: number) => padding.top + plotHeight - ((val - axisMin) / (axisMax - axisMin)) * plotHeight;
  const x1 = padding.left + plotWidth * 0.25;
  const x2 = padding.left + plotWidth * 0.75;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 relative shadow-sm flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
            个体反应斜率图 (Individual Response Plot / T1 vs. T2)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            展示所有受试者在两次测试间的个体轨迹及组均值变化趋势
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-teal-600 font-medium">
            <span className="w-2.5 h-[2px] bg-teal-500 inline-block"></span> T2 增加
          </span>
          <span className="flex items-center gap-1 text-rose-600 font-medium">
            <span className="w-2.5 h-[2px] bg-rose-500 inline-block"></span> T2 降低
          </span>
          <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <span className="w-3 h-1 bg-blue-700 inline-block"></span> 群体均值
          </span>
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

          {/* Vertical axis lines for T1 and T2 */}
          <line x1={x1} y1={padding.top} x2={x1} y2={padding.top + plotHeight} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1={x2} y1={padding.top} x2={x2} y2={padding.top + plotHeight} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Individual trajectories */}
          {pairs.map((p, idx) => {
            const isHovered = hoveredSubject === p.participantId;
            const yStart = yScale(p.test1);
            const yEnd = yScale(p.test2);
            const isUp = p.test2 > p.test1;
            const strokeColor = isHovered ? '#1e293b' : isUp ? '#0d9488' : '#e11d48';
            const strokeOpacity = hoveredSubject ? (isHovered ? 1 : 0.2) : 0.6;
            const strokeWidth = isHovered ? 3 : 1.5;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredSubject(p.participantId)}
                onMouseLeave={() => setHoveredSubject(null)}
              >
                <line
                  x1={x1}
                  y1={yStart}
                  x2={x2}
                  y2={yEnd}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                />
                <circle cx={x1} cy={yStart} r={isHovered ? 5 : 3.5} fill={strokeColor} fillOpacity={strokeOpacity} />
                <circle cx={x2} cy={yEnd} r={isHovered ? 5 : 3.5} fill={strokeColor} fillOpacity={strokeOpacity} />
                {isHovered && (
                  <text
                    x={x2 + 8}
                    y={yEnd + 4}
                    className="text-[11px] font-semibold fill-slate-900"
                  >
                    {p.name}: {formatNum(p.test1, 1)} → {formatNum(p.test2, 1)} (Δ {p.diff >= 0 ? '+' : ''}{formatNum(p.diff, 2)})
                  </text>
                )}
              </g>
            );
          })}

          {/* Group Mean Trajectory (Thick line) */}
          <line
            x1={x1}
            y1={yScale(stats.t1Mean)}
            x2={x2}
            y2={yScale(stats.t2Mean)}
            stroke="#1d4ed8"
            strokeWidth="3.5"
          />
          <circle cx={x1} cy={yScale(stats.t1Mean)} r="6" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
          <circle cx={x2} cy={yScale(stats.t2Mean)} r="6" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />

          {/* Column Titles */}
          <text x={x1} y={height - 12} textAnchor="middle" className="text-xs font-semibold fill-slate-800">
            Session 1 (Test 1)
          </text>
          <text x={x2} y={height - 12} textAnchor="middle" className="text-xs font-semibold fill-slate-800">
            Session 2 (Test 2)
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 border-t border-slate-100 mt-2 pt-2 px-1">
        <div>组均值变化: {formatNum(stats.t1Mean, 2)} → {formatNum(stats.t2Mean, 2)} {stats.unit}</div>
        <div>平均偏差: {stats.meanBias >= 0 ? '+' : ''}{formatNum(stats.meanBias, 2)} {stats.unit} (p={formatNum(stats.pairedTPValue, 3)})</div>
      </div>
    </div>
  );
};
