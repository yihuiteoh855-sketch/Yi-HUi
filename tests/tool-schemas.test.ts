import { describe, expect, it } from 'vitest';
import {
  ProposeEscrowInputSchema,
  ProposeQuarantineInputSchema,
  ProposeSweepInputSchema,
  RunWhatIfInputSchema,
} from '@/lib/types';

describe('LLM tool input schemas (strict)', () => {
  it('accepts a valid run_what_if input', () => {
    const r = RunWhatIfInputSchema.safeParse({ targetItem: 'shoes', itemPrice: 180, category: 'Shopping' });
    expect(r.success).toBe(true);
  });

  it('rejects extra keys (.strict()) — e.g. an injected deepLinkUrl', () => {
    const r = ProposeSweepInputSchema.safeParse({
      subscriptionId: 'spotify_my',
      action: 'CANCEL',
      deepLinkUrl: 'https://evil.example/phish',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a NEEDS category in an escrow lock (NEEDS can never be locked)', () => {
    const r = ProposeEscrowInputSchema.safeParse({
      targetItem: 'impulse',
      itemPrice: 90,
      lockedCategories: ['Medical'],
      durationDays: 5,
    });
    expect(r.success).toBe(false);
  });

  it('rejects a NEEDS category in a quarantine', () => {
    const r = ProposeQuarantineInputSchema.safeParse({
      targetItem: 'medicine',
      itemPrice: 30,
      category: 'Medical',
    });
    expect(r.success).toBe(false);
  });

  it('accepts WANTS-only escrow locks', () => {
    const r = ProposeEscrowInputSchema.safeParse({
      targetItem: 'impulse',
      itemPrice: 90,
      lockedCategories: ['Shopping', 'Entertainment'],
      durationDays: 5,
    });
    expect(r.success).toBe(true);
  });

  it('rejects a non-positive price and an over-30-day duration', () => {
    expect(RunWhatIfInputSchema.safeParse({ targetItem: 'x', itemPrice: 0, category: 'Shopping' }).success).toBe(false);
    expect(
      ProposeEscrowInputSchema.safeParse({
        targetItem: 'x',
        itemPrice: 10,
        lockedCategories: ['Shopping'],
        durationDays: 45,
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown subscriptionId in a sweep', () => {
    const r = ProposeSweepInputSchema.safeParse({ subscriptionId: 'hulu_my', action: 'CANCEL' });
    expect(r.success).toBe(false);
  });

  it('rejects a sweep input that tries to smuggle a price or savings figure', () => {
    const r = ProposeSweepInputSchema.safeParse({
      subscriptionId: 'spotify_my',
      action: 'STUDENT_DOWNGRADE',
      monthlySavings: 999,
    });
    expect(r.success).toBe(false);
  });
});
