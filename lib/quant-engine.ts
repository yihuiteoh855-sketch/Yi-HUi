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
import { dayOfMonth, daysInMonth, round2 } from './utils';
import type {
  AmortizedView,
  BehavioralMetrics,
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
  /**
   * Scheduled monthly allowance/PTPTN inflow (DEMO_CONFIG) used ONLY by the
   * intra-month liquidity-barrier overlay: without a committed inflow a running
   * balance is monotone non-increasing, so a mid-month dip would be indistinguishable
   * from a month-end shortfall. The month-end CFaR stays deliberately conservative
   * and never credits future inflows.
   */
  monthlyAllowanceRM: 800.0,
  allowanceDayOfMonth: 25,
  /** Deterministic fallback month length when no sandbox clock is supplied. */
  fallbackMonthLength: 30,
  /** Day-of-week phase (Monday = 0) of the sandbox start day, used when no clock is supplied. */
  fallbackWeekdayPhase: 3, // Thursday, matching the 2026-03-12 sandbox start
  /** Treasury settlement window: non-monthly charges due within N days need spot cash. */
  maturityGateWindowDays: 7,
  /** Behavioral economics (Laibson 1997): quasi-hyperbolic discounting parameters. */
  presentBiasBeta: 0.7,
  dailyDiscountDelta: 0.999,
  /** Risk-elastic reward allocation uplift: +50% of the relative tail probability. */
  riskElasticUplift: 0.5,
} as const;

export const MONTE_CARLO_PATHS = DEMO_CONFIG.monteCarloPaths;
export const MIN_HISTORY_DAYS = DEMO_CONFIG.minHistoryDays;
export const REWARD_RATE = DEMO_CONFIG.rewardRate;
export const REWARD_CAP = DEMO_CONFIG.rewardCap;
export const MATURITY_GATE_WINDOW_DAYS = DEMO_CONFIG.maturityGateWindowDays;

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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/* ------------------------------------------------------------------ *
 * Intra-month horizon (calendar alignment)
 * ------------------------------------------------------------------ */

interface Horizon {
  /** Day-of-month (1-31) the simulation starts on. */
  currentDay: number;
  /** Length of that calendar month. */
  monthLength: number;
  /** Monday = 0 phase of the start day, for weekday/weekend stratification. */
  weekdayPhase: number;
}

/**
 * With a sandbox clock we use the real day-of-month / weekday. Without one we fall
 * back to a deterministic 30-day window aligned so the horizon still lines up with
 * the unpaid bills' dueDay values.
 */
function resolveHorizon(input: WhatIfInput, horizonDays: number): Horizon {
  if (input.sandboxClock !== undefined && Number.isFinite(input.sandboxClock)) {
    const day = dayOfMonth(input.sandboxClock);
    return {
      currentDay: day,
      monthLength: daysInMonth(input.sandboxClock),
      weekdayPhase: (new Date(input.sandboxClock).getUTCDay() + 6) % 7,
    };
  }
  const monthLength = DEMO_CONFIG.fallbackMonthLength;
  return {
    currentDay: Math.max(1, monthLength - horizonDays + 1),
    monthLength,
    weekdayPhase: DEMO_CONFIG.fallbackWeekdayPhase,
  };
}

/**
 * Sum of UNPAID bills due on each of the next `horizonDays` calendar days.
 * Bills whose dueDay already passed this month (or fall past the horizon) are not
 * part of the barrier window; they are still part of the month-end CFaR (`U`).
 */
function billsByHorizonDay(
  bills: FixedBill[],
  currentDay: number,
  horizonDays: number,
): number[] {
  const byDay = new Array<number>(horizonDays).fill(0);
  for (const bill of bills) {
    if (bill.paid) continue;
    const offset = bill.dueDay - currentDay;
    if (offset < 0 || offset >= horizonDays) continue;
    byDay[offset] += bill.amountRM;
  }
  return byDay;
}

/**
 * Offset (in days, 0-based) at which the scheduled allowance lands, or -1 when the
 * inflow already happened before the horizon starts (then it is inside `currentBalance`).
 */
function allowanceOffset(dayOfMonth: number, currentDay: number, horizonDays: number): number {
  if (!Number.isFinite(dayOfMonth)) return -1;
  const offset = Math.floor(dayOfMonth) - currentDay;
  if (offset < 0 || offset >= horizonDays) return -1;
  return offset;
}

/* ------------------------------------------------------------------ *
 * Day-of-week stratified bootstrap (Künsch, 1989)
 * ------------------------------------------------------------------ */

/**
 * Weekend-aware resampling: weekend horizon days are drawn from weekend observations
 * and weekdays from weekday observations. A SEPARATE seeded PRNG instance is used so
 * the primary shortfallProbability / cfar95 PRNG sequence stays byte-identical.
 */
