# ==============================================================================
# Gold Standard Test-Retest Reliability Independent R Validation Script
# ==============================================================================
# Methodology Reference:
# 1. McGraw, K. O., & Wong, S. P. (1996). Forming inferences about some intraclass
#    correlation coefficients. Psychological Methods, 1(1), 30–46.
# 2. Weir, J. P. (2005). Quantifying test-retest reliability using the intraclass
#    correlation coefficient and the SEM. J Strength Cond Res, 19(1), 231-240.
# 3. Hopkins, W. G. (2000). Measures of reliability in sports medicine and science.
#    Sports Med, 30(1), 1-15.
# ==============================================================================

suppressPackageStartupMessages({
  if (!require("irr", quietly = TRUE)) install.packages("irr", repos = "https://cloud.r-project.org")
  if (!require("psych", quietly = TRUE)) install.packages("psych", repos = "https://cloud.r-project.org")
  if (!require("jsonlite", quietly = TRUE)) install.packages("jsonlite", repos = "https://cloud.r-project.org")
  library(irr)
  library(psych)
  library(jsonlite)
})

# Package versions metadata
r_version <- paste(R.version$major, R.version$minor, sep = ".")
irr_version <- as.character(packageVersion("irr"))
psych_version <- as.character(packageVersion("psych"))

dataset_dirs <- list.dirs("validation/datasets", full.names = TRUE, recursive = FALSE)

cat(sprintf("=== Running Independent R Validation Suite ===\n"))
cat(sprintf("R Version: %s\n", r_version))
cat(sprintf("irr Package Version: %s\n", irr_version))
cat(sprintf("psych Package Version: %s\n\n", psych_version))

for (dir in dataset_dirs) {
  csv_file <- file.path(dir, "input.csv")
  if (!file.exists(csv_file)) next
  
  df <- read.csv(csv_file, stringsAsFactors = FALSE)
  dataset_id <- basename(dir)
  
  # Standardize column structure
  t1 <- df$test1
  t2 <- df$test2
  ratings_mat <- cbind(t1, t2)
  n <- nrow(df)
  
  # --------------------------------------------------------------------------
  # 1. ICC Model Execution via irr::icc
  # Model: "twoway" (Two-way random-effects model for absolute agreement)
  # Type: "agreement" (Absolute agreement definition: includes systematic column variance in denominator)
  # Unit: "single" (Single measure reliability ICC(A,1))
  # --------------------------------------------------------------------------
  icc_irr <- irr::icc(
    ratings_mat,
    model = "twoway",
    type = "agreement",
    unit = "single",
    conf.level = 0.95
  )
  
  # --------------------------------------------------------------------------
  # 2. ICC Verification via psych::ICC
  # In psych::ICC output table, row 'ICC2' corresponds to:
  # "Two-way random effects, single rater, absolute agreement" [ICC(A,1) / ICC(2,1)].
  # Note: psych::ICC labels row ICC3 as "Two-way mixed, consistency", NOT absolute agreement.
  # --------------------------------------------------------------------------
  icc_psych <- psych::ICC(ratings_mat)
  icc2_row <- icc_psych$results[icc_psych$results$type == "ICC2", ]
  
  # --------------------------------------------------------------------------
  # 3. Descriptive & Hopkins / Weir Metrics
  # --------------------------------------------------------------------------
  t1_mean <- mean(t1)
  t2_mean <- mean(t2)
  grand_mean <- mean(c(t1, t2))
  diffs <- t2 - t1
  mean_bias <- mean(diffs)
  sd_diff <- sd(diffs)
  
  # Hopkins Typical Error
  te <- sd_diff / sqrt(2)
  
  # Coefficient of Variation (%)
  cv_mean <- (te / grand_mean) * 100
  
  # Weir (2005) SEM = pooled_sd * sqrt(1 - ICC_A1)
  # Pooled SD across both trials
  ss1 <- sum((t1 - t1_mean)^2)
  ss2 <- sum((t2 - t2_mean)^2)
  pooled_sd <- sqrt((ss1 + ss2) / (2 * n - 2))
  
  icc_point <- icc_irr$value
  sem <- pooled_sd * sqrt(max(0, 1 - icc_point))
  
  # Minimal Detectable Change (MDC95)
  mdc95 <- sem * 1.96 * sqrt(2)
  mdc_percent <- (mdc95 / grand_mean) * 100
  
  # Bland-Altman 95% Limits of Agreement
  loa_lower <- mean_bias - 1.96 * sd_diff
  loa_upper <- mean_bias + 1.96 * sd_diff
  
  output <- list(
    dataset_id = dataset_id,
    engine = "R-Statistical-Core",
    r_version = r_version,
    packages = list(irr = irr_version, psych = psych_version),
    icc_model_spec = list(
      irr_call = "irr::icc(ratings_mat, model='twoway', type='agreement', unit='single', conf.level=0.95)",
      psych_row = "ICC2 (Two-way random single-rater absolute agreement)",
      mcgraw_wong_notation = "ICC(A,1)",
      shrout_fleiss_notation = "ICC(2,1)"
    ),
    results = list(
      n = n,
      t1_mean = round(t1_mean, 6),
      t2_mean = round(t2_mean, 6),
      grand_mean = round(grand_mean, 6),
      mean_bias = round(mean_bias, 6),
      sd_diff = round(sd_diff, 6),
      typical_error = round(te, 6),
      cv_percent = round(cv_mean, 6),
      pooled_sd = round(pooled_sd, 6),
      icc_a1 = round(icc_point, 6),
      icc_a1_lower95 = round(icc_irr$lbound, 6),
      icc_a1_upper95 = round(icc_irr$ubound, 6),
      sem = round(sem, 6),
      mdc95 = round(mdc95, 6),
      mdc_percent = round(mdc_percent, 6),
      loa_lower = round(loa_lower, 6),
      loa_upper = round(loa_upper, 6)
    ),
    timestamp = Sys.time()
  )
  
  out_path <- file.path(dir, "expected_R.json")
  write_json(output, out_path, pretty = TRUE, auto_unbox = TRUE)
  cat(sprintf("[R Validation] Generated %s -> ICC(A,1) = %.6f [%.6f, %.6f]\n", dataset_id, icc_point, icc_irr$lbound, icc_irr$ubound))
}

cat("\n=== R Validation Completed Successfully ===\n")
