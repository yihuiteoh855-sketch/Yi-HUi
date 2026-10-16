import { describe, expect, it } from 'vitest';
import { canonicalJson, computeIntegrityHash, signProposal, verifyProposal } from '@/lib/signing';
import type { ProposalTerms } from '@/lib/types';

const USER = 'student_usm_001';

const terms: ProposalTerms = {
  kind: 'QUARANTINE',
  targetItem: 'Shopee impulse buy',
  itemPrice: 180,
  premiumReward: 9,
  quarantineHours: 24,
  shortfallProbability: 42.5,
  cfar95: 210,
  riskLevel: 'HIGH',
};

describe('canonical JSON', () => {
  it('sorts keys recursively so hashes are stable', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ x: { d: 1, c: 2 } })).toBe('{"x":{"c":2,"d":1}}');
    expect(canonicalJson([3, { b: 1, a: 2 }])).toBe('[3,{"a":2,"b":1}]');
  });

  it('is insensitive to key insertion order', () => {
    expect(computeIntegrityHash({ ...terms }, 'prop_x', USER)).toBe(
      computeIntegrityHash(JSON.parse(JSON.stringify(terms)), 'prop_x', USER),
    );
  });
});

describe('proposal signing', () => {
  it('produces a 64-char integrity hash and verifies', () => {
    const p = signProposal(terms, USER);
    expect(p.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(p.status).toBe('PROPOSED');
    expect(verifyProposal(p, USER)).toBe(true);
  });

  it('rejects a tampered term', () => {
    const p = signProposal(terms, USER);
    const tampered = { ...p, terms: { ...p.terms, itemPrice: 1 } };
    expect(verifyProposal(tampered as typeof p, USER)).toBe(false);
  });

  it('rejects a hash mismatch', () => {
    const p = signProposal(terms, USER);
    expect(verifyProposal({ ...p, integrityHash: 'f'.repeat(64) }, USER)).toBe(false);
  });

  it('rejects a different user id (tenant isolation)', () => {
    const p = signProposal(terms, USER);
    expect(verifyProposal(p, 'other_user')).toBe(false);
  });

  it('is deterministic for the same proposalId + terms + user', () => {
    const a = signProposal(terms, USER, { proposalId: 'prop_fixed_0001' });
    const b = signProposal(terms, USER, { proposalId: 'prop_fixed_0001' });
    expect(a.integrityHash).toBe(b.integrityHash);
  });
});
