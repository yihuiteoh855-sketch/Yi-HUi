import { beforeEach, describe, expect, it } from 'vitest';
import { auditLog } from '@/lib/audit-logger';

const USER = 'student_test_audit';

function seed(n: number) {
  for (let i = 0; i < n; i++) {
    auditLog.append(
      {
        sandboxClock: '2026-03-12T09:00:00.000Z',
        actor: 'AGENT',
        actionType: 'RUN_WHAT_IF',
        permissionTier: 'T0',
        data_accessed: ['transactions.last30d'],
        authorization_ref: 'MANDATE_DEFAULT_T0',
        proposal_hash: null,
        status: 'EXECUTED',
      },
      USER,
    );
  }
}

describe('audit log (hash-chained, append-only)', () => {
  beforeEach(() => {
    auditLog.__reset(USER);
  });

  it('appends entries with a valid chain', () => {
    seed(4);
    const entries = auditLog.list(USER);
    expect(entries).toHaveLength(4);
    expect(entries[0].prevHash).toBe('GENESIS');
    expect(entries[0].entryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(entries[1].prevHash).toBe(entries[0].entryHash);
    expect(auditLog.verifyChain(USER)).toBe(true);
  });

  it('detects tampering with an earlier entry', () => {
    seed(4);
    const entry = auditLog.list(USER)[1] as { status: string };
    entry.status = 'APPROVED'; // tamper
    expect(auditLog.verifyChain(USER)).toBe(false);
  });

  it('is tenant-isolated by userId', () => {
    seed(2);
    expect(auditLog.list('someone_else')).toHaveLength(0);
  });

  it('records field names only (never raw PII values) in data_accessed', () => {
    seed(1);
    const [entry] = auditLog.list(USER);
    expect(entry.data_accessed).toEqual(['transactions.last30d']);
  });

  it('merges server-recorded AGENT entries without breaking the chain, idempotently', () => {
    seed(2); // local USER/sandbox entries

    const external = [
      {
        logId: 'srv_log_0001',
        timestamp: '2026-03-12T09:01:00.000Z',
        sandboxClock: '2026-03-12T09:01:00.000Z',
        actor: 'AGENT' as const,
        actionType: 'RUN_WHAT_IF',
        permissionTier: 'T0' as const,
        data_accessed: ['transactions.last30d'],
        authorization_ref: 'MANDATE_DEFAULT_T0',
        proposal_hash: null,
        status: 'EXECUTED',
        prevHash: 'server-side-hash-does-not-matter',
        entryHash: 'server-side-hash-does-not-matter',
      },
      {
        logId: 'srv_log_0002',
        timestamp: '2026-03-12T09:02:00.000Z',
        sandboxClock: '2026-03-12T09:02:00.000Z',
        actor: 'AGENT' as const,
        actionType: 'NUMBER_VERIFIER_BLOCKED',
        permissionTier: 'T0' as const,
        data_accessed: ['llm.response'],
        authorization_ref: 'NUMBER_VERIFIER',
        proposal_hash: null,
        status: 'DECLINED',
        prevHash: 'server-side-hash-does-not-matter',
        entryHash: 'server-side-hash-does-not-matter',
      },
    ];

    const added = auditLog.mergeExternal(external, USER);
    expect(added).toBe(2);

    const entries = auditLog.list(USER);
    expect(entries).toHaveLength(4);
    // Imported entries keep their descriptive fields but get re-hashed into the local chain.
    expect(entries[2].actionType).toBe('RUN_WHAT_IF');
    expect(entries[3].actionType).toBe('NUMBER_VERIFIER_BLOCKED');
    expect(entries[2].prevHash).toBe(entries[1].entryHash);
    expect(entries[3].prevHash).toBe(entries[2].entryHash);
    expect(auditLog.verifyChain(USER)).toBe(true);

    // Re-syncing the same server entries must not duplicate them.
    expect(auditLog.mergeExternal(external, USER)).toBe(0);
    expect(auditLog.list(USER)).toHaveLength(4);

    // A later local append still extends the merged chain correctly.
    seed(1);
    expect(auditLog.list(USER)).toHaveLength(5);
    expect(auditLog.verifyChain(USER)).toBe(true);
  });

  it('skips malformed external entries instead of corrupting the chain', () => {
    seed(1);
    const added = auditLog.mergeExternal([{ nope: true }, null, 'x', 42], USER);
    expect(added).toBe(0);
    expect(auditLog.list(USER)).toHaveLength(1);
    expect(auditLog.verifyChain(USER)).toBe(true);
  });
});
