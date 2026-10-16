/**
 * Ledger helpers — ISOMORPHIC.
 *
 * The sandbox ledger lives in the browser. The client posts a `ledgerSnapshot`
 * that the server treats as USER-SUPPLIED DATA: the server re-computes every
 * derived figure and signs proposals itself (plan.md Section 8.2 sandbox note).
 */
import {
  FIXED_BILLS,
  HISTORICAL_DAILY_SPENDING,
  MONTHLY_SAVINGS_GOAL,
  SPENT_THIS_MONTH,
  SPENT_THIS_WEEK,
  SUBSCRIPTIONS,
  INITIAL_AI_MANDATE,
  INITIAL_USER_LIMITS,
} from './mock-data';
import { z } from 'zod';
import { SUBSCRIPTION_REGISTRY } from './subscription-registry';
import { calculateAmortizedSubscriptions } from './quant-engine';
import { remainingDaysInMonth } from './utils';
import type { FixedBill, Subscription, WhatIfInput } from './domain';
import { AiMandateSchema, UserSpendingLimitSchema } from './types';
import type { AiMandate, SpendCategory, UserSpendingLimit } from './types';

export interface LedgerSnapshot {
  userId: string;
  sandboxClock: number;
  currentBalance: number;
  defenseVault: number;
  rewardPool: number;
  monthlySavingsGoal: number;
  spentThisWeek: number;
  spentThisMonth: number;
  userLimits: UserSpendingLimit;
  aiMandate: AiMandate;
  amortizeAnnualFees: boolean;
  fixedBills: FixedBill[];
  subscriptions: Subscription[];
  historicalDailySpending: number[];
}

export interface LedgerSnapshotInput {
  userId: string;
  sandboxClock: number;
  currentBalance: number;
  defenseVault: number;
  rewardPool: number;
  amortizeAnnualFees: boolean;
  spentThisWeek?: number;
  spentThisMonth?: number;
  userLimits?: UserSpendingLimit;
  aiMandate?: AiMandate;
  subscriptions?: Subscription[];
  fixedBills?: FixedBill[];
  historicalDailySpending?: number[];
  monthlySavingsGoal?: number;
}

/** Fixed bills still relevant this month = utilities/rent + active subscriptions. */
export function upcomingFixedBills(
  clock: number,
  subscriptions: Subscription[],
  amortizeAnnualFees: boolean,
): FixedBill[] {
  const bills: FixedBill[] = FIXED_BILLS.map((b) => ({ ...b }));
  const amort = new Map(
    calculateAmortizedSubscriptions(subscriptions).map((a) => [a.subscriptionId, a]),
  );
  for (const s of subscriptions) {
    const billingMs = new Date(s.nextBillingDate).getTime();
    const amount = amortizeAnnualFees
      ? amort.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM
      : s.amountRM;
    bills.push({
      id: `sub_${s.subscriptionId}`,
      label: `${SUBSCRIPTION_REGISTRY[s.subscriptionId].merchantName} subscription`,
      amountRM: amount,
      dueDay: new Date(s.nextBillingDate).getUTCDate(),
      paid: billingMs < clock,
    });
  }
  return bills;
}

export function buildLedgerSnapshot(input: LedgerSnapshotInput): LedgerSnapshot {
  const subscriptions = input.subscriptions ?? SUBSCRIPTIONS;
  const fixedBills =
    input.fixedBills ?? upcomingFixedBills(input.sandboxClock, subscriptions, input.amortizeAnnualFees);
  return {
    userId: input.userId,
    sandboxClock: input.sandboxClock,
    currentBalance: input.currentBalance,
    defenseVault: input.defenseVault,
    rewardPool: input.rewardPool,
    monthlySavingsGoal: input.monthlySavingsGoal ?? MONTHLY_SAVINGS_GOAL,
    spentThisWeek: input.spentThisWeek ?? SPENT_THIS_WEEK,
    spentThisMonth: input.spentThisMonth ?? SPENT_THIS_MONTH,
    userLimits: input.userLimits ?? INITIAL_USER_LIMITS,
    aiMandate: input.aiMandate ?? INITIAL_AI_MANDATE,
    amortizeAnnualFees: input.amortizeAnnualFees,
    fixedBills,
    subscriptions,
    historicalDailySpending: input.historicalDailySpending ?? HISTORICAL_DAILY_SPENDING,
  };
}

export function buildWhatIfInput(
  snapshot: LedgerSnapshot,
  proposedExpense: { amount: number; category: SpendCategory; isNeed: boolean },
  seed?: number,
): WhatIfInput {
  return {
    currentBalance: snapshot.currentBalance,
    fixedMonthlyBills: snapshot.fixedBills,
    remainingDaysInMonth: remainingDaysInMonth(snapshot.sandboxClock),
    monthlySavingsGoal: snapshot.monthlySavingsGoal,
    userPayLimits: snapshot.userLimits,
    spentThisWeek: snapshot.spentThisWeek,
    spentThisMonth: snapshot.spentThisMonth,
    historicalDailySpending: snapshot.historicalDailySpending,
    proposedExpense,
    seed,
    // The calendar-aligned liquidity barrier needs to know "today" (Phase 8).
    sandboxClock: snapshot.sandboxClock,
  };
}

/* ------------------------------------------------------------------ *
 * Server-side intake validation
 *
 * The client POSTs a ledgerSnapshot. The server treats it as USER-SUPPLIED DATA:
 * it re-validates the shape and re-computes every derived figure itself.
 * ------------------------------------------------------------------ */

const FixedBillSchema = z.object({
  id: z.string(),
  label: z.string(),
  amountRM: z.number().finite(),
  dueDay: z.number().int().min(1).max(31),
  paid: z.boolean(),
});

const SubscriptionLiteSchema = z.object({
  subscriptionId: z.string(),
  amountRM: z.number().finite(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  nextBillingDate: z.string(),
});

export const LedgerSnapshotSchema = z
  .object({
    userId: z.string().min(1),
    sandboxClock: z.number().int().nonnegative(),
    currentBalance: z.number().finite(),
    defenseVault: z.number().finite(),
    rewardPool: z.number().min(0).finite(),
    monthlySavingsGoal: z.number().min(0).finite(),
    spentThisWeek: z.number().min(0).finite(),
    spentThisMonth: z.number().min(0).finite(),
    userLimits: UserSpendingLimitSchema,
    aiMandate: AiMandateSchema,
    amortizeAnnualFees: z.boolean(),
    fixedBills: z.array(FixedBillSchema).max(64),
    subscriptions: z.array(SubscriptionLiteSchema).max(64),
    historicalDailySpending: z.array(z.number().min(0).finite()).max(4000),
  })
  .strict();

/**
 * Parse an untrusted ledger snapshot from the request body. On failure we throw a
 * descriptive Error (the route converts it to HTTP 400) — we never trust the body.
 */
export function parseLedgerSnapshot(raw: unknown): LedgerSnapshot {
  const parsed = LedgerSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`INVALID_LEDGER_SNAPSHOT: ${parsed.error.issues[0]?.message ?? 'bad shape'}`);
  }
  // The server also re-derives the fixed bills itself rather than trusting the client view.
  return {
    ...parsed.data,
    subscriptions: parsed.data.subscriptions as LedgerSnapshot['subscriptions'],
    fixedBills: upcomingFixedBills(
      parsed.data.sandboxClock,
      parsed.data.subscriptions as LedgerSnapshot['subscriptions'],
      parsed.data.amortizeAnnualFees,
    ),
  };
}
