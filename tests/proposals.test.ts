import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearProposals,
  createProposal,
  decideProposal,
  getStoredProposal,
  ProposalError,
  storeProposal,
} from '@/lib/proposals';
import { buildLedgerSnapshot, parseLedgerSnapshot } from '@/lib/ledger';
import { signProposal } from '@/lib/signing';
import type { LedgerSnapshot } from '@/lib/ledger';
import type { ProposalTerms } from '@/lib/types';

const USER = 'student_usm_001';

function snapshot(overrides: Partial<LedgerSnapshot> = {}): LedgerSnapshot {
  const base = buildLedgerSnapshot({
    userId: USER,
    sandboxClock: Date.UTC(2026, 2, 12, 9, 0, 0),
    currentBalance: 1240,
    defenseVault: 0,
    rewardPool: 24,
    amortizeAnnualFees: false,
  });
  return { ...base, ...overrides };
}

describe('server-side proposal creation', () => {
  beforeEach(() => __clearProposals());

  it('creates a signed quarantine proposal when risk is HIGH/CRITICAL', () => {
    const p = createProposal({
      kind: 'QUARANTINE',
      input: { targetItem: 'Shopee impulse buy', itemPrice: 180, category: 'Shopping' },
      snapshot: snapshot(),
      userId: USER,
    });
    expect(p.terms.kind).toBe('QUARANTINE');
    expect(p.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(p.userId).toBe(USER);
    if (p.terms.kind === 'QUARANTINE') {
      expect(p.terms.premiumReward).toBeGreaterThanOrEqual(0);
      expect(p.terms.shortfallProbability).toBeGreaterThanOrEqual(0);
    }
  });

  it('refuses to propose a contract when risk is LOW/MEDIUM (non-intervention exit path)', () => {
    expect(() =>
      createProposal({
        kind: 'QUARANTINE',
        input: { targetItem: 'cheap snack', itemPrice: 5, category: 'Bubble_Tea_Dining' },
        snapshot: snapshot({ currentBalance: 5000, spentThisWeek: 0, spentThisMonth: 0 }),
        userId: USER,
      }),
    ).toThrowError(/RISK_TOO_LOW/);
  });

  it('rejects a quarantine that exceeds the AI Mandate Limit', () => {
    expect(() =>
      createProposal({
        kind: 'QUARANTINE',
        input: { targetItem: 'gaming laptop', itemPrice: 3000, category: 'Shopping' },
        snapshot: snapshot(),
        userId: USER,
      }),
    ).toThrowError(/EXCEEDS_AI_MANDATE/);
  });

  it('creates an escrow with a server-computed reduction within the safe ceiling', () => {
    const p = createProposal({
      kind: 'ESCROW',
      input: { targetItem: 'impulse', itemPrice: 180, lockedCategories: ['Shopping'], durationDays: 7 },
      snapshot: snapshot(),
      userId: USER,
    });
    if (p.terms.kind !== 'ESCROW') throw new Error('expected escrow');
    expect(p.terms.dailyBudgetReduction).toBeGreaterThan(0);
    expect(p.terms.dailyBudgetReduction).toBeLessThanOrEqual(p.terms.maxAllowedReduction);
  });

  it('rejects an escrow whose locked categories include a NEEDS category', () => {
    expect(() =>
      createProposal({
        kind: 'ESCROW',
        input: { targetItem: 'x', itemPrice: 90, lockedCategories: ['Medical'], durationDays: 5 },
        snapshot: snapshot(),
        userId: USER,
      }),
    ).toThrowError(/ESCROW_FLOOR_VIOLATION/);
  });

  it('computes sweep savings from the registry (student downgrade)', () => {
    const p = createProposal({
      kind: 'SWEEP',
      input: { subscriptionId: 'spotify_my', action: 'STUDENT_DOWNGRADE' },
      snapshot: snapshot(),
      userId: USER,
    });
    if (p.terms.kind !== 'SWEEP') throw new Error('expected sweep');
    expect(p.terms.monthlySavings).toBeCloseTo(7.4, 2);
    expect(p.terms.annualSavings).toBeCloseTo(88.8, 2);
  });

  it('rejects a student downgrade when the merchant has no student plan', () => {
    expect(() =>
      createProposal({
        kind: 'SWEEP',
        input: { subscriptionId: 'netflix_my', action: 'STUDENT_DOWNGRADE' },
        snapshot: snapshot(),
        userId: USER,
      }),
    ).toThrowError(/NO_STUDENT_PLAN/);
  });
});

describe('card decisions', () => {
  beforeEach(() => __clearProposals());

  function makeQuarantine(userId = USER) {
    const terms: ProposalTerms = {
      kind: 'QUARANTINE',
      targetItem: 'Shopee impulse buy',
      itemPrice: 180,
      premiumReward: 9,
      quarantineHours: 24,
      shortfallProbability: 42,
      cfar95: 210,
      riskLevel: 'HIGH',
    };
    const p = signProposal(terms, userId, { proposalId: 'prop_fixed_000001' });
    storeProposal(p);
    return p;
  }

  it('approves and returns the click authorization ref', () => {
    const p = makeQuarantine();
    const out = decideProposal({
      proposalId: p.proposalId,
      userId: USER,
      decision: { status: 'APPROVED', proposalId: p.proposalId, authorizationRef: `USER_CLICK_APPROVE_PROPOSAL_${p.proposalId.slice(-4)}` },
      mandate: snapshot().aiMandate,
      snapshot: snapshot(),
    });
    expect(out.proposal.status).toBe('APPROVED');
    expect(out.authorizationRef).toMatch(/^USER_CLICK_APPROVE_PROPOSAL_/);
  });

  it('rejects a tampered proposal (integrity hash mismatch)', () => {
    const p = makeQuarantine();
    const tampered = { ...p, integrityHash: 'a'.repeat(64) };
    storeProposal(tampered);
    expect(() =>
      decideProposal({
        proposalId: p.proposalId,
        userId: USER,
        decision: { status: 'APPROVED', proposalId: p.proposalId, authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_0001' },
        mandate: snapshot().aiMandate,
        snapshot: snapshot(),
      }),
    ).toThrowError(/INTEGRITY_HASH_MISMATCH/);
  });

  it('rejects a decision from another tenant', () => {
    const p = makeQuarantine('someone_else');
    expect(() =>
      decideProposal({
        proposalId: p.proposalId,
        userId: USER,
        decision: { status: 'APPROVED', proposalId: p.proposalId, authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_0001' },
        mandate: snapshot().aiMandate,
        snapshot: snapshot(),
      }),
    ).toThrowError(/FORBIDDEN/);
  });

  it('re-signs modified escrow terms after re-validating the floor', () => {
    const terms: ProposalTerms = {
      kind: 'ESCROW',
      targetItem: 'impulse',
      itemPrice: 180,
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 10,
      durationDays: 7,
      maxAllowedReduction: 20,
      shortfallProbability: 42,
      cfar95: 210,
    };
    const p = signProposal(terms, USER, { proposalId: 'prop_fixed_000002' });
    storeProposal(p);
    const out = decideProposal({
      proposalId: p.proposalId,
      userId: USER,
      decision: {
        status: 'MODIFIED',
        proposalId: p.proposalId,
        newTerms: { durationDays: 5, dailyBudgetReduction: 8 },
        authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_0002',
      },
      mandate: snapshot().aiMandate,
      snapshot: snapshot(),
    });
    if (out.proposal.terms.kind !== 'ESCROW') throw new Error('expected escrow');
    expect(out.proposal.terms.durationDays).toBe(5);
    expect(out.proposal.terms.dailyBudgetReduction).toBe(8);
    expect(out.proposal.status).toBe('MODIFIED');
  });

  it('rejects modified terms that break the survival floor', () => {
    const terms: ProposalTerms = {
      kind: 'ESCROW',
      targetItem: 'impulse',
      itemPrice: 180,
      lockedCategories: ['Shopping'],
      dailyBudgetReduction: 10,
      durationDays: 7,
      maxAllowedReduction: 20,
      shortfallProbability: 42,
      cfar95: 210,
    };
    const p = signProposal(terms, USER, { proposalId: 'prop_fixed_000003' });
    storeProposal(p);
    expect(() =>
      decideProposal({
        proposalId: p.proposalId,
        userId: USER,
        decision: {
          status: 'MODIFIED',
          proposalId: p.proposalId,
          newTerms: { dailyBudgetReduction: 9999 },
          authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_0003',
        },
        mandate: snapshot().aiMandate,
        snapshot: snapshot(),
      }),
    ).toThrowError(/ESCROW_FLOOR_VIOLATION/);
  });

  it('records a decline without any state change', () => {
    const p = makeQuarantine();
    const out = decideProposal({
      proposalId: p.proposalId,
      userId: USER,
      decision: { status: 'DECLINED', proposalId: p.proposalId, reason: 'not now' },
      mandate: snapshot().aiMandate,
      snapshot: snapshot(),
    });
    expect(out.proposal.status).toBe('DECLINED');
  });
});

describe('ledger snapshot intake validation', () => {
  it('accepts a well-formed snapshot and re-derives fixed bills server-side', () => {
    const s = parseLedgerSnapshot(snapshot());
    expect(s.userId).toBe(USER);
    expect(s.fixedBills.length).toBeGreaterThan(0);
  });

  it('rejects a malformed snapshot from the request body', () => {
    expect(() => parseLedgerSnapshot({ userId: 'x' })).toThrowError(/INVALID_LEDGER_SNAPSHOT/);
  });

  it('rejects unknown keys on the snapshot (.strict())', () => {
    expect(() => parseLedgerSnapshot({ ...snapshot(), injected: true })).toThrowError(
      /INVALID_LEDGER_SNAPSHOT/,
    );
  });

  it('is a ProposalError-compatible failure surface', () => {
    expect(ProposalError).toBeTypeOf('function');
  });

  it('proposal ids are unique per creation', () => {
    __clearProposals();
    const a = createProposal({
      kind: 'SWEEP',
      input: { subscriptionId: 'netflix_my', action: 'CANCEL' },
      snapshot: snapshot(),
      userId: USER,
    });
    const b = createProposal({
      kind: 'SWEEP',
      input: { subscriptionId: 'netflix_my', action: 'CANCEL' },
      snapshot: snapshot(),
      userId: USER,
    });
    expect(a.proposalId).not.toBe(b.proposalId);
    expect(getStoredProposal(a.proposalId)).toBeTruthy();
  });
});
