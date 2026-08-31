import { AthleteMonitoringRecord, Project, ReliabilityReference, ReliabilityStats, SuitabilityEvaluation } from '../types';
import { formatNum } from './statistics';

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReliabilityTableCSV(statsMap: Record<string, ReliabilityStats>, evalsMap: Record<string, SuitabilityEvaluation>): void {
  const headers = [
    '指标名称',
    '单位',
    '样本量(n)',
    'Test 1 均值±SD',
    'Test 2 均值±SD',
    '平均偏差 (Bias)',
    'Bias 95%CI',
    '配对t检验 p值',
    'ICC(A,1)',
    'ICC 95%CI',
    '典型误差 (TE)',
    '测量标准误 (SEM)',
    '变异系数 CV%',
    'CV 95%CI',
    'MDC95',
    'MDC%',
    '监控适用性评价',
    '是否允许建立Reference'
  ];

  const rows = Object.values(statsMap).map(s => {
    const ev = evalsMap[s.metricId];
    return [
      `"${s.metricName}"`,
      `"${s.unit}"`,
      s.n,
      `"${formatNum(s.t1Mean, 2)} ± ${formatNum(s.t1SD, 2)}"`,
      `"${formatNum(s.t2Mean, 2)} ± ${formatNum(s.t2SD, 2)}"`,
      formatNum(s.meanBias, 2),
      `"[${formatNum(s.bias95CILower, 2)}, ${formatNum(s.bias95CIUpper, 2)}]"`,
      formatNum(s.pairedTPValue, 4),
      formatNum(s.iccA1, 3),
      `"[${formatNum(s.iccA1Lower95, 3)}, ${formatNum(s.iccA1Upper95, 3)}]"`,
      formatNum(s.typicalError, 2),
      formatNum(s.sem, 2),
      `${formatNum(s.cvMean, 1)}%`,
      `"[${formatNum(s.cvLower95, 1)}%, ${formatNum(s.cvUpper95, 1)}%]"`,
      formatNum(s.mdc95, 2),
      `${formatNum(s.mdcPercent, 1)}%`,
      `"${ev ? ev.tierLabel : '-'}"`,
      ev?.isEligibleForReference ? '允许' : '不建议/禁止'
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadCSV(`可靠性统计报告_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export function exportAthleteMonitoringCSV(records: AthleteMonitoringRecord[]): void {
  const headers = [
    '记录ID',
    '测试日期',
    '运动员ID',
    '姓名',
    '指标',
    '单位',
    '基线值 (Baseline)',
    '当前值 (Current)',
    '变化量 (Δ)',
    '变化百分比 (%)',
    'MDC95',
    '可检测升高阈值',
    '可检测降低阈值',
    '判定结果',
    '判定解释',
    '所用Reference',
    'Reference ID'
  ];

  const rows = records.map(r => [
    r.id,
    r.date,
    r.athleteId,
    `"${r.athleteName}"`,
    `"${r.metricName}"`,
    `"${r.unit}"`,
    formatNum(r.baselineValue, 2),
    formatNum(r.currentValue, 2),
    formatNum(r.delta, 2),
    `${formatNum(r.deltaPercent, 1)}%`,
    formatNum(r.mdc95, 2),
    formatNum(r.upperThreshold, 2),
    formatNum(r.lowerThreshold, 2),
    `"${r.resultLabel}"`,
    `"${r.resultExplanation.replace(/"/g, '""')}"`,
    `"${r.referenceName}"`,
    r.referenceId
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadCSV(`运动员真实变化监控记录_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export function generatePrintableReportHTML(project: Project, statsMap: Record<string, ReliabilityStats>, evalsMap: Record<string, SuitabilityEvaluation>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>体育测试重测可靠性与MDC分析报告 - ${project.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 32px; font-size: 13px; line-height: 1.5; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #0f172a; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; color: #0f172a; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border-radius: 6px; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .badge-pass { background: #dcfce7; color: #15803d; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
    .badge-warn { background: #fef3c7; color: #b45309; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
    .badge-fail { background: #fee2e2; color: #b91c1c; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
    .disclaimer { margin-top: 30px; padding: 12px; background: #fffbeb; border-left: 4px solid #f59e0b; font-size: 11px; color: #92400e; }
  </style>
</head>
<body>
  <h1>体育测试重测可靠性与最小可检测变化 (MDC) 报告</h1>
  <p style="color: #64748b; margin-top: 0;">项目：${project.name} | 生成日期：${new Date().toLocaleDateString('zh-CN')}</p>

  <div class="meta-grid">
    <div><strong>体育专项：</strong>${project.sport}</div>
    <div><strong>测试名称：</strong>${project.testName}</div>
    <div><strong>测试设备：</strong>${project.device}</div>
    <div><strong>测试协议：</strong>${project.protocol}</div>
    <div><strong>测试间隔：</strong>${project.testInterval}</div>
    <div><strong>试次聚合规则：</strong>${project.aggregationMethod}</div>
  </div>

  <h2>1. 指标可靠性与测量误差统计表</h2>
  <table>
    <thead>
      <tr>
        <th>指标名称</th>
        <th>单位</th>
        <th>样本量</th>
        <th>Test 1 (均值±SD)</th>
        <th>Test 2 (均值±SD)</th>
        <th>ICC(A,1) [95%CI]</th>
        <th>CV% [95%CI]</th>
        <th>SEM</th>
        <th>MDC95</th>
        <th>MDC%</th>
        <th>监控适用性</th>
      </tr>
    </thead>
    <tbody>
      ${Object.values(statsMap).map(s => {
        const ev = evalsMap[s.metricId];
        const badgeClass = ev?.tier === 'tier_1_recommended' ? 'badge-pass' : ev?.tier === 'tier_2_caution' ? 'badge-warn' : 'badge-fail';
        return `
        <tr>
          <td><strong>${s.metricName}</strong></td>
          <td>${s.unit}</td>
          <td>${s.n}</td>
          <td>${formatNum(s.t1Mean, 2)} ± ${formatNum(s.t1SD, 2)}</td>
          <td>${formatNum(s.t2Mean, 2)} ± ${formatNum(s.t2SD, 2)}</td>
          <td>${formatNum(s.iccA1, 2)} [${formatNum(s.iccA1Lower95, 2)}-${formatNum(s.iccA1Upper95, 2)}]</td>
          <td>${formatNum(s.cvMean, 1)}%</td>
          <td>${formatNum(s.sem, 2)}</td>
          <td><strong>${formatNum(s.mdc95, 2)}</strong></td>
          <td>${formatNum(s.mdcPercent, 1)}%</td>
          <td><span class="${badgeClass}">${ev ? ev.tierLabel : '-'}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>2. 适用性评价与科学解释</h2>
  ${Object.values(evalsMap).map(ev => `
    <div style="margin-top: 14px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
      <h3 style="margin: 0 0 6px 0; font-size: 13px;">${ev.metricName} - ${ev.tierLabel}</h3>
      <p style="margin: 0; color: #334155;">${ev.detailedRationale.join(' ')}</p>
    </div>
  `).join('')}

  <div class="disclaimer">
    <strong>⚠️ 科学解释边界与方法学规范：</strong>
    本系统计算之 MDC95 代表在 95% 置信水平下，个体变化超过预期测试测量误差的临界阈值。
    运动员纵向测试变化超出 MDC95，只能客观解释为“该变化超过了当前设备协议下的测量噪声”，超过MDC仅表示观察到的变化超过预期测量误差，不说明变化的生理或训练原因。
  </div>
</body>
</html>`;
}
