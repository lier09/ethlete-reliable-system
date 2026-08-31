import React, { useState } from 'react';
import { ReliabilityStats } from '../../types';
import { formatNum } from '../../utils/statistics';

interface Props {
  stats: ReliabilityStats;
}

export const ScatterIdentityChart: React.FC<Props> = ({ stats }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    name: string;
    id: string;
    t1: number;
    t2: number;
    x: number;
    y: number;
  } | null>(null);

  const width = 640;
  const height = 360;
  const padding = { top: 30, right: 30, bottom: 50, left: 65 };
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

  const scale = (val: number) => padding.left + ((val - axisMin) / (axisMax - axisMin)) * plotWidth;
  const scaleY = (val: number) => padding.top + plotHeight - ((val - axisMin) / (axisMax - axisMin)) * plotHeight;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 relative shadow-sm flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            重测一致性散点图 (Test 1 vs. Test 2 Agreement)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            对角线为理论完全一致线 (y = x)，点越紧贴等值线表示重测一致性越优异
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> 受试者点
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-[2px] bg-slate-400 inline-block"></span> 等值线 y=x
            </span>
          </div>
          <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-mono font-bold">
            ICC(A,1) = {formatNum(stats.iccA1, 3)}
          </div>
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

          {/* Identity Line y = x */}
          <line
            x1={scale(axisMin)}
            y1={scaleY(axisMin)}
            x2={scale(axisMax)}
            y2={scaleY(axisMax)}
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x={scale(axisMax) - 8}
            y={scaleY(axisMax) + 16}
            textAnchor="end"
            className="text-[10px] fill-slate-500 font-mono"
          >
            等值线 y = x
          </text>

          {/* Points */}
          {pairs.map((p, idx) => {
            const cx = scale(p.test1);
            const cy = scaleY(p.test2);
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r="5"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="cursor-pointer transition-all hover:r-7"
                onMouseEnter={() =>
                  setHoveredPoint({
                    name: p.name,
                    id: p.participantId,
                    t1: p.test1,
                    t2: p.test2,
                    x: cx,
                    y: cy
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}

          {/* Axes */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 12}
            textAnchor="middle"
            className="text-[11px] fill-slate-700 font-medium"
          >
            第一轮测试成绩 Test 1 ({stats.unit})
          </text>
          <text
            x={15}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${padding.top + plotHeight / 2})`}
            className="text-[11px] fill-slate-700 font-medium"
          >
            第二轮测试成绩 Test 2 ({stats.unit})
          </text>
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-10 bg-slate-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`
            }}
          >
            <div className="font-semibold text-sky-300">{hoveredPoint.name}</div>
            <div>Test 1: {formatNum(hoveredPoint.t1, 2)} {stats.unit}</div>
            <div>Test 2: {formatNum(hoveredPoint.t2, 2)} {stats.unit}</div>
            <div>Δ: {hoveredPoint.t2 - hoveredPoint.t1 >= 0 ? '+' : ''}{formatNum(hoveredPoint.t2 - hoveredPoint.t1, 2)} {stats.unit}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 border-t border-slate-100 mt-2 pt-2 px-1">
        <div>Test 1 均值: {formatNum(stats.t1Mean, 2)} ± {formatNum(stats.t1SD, 2)} {stats.unit}</div>
        <div>Test 2 均值: {formatNum(stats.t2Mean, 2)} ± {formatNum(stats.t2SD, 2)} {stats.unit}</div>
        <div>典型误差 TE: {formatNum(stats.typicalError, 2)} {stats.unit}</div>
      </div>
    </div>
  );
};
