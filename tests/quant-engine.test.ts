import { describe, expect, it } from 'vitest';
import {
  calculateAmortizedSubscriptions,
  calculateQuarantineReward,
  calculateSubscriptionMetrics,
  classifyRisk,
  clampDailyReduction,
  computeDynamicDailyAllowance,
  isNeedCategory,
  routeIntervention,
  runWhatIfSimulation,
  toStudentUnits,
  validateEscrowFloor,
  ESCROW_RULES,
  MIN_HISTORY_DAYS,
} from '@/lib/quant-engine';
import type { FixedBill, Subscription, WhatIfInput } from '@/lib/domain';
import type { AiMandate } from '@/lib/types';
import { HISTORICAL_DAILY_SPENDING } from '@/lib/mock-data';

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

describe('runWhatIfSimulation', () => {
  it('is deterministic for the same seed', () => {
    const a = runWhatIfSimulation(baseInput());
    const b = runWhatIfSimulation(baseInput());
    expect(a).toEqual(b);
  });

  it('runs exactly 1000 paths and returns bounded probabilities', () => {
    const r = runWhatIfSimulation(baseInput());
    expect(r.pathsRun).toBe(1000);
    expect(r.shortfallProbability).toBeGreaterThanOrEqual(0);
    expect(r.shortfallProbability).toBeLessThanOrEqual(100);
    expect(r.cfar95).toBeGreaterThanOrEqual(0);
  });

  it('raising the proposed expense never lowers the shortfall probability', () => {
    const cheap = runWhatIfSimulation(baseInput({ proposedExpense: { amount: 5, category: 'Shopping', isNeed: false } }));
    const dear = runWhatIfSimulation(baseInput({ proposedExpense: { amount: 900, category: 'Shopping', isNeed: false } }));
    expect(dear.shortfallProbability).toBeGreaterThanOrEqual(cheap.shortfallProbability);
    expect(dear.projectedMonthEndBalance).toBeLessThan(cheap.projectedMonthEndBalance);
  });

  it('flags lowHistoryWarning and still returns a result below MIN_HISTORY_DAYS', () => {
    const r = runWhatIfSimulation(baseInput({ historicalDailySpending: [10, 12, 8] }));
    expect(r.lowHistoryWarning).toBe(true);
    expect(r.pathsRun).toBe(1000);
    expect(Number.isFinite(r.projectedMonthEndBalance)).toBe(true);
  });

  it('raises risk to at least HIGH on a user pay-limit breach', () => {
    const r = runWhatIfSimulation(
      baseInput({
        spentThisWeek: 149,
        proposedExpense: { amount: 180, category: 'Shopping', isNeed: false },
      }),
    );
    expect(r.limitBreach.weekly).toBe(true);
    expect(['HIGH', 'CRITICAL']).toContain(r.riskLevel);
  });

  it('a tiny balance with a big purchase is high risk', () => {
    const r = runWhatIfSimulation(baseInput({ currentBalance: 300 }));
    expect(['HIGH', 'CRITICAL']).toContain(r.riskLevel);
  });

  it('MIN_HISTORY_DAYS is 14 (DEMO_CONFIG)', () => {
    expect(MIN_HISTORY_DAYS).toBe(14);
  });
});

describe('classifyRisk', () => {
  it('maps shortfall probability bands', () => {
    expect(classifyRisk(5, 0)).toBe('LOW');
    expect(classifyRisk(20, 0)).toBe('MEDIUM');
    expect(classifyRisk(45, 0)).toBe('HIGH');
    expect(classifyRisk(70, 0)).toBe('CRITICAL');
  });
  it('forces CRITICAL when negative-balance probability exceeds 20%', () => {
    expect(classifyRisk(5, 25)).toBe('CRITICAL');
  });
});

describe('dynamic daily allowance', () => {
  it('is floored at 0 and reduced by the proposed expense', () => {
    const without = computeDynamicDailyAllowance({
      currentBalance: 100,
      unpaidFixedBills: 400,
      monthlySavingsGoal: 50,
      remainingDaysInMonth: 20,
    });
    expect(without).toBe(0);
    const withExpense = computeDynamicDailyAllowance({
      currentBalance: 1240,
      unpaidFixedBills: 75,
      monthlySavingsGoal: 300,
      remainingDaysInMonth: 19,
    });
    const withPurchase = computeDynamicDailyAllowance({
      currentBalance: 1240,
      unpaidFixedBills: 75,
      monthlySavingsGoal: 300,
      remainingDaysInMonth: 19,
      proposedExpenseAmount: 180,
    });
    expect(withPurchase).toBeLessThan(withExpense);
  });
});

describe('sinking fund amortization', () => {
  it('converts an RM 200/year licence into RM 16.67/month', () => {
    const subs: Subscription[] = [
      { subscriptionId: 'anytime_fitness_my', amountRM: 200, billingCycle: 'ANNUAL', nextBillingDate: '2026-11-01' },
    ];
    const [view] = calculateAmortizedSubscriptions(subs);
    expect(view.monthlyBurden).toBeCloseTo(16.67, 2);
    expect(view.dailyBurden).toBeCloseTo(0.55, 2);
  });

  it('quarterly is divided by 3 and monthly is unchanged', () => {
    const subs: Subscription[] = [
      { subscriptionId: 'netflix_my', amountRM: 55, billingCycle: 'MONTHLY', nextBillingDate: '2026-03-15' },
      { subscriptionId: 'disney_plus_my', amountRM: 54.9, billingCycle: 'QUARTERLY', nextBillingDate: '2026-04-20' },
    ];
    const [m, q] = calculateAmortizedSubscriptions(subs);
    expect(m.monthlyBurden).toBe(55);
    expect(q.monthlyBurden).toBeCloseTo(18.3, 2);
  });
});

