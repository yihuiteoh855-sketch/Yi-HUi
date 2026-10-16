/**
 * CtrlPay deterministic quantitative engine.
 *
 * THE SERVER-SIDE AUTHORITY RULE (plan.md Section 3.2):
 *   The LLM extracts intent + identifiers only. EVERY money figure, probability
 *   and percentage is computed here, deterministically. The LLM never computes
 *   and never sees the signing secret.
 *
 * This module is intentionally ISOMORPHIC (no node:crypto, no node:fs) so the
 * sandbox UI can read the same DEMO_CONFIG and helpers. Proposal signing lives
 * in `lib/signing.ts` (server-only).
 */
import { mulberry32, randInt } from './prng';
import { round2 } from './utils';
import type {
  AmortizedView,
  EscrowFloorCheck,
  FixedBill,
  Subscription,
  SubscriptionMetrics,
  WhatIfInput,
  WhatIfResult,
} from './domain';
import type { AiMandate, SpendCategory } from './types';

/* ------------------------------------------------------------------ *
 * DEMO_CONFIG — sandbox configuration values, NOT market data.
 * ------------------------------------------------------------------ */
export const DEMO_CONFIG = {
  /** Student purchasing-power benchmarks (RM). */
  studentUnits: {
    campusMixedRice: 9.0,
    bubbleTea: 15.0,
  },
  /** Monte Carlo paths per simulation. */
  monteCarloPaths: 1000,
  /** Minimum days of history before we warn the user. */
  minHistoryDays: 14,
  /** Default deterministic PRNG seed. */
  defaultSeed: 20260312,
  /** Quarantine reward economics: reward = min(itemPrice * rate, cap, pool). */
  rewardRate: 0.05,
  rewardCap: 15.0,
  /** Two-stage sweep settlement split (savings -> vault / rewardPool). */
  sweepVaultSplit: 0.5,
  /** Risk classification thresholds (shortfall probability, %). */
  riskThresholds: { low: 10, medium: 30, high: 60 },
  /** Negative-balance probability that forces CRITICAL. */
  criticalNegativeProbability: 20,
} as const;

export const MONTE_CARLO_PATHS = DEMO_CONFIG.monteCarloPaths;
export const MIN_HISTORY_DAYS = DEMO_CONFIG.minHistoryDays;
export const REWARD_RATE = DEMO_CONFIG.rewardRate;
export const REWARD_CAP = DEMO_CONFIG.rewardCap;

export const NEEDS_CATEGORIES = [
  'Bills_Utilities',
  'Campus_Cafeteria_Basic',
  'Medical',
  'Transport_Essential',
] as const;

export const WANTS_CATEGORIES = [
  'Food_Delivery_Grab_Foodpanda',
  'Entertainment',
  'Bubble_Tea_Dining',
  'Shopping',
] as const;

export const ESCROW_RULES = {
  maxReductionRatio: 0.4, // dailyBudgetReduction <= 40% of dynamicDailyAllowance
  minDailySurvivalFloorRM: 15, // basic-meal floor
} as const;

export function isNeedCategory(category: SpendCategory): boolean {
  return (NEEDS_CATEGORIES as readonly string[]).includes(category);
}

/* ------------------------------------------------------------------ *
 * Student-unit translation (always computed here, never by the LLM)
 * ------------------------------------------------------------------ */

export interface StudentUnits {
  mixedRiceMeals: number;
  bubbleTea: number;
}

export function toStudentUnits(amountRM: number): StudentUnits {
  const amount = Math.max(0, amountRM);
  return {
    mixedRiceMeals: Math.floor(amount / DEMO_CONFIG.studentUnits.campusMixedRice),
    bubbleTea: Math.floor(amount / DEMO_CONFIG.studentUnits.bubbleTea),
  };
}

/* ------------------------------------------------------------------ *
 * Dynamic daily allowance
 * ------------------------------------------------------------------ */

export function computeDynamicDailyAllowance(args: {
  currentBalance: number;
  unpaidFixedBills: number;
  monthlySavingsGoal: number;
  remainingDaysInMonth: number;
  proposedExpenseAmount?: number;
  amortizedMonthlyBurden?: number;
}): number {
  const days = Math.max(1, Math.floor(args.remainingDaysInMonth));
  const bills = args.unpaidFixedBills + (args.amortizedMonthlyBurden ?? 0);
  const raw =
    (args.currentBalance - bills - args.monthlySavingsGoal - (args.proposedExpenseAmount ?? 0)) /
    days;
  return round2(Math.max(0, raw));
}

export function unpaidFixedBillTotal(bills: FixedBill[]): number {
  return round2(bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amountRM, 0));
}

/* ------------------------------------------------------------------ *
 * Risk classification
 * ------------------------------------------------------------------ */