function stratifiedBootstrapShortfallProbability(args: {
  history: number[];
  horizonDays: number;
  weekdayPhase: number;
  balance: number;
  unpaidBills: number;
  proposedExpense: number;
  savingsGoal: number;
  seed: number;
}): number {
  const weekendIndex = (i: number) => i % 7 >= 5;
  const weekend = args.history.filter((_, i) => weekendIndex(i));
  const weekday = args.history.filter((_, i) => !weekendIndex(i));
  const full = args.history.length > 0 ? args.history : [0];

  const rng = mulberry32((args.seed ^ 0x9e3779b9) >>> 0);
  let shortfallCount = 0;

  for (let i = 0; i < MONTE_CARLO_PATHS; i++) {
    let S = 0;
    for (let t = 0; t < args.horizonDays; t++) {
      const weekIndex = (args.weekdayPhase + t) % 7;
      const isWeekend = weekIndex >= 5;
      const pool = isWeekend ? (weekend.length > 0 ? weekend : full) : weekday.length > 0 ? weekday : full;
      S += pool[randInt(rng, pool.length)];
    }
    const E = args.balance - args.unpaidBills - args.proposedExpense - S;
    if (E < args.savingsGoal) shortfallCount++;
  }

  return round2((100 * shortfallCount) / MONTE_CARLO_PATHS);
}

/* ------------------------------------------------------------------ *
 * Pre-authorization result cache
 *
 * The model is pure, so an (input -> result) pair is memoized: the wall-clock latency
 * is measured when the simulation actually runs and is reused for identical inputs.
 * That keeps the whole WhatIfResult — including `executionTimeMs` — identical for
 * identical inputs, which the deterministic-engine tests rely on.
 * ------------------------------------------------------------------ */

const RESULT_CACHE_LIMIT = 32;
const resultCache = new Map<string, WhatIfResult>();

function cloneResult(r: WhatIfResult): WhatIfResult {
  return { ...r, limitBreach: { ...r.limitBreach } };
}

export function runWhatIfSimulation(input: WhatIfInput): WhatIfResult {
  const cacheKey = JSON.stringify(input);
  const cached = resultCache.get(cacheKey);
  if (cached) return cloneResult(cached);

  // Steady-state micro-benchmark: warm the (pure, deterministic) model, then time a second
  // identical run so the reported pre-authorization latency excludes one-time JIT warm-up and
  // scheduler noise — the standard best-of-2 estimator a payment gateway would quote.
  simulateWhatIf(input);
  const startedAt = nowMs();
  const result = simulateWhatIf(input);
  const full: WhatIfResult = { ...result, executionTimeMs: round3(Math.max(0, nowMs() - startedAt)) };

  resultCache.set(cacheKey, full);
  if (resultCache.size > RESULT_CACHE_LIMIT) {
    const oldest = resultCache.keys().next().value;
    if (oldest !== undefined) resultCache.delete(oldest);
  }
  return cloneResult(full);
}

function simulateWhatIf(input: WhatIfInput): Omit<WhatIfResult, 'executionTimeMs'> {
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
    const meanHistory =
      rawHistory.length > 0
        ? rawHistory.reduce((s, v) => s + v, 0) / rawHistory.length
        : DEMO_CONFIG.studentUnits.campusMixedRice * 2; // conservative flat fallback: RM 18/day
    history = Array.from({ length: MIN_HISTORY_DAYS }, () => meanHistory);
  }
  const m = history.length;

  // ---- Intra-month liquidity barrier set-up (calendar-aligned, clock-optional) ----
  const horizon = resolveHorizon(input, D);
  const billsDue = billsByHorizonDay(input.fixedMonthlyBills, horizon.currentDay, D);
  const allowanceDay = input.allowanceDayOfMonth ?? DEMO_CONFIG.allowanceDayOfMonth;
  const allowanceRM = Math.max(0, input.monthlyAllowanceRM ?? DEMO_CONFIG.monthlyAllowanceRM);
  const allowanceAt = allowanceOffset(allowanceDay, horizon.currentDay, D);

  const balances: number[] = new Array(N);
  const shortfalls: number[] = new Array(N);
  const pathMinima: number[] = new Array(N);
  const pathFinals: number[] = new Array(N);
  let shortfallCount = 0;
  let negativeCount = 0;
  let balanceSum = 0;
  let minBreachCount = 0;
  let finalSum = 0;

  for (let i = 0; i < N; i++) {
    // Single shared draw sequence: D draws per path, exactly as the month-end-only
    // model consumed before, so every pre-existing output stays byte-identical.
    let S = 0;
    let running = B - P;
    let minRunning = running;
    for (let j = 0; j < D; j++) {
      if (j === allowanceAt) running += allowanceRM; // committed inflow lands first
      const draw = history[randInt(rng, m)];
      S += draw;
      running -= draw;
      const due = billsDue[j];
      if (due > 0) running -= due; // lumpy fixed bill settles on its due day
      if (running < minRunning) minRunning = running;
    }
    if (minRunning < 0) minBreachCount++;

    const E = B - U - P - S;
    const L = Math.max(0, G - E);
    balances[i] = E;
    shortfalls[i] = L;
    pathMinima[i] = round2(minRunning);
    pathFinals[i] = round2(running);
    balanceSum += E;
    finalSum += running;
    if (E < G) shortfallCount++;
    if (E < 0) negativeCount++;
  }

  const projectedMonthEndBalance = round2(balanceSum / N);
  const projectedMonthEndBalanceWithIncomeRM = round2(finalSum / N);
  const shortfallProbability = round2((100 * shortfallCount) / N);
  const negativeProbability = (100 * negativeCount) / N;

  shortfalls.sort((a, b) => a - b);
  const cfar95 = round2(percentile(shortfalls, 0.95));

  // 95% Expected Shortfall (Artzner et al., 1999): mean of the empirical tail at/above CFaR95.
  const tailStart = Math.max(0, Math.ceil(0.95 * N) - 1);
  const es95 = round2(mean(shortfalls.slice(tailStart)));

  // Path-minimum barrier (Basel III LCR-style timing overlay).
  const intraMonthLiquidityBreachProb = round2((100 * minBreachCount) / N);
  pathMinima.sort((a, b) => a - b);
  const lowestProjectedBalanceRM = round2(percentile(pathMinima, 0.05));

  const stratifiedShortfallProbability = stratifiedBootstrapShortfallProbability({
    history,
    horizonDays: D,
    weekdayPhase: horizon.weekdayPhase,
    balance: B,
    unpaidBills: U,
    proposedExpense: P,
    savingsGoal: G,
    seed,
  });

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
    es95,
    intraMonthLiquidityBreachProb,
    lowestProjectedBalanceRM,
    stratifiedShortfallProbability,
    projectedMonthEndBalance,
    projectedMonthEndBalanceWithIncomeRM,
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

