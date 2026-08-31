import * as fs from 'fs';
import * as path from 'path';
import { GOLD_STANDARD_DATASETS } from '../src/utils/goldStandardDatasets';
import { calculateReliability } from '../src/utils/statistics';
import { AggregatedPairData } from '../src/types';

const BASE_DIR = path.join(process.cwd(), 'validation');
const DATASETS_DIR = path.join(BASE_DIR, 'datasets');
const RESULTS_DIR = path.join(BASE_DIR, 'results');

fs.mkdirSync(DATASETS_DIR, { recursive: true });
fs.mkdirSync(RESULTS_DIR, { recursive: true });

console.log('Generating validation dataset folders and input CSVs...');

GOLD_STANDARD_DATASETS.forEach((ds) => {
  const folder = path.join(DATASETS_DIR, ds.id);
  fs.mkdirSync(folder, { recursive: true });

  // 1. Generate input.csv
  const csvRows = ['participant_id,test1,test2'];
  for (let i = 0; i < ds.t1.length; i++) {
    csvRows.push(`P${String(i + 1).padStart(2, '0')},${ds.t1[i]},${ds.t2[i]}`);
  }
  fs.writeFileSync(path.join(folder, 'input.csv'), csvRows.join('\n'), 'utf-8');

  // 2. Generate actual_typescript.json
  const pairs: AggregatedPairData[] = ds.t1.map((val, idx) => ({
    participantId: `P${String(idx + 1).padStart(2, '0')}`,
    name: `Participant ${idx + 1}`,
    test1: val,
    test2: ds.t2[idx],
    diff: ds.t2[idx] - val,
    mean: (val + ds.t2[idx]) / 2,
  }));

  const actualStats = calculateReliability(
    pairs,
    ds.id,
    ds.name,
    ds.unit,
    ds.direction,
    95
  );

  const tsOutput = {
    dataset_id: ds.id,
    engine: 'TypeScript-Statistics-Engine',
    version: '1.0.0',
    implementation_file: 'src/utils/statistics.ts',
    results: {
      n: actualStats.n,
      t1_mean: actualStats.t1Mean,
      t2_mean: actualStats.t2Mean,
      grand_mean: actualStats.grandMean,
      mean_bias: actualStats.meanBias,
      sd_diff: actualStats.biasSD,
      typical_error: actualStats.typicalError,
      cv_percent: isNaN(actualStats.cvMean) ? null : actualStats.cvMean,
      pooled_sd: actualStats.pooledSD,
      icc_a1: actualStats.iccA1,
      icc_a1_lower95: actualStats.iccA1Lower95,
      icc_a1_upper95: actualStats.iccA1Upper95,
      sem: actualStats.sem,
      mdc95: actualStats.mdc95,
      mdc_percent: isNaN(actualStats.mdcPercent) ? null : actualStats.mdcPercent,
      loa_lower: actualStats.loaLower,
      loa_upper: actualStats.loaUpper,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(folder, 'actual_typescript.json'),
    JSON.stringify(tsOutput, null, 2),
    'utf-8'
  );

  // 3. Generate expected_R.json from benchmark standard
  const rExpected = {
    dataset_id: ds.id,
    engine: 'R-irr-psych-Benchmark-Core',
    r_package_equivalent: "irr::icc(ratings, model='twoway', type='agreement', unit='single', conf.level=0.95)",
    psych_package_equivalent: "psych::ICC(ratings)$results['ICC2', ]",
    results: {
      n: ds.expected.n,
      t1_mean: ds.expected.t1Mean,
      t2_mean: ds.expected.t2Mean,
      grand_mean: ds.expected.grandMean,
      mean_bias: ds.expected.meanBias,
      sd_diff: ds.expected.biasSD,
      typical_error: ds.expected.typicalError,
      cv_percent: ds.expected.cvMean,
      pooled_sd: ds.expected.pooledSD,
      icc_a1: ds.expected.iccA1,
      icc_a1_lower95: ds.expected.iccA1Lower95,
      icc_a1_upper95: ds.expected.iccA1Upper95,
      sem: ds.expected.sem,
      mdc95: ds.expected.mdc95,
      mdc_percent: ds.expected.mdcPercent,
      loa_lower: ds.expected.loaLower,
      loa_upper: ds.expected.loaUpper,
    },
    reference_source: ds.referenceSource,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(folder, 'expected_R.json'),
    JSON.stringify(rExpected, null, 2),
    'utf-8'
  );
});

console.log('Finished generating dataset files.');
