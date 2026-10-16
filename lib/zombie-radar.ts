/**
 * Zombie Radar — deterministic recurring-charge detection & tagging (plan.md Section 5.3).
 *
 * Inputs:
 *   1. Bank-statement recurring transactions (mock ledger).
 *   2. User-authorized, read-only structured receipt fields from mock Gmail.
 *
 * Tagging is a T1 action. Detection is T0.
 */
import { round2 } from './utils';
import { SUBSCRIPTION_REGISTRY } from './subscription-registry';
import type { SubscriptionId } from './subscription-registry';
import type { Subscription, Transaction, UsageSignal } from './domain';

export const ZOMBIE_RULES = {
  amountTolerancePct: 0.05, // amount within +/-5%
  intervalDays: 30,
  intervalToleranceDays: 3,
  minOccurrences: 3, // >= 3 occurrences to be recurring
  endangeredWithinDays: 3, // renewing within 3 days
  zombieMonths: 3, // recurring >= 3 months
  lowActivityDays: 30, // no use in 30 days counts as low activity
  /** Cross-border FX + card-scheme markup drift absorbed by the amount matcher (%). */
  fxDriftTolerancePct: 5,
  /** Calendar month length (28-31) + T+1/T+2 weekend clearing lag, in days. */
  settlementLagWindowDays: 3,
  /** ISO 20022 mandate message type behind a recurring card debit. */
  iso20022MandateCategory: 'pain.009_RECURRING_AUTODEBIT',
} as const;

export type ZombieTag = 'ACTIVE' | 'ENDANGERED' | 'ZOMBIE' | 'SUSPECTED_ZOMBIE';

export interface RecurringDetection {
  merchant: string;
  subscriptionId: SubscriptionId | null;
  occurrences: number;
  monthsRecurring: number;
  avgAmount: number;
  avgIntervalDays: number;
  /** Payment-clearing telemetry: the detector tolerates this FX/scheme drift on the amount. */
  fxDriftTolerancePct: number;
  /** Payment-clearing telemetry: settlement interval is 30 days +/- this window. */
  settlementLagWindowDays: number;
  /** ISO 20022 mandate category a real rail would carry for this debit. */
  iso20022MandateCategory: string;
}

/** Normalize a merchant string for comparison: uppercase, alphanumeric only. */
export function normalizeMerchant(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Deterministic merchant -> subscriptionId resolution (no LLM, no network). */
const MERCHANT_TOKENS: Array<{ id: SubscriptionId; tokens: string[] }> = [
  { id: 'netflix_my', tokens: ['NETFLIX'] },
  { id: 'spotify_my', tokens: ['SPOTIFY'] },
  { id: 'youtube_my', tokens: ['YOUTUBE'] },
  { id: 'disney_plus_my', tokens: ['DISNEY'] },
  { id: 'icloud_my', tokens: ['ICLOUD'] },
  { id: 'anytime_fitness_my', tokens: ['ANYTIME'] },
];

export function resolveSubscriptionByMerchant(merchant: string): SubscriptionId | null {
  const norm = normalizeMerchant(merchant);
  for (const entry of MERCHANT_TOKENS) {
    if (entry.tokens.some((t) => norm.includes(t))) return entry.id;
  }
  return null;
}

function daysBetween(aISO: string, bISO: string): number {
  return Math.abs(new Date(aISO).getTime() - new Date(bISO).getTime()) / 86_400_000;
}

function distinctMonths(dates: string[]): number {
  const set = new Set(dates.map((d) => d.slice(0, 7)));
  return set.size;
}

/**
 * Group transactions by merchant and flag as recurring when:
 *   >= 3 occurrences, amount within +/-5%, interval ~= 30 +/- 3 days.
 */
export function detectRecurring(transactions: Transaction[]): RecurringDetection[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = normalizeMerchant(t.merchant);
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const out: RecurringDetection[] = [];
  for (const list of groups.values()) {
    if (list.length < ZOMBIE_RULES.minOccurrences) continue;

    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map((t) => t.amountRM);
    const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const withinTolerance = amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount <= ZOMBIE_RULES.amountTolerancePct,
    );
    if (!withinTolerance) continue;

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }
    const avgIntervalDays =
      intervals.length > 0 ? intervals.reduce((s, v) => s + v, 0) / intervals.length : 0;
    const intervalOk = intervals.every(
      (d) => Math.abs(d - ZOMBIE_RULES.intervalDays) <= ZOMBIE_RULES.intervalToleranceDays,
    );
    if (!intervalOk) continue;

    out.push({
      merchant: sorted[0].merchant,
      subscriptionId: resolveSubscriptionByMerchant(sorted[0].merchant),
      occurrences: sorted.length,
      monthsRecurring: distinctMonths(sorted.map((t) => t.date)),
      avgAmount: round2(avgAmount),
      avgIntervalDays: round2(avgIntervalDays),
      fxDriftTolerancePct: ZOMBIE_RULES.fxDriftTolerancePct,
      settlementLagWindowDays: ZOMBIE_RULES.settlementLagWindowDays,
      iso20022MandateCategory: ZOMBIE_RULES.iso20022MandateCategory,
    });
  }
  return out;
}

