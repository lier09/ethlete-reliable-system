import React from 'react';
import { X, BookOpen, AlertTriangle, CheckCircle, HelpCircle, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              统计学方法手册与科学解释边界 | Methodology & Interpretation Guidelines
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Core Architecture */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-950 flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              一、核心数据关系与工作流逻辑 (Cohort vs. Individual)
            </h4>
            <p className="text-blue-900 mb-3">
              本系统严格遵循体育科学与计量学生态规范：
              <strong className="text-blue-950">
                “必须先通过一批受试者的重复测试数据（Cohort Test–Retest）建立可靠性参考（Reliability Reference），随后才能在运动员监控中用于判断单个运动员。”
              </strong>
            </p>
            <div className="bg-white/80 p-3 rounded border border-blue-200 font-mono text-xs text-blue-900 space-y-1">
              <div>Cohort Test–Retest (群体重复测试数据, 建议 n ≥ 10)</div>
              <div>&nbsp;↳ Reliability Analysis (两因素混合方差分析、典型误差、CV%、MDC95)</div>
              <div>&nbsp;&nbsp;↳ Monitoring Suitability Evaluation (多维度监控适用性三级分级评估)</div>
              <div>&nbsp;&nbsp;&nbsp;↳ Reliability Reference (固化特定人群×设备×协议的参考基准)</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;↳ Individual Athlete Monitoring (输入基线与当前值，判定是否突破测量误差)</div>
            </div>
            <p className="text-xs text-rose-700 mt-2 font-medium">
              ⛔ 严禁错误：如果仅有1名受试者输入T1与T2，系统硬性禁止计算ICC或生成Reference，必须提示使用群体数据或直接调用已有资料库。
            </p>
          </div>

          {/* Section 2: Mathematical Formulas */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              二、核心统计指标与计算公式
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="font-semibold text-slate-900 mb-1">1. 两因素绝对一致性 ICC(A,1)</div>
                <div className="text-xs text-slate-600 mb-2">
                  Two-way mixed single-measure intra-class correlation coefficient:
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 font-mono text-xs">
                  ICC(A,1) = (MS_R - MS_E) / [MS_R + (k-1)MS_E + (k/n)(MS_C - MS_E)]
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  考虑了测试轮次间的系统偏差 ($MS_C$)，比纯相关系数 $r$ 或一致性 ICC(C,1) 更加严格。
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="font-semibold text-slate-900 mb-1">2. 典型误差 TE 与 测量标准误 SEM</div>
                <div className="text-xs text-slate-600 mb-2">
                  Hopkins (2000) 与 ANOVA 均方误差根:
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 font-mono text-xs">
                  TE = SD_diff / √2 | SEM = √(MS_Error)
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  量化同一次协议下受试者重复测试内固有的随机测量噪声（以原始物理单位表示）。
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="font-semibold text-slate-900 mb-1">3. 变异系数 CV% (Coefficient of Variation)</div>
                <div className="text-xs text-slate-600 mb-2">
                  无量纲化个体测量内相对离散度:
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 font-mono text-xs">
                  CV_i (%) = [ |T1 - T2| / (√2 × Mean_i) ] × 100%
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  反映个体测试波动占其测试平均值的百分比，高水平运动监控通常要求 CV ≤ 8%（最好 ≤ 5%）。
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="font-semibold text-slate-900 mb-1">4. 最小可检测变化 MDC95 (Minimum Detectable Change)</div>
                <div className="text-xs text-slate-600 mb-2">
                  95% 置信区间下的真实变化界限 (Weir, 2005):
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 font-mono text-xs">
                  MDC95 = 1.96 × √2 × SEM = 2.7718 × SEM
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Upper Threshold = Baseline + MDC95
                  <br />Lower Threshold = Baseline - MDC95
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Monitoring Suitability Tiers */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">三、监控适用性三级判定标准 (Monitoring Suitability Evaluation)</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5">Tier 1</span>
                <div>
                  <div className="font-semibold text-emerald-950">推荐用于纵向监控 (Recommended)</div>
                  <div className="text-xs text-emerald-800">
                    要求：n ≥ 10, ICC(A,1) ≥ 0.80 且 95%CI下限 ≥ 0.70, CV ≤ 8.0% 且 95%CI上限 ≤ 12.0%, MDC% ≤ 15.0%, 无显著学习效应。
                    <br /><strong>结果：允许建立 Reliability Reference 并固化到资料库。</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5">Tier 2</span>
                <div>
                  <div className="font-semibold text-amber-950">可采用，但需谨慎 (Acceptable with Caution)</div>
                  <div className="text-xs text-amber-800">
                    信度或变异处于临界区间（例如 0.70 ≤ ICC &lt; 0.80 或 8% &lt; CV ≤ 12%）。小幅变化可能淹没在噪声中，建议结合其他指标联合分析，系统默认不推荐作为单指标决策。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5">Tier 3</span>
                <div>
                  <div className="font-semibold text-rose-950">不建议作为主要监控指标 (Not Recommended)</div>
                  <div className="text-xs text-rose-800">
                    重测变异过高（如 Braking RFD 常有 CV &gt; 18% 或 MDC% &gt; 35%）或 ICC &lt; 0.70。
                    <strong>系统硬性禁用建立 Reference 功能，以避免给教练员产生虚假的测量精确性假象。</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Boundary of Interpretation */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-amber-950 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              四、不可逾越的科学解释边界 (Interpretation Boundaries)
            </h4>
            <p className="text-xs text-amber-900 leading-normal">
              <strong>本系统不是疲劳诊断系统，亦非伤病预测模型。</strong>
              当运动员测试变化超过 MDC95 时，统计学上<strong>只能解释为：“该变化在 95% 置信度下超过了当前测试协议下的预期测量误差。”</strong>
              <br />
              不得脱离训练背景直接定性为中枢疲劳、肌肉损伤或超量恢复，必须由体能教练和运动科学家结合实际负荷数据（如 GPS 总跑动距离、RPE 主观疲劳评分）与临床检查综合研判。
            </p>
          </div>

          {/* Section 5: References */}
          <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
            <div className="font-semibold text-slate-700 mb-1">方法学参考来源：</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Shaw et al. (2026). Test–Retest Reliability of Countermovement Jump Testing in Academy Rugby League Environments: Establishing Thresholds for Minimum Detectable Change to Guide Longitudinal Development.</li>
              <li>Hopkins, W. G. (2000). Measures of reliability in sports medicine and science. <em>Sports Medicine</em>, 30(1), 1-15.</li>
              <li>Weir, J. P. (2005). Quantifying test-retest reliability using the intraclass correlation coefficient and the SEM. <em>J Strength Cond Res</em>, 19(1), 231-240.</li>
              <li>Bland, J. M., & Altman, D. (1986). Statistical methods for assessing agreement between two methods of clinical measurement. <em>The Lancet</em>, 327(8476), 307-310.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            我已阅读并知晓方法学规范
          </button>
        </div>
      </div>
    </div>
  );
};
