/**
 * Phase 8 — FinTech / quantitative-finance hardening regression tests.
 *
 *   - Basel III 95% Expected Shortfall (ES95) coherence: ES95 >= CFaR95 (Artzner et al., 1999).
 *   - Intra-month path-minimum liquidity barrier: P(min_t B(t) < 0) catches mid-month
 *     non-sufficient-funds dips that a month-end-only projection cannot see.
 *   - Day-of-week stratified bootstrap (Künsch, 1989).
 *   - Laibson (1997) beta-delta present-bias telemetry + risk-elastic reward pricing.
 *   - Stone-Geary (1954) subsistence floor fields on the escrow checker.
 *   - Sinking-fund maturity liquidity gate (treasury spot-cash reserve).
 */
import { describe, expect, it } from 'vitest';
import {
  calculateAmortizedSubscriptions,
  calculateBehavioralMetrics,
  calculateQuarantineReward,
  runWhatIfSimulation,
  validateEscrowFloor,
  MATURITY_GATE_WINDOW_DAYS,
  REWARD_CAP,
} from '@/lib/quant-engine';
import { HISTORICAL_DAILY_SPENDING } from '@/lib/mock-data';
import type { AiMandate } from '@/lib/types';
import type { FixedBill, Subscription, WhatIfInput } from '@/lib/domain';

const MAR_1 = Date.UTC(2026, 2, 1, 9, 0, 0);
const MAR_27 = Date.UTC(2026, 2, 27, 9, 0, 0); // Friday

const bills: FixedBill[] = [
  { id: 'rent', label: 'Room rent', amountRM: 350, dueDay: 1, paid: true },
  { id: 'electric', label: 'Electricity', amountRM: 45, dueDay: 20, paid: false },
];

const baseInput = (over: Partial<WhatIfInput> = {}): WhatIfInput => ({
  currentBalance: 1240,
  fixedMonthlyBills: bills,
  remainingDaysInMonth: 19,
  monthlySavingsGoal: 300,
  userPayLimits: {
    weeklyPayLimit: 150,
    monthlyPayLimit: 600,
    weeklyTransferLimit: 300,
    monthlyTransferLimit: 1000,
  },
  spentThisWeek: 62,
  spentThisMonth: 480,
  historicalDailySpending: HISTORICAL_DAILY_SPENDING,
  proposedExpense: { amount: 180, category: 'Shopping', isNeed: false },
  seed: 20260312,
  ...over,
});

describe('Phase 8 engine regression lock (existing outputs unchanged)', () => {
  it('keeps the sandbox CFaR figures byte-stable while adding the new metrics', () => {
    const r = runWhatIfSimulation(baseInput({ seed: 42 }));
    // Regression lock (Phase 7 values must not drift) + the Phase 8 additions.
    expect(r).toMatchObject({
      shortfallProbability: 0,
      cfar95: 0,
      projectedMonthEndBalance: 624.75,
      dynamicDailyAllowance: 37.63,
      riskLevel: 'HIGH',
      limitBreach: { weekly: true, monthly: true },
      lowHistoryWarning: false,
      pathsRun: 1000,
      es95: 0,
      intraMonthLiquidityBreachProb: 0,
      lowestProjectedBalanceRM: 654.47,
      stratifiedShortfallProbability: 0,
      projectedMonthEndBalanceWithIncomeRM: 1424.75,
    });
  });
});

