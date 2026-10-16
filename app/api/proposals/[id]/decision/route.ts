import { getUserIdFromSession } from '@/lib/session';
import { parseLedgerSnapshot } from '@/lib/ledger';
import { decideProposal, getStoredProposal, ProposalError } from '@/lib/proposals';
import { assertTier, type TierState } from '@/lib/permissions';
import { auditLog } from '@/lib/audit-logger';
import { CardDecisionSchema, SignedProposalSchema, type SignedProposal } from '@/lib/types';
import { toISODateTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  decision?: unknown;
  ledgerSnapshot?: unknown;
  autonomy?: TierState;
  /** The signed proposal being decided on, echoed by the client for stateless verification. */
  proposal?: unknown;
}

const TOOL_FOR_KIND: Record<string, string> = {
  QUARANTINE: 'propose_quarantine',
  ESCROW: 'propose_escrow',
  SWEEP: 'propose_sweep',
};

/**
 * Apply a card decision to a signed proposal.
 * Enforces, in order: Zod decision schema -> integrity hash -> tenant -> T3 tier gate
 * (Master ON + explicit USER_CLICK_APPROVE_PROPOSAL_* ref) -> escrow floor + AI mandate.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = getUserIdFromSession(req);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const parsedDecision = CardDecisionSchema.safeParse(body.decision);
  if (!parsedDecision.success) {
    return Response.json(
      { error: 'INVALID_DECISION', issues: parsedDecision.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const decision = parsedDecision.data;

  // The proposalId in the URL is authoritative.
  if (decision.proposalId !== params.id) {
    return Response.json({ error: 'PROPOSAL_ID_MISMATCH' }, { status: 400 });
  }

  let snapshot;
  try {
    snapshot = parseLedgerSnapshot(body.ledgerSnapshot);
  } catch (err) {
    return Response.json(
      { error: 'INVALID_LEDGER_SNAPSHOT', message: (err as Error).message },
      { status: 400 },
    );
  }

  const autonomy: TierState = body.autonomy ?? {
    masterAutonomyEnabled: false,
    enabledTiers: { T0: true, T1: false, T2: false, T3: false },
  };

  // Optional stateless fallback: verify the echoed proposal's shape (hash is verified in decideProposal).
  let echoedProposal: SignedProposal | undefined;
  if (body.proposal !== undefined) {
    const parsedProposal = SignedProposalSchema.safeParse(body.proposal);
    if (!parsedProposal.success) {
      return Response.json({ error: 'INVALID_PROPOSAL_PAYLOAD' }, { status: 400 });
    }
    echoedProposal = parsedProposal.data;
  }

  // Tier gate. A DECLINE is always allowed (it is not a financial state change).
  if (decision.status !== 'DECLINED') {
    const source = getStoredProposal(params.id) ?? echoedProposal;
    const toolName = source ? TOOL_FOR_KIND[source.terms.kind] ?? 'propose_quarantine' : 'propose_quarantine';
    const check = assertTier(toolName, autonomy, { authorizationRef: decision.authorizationRef });
    if (!check.ok) {
      auditLog.append(
        {
          sandboxClock: toISODateTime(snapshot.sandboxClock),
          actor: 'USER',
          actionType: 'T3_GATE_REJECTED',
          permissionTier: 'T3',
          data_accessed: ['proposals'],
          authorization_ref: decision.authorizationRef,
          proposal_hash: null,
          status: 'DECLINED',
        },
        userId,
      );
      return Response.json({ error: 'TIER_BLOCKED', reason: check.reason }, { status: 403 });
    }
  }

  try {
    const { proposal, authorizationRef } = decideProposal({
      proposalId: params.id,
      userId,
      decision,
      mandate: snapshot.aiMandate,
      snapshot,
      proposal: echoedProposal,
    });

    auditLog.append(
      {
        sandboxClock: toISODateTime(snapshot.sandboxClock),
        actor: 'USER',
        actionType: 'USER_DECISION',
        permissionTier: 'T3',
        data_accessed: ['proposals', 'balance'],
        authorization_ref: authorizationRef,
        proposal_hash: proposal.integrityHash,
        status:
          proposal.status === 'DECLINED'
            ? 'DECLINED'
            : proposal.status === 'MODIFIED'
              ? 'MODIFIED'
              : 'APPROVED',
      },
      userId,
    );

    return Response.json({ proposal, authorizationRef });
  } catch (err) {
    if (err instanceof ProposalError) {
      return Response.json({ error: err.code, message: err.message }, { status: err.status });
    }
    console.error('[proposals/decision] unexpected', err);
    return Response.json({ error: 'DECISION_FAILED' }, { status: 500 });
  }
}
