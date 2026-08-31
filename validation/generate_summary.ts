import * as fs from 'fs';
import * as path from 'path';

const DATASETS_DIR = path.join(process.cwd(), 'validation', 'datasets');
const RESULTS_DIR = path.join(process.cwd(), 'validation', 'results');

const folders = fs.readdirSync(DATASETS_DIR).sort();

interface ComparisonMetric {
  metric: string;
  typescript: number | null;
  r_expected: number | null;
  python_calculated: number | null;
  diff_ts_vs_r: number | null;
  diff_ts_vs_python: number | null;
  tolerance_vs_r: number;
  tolerance_vs_python: number;
  passed: boolean;
}

interface DatasetComparison {
  dataset_id: string;
  metrics: ComparisonMetric[];
}

const summary: DatasetComparison[] = [];

let maxDiffIcc = 0;
let maxDiffIccLower = 0;
let maxDiffIccUpper = 0;
let maxDiffTe = 0;
let maxDiffCv = 0;
let maxDiffSem = 0;
let maxDiffMdc = 0;
let maxDiffBias = 0;

folders.forEach((folder) => {
  const folderPath = path.join(DATASETS_DIR, folder);
  if (!fs.statSync(folderPath).isDirectory()) return;

  const tsPath = path.join(folderPath, 'actual_typescript.json');
  const rPath = path.join(folderPath, 'expected_R.json');
  const pyPath = path.join(folderPath, 'expected_Python.json');

  if (!fs.existsSync(tsPath) || !fs.existsSync(rPath) || !fs.existsSync(pyPath)) return;

  const tsData = JSON.parse(fs.readFileSync(tsPath, 'utf-8')).results;
  const rData = JSON.parse(fs.readFileSync(rPath, 'utf-8')).results;
  const pyData = JSON.parse(fs.readFileSync(pyPath, 'utf-8')).results;

  const metricKeys = [
    { key: 'icc_a1', name: 'ICC(A,1)' },
    { key: 'icc_a1_lower95', name: 'ICC(A,1) 95% CI Lower' },
    { key: 'icc_a1_upper95', name: 'ICC(A,1) 95% CI Upper' },
    { key: 'typical_error', name: 'Typical Error (TE)' },
    { key: 'cv_percent', name: 'CV%' },
    { key: 'sem', name: 'SEM' },
    { key: 'mdc95', name: 'MDC95' },
    { key: 'mean_bias', name: 'Mean Bias' },
    { key: 'sd_diff', name: 'SDdiff' },
    { key: 'pooled_sd', name: 'Pooled SD' },
  ];

  const comparisons: ComparisonMetric[] = metricKeys.map(({ key, name }) => {
    const tsVal = tsData[key] !== undefined ? tsData[key] : null;
    const rVal = rData[key] !== undefined ? rData[key] : null;
    const pyVal = pyData[key] !== undefined ? pyData[key] : null;

    const diffR = tsVal !== null && rVal !== null ? Math.abs(tsVal - rVal) : null;
    const diffPy = tsVal !== null && pyVal !== null ? Math.abs(tsVal - pyVal) : null;

    if (key === 'icc_a1' && diffR !== null) maxDiffIcc = Math.max(maxDiffIcc, diffR);
    if (key === 'icc_a1_lower95' && diffR !== null) maxDiffIccLower = Math.max(maxDiffIccLower, diffR);
    if (key === 'icc_a1_upper95' && diffR !== null) maxDiffIccUpper = Math.max(maxDiffIccUpper, diffR);
    if (key === 'typical_error' && diffR !== null) maxDiffTe = Math.max(maxDiffTe, diffR);
    if (key === 'cv_percent' && diffR !== null) maxDiffCv = Math.max(maxDiffCv, diffR);
    if (key === 'sem' && diffR !== null) maxDiffSem = Math.max(maxDiffSem, diffR);
    if (key === 'mdc95' && diffR !== null) maxDiffMdc = Math.max(maxDiffMdc, diffR);
    if (key === 'mean_bias' && diffR !== null) maxDiffBias = Math.max(maxDiffBias, diffR);

    return {
      metric: name,
      typescript: tsVal,
      r_expected: rVal,
      python_calculated: pyVal,
      diff_ts_vs_r: diffR,
      diff_ts_vs_python: diffPy,
      tolerance_vs_r: 5e-4,
      tolerance_vs_python: 5e-5,
      passed: diffR !== null && diffPy !== null && diffR <= 5e-4 && diffPy <= 5e-5,
    };
  });

  summary.push({
    dataset_id: folder,
    metrics: comparisons,
  });
});

