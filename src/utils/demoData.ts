import { MetricDefinition, Project, RawDataRow, ReliabilityReference } from '../types';

export const DEMO_METRIC_DEFINITIONS: Record<string, MetricDefinition[]> = {
  cmj: [
    {
      id: 'jump_height',
      name: 'Jump Height',
      unit: 'cm',
      direction: 'higher_is_better',
      testName: 'Countermovement Jump (CMJ)',
      description: '基于测力板垂直起跳飞行时间/冲量积分计算的双腿跳跃高度'
    },
    {
      id: 'peak_power',
      name: 'Peak Power',
      unit: 'W',
      direction: 'higher_is_better',
      testName: 'Countermovement Jump (CMJ)',
      description: '向心推进阶段产生的最大瞬时机械功率'
    },
    {
      id: 'rsi_mod',
      name: 'RSI Modified',
      unit: 'm/s',
      direction: 'higher_is_better',
      testName: 'Countermovement Jump (CMJ)',
      description: '改良反应力量指数 (Jump Height / Time to Takeoff)'
    },
    {
      id: 'braking_rfd',
      name: 'Braking RFD',
      unit: 'N/s',
      direction: 'higher_is_better',
      testName: 'Countermovement Jump (CMJ)',
      description: '制动减速阶段的发力率 (Braking Rate of Force Development)'
    }
  ],
  sprint: [
    {
      id: 'sprint_10m',
      name: '10 m Sprint',
      unit: 's',
      direction: 'lower_is_better',
      testName: '10m / 30m Sprint Acceleration',
      description: '双光电门计时系统测定的前10米加速耗时'
    },
    {
      id: 'sprint_30m',
      name: '30 m Sprint',
      unit: 's',
      direction: 'lower_is_better',
      testName: '10m / 30m Sprint Acceleration',
      description: '双光电门计时系统测定的30米冲刺总耗时'
    }
  ]
};

