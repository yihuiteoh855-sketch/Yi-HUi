/**
 * Server-side tools for the chat route (plan.md Section 8.2).
 *
 * THE SERVER-SIDE AUTHORITY RULE: every figure returned here is computed by
 * lib/quant-engine.ts. The LLM may only restate these numbers.
 *
 * Every call is audit-logged with the exact FIELDS accessed (never raw PII values).
 */
import { auditLog } from './audit-logger';
import { analyzeZombies, ZOMBIE_RULES } from './zombie-radar';
import {
  calculateSubscriptionMetrics,
  computeDynamicDailyAllowance,
  isNeedCategory,
  routeIntervention,
  runWhatIfSimulation,
  toStudentUnits,
  unpaidFixedBillTotal,
  calculateAmortizedSubscriptions,
} from './quant-engine';
import { SUBSCRIPTION_REGISTRY, type SubscriptionId } from './subscription-registry';
import { RECURRING_TRANSACTIONS, USAGE_SIGNALS } from './mock-data';
import { buildWhatIfInput, upcomingFixedBills, type LedgerSnapshot } from './ledger';
import type { AuditTier } from './audit-logger';
import type {
  DraftCancellationInput,
  FlagSuspectedZombieInput,
  GenerateRoastInput,
  RunWhatIfInput,
} from './types';
import { toISODateTime, remainingDaysInMonth } from './utils';

interface ToolMeta {
  actionType: string;
  tier: AuditTier;
  dataAccessed: string[];
  authorizationRef: string;
}

function log(userId: string, snapshot: LedgerSnapshot, meta: ToolMeta, status: 'EXECUTED' = 'EXECUTED') {
  auditLog.append(
    {
      sandboxClock: toISODateTime(snapshot.sandboxClock),
      actor: 'AGENT',
      actionType: meta.actionType,
      permissionTier: meta.tier,
      data_accessed: meta.dataAccessed,
      authorization_ref: meta.authorizationRef,
      proposal_hash: null,
      status,
    },
    userId,
  );
}

/* ------------------------------------------------------------------ *
 * T0 — run_what_if_simulation
 * ------------------------------------------------------------------ */

export function runWhatIfForUser(userId: string, snapshot: LedgerSnapshot, args: RunWhatIfInput) {
  const isNeed = isNeedCategory(args.category);

  const input = buildWhatIfInput(snapshot, {
    amount: args.itemPrice,
    category: args.category,
    isNeed,
  });
  const result = runWhatIfSimulation(input);
  const gate = routeIntervention({ result, isNeed });
  const units = toStudentUnits(args.itemPrice);

  log(userId, snapshot, {
    actionType: 'RUN_WHAT_IF',
    tier: 'T0',
    dataAccessed: ['transactions.last45d', 'bills.unpaid', 'userPayLimits'],
    authorizationRef: 'MANDATE_DEFAULT_T0',
  });

  return {
    targetItem: args.targetItem,
    itemPrice: args.itemPrice,
    category: args.category,
    isNeed,
    shortfallProbability: result.shortfallProbability,
    cfar95: result.cfar95,
    projectedMonthEndBalance: result.projectedMonthEndBalance,
    dynamicDailyAllowance: result.dynamicDailyAllowance,
    riskLevel: result.riskLevel,
    limitBreach: result.limitBreach,
    lowHistoryWarning: result.lowHistoryWarning,
    pathsRun: result.pathsRun,
    studentUnits: units,
    studentUnitPrices: { mixedRice: 9, bubbleTea: 15 },
    recommendedGate: gate.action,
    gateReason: gate.reason,
  };
}

/* ------------------------------------------------------------------ *
 * T0 — get_budget_insights
 * ------------------------------------------------------------------ */

export function getBudgetInsightsForUser(userId: string, snapshot: LedgerSnapshot) {
  const bills = upcomingFixedBills(snapshot.sandboxClock, snapshot.subscriptions, snapshot.amortizeAnnualFees);
  const unpaid = unpaidFixedBillTotal(bills);
  const days = remainingDaysInMonth(snapshot.sandboxClock);
  const allowance = computeDynamicDailyAllowance({
    currentBalance: snapshot.currentBalance,
    unpaidFixedBills: unpaid,
    monthlySavingsGoal: snapshot.monthlySavingsGoal,
    remainingDaysInMonth: days,
  });
  const amortized = calculateAmortizedSubscriptions(snapshot.subscriptions);
  const amortizedMonthly = amortized.reduce((sum, a) => sum + a.monthlyBurden, 0);

  log(userId, snapshot, {
    actionType: 'GET_BUDGET_INSIGHTS',
    tier: 'T0',
    dataAccessed: ['balance', 'bills.unpaid', 'subscriptions'],
    authorizationRef: 'MANDATE_DEFAULT_T0',
  });

  return {
    currentBalance: snapshot.currentBalance,
    unpaidFixedBills: unpaid,
    monthlySavingsGoal: snapshot.monthlySavingsGoal,
    dynamicDailyAllowance: allowance,
    remainingDaysInMonth: days,
    spentThisWeek: snapshot.spentThisWeek,
    spentThisMonth: snapshot.spentThisMonth,
    userPayLimits: snapshot.userLimits,
    amortizeAnnualFees: snapshot.amortizeAnnualFees,
    amortizedMonthlyBurden: Math.round(amortizedMonthly * 100) / 100,
    defenseVault: snapshot.defenseVault,
    rewardPool: snapshot.rewardPool,
    studentUnitsOfAllowance: toStudentUnits(allowance),
  };
}

/* ------------------------------------------------------------------ *
 * T0 — analyze_zombies
 * ------------------------------------------------------------------ */

