# Sports Test Reliability & True Change System

面向体育科研与运动表现团队的重测可靠性和个体真实变化判定系统。

系统分为两个独立工作区：

- **Reliability Lab**：使用一批受试者的 test–retest 数据估计 ICC、TE、CV、SEM、MDC95 与 Bland–Altman LoA，并根据保守准入规则决定指标能否建立正式 Reference。
- **Athlete Monitor**：使用已经通过准入的 Reference，通过 `Baseline ± MDC95` 判断运动员变化是否超过预期测量误差。

超过 MDC 只表示观察变化超过当前 Reference 所估计的测量误差，不自动证明疲劳、训练适应、伤病或其他生理原因。

## Local development

```bash
npm install
npm run dev
```

## Acceptance checks

```bash
npm test
npm run lint
npm run build
npm run validate:statistics
```

`validate:statistics` 会重新生成 TypeScript 实际结果，用独立 NumPy/SciPy 计算核对 10 组基准数据，并生成包含 ICC(A,1) 95%CI 强制验收结果的报告：

- [`validation/results/README.md`](validation/results/README.md)
- [`validation/results/validation_summary.json`](validation/results/validation_summary.json)

GitHub Actions 还会在干净环境中运行 R `irr::icc`、Python/SciPy、TypeScript、单元测试、类型检查和生产构建。TypeScript 导出脚本不得生成或覆盖 `expected_R.json`，以避免循环验证。

## Statistical specification

- Primary ICC: two-way random-effects, single-measure, absolute-agreement `ICC(A,1)` / `ICC(2,1)`
- TE: `SD(T2 − T1) / √2`
- SEM: `pooled SD × √(1 − ICC)`
- MDC95: `SEM × 1.96 × √2`
- True-change thresholds: `Baseline ± MDC95`

Tier 2 禁止建立正式 Reference 是本产品采用的保守准入策略，不是统计学上的唯一规则。
