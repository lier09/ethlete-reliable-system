#!/usr/bin/env python3
# ==============================================================================
# Gold Standard Test-Retest Reliability Independent Python Validation Engine
# ==============================================================================
# Reference Standards:
# 1. McGraw, K. O., & Wong, S. P. (1996). Psychological Methods, 1(1), 30–46.
# 2. Pingouin Statistical Package: intraclass_corr(data, targets, raters, ratings) -> 'ICC2'
# 3. Weir, J. P. (2005). Journal of Strength and Conditioning Research, 19(1), 231-240.
# 4. Hopkins, W. G. (2000). Sports Medicine, 30(1), 1-15.
# ==============================================================================

import os
import sys
import csv
import json
import math
import datetime

# Numerical F-distribution inverse survival function for exact McGraw & Wong (1996) CI
def f_quantile(p, df1, df2):
    # Precise numerical integration/bisection using regularized incomplete beta function
    def log_gamma(x):
        # Lanczos approximation
        g = 7
        c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
             771.32342877765313, -176.61502916214059, 12.507343278686905,
             -0.138571095836526, 9.9843695780195716e-6, 1.5056327351493116e-7]
        if x < 0.5:
            return math.log(math.pi / math.sin(math.pi * x)) - log_gamma(1 - x)
        x -= 1
        a = c[0]
        t = x + g + 0.5
        for i in range(1, len(c)):
            a += c[i] / (x + i)
        return 0.5 * math.log(2 * math.pi) + (x + 0.5) * math.log(t) - t + math.log(a)

    def betainc(a, b, x):
        if x == 0: return 0.0
        if x == 1: return 1.0
        # Continued fraction approximation for incomplete beta
        lbeta = log_gamma(a) + log_gamma(b) - log_gamma(a + b)
        front = math.exp(a * math.log(x) + b * math.log(1.0 - x) - lbeta) / a
        # Lentz's method
        tiny = 1e-30
        f = 1.0
        c = 1.0
        d = 0.0
        for m in range(1, 200):
            # Even step
            numer = -(a + m - 1) * (a + b + m - 1) * x / ((a + 2 * m - 2) * (a + 2 * m - 1))
            d = 1.0 + numer * d
            if abs(d) < tiny: d = tiny
            c = 1.0 + numer / c
            if abs(c) < tiny: c = tiny
            d = 1.0 / d
            f *= c * d
            # Odd step
            numer = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m))
            d = 1.0 + numer * d
            if abs(d) < tiny: d = tiny
            c = 1.0 + numer / c
            if abs(c) < tiny: c = tiny
            d = 1.0 / d
            delta = c * d
            f *= delta
            if abs(delta - 1.0) < 1e-12:
                break
        return front * f

    def f_cdf(f_val, d1, d2):
        if f_val <= 0: return 0.0
        x = (d1 * f_val) / (d1 * f_val + d2)
        return betainc(d1 / 2.0, d2 / 2.0, x)

    # Solve f_cdf(f, df1, df2) = p using bisection
    low, high = 0.0, 1000.0
    for _ in range(100):
        mid = (low + high) / 2.0
        val = f_cdf(mid, df1, df2)
        if val < p:
            low = mid
        else:
            high = mid
    return (low + high) / 2.0


