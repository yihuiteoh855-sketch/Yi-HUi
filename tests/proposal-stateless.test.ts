import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/proposals/[id]/decision/route';
import { __clearProposals } from '@/lib/proposals';
import { signProposal } from '@/lib/signing';
import { buildLedgerSnapshot } from '@/lib/ledger';
import type { LedgerSnapshot } from '@/lib/ledger';
import type { QuarantineTerms, SignedProposal } from '@/lib/types';

/**
 * Task 2 — stateless proposal verification.
 *
 * On serverless, POST /api/proposals and POST /api/proposals/[id]/decision may hit
 * different instances. The decision route must therefore accept the client-echoed
 * SignedProposal and cryptographically re-verify it, instead of 404-ing on a cold start.
 */

const USER = 'student_usm_001';
const AUTONOMY = {
  masterAutonomyEnabled: true,
  enabledTiers: { T0: true, T1: true, T2: true, T3: true },
};

function snapshot(): LedgerSnapshot {
  return buildLedgerSnapshot({
    userId: USER,
    sandboxClock: Date.UTC(2026, 2, 12, 9, 0, 0),
    currentBalance: 1240,
    defenseVault: 0,
    rewardPool: 24,
    amortizeAnnualFees: false,
  });
}

function quarantineTerms(): QuarantineTerms {
  return {
    kind: 'QUARANTINE',
    targetItem: 'Shopee impulse buy',
    itemPrice: 180,
    premiumReward: 9,
    quarantineHours: 24,
    shortfallProbability: 42,
    cfar95: 210,
    riskLevel: 'HIGH',
  };
}

function makeProposal(opts?: { expiresAt?: string }): SignedProposal {
  return signProposal(quarantineTerms(), USER, {
    proposalId: 'prop_stateless_0001',
    expiresAt: opts?.expiresAt,
  });
}

function approveDecision(proposalId: string) {
  return {
    status: 'APPROVED' as const,
    proposalId,
    authorizationRef: `USER_CLICK_APPROVE_PROPOSAL_${proposalId.slice(-4)}`,
  };
}

function makeRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/proposals/${id}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('stateless proposal decision (serverless cold start)', () => {
  beforeEach(() => __clearProposals());

  it('succeeds with a valid echoed SignedProposal after the in-memory store is cleared', async () => {
    const proposal = makeProposal();
    __clearProposals(); // simulate a different instance / cold start

    const res = await POST(
      makeRequest(proposal.proposalId, {
        decision: approveDecision(proposal.proposalId),
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY,
        proposal,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { proposal: SignedProposal; authorizationRef: string };
    expect(data.proposal.status).toBe('APPROVED');
    expect(data.authorizationRef).toMatch(/^USER_CLICK_APPROVE_PROPOSAL_/);
  });

  it('rejects a proposal whose premiumReward was tampered with by 0.01', async () => {
    const proposal = makeProposal();
    __clearProposals();
    const terms = proposal.terms as QuarantineTerms;
    const tampered: SignedProposal = {
      ...proposal,
      terms: { ...terms, premiumReward: terms.premiumReward + 0.01 },
    };

    const res = await POST(
      makeRequest(proposal.proposalId, {
        decision: approveDecision(proposal.proposalId),
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY,
        proposal: tampered,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('INTEGRITY_HASH_MISMATCH');
  });

  it('rejects an expired proposal with 410', async () => {
    const proposal = makeProposal({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    __clearProposals();

    const res = await POST(
      makeRequest(proposal.proposalId, {
        decision: approveDecision(proposal.proposalId),
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY,
        proposal,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(410);
  });

  it('returns 404 when neither memory nor a body proposal is available', async () => {
    __clearProposals();
    const res = await POST(
      makeRequest('prop_missing_0000', {
        decision: approveDecision('prop_missing_0000'),
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY,
      }),
      { params: { id: 'prop_missing_0000' } },
    );
    expect(res.status).toBe(404);
  });

  it('still enforces the T3 click gate on the stateless path', async () => {
    const proposal = makeProposal();
    __clearProposals();

    const res = await POST(
      makeRequest(proposal.proposalId, {
        decision: { status: 'APPROVED', proposalId: proposal.proposalId, authorizationRef: 'NOT_A_CLICK_REF' },
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY,
        proposal,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('TIER_BLOCKED');
  });
});