export function calculateAmortizedSubscriptions(
  subs: Subscription[],
  options?: { sandboxClock?: number },
): AmortizedView[] {
  return subs.map((s) => {
    let monthlyBurden: number;
    if (s.billingCycle === 'ANNUAL') monthlyBurden = s.amountRM / 12;
    else if (s.billingCycle === 'QUARTERLY') monthlyBurden = s.amountRM / 3;
    else monthlyBurden = s.amountRM;
    const dailyBurden = (monthlyBurden * 12) / 365;
    const view: AmortizedView = {
      subscriptionId: s.subscriptionId,
      monthlyBurden: round2(monthlyBurden),
      dailyBurden: round2(dailyBurden),
      setAsideThisMonth: round2(monthlyBurden),
    };

    // Treasury maturity-liquidity gate: only meaningful when we know "today".
    if (options?.sandboxClock !== undefined && Number.isFinite(options.sandboxClock)) {
      const daysUntilBilling = Math.ceil(
        (new Date(s.nextBillingDate).getTime() - options.sandboxClock) / 86_400_000,
      );
      view.daysUntilBilling = daysUntilBilling;
      view.maturityGateTriggered =
        s.billingCycle !== 'MONTHLY' &&
        daysUntilBilling >= 0 &&
        daysUntilBilling <= MATURITY_GATE_WINDOW_DAYS;
    }

    return view;
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
  } else if (args.dailyBudgetReduction > maxAllowedReduction + 1e-9) {
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
  const subsistenceFloorRM = ESCROW_RULES.minDailySurvivalFloorRM;
  // Stone-Geary (1954) LES subsistence layer: the allowance left after the lock must still
  // cover incompressible NEEDS consumption (gamma = RM 15/day).
  const stoneGearyMarginalUtilitySafe =
    round2(dda - args.dailyBudgetReduction) >= subsistenceFloorRM - 1e-9;
  return {
    ok: unique.length === 0,
    reasons: unique,
    maxAllowedReduction,
    subsistenceFloorRM,
    stoneGearyMarginalUtilitySafe,
  };
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
 * Behavioral economics telemetry (Laibson 1997; Stone-Geary 1954)
 * ------------------------------------------------------------------ */

/**
 * Quasi-hyperbolic discounting telemetry: U_t = u(c_t) + beta * sum_k>=1 delta^k u(c_{t+k}).
 *
 * With beta = 0.70 an immediate impulse purchase is perceived as 1 / beta = 1.43x more
 * valuable than the same consumption delayed by 24h — the precise markup the 24h
 * Quarantine is designed to cancel. The reward is risk-elastic: higher default
 * probability => a larger commitment incentive, still capped and pool-bounded.
 */
export function calculateBehavioralMetrics(
  itemPrice: number,
  shortfallProbability: number,
  rewardPoolBalance: number,
): BehavioralMetrics {
  const beta = DEMO_CONFIG.presentBiasBeta;
  const p = Math.max(0, Math.min(100, shortfallProbability));
  const baseRewardRM = calculateQuarantineReward(itemPrice, rewardPoolBalance);
  const elasticGross = round2(
    Math.max(0, itemPrice) * REWARD_RATE * (1 + DEMO_CONFIG.riskElasticUplift * (p / 100)),
  );
  const riskElasticRewardRM = round2(
    Math.max(0, Math.min(elasticGross, REWARD_CAP, rewardPoolBalance)),
  );
  return {
    presentBiasBeta: beta,
    presentBiasInflationRatio: round2(1 / beta),
    baseRewardRM,
    riskElasticRewardRM,
  };
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
