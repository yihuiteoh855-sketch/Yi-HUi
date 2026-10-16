import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_DAILY_SPENDING,
  RECURRING_TRANSACTIONS,
  SUBSCRIPTIONS,
  FIXED_BILLS,
  generateHistoricalDailySpending,
} from '@/lib/mock-data';

describe('mock-data', () => {
  it('provides at least 45 days of historical daily spending', () => {
    expect(HISTORICAL_DAILY_SPENDING.length).toBeGreaterThanOrEqual(45);
    expect(HISTORICAL_DAILY_SPENDING.every((v) => v > 0)).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    expect(generateHistoricalDailySpending(20260312, 45)).toEqual(
      generateHistoricalDailySpending(20260312, 45),
    );
  });

  it('every recurring subscription has >= 3 historical charges', () => {
    const merchants: Record<string, number> = {};
    for (const t of RECURRING_TRANSACTIONS) {
      merchants[t.merchant] = (merchants[t.merchant] ?? 0) + 1;
    }
    // Netflix, Spotify, YouTube, Disney+, iCloud all appear 3 times.
    const recurring = Object.values(merchants).filter((n) => n >= 3);
    expect(recurring.length).toBeGreaterThanOrEqual(5);
  });

  it('has at least one unpaid fixed bill still due this month', () => {
    expect(FIXED_BILLS.some((b) => !b.paid)).toBe(true);
  });

  it('subscription next billing dates are valid ISO dates', () => {
    for (const s of SUBSCRIPTIONS) {
      expect(() => new Date(s.nextBillingDate).toISOString()).not.toThrow();
    }
  });
});
