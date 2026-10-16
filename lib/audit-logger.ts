/**
 * Immutable, hash-chained, append-only audit log (plan.md Section 6.4).
 *
 *   entryHash = SHA-256(prevHash + canonicalJson(entry))
 *
 * Any tampering with an earlier entry breaks every subsequent hash, so
 * `verifyChain()` detects it. The sandbox persists to server memory plus a
 * localStorage mirror; production would use WORM storage.
 *
 * ISOMORPHIC: uses the pure sha256 implementation so the browser store can append.
 */
import { sha256Hex } from './sha256';
import { canonicalJson } from './canonical';
import { newId } from './ids';
import { CURRENT_USER_ID } from './mock-data';

export type AuditActor = 'AGENT' | 'USER';
export type AuditTier = 'T0' | 'T1' | 'T2' | 'T3';
export type AuditStatus = 'PROPOSED' | 'APPROVED' | 'DECLINED' | 'MODIFIED' | 'EXECUTED';

export interface AuditEntry {
  logId: string;
  timestamp: string; // ISO, real time
  sandboxClock: string; // ISO, simulated time
  actor: AuditActor;
  actionType: string; // e.g. 'RUN_WHAT_IF', 'PROPOSE_QUARANTINE', 'USER_DECISION'
  permissionTier: AuditTier;
  data_accessed: string[]; // exact FIELDS read; never raw PII values
  authorization_ref: string; // e.g. 'USER_CLICK_APPROVE_PROPOSAL_8F3A'
  proposal_hash: string | null;
  status: AuditStatus;
  prevHash: string;
  entryHash: string;
}

export type AuditInput = Omit<AuditEntry, 'logId' | 'timestamp' | 'prevHash' | 'entryHash'>;

const GENESIS_HASH = 'GENESIS';
const STORAGE_PREFIX = 'ctrlpay_audit_';

const logs = new Map<string, AuditEntry[]>();

function localStorageSafe(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function hydrate(userId: string): AuditEntry[] {
  if (logs.has(userId)) return logs.get(userId) as AuditEntry[];
  const store = localStorageSafe();
  if (store) {
    const raw = store.getItem(STORAGE_PREFIX + userId);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuditEntry[];
        logs.set(userId, parsed);
        return parsed;
      } catch {
        /* ignore corrupt mirror */
      }
    }
  }
  logs.set(userId, []);
  return logs.get(userId) as AuditEntry[];
}

function persist(userId: string, entries: AuditEntry[]): void {
  const store = localStorageSafe();
  if (!store) return;
  try {
    store.setItem(STORAGE_PREFIX + userId, JSON.stringify(entries));
  } catch {
    /* quota / private mode: in-memory log still stands */
  }
}

function hashEntry(head: Omit<AuditEntry, 'entryHash'>): string {
  return sha256Hex(canonicalJson(head));
}

/** Shape guard for untrusted external entries (from the server). */
function isAuditEntry(value: unknown): value is AuditEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.logId === 'string' &&
    typeof e.timestamp === 'string' &&
    typeof e.sandboxClock === 'string' &&
    (e.actor === 'AGENT' || e.actor === 'USER') &&
    typeof e.actionType === 'string' &&
    (e.permissionTier === 'T0' ||
      e.permissionTier === 'T1' ||
      e.permissionTier === 'T2' ||
      e.permissionTier === 'T3') &&
    Array.isArray(e.data_accessed) &&
    typeof e.authorization_ref === 'string' &&
    (e.proposal_hash === null || typeof e.proposal_hash === 'string') &&
    typeof e.status === 'string' &&
    typeof e.prevHash === 'string' &&
    typeof e.entryHash === 'string'
  );
}

export const auditLog = {
  append(e: AuditInput, userId: string = CURRENT_USER_ID): AuditEntry {
    const entries = hydrate(userId);
    const prevHash = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;
    const head: Omit<AuditEntry, 'entryHash'> = {
      logId: newId('log'),
      timestamp: new Date().toISOString(),
      sandboxClock: e.sandboxClock,
      actor: e.actor,
      actionType: e.actionType,
      permissionTier: e.permissionTier,
      data_accessed: e.data_accessed,
      authorization_ref: e.authorization_ref,
      proposal_hash: e.proposal_hash,
      status: e.status,
      prevHash,
    };
    const entry: AuditEntry = { ...head, entryHash: hashEntry(head) };
    entries.push(entry);
    persist(userId, entries);
    return entry;
  },

  list(userId: string = CURRENT_USER_ID): readonly AuditEntry[] {
    return hydrate(userId);
  },

  verifyChain(userId: string = CURRENT_USER_ID): boolean {
    const entries = hydrate(userId);
    let prevHash = GENESIS_HASH;
    for (const entry of entries) {
      if (entry.prevHash !== prevHash) return false;
      const { entryHash, ...head } = entry;
      if (hashEntry(head) !== entryHash) return false;
      prevHash = entryHash;
    }
    return true;
  },

  /**
   * Merge externally-recorded entries (e.g. server-side AGENT tool invocations) into this
   * chain. Entries already present (by `logId`) are skipped, so repeated syncs are
   * idempotent. Hashes are RECOMPUTED locally so the merged chain still satisfies
   * `verifyChain() === true`. All original descriptive fields are preserved.
   */
  mergeExternal(external: readonly unknown[], userId: string = CURRENT_USER_ID): number {
    const entries = hydrate(userId);
    const seen = new Set(entries.map((e) => e.logId));
    let prevHash = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;
    let added = 0;

    for (const raw of external) {
      if (!isAuditEntry(raw) || seen.has(raw.logId)) continue;
      const head: Omit<AuditEntry, 'entryHash'> = {
        logId: raw.logId,
        timestamp: raw.timestamp,
        sandboxClock: raw.sandboxClock,
        actor: raw.actor,
        actionType: raw.actionType,
        permissionTier: raw.permissionTier,
        data_accessed: raw.data_accessed,
        authorization_ref: raw.authorization_ref,
        proposal_hash: raw.proposal_hash,
        status: raw.status,
        prevHash,
      };
      const entry: AuditEntry = { ...head, entryHash: hashEntry(head) };
      entries.push(entry);
      seen.add(entry.logId);
      prevHash = entry.entryHash;
      added += 1;
    }

    if (added > 0) persist(userId, entries);
    return added;
  },

  /** Test/admin helper: drop the in-memory chain (localStorage mirror included). */
  __reset(userId: string = CURRENT_USER_ID): void {
    logs.set(userId, []);
    const store = localStorageSafe();
    if (store) store.removeItem(STORAGE_PREFIX + userId);
  },
};
