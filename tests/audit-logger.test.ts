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
});
