import { describe, expect, it } from 'vitest';
import { CLICK_AUTH_RE } from '@/lib/permissions';
import {
  approveProposal,
  applyResolutions,
  clickAuthorizationRef,
  declineProposal,
  DISMISSED_REASON,
  dismissProposal,
  isT3ContractTool,
  modifyProposal,
  pendingT3ToolCallIds,
  type LooseMessageLike,
} from '@/lib/tool-resolution';
import type { EscrowTerms } from '@/lib/types';

const PROPOSAL_ID = 'prop_2026_03_12_ab12cd';
const TERMS: EscrowTerms = {
  kind: 'ESCROW',
  targetItem: 'Shopee impulse buy',
  itemPrice: 180,
  lockedCategories: ['Shopping'],
  dailyBudgetReduction: 5,
  durationDays: 7,
  maxAllowedReduction: 9.6,
  shortfallProbability: 62,
  cfar95: 41.5,
};

function transcriptWithPendingQuarantine(): LooseMessageLike[] {
  return [
    { parts: [{ type: 'text' }] },
    {
      parts: [
        { type: 'text' },
        {
          type: 'tool-invocation',
          toolInvocation: { state: 'call', toolCallId: 'tc_pending_1', toolName: 'propose_escrow' },
        },
      ],
    },
  ];
}

describe('T3 contract tool registry', () => {
  it('recognises exactly the three client-resolved contract tools', () => {
    expect(isT3ContractTool('propose_quarantine')).toBe(true);
    expect(isT3ContractTool('propose_escrow')).toBe(true);
    expect(isT3ContractTool('propose_sweep')).toBe(true);
    expect(isT3ContractTool('run_what_if_simulation')).toBe(false);
  });
});

describe('authorization ref', () => {
  it('produces a ref accepted by the T3 gate', () => {
    expect(CLICK_AUTH_RE.test(clickAuthorizationRef(PROPOSAL_ID))).toBe(true);
  });

  it('rejects an id that cannot form a valid ref', () => {
    expect(() => clickAuthorizationRef('!!!')).toThrow();
  });
});

describe('dangling-tool-call integrity (plan.md Section 2.3)', () => {
  it('flags a contract call that is still awaiting a decision', () => {
    expect(pendingT3ToolCallIds(transcriptWithPendingQuarantine())).toEqual(['tc_pending_1']);
  });

  it('ignores non-contract tools and already-resolved contract calls', () => {
    const transcript: LooseMessageLike[] = [
      {
        parts: [
          { toolInvocation: { state: 'result', toolCallId: 'tc_whatif', toolName: 'run_what_if_simulation' } },
          { toolInvocation: { state: 'result', toolCallId: 'tc_done', toolName: 'propose_quarantine' } },
        ],
      },
    ];
    expect(pendingT3ToolCallIds(transcript)).toEqual([]);
  });

  it('APPROVE resolves the pending call and yields a clean next turn', () => {
    const built = approveProposal(PROPOSAL_ID, TERMS);
    expect(built.decision?.status).toBe('APPROVED');
    expect(built.resolution.status).toBe('APPROVED');
    expect(CLICK_AUTH_RE.test(built.resolution.authorizationRef ?? '')).toBe(true);

    const after = applyResolutions(transcriptWithPendingQuarantine(), ['tc_pending_1']);
    expect(pendingT3ToolCallIds(after)).toEqual([]);
  });

  it('MODIFY resolves the pending call and carries the user terms', () => {
    const built = modifyProposal(PROPOSAL_ID, { durationDays: 3, dailyBudgetReduction: 2 }, TERMS);
    expect(built.decision?.status).toBe('MODIFIED');
    expect(built.resolution.status).toBe('MODIFIED');
    // The tool result always carries a proposalId so it can be bound to a toolCallId.
    expect(built.resolution.proposalId).toBe(PROPOSAL_ID);

    const after = applyResolutions(transcriptWithPendingQuarantine(), ['tc_pending_1']);
    expect(pendingT3ToolCallIds(after)).toEqual([]);
  });

  it('DECLINE resolves the pending call', () => {
    const built = declineProposal(PROPOSAL_ID);
    expect(built.decision?.status).toBe('DECLINED');
    expect(built.resolution).toEqual({ status: 'DECLINED', proposalId: PROPOSAL_ID, reason: 'not now' });

    const after = applyResolutions(transcriptWithPendingQuarantine(), ['tc_pending_1']);
    expect(pendingT3ToolCallIds(after)).toEqual([]);
  });

  it('"clear chat while pending" resolves with DISMISSED and no server decision', () => {
    const built = dismissProposal();
    expect(built.decision).toBeNull();
    expect(built.resolution).toEqual({ status: 'DECLINED', proposalId: null, reason: DISMISSED_REASON });

    const after = applyResolutions(transcriptWithPendingQuarantine(), ['tc_pending_1']);
    expect(pendingT3ToolCallIds(after)).toEqual([]);
  });

  it('every contract card path produces a resolution (never an undefined result)', () => {
    const paths = [
      approveProposal(PROPOSAL_ID, TERMS).resolution,
      modifyProposal(PROPOSAL_ID, {}, TERMS).resolution,
      declineProposal(PROPOSAL_ID).resolution,
      dismissProposal().resolution,
    ];
    for (const resolution of paths) {
      expect(resolution).toBeDefined();
      expect(resolution.status).toBeTruthy();
    }
  });
});
