'use client';

/**
 * Client–server audit traversal (plan.md Section 6.4).
 *
 * Server-side executions (AGENT tool invocations, NUMBER_VERIFIER_* records) are written
 * to the server's audit chain. This helper pulls them and merges them into the browser's
 * chain via `auditLog.mergeExternal`, which recomputes hashes locally so
 * `verifyChain(userId) === true` still holds. Only AGENT entries are imported, because
 * USER decisions are already recorded client-side — importing them too would double-count.
 */
import { auditLog, type AuditEntry } from './audit-logger';
import { useCtrlPayStore } from './store';

export interface AuditSyncResult {
  added: number;
  /** The most recent post-LLM number-verifier outcome the server recorded, if any. */
  verifier: 'PASSED' | 'BLOCKED' | null;
  chainOk: boolean;
}

const VERIFIER_RE = /^NUMBER_VERIFIER_(PASSED|BLOCKED)$/;

export async function syncServerAudit(): Promise<AuditSyncResult> {
  const userId = useCtrlPayStore.getState().userId;
  try {
    const res = await fetch('/api/audit', { cache: 'no-store' });
    if (!res.ok) return { added: 0, verifier: null, chainOk: auditLog.verifyChain(userId) };
    const data = (await res.json()) as { entries?: unknown[] };
    const agentEntries = (data.entries ?? []).filter(
      (e): e is AuditEntry => !!e && typeof e === 'object' && (e as AuditEntry).actor === 'AGENT',
    );
    const added = auditLog.mergeExternal(agentEntries, userId);

    const entries = auditLog.list(userId);
    let verifier: 'PASSED' | 'BLOCKED' | null = null;
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const match = VERIFIER_RE.exec(entries[i].actionType);
      if (match) {
        verifier = match[1] === 'BLOCKED' ? 'BLOCKED' : 'PASSED';
        break;
      }
    }
    return { added, verifier, chainOk: auditLog.verifyChain(userId) };
  } catch {
    return { added: 0, verifier: null, chainOk: auditLog.verifyChain(userId) };
  }
}
