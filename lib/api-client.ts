'use client';

/**
 * Client-side API helpers.
 *
 * The sandbox ledger lives in the browser, so every call posts a fresh
 * `ledgerSnapshot` that the server treats as USER-SUPPLIED DATA and re-derives.
 */
import { useCtrlPayStore } from './store';
import type { CardDecision, SignedProposal } from './types';

export type ProposalKind = 'QUARANTINE' | 'ESCROW' | 'SWEEP';

function currentAutonomy() {
  const s = useCtrlPayStore.getState();
  return {
    masterAutonomyEnabled: s.masterAutonomyEnabled,
    enabledTiers: s.enabledTiers,
  };
}

export interface ApiError {
  error: string;
  message?: string;
  reason?: string;
}

export async function requestProposal(
  kind: ProposalKind,
  input: Record<string, unknown>,
): Promise<SignedProposal> {
  const snapshot = useCtrlPayStore.getState().ledgerSnapshot();
  const res = await fetch('/api/proposals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, input, ledgerSnapshot: snapshot }),
  });
  const data = (await res.json()) as { proposal?: SignedProposal } & ApiError;
  if (!res.ok || !data.proposal) {
    throw new Error(data.message ?? data.reason ?? data.error ?? 'PROPOSAL_FAILED');
  }
  return data.proposal;
}

export async function submitDecision(
  proposalId: string,
  decision: CardDecision,
): Promise<{ proposal: SignedProposal; authorizationRef: string }> {
  const snapshot = useCtrlPayStore.getState().ledgerSnapshot();
  const res = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision, ledgerSnapshot: snapshot, autonomy: currentAutonomy() }),
  });
  const data = (await res.json()) as {
    proposal?: SignedProposal;
    authorizationRef?: string;
  } & ApiError;
  if (!res.ok || !data.proposal || !data.authorizationRef) {
    throw new Error(data.reason ?? data.message ?? data.error ?? 'DECISION_FAILED');
  }
  return { proposal: data.proposal, authorizationRef: data.authorizationRef };
}

/** Build a client-side mailto: URL from a registry descriptor (never sent by CtrlPay). */
export function buildMailto(
  descriptor: { to: string; subject: string; body: string },
  profile: { fullName: string; memberId: string },
): string {
  const fill = (s: string) =>
    s.replaceAll('{{MEMBER_ID}}', profile.memberId).replaceAll('{{FULL_NAME}}', profile.fullName);
  const subject = encodeURIComponent(fill(descriptor.subject));
  const body = encodeURIComponent(fill(descriptor.body));
  return `mailto:${descriptor.to}?subject=${subject}&body=${body}`;
}
