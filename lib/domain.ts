/**
 * Shared domain interfaces (plain TypeScript, no runtime dependencies).
 * The quantitative engine (`lib/quant-engine.ts`) implements the behaviour and
 * re-exports these for convenience.
 */
import type { SpendCategory } from './types';
import type { SubscriptionId } from './subscription-registry';

/** A fixed bill still owed this month (utilities, rent, active subscriptions). */
export interface FixedBill {
  id: string;
  label: string;
  amountRM: number;
  /** Day of month (1-31) the bill is due. */
  dueDay: number;
  /** Whether the bill has already been paid in the sandbox ledger. */
  paid: boolean;
}

/** A recurring subscription in the sandbox registry-backed ledger. */
export interface Subscription {
  subscriptionId: SubscriptionId;
  amountRM: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  nextBillingDate: string; // ISO date in sandbox clock
}

export interface AmortizedView {
  subscriptionId: SubscriptionId;
  monthlyBurden: number; // RM
  dailyBurden: number; // RM
  setAsideThisMonth: number; // RM to reserve in the sinking fund
  /** Days until the real billing date (only when a sandbox clock is supplied). */
  daysUntilBilling?: number;
  /**
   * Treasury "Maturity Liquidity Gate" (Phase 8): true when a non-monthly charge
   * (ANNUAL/QUARTERLY) is due inside the settlement window, so the 1/12 amortized
   * figure alone would create a maturity mismatch (illusion of liquidity).
   */
  maturityGateTriggered?: boolean;
}

export interface WhatIfInput {
  currentBalance: number; // RM
  fixedMonthlyBills: FixedBill[]; // utilities, rent, active subscriptions (with dueDay + paid flag)
  remainingDaysInMonth: number; // integer >= 1
  monthlySavingsGoal: number; // RM
  userPayLimits: {
    weeklyPayLimit: number;
    monthlyPayLimit: number;
    weeklyTransferLimit: number;
    monthlyTransferLimit: number;
  };
  spentThisWeek: number;
  spentThisMonth: number;
  historicalDailySpending: number[]; // variable daily spend, RM per day, length >= MIN_HISTORY_DAYS
  proposedExpense: { amount: number; category: SpendCategory; isNeed: boolean };
  seed?: number; // deterministic PRNG seed for reproducible demos
  /**
   * Sandbox clock in ms. Optional: when supplied, the intra-month liquidity barrier
   * aligns each remaining day with its real day-of-month and weekday. When omitted the
   * engine falls back to a deterministic 30-day window (identical arithmetic, no clock).
   */
  sandboxClock?: number;
  /** Scheduled monthly allowance/PTPTN inflow used by the liquidity-barrier overlay (DEMO_CONFIG default). */
  monthlyAllowanceRM?: number;
  /** Day of month the scheduled inflow lands (DEMO_CONFIG default). */
  allowanceDayOfMonth?: number;
}

export interface WhatIfResult {
  shortfallProbability: number; // 0-100 (%)
  cfar95: number; // RM, 95th percentile month-end shortfall vs. savings goal
  es95: number; // RM, 95% Expected Shortfall (tail mean of the worst paths, coherent risk measure)
  intraMonthLiquidityBreachProb: number; // 0-100 (%), P(min_t running balance < 0) on any remaining day
  lowestProjectedBalanceRM: number; // RM, 5th percentile of the path-minimum running balance
  stratifiedShortfallProbability: number; // 0-100 (%), weekday/weekend stratified bootstrap estimate
  executionTimeMs: number; // ms, pre-authorization risk-hook latency (memoized with the result)
  projectedMonthEndBalance: number; // RM, mean of simulated paths (conservative: no new inflows)
  projectedMonthEndBalanceWithIncomeRM: number; // RM, mean final balance of the liquidity-barrier paths (credits the scheduled inflow)
  dynamicDailyAllowance: number; // RM/day
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  limitBreach: { weekly: boolean; monthly: boolean };
  lowHistoryWarning: boolean; // true if history < MIN_HISTORY_DAYS (falls back to flat estimate)
  pathsRun: number; // 1000
}

export interface EscrowFloorCheck {
  ok: boolean;
  reasons: Array<
    | 'NEEDS_CATEGORY_LOCKED'
    | 'REDUCTION_OVER_40_PERCENT'
    | 'BELOW_SURVIVAL_FLOOR'
    | 'EXCEEDS_AI_MANDATE'
  >;
  maxAllowedReduction: number; // RM/day
  /** Stone-Geary (1954) incompressible subsistence floor (RM/day of NEEDS consumption). */
  subsistenceFloorRM: number;
  /** True when the daily allowance left after the lock still covers the subsistence floor. */
  stoneGearyMarginalUtilitySafe: boolean;
}

/** Behavioral-economics telemetry (Laibson 1997 quasi-hyperbolic discounting). */
export interface BehavioralMetrics {
  presentBiasBeta: number;
  presentBiasInflationRatio: number;
  baseRewardRM: number;
  riskElasticRewardRM: number;
}

export interface SubscriptionMetrics {
  annualizedCost: number; // monthlyPrice * 12
  studentAnnualSavings: number | null; // null if no student plan exists
  opportunityCostMeals: number; // floor(monthlySpend / 9.00)
  opportunityCostBubbleTea: number; // floor(monthlySpend / 15.00)
}

/** A recurring transaction row in the mock bank-statement ledger. */
export interface Transaction {
  id: string;
  /** ISO date. */
  date: string;
  merchant: string;
  /** Positive number = money leaving the account. */
  amountRM: number;
  category: SpendCategory;
}

/** User-authorized, read-only structured receipt fields from mock Gmail. */
export interface MockReceipt {
  id: string;
  merchant: string;
  amountRM: number;
  billingDate: string; // ISO date
  cycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
}

export interface UsageSignal {
  subscriptionId: SubscriptionId;
  /** Days since last recorded use; null = no usage telemetry available. */
  lastUsedDaysAgo: number | null;
}