describe('escrow floor (Needs/Wants protection)', () => {
  const mandate: AiMandate = { maxLockAmountRM: 200, maxLockDurationDays: 14 };
  const dda = 50;

  it('rejects NEEDS categories (they can never be locked)', () => {
    const check = validateEscrowFloor({
      lockedCategories: ['Medical'],
      dailyBudgetReduction: 10,
      dynamicDailyAllowance: dda,
      durationDays: 7,
      mandate,
    });
    expect(check.ok).toBe(false);
    expect(check.reasons).toContain('NEEDS_CATEGORY_LOCKED');
  });

  it('enforces the 40% reduction rule', () => {
    const check = validateEscrowFloor({
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 25, // > 40% of 50
      dynamicDailyAllowance: dda,
      durationDays: 7,
      mandate,
    });
    expect(check.reasons).toContain('REDUCTION_OVER_40_PERCENT');
    expect(check.maxAllowedReduction).toBeCloseTo(20, 2);
  });

  it('enforces the RM 15 daily survival floor', () => {
    const check = validateEscrowFloor({
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 6, // 20 - 6 = 14 < 15
      dynamicDailyAllowance: 20,
      durationDays: 7,
      mandate,
    });
    expect(check.reasons).toContain('BELOW_SURVIVAL_FLOOR');
    expect(check.maxAllowedReduction).toBeCloseTo(5, 2);
  });

  it('does not offer escrow at all when the allowance is at/below the floor', () => {
    const check = validateEscrowFloor({
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 1,
      dynamicDailyAllowance: ESCROW_RULES.minDailySurvivalFloorRM,
      durationDays: 7,
      mandate,
    });
    expect(check.maxAllowedReduction).toBe(0);
    expect(check.ok).toBe(false);
  });

  it('rejects proposals that exceed the AI Mandate Limit', () => {
    const check = validateEscrowFloor({
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 10,
      dynamicDailyAllowance: 100,
      durationDays: 20, // > 14 days
      mandate,
    });
    expect(check.reasons).toContain('EXCEEDS_AI_MANDATE');
  });

  it('accepts a safe, in-mandate proposal', () => {
    const check = validateEscrowFloor({
      lockedCategories: ['Shopping', 'Entertainment'],
      dailyBudgetReduction: 10,
      dynamicDailyAllowance: dda,
      durationDays: 10,
      mandate,
    });
    expect(check.ok).toBe(true);
    expect(check.maxAllowedReduction).toBeCloseTo(20, 2);
  });

  it('clamps a requested reduction to the safe maximum', () => {
    expect(clampDailyReduction(999, 20)).toBe(20);
    expect(clampDailyReduction(5, 20)).toBe(5);
    expect(clampDailyReduction(-3, 20)).toBe(0);
  });
});

describe('subscription metrics', () => {
  it('annualizes cost and computes student savings', () => {
    const m = calculateSubscriptionMetrics({ fullPriceRM: 15.9, studentPriceRM: 8.5 });
    expect(m.annualizedCost).toBeCloseTo(190.8, 2);
    expect(m.studentAnnualSavings).toBeCloseTo(88.8, 2);
    expect(m.opportunityCostMeals).toBe(1); // floor(15.9 / 9)
    expect(m.opportunityCostBubbleTea).toBe(1); // floor(15.9 / 15)
  });

  it('returns null student savings when no student plan exists', () => {
    const m = calculateSubscriptionMetrics({ fullPriceRM: 55, studentPriceRM: null });
    expect(m.studentAnnualSavings).toBeNull();
    expect(m.opportunityCostMeals).toBe(6); // floor(55 / 9)
    expect(m.opportunityCostBubbleTea).toBe(3); // floor(55 / 15)
  });
});

describe('quarantine reward', () => {
  it('is rate-limited, capped and bounded by the reward pool', () => {
    expect(calculateQuarantineReward(180, 100)).toBeCloseTo(9, 2); // 5% of 180 = 9 (< cap 15)
    expect(calculateQuarantineReward(1000, 100)).toBeCloseTo(15, 2); // capped at 15
    expect(calculateQuarantineReward(180, 3)).toBeCloseTo(3, 2); // pool-limited
    expect(calculateQuarantineReward(180, 0)).toBe(0); // empty pool -> zero
  });
});

describe('student-unit translation & routing gate', () => {
  it('computes units in the engine, never the LLM', () => {
    expect(toStudentUnits(180)).toEqual({ mixedRiceMeals: 20, bubbleTea: 12 });
  });

  it('NEEDS are advisory only', () => {
    const gate = routeIntervention({ result: { riskLevel: 'CRITICAL', limitBreach: { weekly: false, monthly: false } }, isNeed: true });
    expect(gate.action).toBe('ADVISORY_ONLY');
  });

  it('LOW/MEDIUM without breach takes the non-intervention exit path', () => {
    const gate = routeIntervention({ result: { riskLevel: 'MEDIUM', limitBreach: { weekly: false, monthly: false } }, isNeed: false });
    expect(gate.action).toBe('NONE');
  });

  it('HIGH/CRITICAL may propose a contract', () => {
    const gate = routeIntervention({ result: { riskLevel: 'HIGH', limitBreach: { weekly: false, monthly: false } }, isNeed: false });
    expect(gate.action).toBe('QUARANTINE');
  });

  it('knows which categories are NEEDS', () => {
    expect(isNeedCategory('Medical')).toBe(true);
    expect(isNeedCategory('Shopping')).toBe(false);
  });
});
