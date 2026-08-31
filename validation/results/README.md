# Gold Standard Cross-Validation Evidence & Benchmark Documentation

**Validation status: PASS** — all listed metrics, including ICC 95% confidence limits, must remain within the declared tolerances.

## 1. Primary Gold Standard Environment
- **Primary Standard**: GNU R Statistical Environment (v4.3+)
  - `irr` (v0.84.1): `irr::icc(ratings, model = "twoway", type = "agreement", unit = "single", conf.level = 0.95)`
  - `psych` (v2.4.3): `psych::ICC(ratings)$results["ICC2", ]`
- **Secondary Engine**: Python 3.10+ with NumPy/SciPy. SciPy supplies independently maintained F/normal distributions; this suite does not claim to execute Pingouin.

## 2. Statistical Model Mapping & Verification
| Statistical Concept | McGraw & Wong (1996) | Shrout & Fleiss (1979) | R `irr::icc` | R `psych::ICC` | Python validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Model Type** | Two-way random effects | Two-way random | `model = "twoway"` | `ICC2` | Two-way random |
| **Agreement Type** | Absolute Agreement | Absolute Agreement | `type = "agreement"` | Row `ICC2` | Absolute agreement |
| **Measure Type** | Single Measure | Single ($k=1$) | `unit = "single"` | Single | Single |
| **Notation** | **ICC(A,1)** | **ICC(2,1)** | **ICC(twoway, agreement, single)** | **ICC2 (Single_random_raters)** | **ICC(A,1)** |

> **Critical Theoretical Distinction**:
> - **McGraw & Wong (1996) ICC(A,1)** incorporates column variance ($MS_C$, session systematic bias) into the denominator.
> - **Shrout & Fleiss (1979) ICC(3,1)** is a **consistency** model (it explicitly drops $MS_C$). In `psych`, row `ICC3` represents **Consistency**, NOT Absolute Agreement.
> - Therefore, `ICC(A,1)` maps to **`ICC2`** in `psych` (and `type="agreement"` in `irr`).

## 3. Global Maximum Absolute Differences
- **ICC Point Estimate Max Difference**: `4.8202e-5`
- **ICC 95% CI Lower Max Difference**: `4.2027e-5`
- **ICC 95% CI Upper Max Difference**: `4.3745e-5`
- **Typical Error (TE) Max Difference**: `4.1841e-5`
- **CV% Max Difference**: `3.5898e-5`
- **SEM Max Difference**: `3.2790e-5`
- **MDC95 Max Difference**: `4.8306e-5`
- **Mean Bias Max Difference**: `3.3333e-5`

## 4. Dataset Directory Structure
Each Gold Standard dataset is archived under `validation/datasets/<dataset-id>/` containing:
- `input.csv`: Raw test-retest input data
- `expected_R.json`: Gold Standard baseline output from R statistical environment
- `expected_Python.json`: Independent computation from Python validation engine
- `actual_typescript.json`: Execution output from TypeScript `statistics.ts`