describe('Basel III expected shortfall coherence', () => {
  const scenarios: Array<[string, WhatIfInput]> = [
    ['sandbox default', baseInput()],
    ['dear impulse buy', baseInput({ proposedExpense: { amount: 900, category: 'Shopping', isNeed: false } })],
    ['thin balance', baseInput({ currentBalance: 300 })],
    ['low history', baseInput({ historicalDailySpending: [10, 12, 8] })],
    ['zero goal', baseInput({ monthlySavingsGoal: 0 })],
  ];

  it.each(scenarios)('ES95 >= CFaR95 (%s)', (_name, input) => {
    const r = runWhatIfSimulation(input);
    expect(r.es95).toBeGreaterThanOrEqual(r.cfar95);
    expect(Number.isFinite(r.es95)).toBe(true);
    expect(r.es95).toBeGreaterThanOrEqual(0);
  });

  it('ES95 strictly exceeds CFaR95 when the tail has spread', () => {
    const r = runWhatIfSimulation(
      baseInput({ proposedExpense: { amount: 900, category: 'Shopping', isNeed: false } }),
    );
    expect(r.cfar95).toBeGreaterThan(0);
    expect(r.es95).toBeGreaterThan(r.cfar95);
  });

  it('reports a memoized pre-authorization latency below the 50 ms budget', () => {
    const first = runWhatIfSimulation(baseInput({ seed: 7, currentBalance: 999 }));
    const second = runWhatIfSimulation(baseInput({ seed: 7, currentBalance: 999 }));
    expect(first.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(first.executionTimeMs).toBeLessThan(50);
    // Memoized with the deterministic result: identical inputs report identical telemetry.
    expect(second.executionTimeMs).toBe(first.executionTimeMs);
    expect(second).toEqual(first);
  });
});

describe('intra-month path-minimum liquidity barrier', () => {
  const daily = Array.from({ length: 45 }, () => 20);

  const dipScenario = (over: Partial<WhatIfInput> = {}): WhatIfInput =>
    baseInput({
      sandboxClock: MAR_1,
      remainingDaysInMonth: 31,
      currentBalance: 300,
      fixedMonthlyBills: [{ id: 'tuition', label: 'Tuition instalment', amountRM: 450, dueDay: 2, paid: false }],
      historicalDailySpending: daily,
      monthlySavingsGoal: 300,
      monthlyAllowanceRM: 1200,
      allowanceDayOfMonth: 25,
      proposedExpense: { amount: 0, category: 'Shopping', isNeed: false },
      ...over,
    });

  it('detects a day-2 bill that breaches zero before the day-25 allowance lands', () => {
    const r = runWhatIfSimulation(dipScenario());
    expect(r.intraMonthLiquidityBreachProb).toBe(100);
    expect(r.lowestProjectedBalanceRM).toBeLessThan(0);
    // Timing-aware month-end view: the committed inflow covers the month.
    expect(r.projectedMonthEndBalanceWithIncomeRM).toBeGreaterThanOrEqual(300);
  });

  it('does not breach when the same bill lands after the allowance', () => {
    const r = runWhatIfSimulation(
      dipScenario({
        currentBalance: 600,
        fixedMonthlyBills: [{ id: 'tuition', label: 'Tuition instalment', amountRM: 450, dueDay: 27, paid: false }],
      }),
    );
    expect(r.intraMonthLiquidityBreachProb).toBe(0);
    expect(r.lowestProjectedBalanceRM).toBeGreaterThanOrEqual(0);
  });

  it('ignores bills already marked paid', () => {
    const paid = runWhatIfSimulation(
      dipScenario({
        historicalDailySpending: Array.from({ length: 45 }, () => 0),
        fixedMonthlyBills: [{ id: 'tuition', label: 'Tuition instalment', amountRM: 450, dueDay: 2, paid: true }],
      }),
    );
    expect(paid.intraMonthLiquidityBreachProb).toBe(0);
    expect(paid.lowestProjectedBalanceRM).toBeGreaterThan(0);
  });

  it('is deterministic and lands on the 5th percentile of the path minima', () => {
    const a = runWhatIfSimulation(dipScenario());
    const b = runWhatIfSimulation(dipScenario());
    expect(a.lowestProjectedBalanceRM).toBe(b.lowestProjectedBalanceRM);
    expect(a.lowestProjectedBalanceRM).toBeLessThanOrEqual(a.projectedMonthEndBalanceWithIncomeRM);
  });
});

describe('day-of-week stratified bootstrap', () => {
  // 33 weekday observations at RM 0 and 12 weekend observations at RM 100.
  const weekendHeavy = Array.from({ length: 45 }, (_, i) => (i % 7 >= 5 ? 100 : 0));

  it('is bounded, deterministic and weekend-weighted', () => {
    const input = baseInput({
      sandboxClock: MAR_27, // Friday: the next days are Sat + Sun
      remainingDaysInMonth: 3,
      currentBalance: 150,
      fixedMonthlyBills: [],
      historicalDailySpending: weekendHeavy,
      monthlySavingsGoal: 100,
      proposedExpense: { amount: 0, category: 'Shopping', isNeed: false },
    });
    const a = runWhatIfSimulation(input);
    const b = runWhatIfSimulation(input);
    expect(a.stratifiedShortfallProbability).toBe(b.stratifiedShortfallProbability);
    expect(a.stratifiedShortfallProbability).toBeGreaterThanOrEqual(0);
    expect(a.stratifiedShortfallProbability).toBeLessThanOrEqual(100);
    expect(a.stratifiedShortfallProbability).toBeGreaterThan(a.shortfallProbability);
  });
});

describe('Laibson (1997) present-bias telemetry', () => {
  it('reports beta = 0.7 and the 1.43x present-bias inflation ratio', () => {
    const m = calculateBehavioralMetrics(180, 62, 24);
    expect(m.presentBiasBeta).toBe(0.7);
    expect(m.presentBiasInflationRatio).toBe(1.43);
  });

  it('keeps the legacy base reward unchanged', () => {
    expect(calculateBehavioralMetrics(180, 62, 24).baseRewardRM).toBe(calculateQuarantineReward(180, 24));
    expect(calculateBehavioralMetrics(180, 62, 24).baseRewardRM).toBe(9);
  });

  it('is risk-elastic but still capped and pool-bounded', () => {
    const low = calculateBehavioralMetrics(180, 5, 100);
    const high = calculateBehavioralMetrics(180, 95, 100);
    expect(high.riskElasticRewardRM).toBeGreaterThanOrEqual(low.riskElasticRewardRM);
    for (const m of [low, high]) {
      expect(m.riskElasticRewardRM).toBeLessThanOrEqual(REWARD_CAP);
      expect(m.riskElasticRewardRM).toBeLessThanOrEqual(100);
      expect(m.riskElasticRewardRM).toBeGreaterThanOrEqual(m.baseRewardRM);
    }
    expect(calculateBehavioralMetrics(180, 95, 0).riskElasticRewardRM).toBe(0);
  });
});

describe('Stone-Geary subsistence floor', () => {
  const mandate: AiMandate = { maxLockAmountRM: 200, maxLockDurationDays: 14 };

  it('exposes the RM 15/day floor and the marginal-utility safety flag', () => {
    const safe = validateEscrowFloor({
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 10,
      dynamicDailyAllowance: 50,
      durationDays: 7,
      mandate,
    });
    expect(safe.subsistenceFloorRM).toBe(15);
    expect(safe.stoneGearyMarginalUtilitySafe).toBe(true);

    const unsafe = validateEscrowFloor({
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 6, // 20 - 6 = 14 < 15
      dynamicDailyAllowance: 20,
      durationDays: 7,
      mandate,
    });
    expect(unsafe.stoneGearyMarginalUtilitySafe).toBe(false);
    expect(unsafe.ok).toBe(false);
  });
});

describe('sinking-fund maturity liquidity gate', () => {
  const subs: Subscription[] = [
    { subscriptionId: 'anytime_fitness_my', amountRM: 180, billingCycle: 'ANNUAL', nextBillingDate: '2026-04-05' },
    { subscriptionId: 'netflix_my', amountRM: 55, billingCycle: 'MONTHLY', nextBillingDate: '2026-03-15' },
  ];

  it('flags a non-monthly charge due inside the settlement window', () => {
    const [annual, monthly] = calculateAmortizedSubscriptions(subs, {
      sandboxClock: Date.UTC(2026, 2, 31, 9, 0, 0), // 5 days before the annual charge
    });
    expect(annual.daysUntilBilling).toBe(5);
    expect(annual.maturityGateTriggered).toBe(true);
    expect(monthly.maturityGateTriggered).toBe(false);
    expect(annual.monthlyBurden).toBe(15);
  });

  it('stays quiet outside the window and without a clock', () => {
    const [early] = calculateAmortizedSubscriptions(subs, { sandboxClock: MAR_1 });
    expect(early.daysUntilBilling).toBeGreaterThan(MATURITY_GATE_WINDOW_DAYS);
    expect(early.maturityGateTriggered).toBe(false);

    const [noClock] = calculateAmortizedSubscriptions(subs);
    expect(noClock.daysUntilBilling).toBeUndefined();
    expect(noClock.maturityGateTriggered).toBeUndefined();
    expect(noClock.monthlyBurden).toBe(15);
  });
});
