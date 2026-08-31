#!/usr/bin/env python3
"""Independent numerical validation for the browser reliability engine.

The application remains a custom TypeScript implementation. This script uses
NumPy and SciPy's independently maintained probability distributions, then
checks every reported metric (including ICC confidence limits) against both
R reference output and TypeScript output. It intentionally does not claim that
Pingouin was executed.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import scipy
from scipy import stats


ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = ROOT / "datasets"
FIELDS = (
    "n",
    "t1_mean",
    "t2_mean",
    "grand_mean",
    "mean_bias",
    "sd_diff",
    "typical_error",
    "cv_percent",
    "pooled_sd",
    "icc_a1",
    "icc_a1_lower95",
    "icc_a1_upper95",
    "sem",
    "mdc95",
    "mdc_percent",
    "loa_lower",
    "loa_upper",
)

# R fixtures are rounded to four decimals; this tolerance is deliberately
# tighter than any product decision threshold but allows fixture rounding.
R_ABSOLUTE_TOLERANCE = 5e-4
TS_ABSOLUTE_TOLERANCE = 5e-5


def read_dataset(csv_path: Path) -> tuple[np.ndarray, np.ndarray]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return (
        np.asarray([float(row["test1"]) for row in rows], dtype=float),
        np.asarray([float(row["test2"]) for row in rows], dtype=float),
    )


def calculate_results(t1: np.ndarray, t2: np.ndarray) -> dict[str, object]:
    if t1.shape != t2.shape or t1.size < 2:
        raise ValueError("Validation data require at least two paired observations.")
    if not np.isfinite(t1).all() or not np.isfinite(t2).all():
        raise ValueError("Validation data must contain only finite values.")

    n = int(t1.size)
    k = 2
    matrix = np.column_stack((t1, t2))
    t1_mean = float(t1.mean())
    t2_mean = float(t2.mean())
    grand_mean = float(matrix.mean())
    row_means = matrix.mean(axis=1)
    column_means = matrix.mean(axis=0)

    ss_total = float(np.square(matrix - grand_mean).sum())
    ss_rows = float(k * np.square(row_means - grand_mean).sum())
    ss_columns = float(n * np.square(column_means - grand_mean).sum())
    ss_error = max(0.0, ss_total - ss_rows - ss_columns)
    ms_rows = ss_rows / (n - 1)
    ms_columns = ss_columns / (k - 1)
    ms_error = ss_error / ((n - 1) * (k - 1))

    icc_denominator = (
        ms_rows
        + (k - 1) * ms_error
        + (k / n) * (ms_columns - ms_error)
    )
    icc_a1 = (ms_rows - ms_error) / icc_denominator

    # McGraw & Wong ICC(A,1) exact limits. SciPy supplies the F quantile;
    # R irr::icc is the independent package-level reference.
    f_upper = float(stats.f.ppf(0.975, n - 1, n - 1))
    lower_numerator = n * (ms_rows - f_upper * ms_error)
    lower_denominator = (
        f_upper * (k * ms_columns + (k * n - k - n) * ms_error)
        + n * ms_rows
    )
    upper_numerator = n * (f_upper * ms_rows - ms_error)
    upper_denominator = (
        k * ms_columns
        + (k * n - k - n) * ms_error
        + n * f_upper * ms_rows
    )
    lower_ci = float(np.clip(lower_numerator / lower_denominator, -1.0, 1.0))
    upper_ci = float(np.clip(upper_numerator / upper_denominator, -1.0, 1.0))

    differences = t2 - t1
    mean_bias = float(differences.mean())
    sd_diff = float(differences.std(ddof=1))
    typical_error = sd_diff / math.sqrt(2)
    pooled_sd = float(
        math.sqrt(
            ((n - 1) * t1.var(ddof=1) + (n - 1) * t2.var(ddof=1))
            / (2 * n - 2)
        )
    )
    sem = pooled_sd * math.sqrt(max(0.0, 1.0 - icc_a1))
    mdc95 = sem * float(stats.norm.ppf(0.975)) * math.sqrt(2)
    cv_percent = typical_error / abs(grand_mean) * 100 if abs(grand_mean) >= 1e-6 else None
    mdc_percent = mdc95 / abs(grand_mean) * 100 if abs(grand_mean) >= 1e-6 else None

    return {
        "n": n,
        "t1_mean": t1_mean,
        "t2_mean": t2_mean,
        "grand_mean": grand_mean,
        "mean_bias": mean_bias,
        "sd_diff": sd_diff,
        "typical_error": typical_error,
        "cv_percent": cv_percent,
        "pooled_sd": pooled_sd,
        "icc_a1": float(icc_a1),
        "icc_a1_lower95": lower_ci,
        "icc_a1_upper95": upper_ci,
        "sem": sem,
        "mdc95": mdc95,
        "mdc_percent": mdc_percent,
        "loa_lower": mean_bias - 1.959964 * sd_diff,
        "loa_upper": mean_bias + 1.959964 * sd_diff,
        "anova_table": {
            "ms_rows": ms_rows,
            "ms_columns": ms_columns,
            "ms_error": ms_error,
            "df_rows": n - 1,
            "df_columns": k - 1,
            "df_error": (n - 1) * (k - 1),
        },
    }


def payload(dataset_id: str, results: dict[str, object]) -> dict[str, object]:
    return {
        "dataset_id": dataset_id,
        "engine": "Python-NumPy-SciPy-Independent-Validation",
        "python_version": platform.python_version(),
        "packages": {"numpy": np.__version__, "scipy": scipy.__version__},
        "model_specification": {
            "design": "Two-way random-effects ANOVA",
            "definition": "Absolute agreement",
            "measure": "Single score ICC(A,1) / ICC(2,1)",
            "ci_method": "McGraw & Wong exact F-distribution; scipy.stats.f.ppf",
            "independent_primary_reference": "R irr::icc(model='twoway', type='agreement', unit='single')",
        },
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def assert_close(
    dataset_id: str,
    source: str,
    actual: dict[str, object],
    expected: dict[str, object],
    tolerance: float,
) -> None:
    failures: list[str] = []
    for field in FIELDS:
        observed = actual.get(field)
        reference = expected.get(field)
        if observed is None and reference is None:
            continue
        if observed is None or reference is None:
            failures.append(f"{field}: {observed!r} != {reference!r}")
            continue
        difference = abs(float(observed) - float(reference))
        if difference > tolerance:
            failures.append(
                f"{field}: observed={float(observed):.9g}, "
                f"reference={float(reference):.9g}, diff={difference:.3g}"
            )
    if failures:
        details = "\n  ".join(failures)
        raise AssertionError(f"{dataset_id} failed against {source}:\n  {details}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Do not rewrite fixtures; fail if Python differs from R or TypeScript.",
    )
    args = parser.parse_args()

    checked = 0
    for dataset_dir in sorted(path for path in DATASETS_DIR.iterdir() if path.is_dir()):
        t1, t2 = read_dataset(dataset_dir / "input.csv")
        results = calculate_results(t1, t2)
        output = payload(dataset_dir.name, results)

        if args.check:
            r_results = json.loads((dataset_dir / "expected_R.json").read_text(encoding="utf-8"))["results"]
            ts_results = json.loads((dataset_dir / "actual_typescript.json").read_text(encoding="utf-8"))["results"]
            assert_close(dataset_dir.name, "R irr::icc fixtures", results, r_results, R_ABSOLUTE_TOLERANCE)
            assert_close(dataset_dir.name, "TypeScript engine", results, ts_results, TS_ABSOLUTE_TOLERANCE)
        else:
            (dataset_dir / "expected_Python.json").write_text(
                json.dumps(output, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        checked += 1

    action = "validated" if args.check else "generated"
    print(f"Python/SciPy {action} {checked} datasets, including ICC 95% confidence limits.")


if __name__ == "__main__":
    main()