export interface ZombieAnalysisInput {
  transactions: Transaction[];
  subscriptions: Subscription[];
  usageSignals: UsageSignal[];
  /** Sandbox clock in ms. */
  sandboxClock: number;
}

export interface ZombieAnalysis {
  recurring: RecurringDetection[];
  tags: Record<string, ZombieTag>;
  /** Subscriptions where the user pays full price but a student plan exists. */
  studentDowngradeCandidates: SubscriptionId[];
}

function daysUntil(isoDate: string, sandboxClock: number): number {
  return Math.ceil((new Date(isoDate).getTime() - sandboxClock) / 86_400_000);
}

export function analyzeZombies(input: ZombieAnalysisInput): ZombieAnalysis {
  const recurring = detectRecurring(input.transactions);
  const usageById = new Map(input.usageSignals.map((u) => [u.subscriptionId, u.lastUsedDaysAgo]));
  const subsById = new Map(input.subscriptions.map((s) => [s.subscriptionId, s]));

  const tags: Record<string, ZombieTag> = {};
  const studentDowngradeCandidates: SubscriptionId[] = [];

  for (const rec of recurring) {
    if (!rec.subscriptionId) continue;
    const id = rec.subscriptionId;
    const lastUsed = usageById.get(id);

    let tag: ZombieTag;
    if (lastUsed === undefined || lastUsed === null) {
      // Recurring but no usage telemetry available -> agent asks one-click.
      tag = 'SUSPECTED_ZOMBIE';
    } else if (rec.monthsRecurring >= ZOMBIE_RULES.zombieMonths && lastUsed > ZOMBIE_RULES.lowActivityDays) {
      tag = 'ZOMBIE';
    } else {
      tag = 'ACTIVE';
    }

    // Time overlay: an active-ish subscription renewing within 3 days is ENDANGERED.
    const sub = subsById.get(id);
    if (tag === 'ACTIVE' && sub && daysUntil(sub.nextBillingDate, input.sandboxClock) <= ZOMBIE_RULES.endangeredWithinDays) {
      tag = 'ENDANGERED';
    }

    tags[id] = tag;

    // Student arbitrage: paying full price while the registry exposes a student plan.
    const entry = SUBSCRIPTION_REGISTRY[id];
    if (sub && entry.studentPriceRM !== null) {
      const tolerance = sub.amountRM * ZOMBIE_RULES.amountTolerancePct;
      if (Math.abs(sub.amountRM - entry.fullPriceRM) <= tolerance) {
        studentDowngradeCandidates.push(id);
      }
    }
  }

  return { recurring, tags, studentDowngradeCandidates };
}

/**
 * One-click answer to "Have you used <merchant> in the past 30 days?".
 * "No" upgrades SUSPECTED_ZOMBIE -> ZOMBIE. T1 action.
 */
export function applyUsageAnswer(tag: ZombieTag, usedInPast30Days: boolean): ZombieTag {
  if (usedInPast30Days) return tag === 'SUSPECTED_ZOMBIE' ? 'ACTIVE' : tag;
  return tag === 'SUSPECTED_ZOMBIE' ? 'ZOMBIE' : tag;
}
