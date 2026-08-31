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
}

interface DatasetComparison {
  dataset_id: string;
  metrics: ComparisonMetric[];
}

const summary: DatasetComparison[] = [];

let maxDiffIcc = 0;
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
    };
  });

  summary.push({
    dataset_id: folder,
    metrics: comparisons,
  });
});

const report = {
  title: 'Gold Standard Independent Cross-Validation Report',
  primary_gold_standard: 'R (irr version 0.84.1 & psych version 2.4.3)',
  secondary_validation_engine: 'Python SciPy / Pingouin equivalent implementation',
  typescript_engine: 'TypeScript statistics.ts v1.0.0',
  summary_max_absolute_differences: {
    max_icc_point_diff: maxDiffIcc,
    max_typical_error_diff: maxDiffTe,
    max_cv_percent_diff: maxDiffCv,
    max_sem_diff: maxDiffSem,
    max_mdc95_diff: maxDiffMdc,
    max_mean_bias_diff: maxDiffBias,
  },
  datasets_evaluated: summary.length,
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

## 1. Primary Gold Standard Environment
- **Primary Standard**: GNU R Statistical Environment (v4.3+)
  - \`irr\` (v0.84.1): \`irr::icc(ratings, model = "twoway", type = "agreement", unit = "single", conf.level = 0.95)\`
  - \`psych\` (v2.4.3): \`psych::ICC(ratings)$results["ICC2", ]\`
- **Secondary Engine**: Python 3.10+ with equivalent \`scipy.stats\` / \`pingouin\` (\`intraclass_corr()\` -> Type \`ICC2\`)

## 2. Statistical Model Mapping & Verification
| Statistical Concept | McGraw & Wong (1996) | Shrout & Fleiss (1979) | R \`irr::icc\` | R \`psych::ICC\` | Python \`pingouin\` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Model Type** | Two-way Mixed Effects | Two-way Random / Mixed | \`model = "twoway"\` | \`ICC2\` / \`ICC3\` | \`ICC2\` / \`ICC3\` |
| **Agreement Type** | Absolute Agreement | Absolute Agreement | \`type = "agreement"\` | Row \`ICC2\` | Row \`ICC2\` |
| **Measure Type** | Single Measure | Single ($k=1$) | \`unit = "single"\` | Single | Single |
| **Notation** | **ICC(A,1)** | **ICC(2,1)** | **ICC(twoway, agreement, single)** | **ICC2 (Single_random_raters)** | **ICC2 (Two-way random single)** |

> **Critical Theoretical Distinction**:
> - **McGraw & Wong (1996) ICC(A,1)** incorporates column variance ($MS_C$, session systematic bias) into the denominator.
> - **Shrout & Fleiss (1979) ICC(3,1)** is a **consistency** model (it explicitly drops $MS_C$). In \`psych\` and \`pingouin\`, row \`ICC3\` represents **Consistency**, NOT Absolute Agreement.
> - Therefore, \`ICC(A,1)\` strictly maps to **\`ICC2\`** in \`psych\` and \`pingouin\` (and \`type="agreement"\` in \`irr\`).

## 3. Global Maximum Absolute Differences
- **ICC Point Estimate Max Difference**: \`${maxDiffIcc.toExponential(4)}\`
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

console.log('Successfully generated validation_summary.json and validation README.md');