def calculate_dataset_gold_standard(t1, t2):
    n = len(t1)
    k = 2  # 2 sessions
    
    # Means and deviations
    t1_mean = sum(t1) / n
    t2_mean = sum(t2) / n
    grand_mean = sum(t1 + t2) / (n * k)
    
    row_means = [(t1[i] + t2[i]) / 2.0 for i in range(n)]
    col_means = [t1_mean, t2_mean]
    
    # Sum of Squares (Two-Way Mixed ANOVA)
    ss_total = sum((x - grand_mean) ** 2 for x in t1 + t2)
    ss_rows = k * sum((rm - grand_mean) ** 2 for rm in row_means)
    ss_cols = n * sum((cm - grand_mean) ** 2 for cm in col_means)
    ss_error = max(0.0, ss_total - ss_rows - ss_cols)
    
    df_rows = n - 1
    df_cols = k - 1
    df_error = (n - 1) * (k - 1)
    
    ms_rows = ss_rows / df_rows
    ms_cols = ss_cols / df_cols
    ms_error = ss_error / df_error if df_error > 0 else 0.0
    
    # ICC(A,1) - McGraw & Wong (1996) Single Measure Absolute Agreement
    denom = ms_rows + (k - 1) * ms_error + (k / n) * (ms_cols - ms_error)
    icc_a1 = (ms_rows - ms_error) / denom if denom != 0 else 0.0
    
    # 95% Confidence Interval for ICC(A,1) using McGraw & Wong (1996)
    # F_obs = MS_R / MS_E
    f_obs = ms_rows / ms_error if ms_error > 0 else 1e9
    f_c = ms_cols / ms_error if ms_error > 0 else 1.0
    
    # Quantiles for 95% CI
    fl = f_quantile(0.975, df_rows, df_error)
    fu = f_quantile(0.975, df_error, df_rows)
    
    # Exact boundaries according to McGraw & Wong Table 5
    a = (k * f_c) / (n * f_obs)
    # Lower bound
    f_low_val = f_obs / fl
    lower_ci = (n * (f_low_val - 1)) / (n * f_low_val + k * f_c + n * (k - 1) - k) if f_low_val > 0 else -1.0
    lower_ci = max(-1.0, min(1.0, lower_ci))
    
    # Upper bound
    f_up_val = f_obs * fu
    upper_ci = (n * (f_up_val - 1)) / (n * f_up_val + k * f_c + n * (k - 1) - k) if f_up_val > 0 else 1.0
    upper_ci = max(-1.0, min(1.0, upper_ci))
    
    # Differences and Hopkins / Weir Metrics
    diffs = [t2[i] - t1[i] for i in range(n)]
    mean_bias = sum(diffs) / n
    sd_diff = math.sqrt(sum((d - mean_bias) ** 2 for d in diffs) / (n - 1)) if n > 1 else 0.0
    
    typical_error = sd_diff / math.sqrt(2)
    cv_percent = (typical_error / grand_mean * 100) if abs(grand_mean) > 1e-6 else float('nan')
    
    # Weir (2005) Pooled SD and SEM
    ss1 = sum((x - t1_mean) ** 2 for x in t1)
    ss2 = sum((x - t2_mean) ** 2 for x in t2)
    pooled_sd = math.sqrt((ss1 + ss2) / (2 * n - 2)) if n > 1 else 0.0
    sem = pooled_sd * math.sqrt(max(0.0, 1.0 - icc_a1))
    
    # MDC95
    mdc95 = sem * 1.96 * math.sqrt(2)
    mdc_percent = (mdc95 / grand_mean * 100) if abs(grand_mean) > 1e-6 else float('nan')
    
    # Limits of Agreement (Bland-Altman 1999)
    loa_lower = mean_bias - 1.96 * sd_diff
    loa_upper = mean_bias + 1.96 * sd_diff
    
    return {
        "n": n,
        "t1_mean": round(t1_mean, 6),
        "t2_mean": round(t2_mean, 6),
        "grand_mean": round(grand_mean, 6),
        "mean_bias": round(mean_bias, 6),
        "sd_diff": round(sd_diff, 6),
        "typical_error": round(typical_error, 6),
        "cv_percent": round(cv_percent, 6) if not math.isnan(cv_percent) else None,
        "pooled_sd": round(pooled_sd, 6),
        "icc_a1": round(icc_a1, 6),
        "icc_a1_lower95": round(lower_ci, 6),
        "icc_a1_upper95": round(upper_ci, 6),
        "sem": round(sem, 6),
        "mdc95": round(mdc95, 6),
        "mdc_percent": round(mdc_percent, 6) if not math.isnan(mdc_percent) else None,
        "loa_lower": round(loa_lower, 6),
        "loa_upper": round(loa_upper, 6),
        "anova_table": {
            "ms_rows": round(ms_rows, 6),
            "ms_cols": round(ms_cols, 6),
            "ms_error": round(ms_error, 6),
            "df_rows": df_rows,
            "df_cols": df_cols,
            "df_error": df_error
        }
    }


def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(root_dir, "datasets")
    
    if not os.path.exists(datasets_dir):
        print(f"Datasets directory not found: {datasets_dir}")
        sys.exit(1)
        
    print("=== Running Independent Python Validation Engine ===")
    print(f"Python Version: {sys.version.split()[0]}")
    
    for folder in sorted(os.listdir(datasets_dir)):
        folder_path = os.path.join(datasets_dir, folder)
        if not os.path.isdir(folder_path):
            continue
            
        csv_path = os.path.join(folder_path, "input.csv")
        if not os.path.exists(csv_path):
            continue
            
        t1_vals = []
        t2_vals = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                t1_vals.append(float(row['test1']))
                t2_vals.append(float(row['test2']))
                
        results = calculate_dataset_gold_standard(t1_vals, t2_vals)
        
        output_payload = {
            "dataset_id": folder,
            "engine": "Python-Scientific-Validation-Engine",
            "python_version": sys.version.split()[0],
            "framework_equivalent": "pingouin.intraclass_corr(targets='participant', raters='session', ratings='val') -> ICC2 (Two-way mixed single absolute agreement)",
            "model_specification": {
                "design": "Two-way mixed effects ANOVA",
                "definition": "Absolute Agreement",
                "measure": "Single score ICC(A,1)",
                "ci_method": "McGraw & Wong (1996) exact F-distribution",
                "sem_method": "Weir (2005) pooled_sd * sqrt(1 - ICC)",
                "te_method": "Hopkins (2000) sd_diff / sqrt(2)"
            },
            "results": results,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        out_json_path = os.path.join(folder_path, "expected_Python.json")
        with open(out_json_path, 'w', encoding='utf-8') as f:
            json.dump(output_payload, f, indent=2)
            
        print(f"[Python Validation] Processed {folder} -> ICC(A,1) = {results['icc_a1']:.6f} [{results['icc_a1_lower95']:.6f}, {results['icc_a1_upper95']:.6f}]")

    print("\n=== Python Validation Completed Successfully ===")

if __name__ == "__main__":
    main()
