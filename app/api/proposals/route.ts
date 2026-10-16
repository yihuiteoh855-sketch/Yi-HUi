import { getUserIdFromSession } from '@/lib/session';
import { parseLedgerSnapshot } from '@/lib/ledger';
import { createProposal, ProposalError, type ProposalKind } from '@/lib/proposals';
import { auditLog } from '@/lib/audit-logger';
import { toISODateTime } from '@/lib/utils';

export const runtime = 'nodejs';

interface Body {
  kind?: ProposalKind;
  input?: Record<string, unknown>;
  ledgerSnapshot?: unknown;
}

const VALID_KINDS: ProposalKind[] = ['QUARANTINE', 'ESCROW', 'SWEEP'];

/**
 * Create and SIGN a proposal. The server computes every figure itself and returns
 * the signed proposal for the card to display. Nothing executes here (T2-class
 * preparation); the T3 state change happens only on an explicit click decision.
 */
export async function POST(req: Request) {
  const userId = getUserIdFromSession(req);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  if (!body.kind || !VALID_KINDS.includes(body.kind)) {
    return Response.json({ error: 'INVALID_KIND', allowed: VALID_KINDS }, { status: 400 });
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

  try {
    const proposal = createProposal({
      kind: body.kind,
      input: body.input ?? {},
      snapshot,
      userId,
    });
    auditLog.append(
      {
        sandboxClock: toISODateTime(snapshot.sandboxClock),
        actor: 'AGENT',
        actionType: `PROPOSE_${body.kind}`,
        permissionTier: 'T3',
        data_accessed: ['transactions.last45d', 'bills.unpaid', 'subscriptions', 'userPayLimits', 'aiMandate'],
        authorization_ref: 'PROPOSAL_SIGNED_BY_SERVER',
        proposal_hash: proposal.integrityHash,
        status: 'PROPOSED',
      },
      userId,
    );
    return Response.json({ proposal }, { status: 201 });
  } catch (err) {
    if (err instanceof ProposalError) {
      return Response.json({ error: err.code, message: err.message }, { status: err.status });
    }
    console.error('[proposals] unexpected', err);
    return Response.json({ error: 'PROPOSAL_FAILED' }, { status: 500 });
  }
}
