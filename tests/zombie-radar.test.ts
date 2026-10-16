import { describe, expect, it } from 'vitest';
import { analyzeZombies, applyUsageAnswer, detectRecurring, normalizeMerchant, resolveSubscriptionByMerchant } from '@/lib/zombie-radar';
import {
  RECURRING_TRANSACTIONS,
  SUBSCRIPTIONS,
  USAGE_SIGNALS,
  SANDBOX_START_MS,
} from '@/lib/mock-data';

const analysis = analyzeZombies({
  transactions: RECURRING_TRANSACTIONS,
  subscriptions: SUBSCRIPTIONS,
  usageSignals: USAGE_SIGNALS,
  sandboxClock: SANDBOX_START_MS,
});

describe('zombie radar', () => {
  it('normalizes merchant strings', () => {
    expect(normalizeMerchant('NETFLIX.COM')).toBe('NETFLIXCOM');
  });

  it('resolves merchants to registry ids deterministically', () => {
    expect(resolveSubscriptionByMerchant('SPOTIFY PTE LTD')).toBe('spotify_my');
    expect(resolveSubscriptionByMerchant('GOOGLE *YOUTUBE')).toBe('youtube_my');
    expect(resolveSubscriptionByMerchant('UNKNOWN SHOP')).toBeNull();
  });

  it('detects >= 3 recurring monthly charges within ±5% and ~30±3 day intervals', () => {
    const recurring = detectRecurring(RECURRING_TRANSACTIONS);
    const ids = recurring.map((r) => r.subscriptionId);
    expect(ids).toContain('netflix_my');
    expect(ids).toContain('spotify_my');
    expect(ids).toContain('disney_plus_my');
    const netflix = recurring.find((r) => r.subscriptionId === 'netflix_my')!;
    expect(netflix.occurrences).toBe(3);
    expect(netflix.avgIntervalDays).toBeCloseTo(31, 0);
  });

  it('tags low-activity recurring subscriptions as ZOMBIE', () => {
    expect(analysis.tags.netflix_my).toBe('ZOMBIE');
  });

  it('tags recurring subscriptions with no telemetry as SUSPECTED_ZOMBIE', () => {
    expect(analysis.tags.disney_plus_my).toBe('SUSPECTED_ZOMBIE');
  });

  it('tags an active subscription renewing within 3 days as ENDANGERED', () => {
    expect(analysis.tags.youtube_my).toBe('ENDANGERED');
  });

  it('tags healthy subscriptions as ACTIVE', () => {
    expect(analysis.tags.spotify_my).toBe('ACTIVE');
    expect(analysis.tags.icloud_my).toBe('ACTIVE');
  });

  it('detects student-downgrade arbitrage (full price while a student plan exists)', () => {
    expect(analysis.studentDowngradeCandidates).toContain('spotify_my');
    expect(analysis.studentDowngradeCandidates).toContain('youtube_my');
    expect(analysis.studentDowngradeCandidates).not.toContain('netflix_my');
  });

  it('answers "used in past 30 days?" upgrade/downgrade the suspected zombie', () => {
    expect(applyUsageAnswer('SUSPECTED_ZOMBIE', false)).toBe('ZOMBIE');
    expect(applyUsageAnswer('SUSPECTED_ZOMBIE', true)).toBe('ACTIVE');
    expect(applyUsageAnswer('ACTIVE', false)).toBe('ACTIVE');
  });
});