export function classifyRisk(
  shortfallProbability: number,
  negativeProbability: number,
): WhatIfResult['riskLevel'] {
  if (
    shortfallProbability >= DEMO_CONFIG.riskThresholds.high ||
    negativeProbability > DEMO_CONFIG.criticalNegativeProbability
  ) {
    return 'CRITICAL';
  }
  if (shortfallProbability >= DEMO_CONFIG.riskThresholds.medium) return 'HIGH';
  if (shortfallProbability >= DEMO_CONFIG.riskThresholds.low) return 'MEDIUM';
  return 'LOW';
}

const RISK_ORDER: Record<WhatIfResult['riskLevel'], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function maxRisk(
  a: WhatIfResult['riskLevel'],
  b: WhatIfResult['riskLevel'],
): WhatIfResult['riskLevel'] {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

/* ------------------------------------------------------------------ *
 * Cash-Flow-at-Risk via historical bootstrap Monte Carlo (Section 3.3)
 * ------------------------------------------------------------------ */

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil(p * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

export function runWhatIfSimulation(input: WhatIfInput): WhatIfResult {
  const N = MONTE_CARLO_PATHS;
  const seed = input.seed ?? DEMO_CONFIG.defaultSeed;
  const rng = mulberry32(seed);

  const B = input.currentBalance;
  const U = unpaidFixedBillTotal(input.fixedMonthlyBills);
  const P = input.proposedExpense.amount;
  const G = input.monthlySavingsGoal;
  const D = Math.max(1, Math.floor(input.remainingDaysInMonth));

  const rawHistory = input.historicalDailySpending.filter((v) => Number.isFinite(v) && v >= 0);
  const lowHistoryWarning = rawHistory.length < MIN_HISTORY_DAYS;

  // Below MIN_HISTORY_DAYS we bootstrap from a flat estimate (mean daily spend).
  let history = rawHistory;
  if (lowHistoryWarning) {
    const mean =
      rawHistory.length > 0
        ? rawHistory.reduce((s, v) => s + v, 0) / rawHistory.length
        : DEMO_CONFIG.studentUnits.campusMixedRice * 2; // conservative flat fallback: RM 18/day
    history = Array.from({ length: MIN_HISTORY_DAYS }, () => mean);
  }
  const m = history.length;

  const balances: number[] = new Array(N);
  const shortfalls: number[] = new Array(N);
  let shortfallCount = 0;
  let negativeCount = 0;
  let balanceSum = 0;

  for (let i = 0; i < N; i++) {
    let S = 0;
    for (let j = 0; j < D; j++) {
      S += history[randInt(rng, m)];
    }
    const E = B - U - P - S;
    const L = Math.max(0, G - E);
    balances[i] = E;
    shortfalls[i] = L;
    balanceSum += E;
    if (E < G) shortfallCount++;
    if (E < 0) negativeCount++;
  }

  const projectedMonthEndBalance = round2(balanceSum / N);
  const shortfallProbability = round2((100 * shortfallCount) / N);
  const negativeProbability = (100 * negativeCount) / N;

  shortfalls.sort((a, b) => a - b);
  const cfar95 = round2(percentile(shortfalls, 0.95));

  const dynamicDailyAllowance = computeDynamicDailyAllowance({
    currentBalance: B,
    unpaidFixedBills: U,
    monthlySavingsGoal: G,
    remainingDaysInMonth: D,
    proposedExpenseAmount: P,
  });

  const limitBreach = {
    weekly: input.spentThisWeek + P > input.userPayLimits.weeklyPayLimit,
    monthly: input.spentThisMonth + P > input.userPayLimits.monthlyPayLimit,
  };

  let riskLevel = classifyRisk(shortfallProbability, negativeProbability);
  if (limitBreach.weekly || limitBreach.monthly) {
    riskLevel = maxRisk(riskLevel, 'HIGH');
  }

  return {
    shortfallProbability,
    cfar95,
    projectedMonthEndBalance,
    dynamicDailyAllowance,
    riskLevel,
    limitBreach,
    lowHistoryWarning,
    pathsRun: N,
  };
}

/* ------------------------------------------------------------------ *
 * Sinking fund amortization (Section 3.4)
 * ------------------------------------------------------------------ */

export function calculateAmortizedSubscriptions(subs: Subscription[]): AmortizedView[] {
  return subs.map((s) => {
    let monthlyBurden: number;
    if (s.billingCycle === 'ANNUAL') monthlyBurden = s.amountRM / 12;
    else if (s.billingCycle === 'QUARTERLY') monthlyBurden = s.amountRM / 3;
    else monthlyBurden = s.amountRM;
    const dailyBurden = (monthlyBurden * 12) / 365;
    return {
      subscriptionId: s.subscriptionId,
      monthlyBurden: round2(monthlyBurden),
      dailyBurden: round2(dailyBurden),
      setAsideThisMonth: round2(monthlyBurden),
    } as AmortizedView;
  });
}

export function totalAmortizedMonthlyBurden(subs: Subscription[]): number {
  return round2(
    calculateAmortizedSubscriptions(subs).reduce((sum, v) => sum + v.monthlyBurden, 0),
  );
}

/* ------------------------------------------------------------------ *
 * Needs/Wants protection floor (Section 3.5)
 * ------------------------------------------------------------------ */

export function validateEscrowFloor(args: {
  lockedCategories: SpendCategory[];
  dailyBudgetReduction: number;
  dynamicDailyAllowance: number;
  durationDays: number;
  mandate: AiMandate;
}): EscrowFloorCheck {
  const reasons: EscrowFloorCheck['reasons'] = [];
  const dda = args.dynamicDailyAllowance;

  // (a) NEEDS categories can never appear in lockedCategories.
  if (args.lockedCategories.some((c) => isNeedCategory(c))) {
    reasons.push('NEEDS_CATEGORY_LOCKED');
  }

  // (b) reduction <= 40% of DDA AND DDA - reduction >= survival floor.
  const byRatio = ESCROW_RULES.maxReductionRatio * dda;
  const byFloor = dda - ESCROW_RULES.minDailySurvivalFloorRM;
  const maxAllowedReduction = round2(Math.max(0, Math.min(byRatio, byFloor)));

  if (maxAllowedReduction <= 0) {
    // Too little daily allowance to lock anything without breaking the survival floor.
    reasons.push('BELOW_SURVIVAL_FLOOR');
  } else {
    if (args.dailyBudgetReduction > byRatio + 1e-9) reasons.push('REDUCTION_OVER_40_PERCENT');
    if (dda - args.dailyBudgetReduction < ESCROW_RULES.minDailySurvivalFloorRM - 1e-9) {
      reasons.push('BELOW_SURVIVAL_FLOOR');
    }
  }

  // (c) duration + total locked RM within the AI Mandate Limit.
  const totalLocked = round2(args.dailyBudgetReduction * args.durationDays);
  if (
    args.durationDays > args.mandate.maxLockDurationDays ||
    totalLocked > args.mandate.maxLockAmountRM + 1e-9
  ) {
    reasons.push('EXCEEDS_AI_MANDATE');
  }

  const unique = Array.from(new Set(reasons));
  return { ok: unique.length === 0, reasons: unique, maxAllowedReduction };
}

/** Clamp a requested daily reduction into the safe escrow bounds. */
export function clampDailyReduction(requested: number, maxAllowedReduction: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return round2(Math.min(requested, maxAllowedReduction));
}

/* ------------------------------------------------------------------ *
 * Subscription annualized + opportunity cost (Section 3.6)
 * ------------------------------------------------------------------ */

export function calculateSubscriptionMetrics(args: {
  fullPriceRM: number;
  studentPriceRM: number | null;
}): SubscriptionMetrics {
  const annualizedCost = round2(args.fullPriceRM * 12);
  const studentAnnualSavings =
    args.studentPriceRM === null
      ? null
      : round2((args.fullPriceRM - args.studentPriceRM) * 12);
  return {
    annualizedCost,
    studentAnnualSavings,
    opportunityCostMeals: Math.floor(args.fullPriceRM / DEMO_CONFIG.studentUnits.campusMixedRice),
    opportunityCostBubbleTea: Math.floor(args.fullPriceRM / DEMO_CONFIG.studentUnits.bubbleTea),
  };
}

/* ------------------------------------------------------------------ *
 * Quarantine reward (Section 3.7)
 * ------------------------------------------------------------------ */

export function calculateQuarantineReward(itemPrice: number, rewardPoolBalance: number): number {
  if (rewardPoolBalance <= 0) return 0;
  const gross = round2(itemPrice * REWARD_RATE);
  return round2(Math.max(0, Math.min(gross, REWARD_CAP, rewardPoolBalance)));
}

/* ------------------------------------------------------------------ *
 * Downstream routing gate (Section 3.3)
 * ------------------------------------------------------------------ */

export type InterventionGate =
  | { action: 'NONE'; reason: string }
  | { action: 'QUARANTINE'; reason: string }
  | { action: 'ESCROW'; reason: string }
  | { action: 'ADVISORY_ONLY'; reason: string };

export function routeIntervention(args: {
  result: Pick<WhatIfResult, 'riskLevel' | 'limitBreach'>;
  isNeed: boolean;
}): InterventionGate {
  const { riskLevel, limitBreach } = args.result;
  const elevated = riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || limitBreach.weekly || limitBreach.monthly;

  if (args.isNeed) {
    return {
      action: 'ADVISORY_ONLY',
      reason: 'NEEDS purchases are never locked; advisory only.',
    };
  }
  if (!elevated) {
    return {
      action: 'NONE',
      reason: 'Non-Intervention Exit Path: risk is LOW/MEDIUM with no limit breach.',
    };
  }
  return {
    action: 'QUARANTINE',
    reason: `riskLevel=${riskLevel}${limitBreach.weekly || limitBreach.monthly ? ' + limitBreach' : ''}`,
  };
}