export function analyzeZombiesForUser(userId: string, snapshot: LedgerSnapshot) {
  const analysis = analyzeZombies({
    transactions: RECURRING_TRANSACTIONS,
    subscriptions: snapshot.subscriptions,
    usageSignals: USAGE_SIGNALS,
    sandboxClock: snapshot.sandboxClock,
  });

  const candidates = analysis.studentDowngradeCandidates.map((id) => {
    const entry = SUBSCRIPTION_REGISTRY[id as SubscriptionId];
    const metrics = calculateSubscriptionMetrics({
      fullPriceRM: entry.fullPriceRM,
      studentPriceRM: entry.studentPriceRM,
    });
    return {
      subscriptionId: id,
      merchantName: entry.merchantName,
      fullPriceRM: entry.fullPriceRM,
      studentPriceRM: entry.studentPriceRM,
      annualizedCost: metrics.annualizedCost,
      studentAnnualSavings: metrics.studentAnnualSavings,
      requiresStudentEmailOTP: entry.requiresStudentEmailOTP,
      opportunityCostMeals: metrics.opportunityCostMeals,
      opportunityCostBubbleTea: metrics.opportunityCostBubbleTea,
    };
  });

  log(userId, snapshot, {
    actionType: 'ANALYZE_ZOMBIES',
    tier: 'T0',
    dataAccessed: ['transactions.last90d', 'subscriptions', 'usageSignals'],
    authorizationRef: 'MANDATE_DEFAULT_T0',
  });

  return {
    tags: analysis.tags,
    recurring: analysis.recurring.map((r) => ({
      merchant: r.merchant,
      subscriptionId: r.subscriptionId,
      occurrences: r.occurrences,
      monthsRecurring: r.monthsRecurring,
      avgAmount: r.avgAmount,
      avgIntervalDays: r.avgIntervalDays,
    })),
    studentDowngradeCandidates: candidates,
    zombieRules: ZOMBIE_RULES,
  };
}

/* ------------------------------------------------------------------ *
 * T1 — flag_suspected_zombie
 * ------------------------------------------------------------------ */

export function flagSuspectedZombieForUser(
  userId: string,
  snapshot: LedgerSnapshot,
  args: FlagSuspectedZombieInput,
) {
  log(userId, snapshot, {
    actionType: 'FLAG_SUSPECTED_ZOMBIE',
    tier: 'T1',
    dataAccessed: ['usageSignals', 'subscriptions'],
    authorizationRef: args.usedInPast30Days ? 'USER_USED_YES' : 'USER_USED_NO',
  });
  return {
    subscriptionId: args.subscriptionId,
    usedInPast30Days: args.usedInPast30Days,
    resultingTag: args.usedInPast30Days ? 'ACTIVE' : 'ZOMBIE',
  };
}

/* ------------------------------------------------------------------ *
 * T2 — draft_cancellation (registry-based descriptor; NO free-form URL)
 * ------------------------------------------------------------------ */

export function draftCancellationForUser(
  userId: string,
  snapshot: LedgerSnapshot,
  args: DraftCancellationInput,
) {
  const entry = SUBSCRIPTION_REGISTRY[args.subscriptionId];
  const metrics = calculateSubscriptionMetrics({
    fullPriceRM: entry.fullPriceRM,
    studentPriceRM: entry.studentPriceRM,
  });

  log(userId, snapshot, {
    actionType: 'DRAFT_CANCELLATION',
    tier: 'T2',
    dataAccessed: ['subscriptions', `registry.${args.subscriptionId}`],
    authorizationRef: 'MANDATE_T2_DRAFT',
  });

  return {
    subscriptionId: args.subscriptionId,
    merchantName: entry.merchantName,
    // The client builds the mailto: URL with encodeURIComponent and fills placeholders locally.
    mailtoDescriptor: entry.mailtoTemplate,
    officialCancelDeepLink: entry.officialCancelDeepLink,
    deepLinkAvailable: entry.officialCancelDeepLink !== null,
    mailtoAvailable: entry.mailtoTemplate !== null,
    metrics,
  };
}

/* ------------------------------------------------------------------ *
 * T0 — generate_roast (engine numbers; the LLM writes the prose)
 * ------------------------------------------------------------------ */

export function generateRoastForUser(
  userId: string,
  snapshot: LedgerSnapshot,
  args: GenerateRoastInput,
) {
  const analysis = analyzeZombies({
    transactions: RECURRING_TRANSACTIONS,
    subscriptions: snapshot.subscriptions,
    usageSignals: USAGE_SIGNALS,
    sandboxClock: snapshot.sandboxClock,
  });

  const wastedMonthly = snapshot.subscriptions
    .filter((s) => {
      const t = analysis.tags[s.subscriptionId];
      return t === 'ZOMBIE' || t === 'SUSPECTED_ZOMBIE';
    })
    .reduce((sum, s) => sum + s.amountRM, 0);
  const wastedAnnual = Math.round(wastedMonthly * 12 * 100) / 100;

  log(userId, snapshot, {
    actionType: 'GENERATE_ROAST',
    tier: 'T0',
    dataAccessed: ['subscriptions', 'usageSignals'],
    authorizationRef: 'MANDATE_DEFAULT_T0',
  });

  return {
    tone: args.tone,
    wastedMonthly: Math.round(wastedMonthly * 100) / 100,
    wastedAnnual,
    units: toStudentUnits(Math.round(wastedMonthly * 100) / 100),
    unitsAnnual: toStudentUnits(wastedAnnual),
    studentUnitPrices: { mixedRice: 9, bubbleTea: 15 },
    zombieTags: analysis.tags,
  };
}
