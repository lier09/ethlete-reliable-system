import React, { useState, useRef } from 'react';
import { ReliabilityStats } from '../../types';
import { formatNum } from '../../utils/statistics';
import { Download } from 'lucide-react';

interface Props {
  stats: ReliabilityStats;
}

export const BlandAltmanChart: React.FC<Props> = ({ stats }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    id: string;
    name: string;
    mean: number;
    diff: number;
    x: number;
    y: number;
  } | null>(null);

  const width = 640;
  const height = 360;
  const padding = { top: 30, right: 40, bottom: 50, left: 65 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const pairs = stats.pairs;
  if (!pairs || pairs.length === 0) {
    return <div className="p-8 text-center text-slate-400">无配对数据用于渲染 Bland–Altman 图</div>;
  }

  // X range: pair means
  const means = pairs.map(p => p.mean);
  const minMean = Math.min(...means);
  const maxMean = Math.max(...means);
  const meanSpan = maxMean - minMean || 1;
  const xMin = minMean - meanSpan * 0.1;
  const xMax = maxMean + meanSpan * 0.1;

  // Y range: pair diffs + LoA bounds
  const diffs = pairs.map(p => p.diff);
  const allY = [...diffs, stats.loaLower, stats.loaUpper, 0, stats.meanBias];
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const ySpan = maxY - minY || 1;
  const yMin = minY - ySpan * 0.15;
  const yMax = maxY + ySpan * 0.15;

  const xScale = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (val: number) => padding.top + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BlandAltman_${stats.metricName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 relative shadow-sm flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-sky-500 rounded-full"></span>
            Bland–Altman 一致性检验图 (Differences vs. Means)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            评估重测系统偏差 (Bias) 与 95% 一致性界限 (95% Limits of Agreement, LoA)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-mono font-medium">
            Bias: {stats.meanBias >= 0 ? '+' : ''}{formatNum(stats.meanBias, 2)}
          </div>
          <button
            onClick={handleExportSVG}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition font-medium"
            title="导出矢量图 SVG"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
        >
          {/* Background grid */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="#f8fafc"
            stroke="#e2e8f0"
          />

          {/* Shaded LoA Agreement Zone */}
          <rect
            x={padding.left}
            y={Math.max(padding.top, yScale(stats.loaUpper))}
            width={plotWidth}
            height={Math.max(0, yScale(stats.loaLower) - yScale(stats.loaUpper))}
            fill="#0284c7"
            fillOpacity="0.04"
          />

          {/* Zero Line (Perfect mean difference) */}
          <line
            x1={padding.left}
            y1={yScale(0)}
            x2={padding.left + plotWidth}
            y2={yScale(0)}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Upper LoA Line */}
          <line
            x1={padding.left}
            y1={yScale(stats.loaUpper)}
            x2={padding.left + plotWidth}
            y2={yScale(stats.loaUpper)}
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={padding.left + plotWidth - 6}
            y={yScale(stats.loaUpper) - 6}
            textAnchor="end"
            className="text-[10px] font-mono fill-red-600 font-medium"
          >
            +1.96 SD: +{formatNum(stats.loaUpper, 2)} {stats.unit}
          </text>

          {/* Mean Bias Line */}
          <line
            x1={padding.left}
            y1={yScale(stats.meanBias)}
            x2={padding.left + plotWidth}
            y2={yScale(stats.meanBias)}
            stroke="#0284c7"
            strokeWidth="2"
          />
          <text
            x={padding.left + plotWidth - 6}
            y={yScale(stats.meanBias) - 6}
            textAnchor="end"
            className="text-[10px] font-mono fill-sky-700 font-semibold"
          >
            Bias: {stats.meanBias >= 0 ? '+' : ''}{formatNum(stats.meanBias, 2)} {stats.unit}
          </text>

          {/* Lower LoA Line */}
          <line
            x1={padding.left}
            y1={yScale(stats.loaLower)}
            x2={padding.left + plotWidth}
            y2={yScale(stats.loaLower)}
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={padding.left + plotWidth - 6}
            y={yScale(stats.loaLower) + 14}
            textAnchor="end"
            className="text-[10px] font-mono fill-red-600 font-medium"
          >
            -1.96 SD: {formatNum(stats.loaLower, 2)} {stats.unit}
          </text>

          {/* Data Points */}
          {pairs.map((p, idx) => {
            const cx = xScale(p.mean);
            const cy = yScale(p.diff);
            const isOutside = p.diff > stats.loaUpper || p.diff < stats.loaLower;

            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill={isOutside ? '#ef4444' : '#0f766e'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all hover:r-7"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      id: p.participantId,
                      name: p.name,
                      mean: p.mean,
                      diff: p.diff,
                      x: cx,
                      y: cy
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Axes labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 12}
            textAnchor="middle"
            className="text-[11px] fill-slate-700 font-medium"
          >
            两轮测试均值 Mean of (T1 + T2) / 2 ({stats.unit})
          </text>
          <text
            x={15}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${padding.top + plotHeight / 2})`}
            className="text-[11px] fill-slate-700 font-medium"
          >
            重测差值 Difference (T2 - T1) ({stats.unit})
          </text>
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 bg-slate-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`
            }}
          >
            <div className="font-semibold text-sky-300">{hoveredPoint.name} ({hoveredPoint.id})</div>
            <div>均值: {formatNum(hoveredPoint.mean, 2)} {stats.unit}</div>
            <div>差值 (T2-T1): {hoveredPoint.diff >= 0 ? '+' : ''}{formatNum(hoveredPoint.diff, 2)} {stats.unit}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 border-t border-slate-100 mt-2 pt-2 px-1">
        <div>
          <span className="font-medium text-slate-700">系统偏差 Bias:</span> {formatNum(stats.meanBias, 2)} {stats.unit} (p={formatNum(stats.pairedTPValue, 3)})
        </div>
        <div>
          <span className="font-medium text-slate-700">95% LoA 区间:</span> [{formatNum(stats.loaLower, 2)} ~ +{formatNum(stats.loaUpper, 2)}] {stats.unit}
        </div>
        <div className="text-slate-500">
          样本点数: {pairs.length} (越界点: {pairs.filter(p => p.diff > stats.loaUpper || p.diff < stats.loaLower).length} 个)
        </div>
      </div>
    </div>
  );
};