const report = {
  title: 'Gold Standard Independent Cross-Validation Report',
  primary_gold_standard: 'R 4.6.1 (irr 0.85 & psych 2.6.5)',
  secondary_validation_engine: 'Independent Python NumPy/SciPy implementation (no Pingouin execution claim)',
  typescript_engine: 'TypeScript statistics.ts v1.0.0',
  summary_max_absolute_differences: {
    max_icc_point_diff: maxDiffIcc,
    max_icc_lower95_diff: maxDiffIccLower,
    max_icc_upper95_diff: maxDiffIccUpper,
    max_typical_error_diff: maxDiffTe,
    max_cv_percent_diff: maxDiffCv,
    max_sem_diff: maxDiffSem,
    max_mdc95_diff: maxDiffMdc,
    max_mean_bias_diff: maxDiffBias,
  },
  datasets_evaluated: summary.length,
  validation_passed: summary.length > 0 && summary.every(dataset => dataset.metrics.every(metric => metric.passed)),
  datasets: summary,
  timestamp: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(RESULTS_DIR, 'validation_summary.json'),
  JSON.stringify(report, null, 2),
  'utf-8'
);

// Create Markdown documentation
const mdContent = `# Gold Standard Cross-Validation Evidence & Benchmark Documentation

**Validation status: ${report.validation_passed ? 'PASS' : 'FAIL'}** — all listed metrics, including ICC 95% confidence limits, must remain within the declared tolerances.

## 1. Primary Gold Standard Environment
- **Primary Standard**: GNU R Statistical Environment (v4.6.1)
  - \`irr\` (v0.85): \`irr::icc(ratings, model = "twoway", type = "agreement", unit = "single", conf.level = 0.95)\`
  - \`psych\` (v2.6.5): \`psych::ICC(ratings)$results["ICC2", ]\`
- **Secondary Engine**: Python 3.10+ with NumPy/SciPy. SciPy supplies independently maintained F/normal distributions; this suite does not claim to execute Pingouin.

## 2. Statistical Model Mapping & Verification
| Statistical Concept | McGraw & Wong (1996) | Shrout & Fleiss (1979) | R \`irr::icc\` | R \`psych::ICC\` | Python validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Model Type** | Two-way random effects | Two-way random | \`model = "twoway"\` | \`ICC2\` | Two-way random |
| **Agreement Type** | Absolute Agreement | Absolute Agreement | \`type = "agreement"\` | Row \`ICC2\` | Absolute agreement |
| **Measure Type** | Single Measure | Single ($k=1$) | \`unit = "single"\` | Single | Single |
| **Notation** | **ICC(A,1)** | **ICC(2,1)** | **ICC(twoway, agreement, single)** | **ICC2 (Single_random_raters)** | **ICC(A,1)** |

> **Critical Theoretical Distinction**:
> - **McGraw & Wong (1996) ICC(A,1)** incorporates column variance ($MS_C$, session systematic bias) into the denominator.
> - **Shrout & Fleiss (1979) ICC(3,1)** is a **consistency** model (it explicitly drops $MS_C$). In \`psych\`, row \`ICC3\` represents **Consistency**, NOT Absolute Agreement.
> - Therefore, \`ICC(A,1)\` maps to **\`ICC2\`** in \`psych\` (and \`type="agreement"\` in \`irr\`).

## 3. Global Maximum Absolute Differences
- **ICC Point Estimate Max Difference**: \`${maxDiffIcc.toExponential(4)}\`
- **ICC 95% CI Lower Max Difference**: \`${maxDiffIccLower.toExponential(4)}\`
- **ICC 95% CI Upper Max Difference**: \`${maxDiffIccUpper.toExponential(4)}\`
- **Typical Error (TE) Max Difference**: \`${maxDiffTe.toExponential(4)}\`
- **CV% Max Difference**: \`${maxDiffCv.toExponential(4)}\`
- **SEM Max Difference**: \`${maxDiffSem.toExponential(4)}\`
- **MDC95 Max Difference**: \`${maxDiffMdc.toExponential(4)}\`
- **Mean Bias Max Difference**: \`${maxDiffBias.toExponential(4)}\`

## 4. Dataset Directory Structure
Each Gold Standard dataset is archived under \`validation/datasets/<dataset-id>/\` containing:
- \`input.csv\`: Raw test-retest input data
- \`expected_R.json\`: Gold Standard baseline output from R statistical environment
- \`expected_Python.json\`: Independent computation from Python validation engine
- \`actual_typescript.json\`: Execution output from TypeScript \`statistics.ts\`
`;

fs.writeFileSync(path.join(RESULTS_DIR, 'README.md'), mdContent, 'utf-8');

if (!report.validation_passed) {
  console.error('Cross-validation failed: at least one metric exceeded tolerance or was missing.');
  process.exitCode = 1;
} else {
  console.log('Cross-validation passed for all datasets, including ICC 95% confidence limits.');
}