// 20 Academy Rugby League Athletes (Shaw et al. 2026 framework)
export function generateRugbyCMJDataset(): RawDataRow[] {
  const athleteNames = [
    '张博文 (P01)', '李俊杰 (P02)', '王晨阳 (P03)', '刘子轩 (P04)', '陈浩宇 (P05)',
    '杨宇航 (P06)', '赵天翔 (P07)', '孙志强 (P08)', '周明浩 (P09)', '吴思远 (P10)',
    '黄文杰 (P11)', '徐鹏飞 (P12)', '朱浩然 (P13)', '胡晋鹏 (P14)', '高铭瑄 (P15)',
    '林志远 (P16)', '何少华 (P17)', '郭嘉铭 (P18)', '马云飞 (P19)', '韩梓涵 (P20)'
  ];

  // Synthetic seeds calibrated to real Shaw et al. (2026) CMJ test-retest profiles
  const baseProfiles = [
    { jh: 38.2, pp: 3950, rsi: 0.42, rfd: 4200 },
    { jh: 44.5, pp: 4420, rsi: 0.51, rfd: 5800 },
    { jh: 35.8, pp: 3710, rsi: 0.38, rfd: 3100 },
    { jh: 41.2, pp: 4180, rsi: 0.46, rfd: 4900 },
    { jh: 47.0, pp: 4680, rsi: 0.54, rfd: 6200 },
    { jh: 33.4, pp: 3520, rsi: 0.35, rfd: 2900 },
    { jh: 39.7, pp: 4050, rsi: 0.44, rfd: 4400 },
    { jh: 42.8, pp: 4300, rsi: 0.48, rfd: 5100 },
    { jh: 36.9, pp: 3820, rsi: 0.39, rfd: 3600 },
    { jh: 45.1, pp: 4500, rsi: 0.52, rfd: 5900 },
    { jh: 37.5, pp: 3900, rsi: 0.41, rfd: 3800 },
    { jh: 40.4, pp: 4120, rsi: 0.45, rfd: 4600 },
    { jh: 43.6, pp: 4380, rsi: 0.49, rfd: 5300 },
    { jh: 34.9, pp: 3640, rsi: 0.37, rfd: 3300 },
    { jh: 46.2, pp: 4610, rsi: 0.53, rfd: 6050 },
    { jh: 38.8, pp: 4010, rsi: 0.43, rfd: 4350 },
    { jh: 41.9, pp: 4240, rsi: 0.47, rfd: 4850 },
    { jh: 36.2, pp: 3780, rsi: 0.39, rfd: 3450 },
    { jh: 43.1, pp: 4350, rsi: 0.48, rfd: 5200 },
    { jh: 39.3, pp: 4080, rsi: 0.43, rfd: 4500 }
  ];

  const rows: RawDataRow[] = [];

  baseProfiles.forEach((bp, idx) => {
    const pid = `ATH-${String(idx + 1).padStart(3, '0')}`;
    const name = athleteNames[idx];
    const age = 17 + (idx % 3);
    const sex = 'Male';

    // Subject random noise generators for 2 sessions x 2 trials
    // JH has low CV (~3.5%), RFD has high CV (~18%)
    const s1_noise_jh = (Math.sin(idx * 1.7) * 0.4);
    const s2_noise_jh = (Math.cos(idx * 2.3) * 0.5);

    const s1_noise_pp = (Math.sin(idx * 1.4) * 45);
    const s2_noise_pp = (Math.cos(idx * 2.1) * 50);

    const s1_noise_rsi = (Math.sin(idx * 1.9) * 0.015);
    const s2_noise_rsi = (Math.cos(idx * 2.5) * 0.018);

    const s1_noise_rfd = (Math.sin(idx * 3.1) * 650);
    const s2_noise_rfd = (Math.cos(idx * 4.2) * 780);

    // Session 1 Trial 1 & 2
    rows.push(
      { participant_id: pid, name, age, sex, session: 1, trial: 1, metric: 'Jump Height', value: Number((bp.jh + s1_noise_jh - 0.2).toFixed(2)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 2, metric: 'Jump Height', value: Number((bp.jh + s1_noise_jh + 0.3).toFixed(2)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 1, metric: 'Peak Power', value: Number((bp.pp + s1_noise_pp - 20).toFixed(1)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 2, metric: 'Peak Power', value: Number((bp.pp + s1_noise_pp + 25).toFixed(1)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 1, metric: 'RSI Modified', value: Number((bp.rsi + s1_noise_rsi - 0.01).toFixed(3)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 2, metric: 'RSI Modified', value: Number((bp.rsi + s1_noise_rsi + 0.01).toFixed(3)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 1, metric: 'Braking RFD', value: Number((bp.rfd + s1_noise_rfd - 200).toFixed(0)) },
      { participant_id: pid, name, age, sex, session: 1, trial: 2, metric: 'Braking RFD', value: Number((bp.rfd + s1_noise_rfd + 250).toFixed(0)) }
    );

    // Session 2 Trial 1 & 2 (7 days later)
    rows.push(
      { participant_id: pid, name, age, sex, session: 2, trial: 1, metric: 'Jump Height', value: Number((bp.jh + s2_noise_jh - 0.1).toFixed(2)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 2, metric: 'Jump Height', value: Number((bp.jh + s2_noise_jh + 0.2).toFixed(2)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 1, metric: 'Peak Power', value: Number((bp.pp + s2_noise_pp - 15).toFixed(1)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 2, metric: 'Peak Power', value: Number((bp.pp + s2_noise_pp + 30).toFixed(1)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 1, metric: 'RSI Modified', value: Number((bp.rsi + s2_noise_rsi - 0.008).toFixed(3)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 2, metric: 'RSI Modified', value: Number((bp.rsi + s2_noise_rsi + 0.012).toFixed(3)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 1, metric: 'Braking RFD', value: Number((bp.rfd + s2_noise_rfd - 350).toFixed(0)) },
      { participant_id: pid, name, age, sex, session: 2, trial: 2, metric: 'Braking RFD', value: Number((bp.rfd + s2_noise_rfd + 420).toFixed(0)) }
    );
  });

  return rows;
}

// Single-Subject Dataset (N=1) for testing the hard prohibition constraint
export function generateSingleSubjectDataset(): RawDataRow[] {
  return [
    { participant_id: 'ATH-SINGLE', name: '李独苗 (Single Subject)', age: 19, sex: 'Male', session: 1, trial: 1, metric: 'Jump Height', value: 38.5 },
    { participant_id: 'ATH-SINGLE', name: '李独苗 (Single Subject)', age: 19, sex: 'Male', session: 1, trial: 2, metric: 'Jump Height', value: 39.0 },
    { participant_id: 'ATH-SINGLE', name: '李独苗 (Single Subject)', age: 19, sex: 'Male', session: 2, trial: 1, metric: 'Jump Height', value: 39.2 },
    { participant_id: 'ATH-SINGLE', name: '李独苗 (Single Subject)', age: 19, sex: 'Male', session: 2, trial: 2, metric: 'Jump Height', value: 39.8 }
  ];
}

// Pre-seeded Reliability References in Reference Library
export const INITIAL_DEMO_REFERENCES: ReliabilityReference[] = [
  {
    id: 'REF-2026-CMJ-JH',
    version: 1,
    name: '青年橄榄球运动员 CMJ 跳跃高度可靠性参考',
    createdAt: '2026-03-15T09:30:00.000Z',
    updatedAt: '2026-03-15T09:30:00.000Z',
    status: 'active',
    projectId: 'proj-demo-cmj-01',
    projectName: '青训梯队CMJ测试重测信度研究',
    sport: 'Rugby League (英式橄榄球)',
    testName: 'Countermovement Jump (CMJ)',
    metricId: 'jump_height',
    metricName: 'Jump Height',
    unit: 'cm',
    direction: 'higher_is_better',
    device: '双侧双轴测力板系统 (ForceDecks FD4000)',
    protocol: '双手叉腰双腿下蹲跳，每组2次试次，间隔60s；重测间隔7天',
    cohortDescription: 'U18-U21 青训学院男子橄榄球运动员 (N=20, 年龄 18.2±1.1 岁)',
    sampleSize: 20,
    sessionInterval: '7 天',
    sessionsCount: 2,
    trialsPerSession: 2,
    trialAggregation: 'mean',
    iccModel: 'two_way_mixed',
    iccDefinition: 'absolute_agreement',
    iccMeasureType: 'single',
    iccA1: 0.932,
    iccA1CI: [0.835, 0.974],
    iccC1: 0.934,
    teMethod: 'sd_diff_div_sqrt2',
    typicalError: 1.05,
    cvMethod: 'te_div_pooled_mean',
    cv: 2.61,
    cvCI: [1.98, 3.42],
    meanBias: 0.18,
    biasCI: [-0.32, 0.68],
    pooledSD: 3.75,
    semMethod: 'pooled_sd_sqrt_1_minus_icc',
    sem: 0.98,
    mdcConfidenceLevel: 95,
    mdcMethod: 'sem_times_z_times_sqrt2',
    mdc95: 2.71,
    mdcPercent: 6.74,
    loaLower: -2.73,
    loaUpper: 3.09,
    t1Mean: 40.12,
    t2Mean: 40.30,
    grandMean: 40.21,
    suitabilityTier: 'tier_1_recommended',
    suitabilityRationale: 'ICC(A,1)=0.932 处于极佳相对信度区间，CV=2.61% 绝对误差受控，MDC95=2.71 cm (占平均值 6.74%)，非常适合作为纵向能力发展与机能监控基准。',
    ruleVersion: 'Ruleset v1.0 (95% CI)',
    dataVersion: 'v1.0-clean',
    analysisMethodVersion: 'v1.0',
    tags: ['测力板', '爆发力', '青训', '高精度']
  },
  {
    id: 'REF-2026-CMJ-PP',
    version: 1,
    name: '青年橄榄球运动员 CMJ 峰值功率可靠性参考',
    createdAt: '2026-03-15T09:35:00.000Z',
    updatedAt: '2026-03-15T09:35:00.000Z',
    status: 'active',
    projectId: 'proj-demo-cmj-01',
    projectName: '青训梯队CMJ测试重测信度研究',
    sport: 'Rugby League (英式橄榄球)',
    testName: 'Countermovement Jump (CMJ)',
    metricId: 'peak_power',
    metricName: 'Peak Power',
    unit: 'W',
    direction: 'higher_is_better',
    device: '双侧双轴测力板系统 (ForceDecks FD4000)',
    protocol: '双手叉腰双腿下蹲跳，每组2次试次，间隔60s；重测间隔7天',
    cohortDescription: 'U18-U21 青训学院男子橄榄球运动员 (N=20, 年龄 18.2±1.1 岁)',
    sampleSize: 20,
    sessionInterval: '7 天',
    sessionsCount: 2,
    trialsPerSession: 2,
    trialAggregation: 'mean',
    iccModel: 'two_way_mixed',
    iccDefinition: 'absolute_agreement',
    iccMeasureType: 'single',
    iccA1: 0.941,
    iccA1CI: [0.862, 0.978],
    iccC1: 0.943,
    teMethod: 'sd_diff_div_sqrt2',
    typicalError: 78.4,
    cvMethod: 'te_div_pooled_mean',
    cv: 1.90,
    cvCI: [1.45, 2.49],
    meanBias: 12.4,
    biasCI: [-24.1, 48.9],
    pooledSD: 325.0,
    semMethod: 'pooled_sd_sqrt_1_minus_icc',
    sem: 79.0,
    mdcConfidenceLevel: 95,
    mdcMethod: 'sem_times_z_times_sqrt2',
    mdc95: 219.0,
    mdcPercent: 5.30,
    loaLower: -205.0,
    loaUpper: 229.8,
    t1Mean: 4125.0,
    t2Mean: 4137.4,
    grandMean: 4131.2,
    suitabilityTier: 'tier_1_recommended',
    suitabilityRationale: '相对信度极佳 (ICC=0.941)，峰值机械输出测量极其稳定，MDC95=219.0 W (5.30%)，推荐用于评估爆发力纵向增益。',
    ruleVersion: 'Ruleset v1.0 (95% CI)',
    dataVersion: 'v1.0-clean',
    analysisMethodVersion: 'v1.0',
    tags: ['机械功率', '向心推进', '测力板']
  },
  {
    id: 'REF-2026-SPRINT-10M',
    version: 1,
    name: '田径与足球运动员 10m 加速耗时可靠性参考',
    createdAt: '2026-03-10T14:20:00.000Z',
    updatedAt: '2026-03-10T14:20:00.000Z',
    status: 'active',
    projectId: 'proj-demo-sprint-01',
    projectName: '短距离冲刺加速信度标定项目',
    sport: 'Track & Field / Football',
    testName: '10m Sprint Acceleration',
    metricId: 'sprint_10m',
    metricName: '10 m Sprint',
    unit: 's',
    direction: 'lower_is_better',
    device: '双光束电子计时门 (SmartSpeed Pro)',
    protocol: '站立式起跑，前脚距第一道光电门50cm，每轮3次测试取最好成绩',
    cohortDescription: '男子高水平短跑与足球专项运动员 (N=16, 21.4±2.3岁)',
    sampleSize: 16,
    sessionInterval: '48 小时',
    sessionsCount: 2,
    trialsPerSession: 3,
    trialAggregation: 'best',
    iccModel: 'two_way_mixed',
    iccDefinition: 'absolute_agreement',
    iccMeasureType: 'single',
    iccA1: 0.895,
    iccA1CI: [0.745, 0.962],
    iccC1: 0.898,
    teMethod: 'sd_diff_div_sqrt2',
    typicalError: 0.024,
    cvMethod: 'te_div_pooled_mean',
    cv: 1.39,
    cvCI: [1.02, 1.86],
    meanBias: -0.008,
    biasCI: [-0.025, 0.009],
    pooledSD: 0.076,
    semMethod: 'pooled_sd_sqrt_1_minus_icc',
    sem: 0.0246,
    mdcConfidenceLevel: 95,
    mdcMethod: 'sem_times_z_times_sqrt2',
    mdc95: 0.068,
    mdcPercent: 3.93,
    loaLower: -0.075,
    loaUpper: 0.059,
    t1Mean: 1.735,
    t2Mean: 1.727,
    grandMean: 1.731,
    suitabilityTier: 'tier_1_recommended',
    suitabilityRationale: '光电门高采样率保证绝对变异极低 (CV=1.39%)，MDC95为 0.068 秒。由于时间越短越好，耗时缩短超过 0.068 秒判定为超出测量误差的可信提升。',
    ruleVersion: 'Ruleset v1.0 (95% CI)',
    dataVersion: 'v1.0-clean',
    analysisMethodVersion: 'v1.0',
    tags: ['光电门', '加速能力', '短跑']
  }
];

export const INITIAL_DEMO_PROJECT: Project = {
  id: 'proj-demo-cmj-01',
  name: '青训学院英式橄榄球 CMJ 测试重测信度标定',
  sport: 'Rugby League (英式橄榄球)',
  testName: 'Countermovement Jump (CMJ)',
  device: '双侧双轴测力板系统 (ForceDecks FD4000, 1000Hz)',
  protocol: '双手叉腰双腿下蹲跳，每组2次试次，间隔60s；重测间隔7天',
  testInterval: '7 天 (48h 无高强度比赛与力量训练)',
  cohortDescription: 'U18-U21 青训学院男子橄榄球运动员 (N=20, 18.2±1.1 岁)',
  sessionCount: 2,
  trialCount: 2,
  aggregationMethod: 'mean',
  notes: '严格按照 Shaw et al. (2026) 青年英式橄榄球下蹲跳重测信度方案执行，评估跳跃高度、峰值功率、RSI-mod 与制动发力率在纵向监测中的适用性。',
  createdAt: '2026-03-15T08:00:00.000Z',
  updatedAt: '2026-03-15T09:30:00.000Z',
  status: 'reference_built',
  rawDataset: generateRugbyCMJDataset(),
  metricDefinitions: DEMO_METRIC_DEFINITIONS.cmj
};
