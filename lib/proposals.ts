/**
 * Proposal service — SERVER-ONLY.
 *
 * The server (never the LLM) computes and signs every contract figure:
 *   premiumReward, monthlySavings, dailyBudgetReduction, shortfallProbability ...
 * then returns a SIGNED PROPOSAL: { proposalId, terms, integrityHash, expiresAt }.
 * The user approves / modifies / declines THAT exact proposal.
 */
import { signProposal, verifyProposal } from './signing';
import {
  calculateQuarantineReward,
  calculateSubscriptionMetrics,
  computeDynamicDailyAllowance,
  routeIntervention,
  runWhatIfSimulation,
  unpaidFixedBillTotal,
  validateEscrowFloor,
} from './quant-engine';
import { SUBSCRIPTION_REGISTRY } from './subscription-registry';
import { buildWhatIfInput, upcomingFixedBills, type LedgerSnapshot } from './ledger';
import {
  EscrowTermsSchema,
  QuarantineTermsSchema,
  SweepTermsSchema,
  type CardDecision,
  type ProposalTerms,
  type SignedProposal,
  type SpendCategory,
} from './types';
import { round2, remainingDaysInMonth } from './utils';

export class ProposalError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(`${code}: ${message}`);
    this.code = code;
    this.status = status;
    this.name = 'ProposalError';
  }
}

export type ProposalKind = 'QUARANTINE' | 'ESCROW' | 'SWEEP';

export interface CreateProposalArgs {
  kind: ProposalKind;
  input: Record<string, unknown>;
  snapshot: LedgerSnapshot;
  userId: string;
}

/* ------------------------------------------------------------------ *
 * In-memory proposal registry (sandbox). Production: a tenant-scoped DB.
 * ------------------------------------------------------------------ */

const proposals = new Map<string, SignedProposal>();

export function storeProposal(p: SignedProposal): void {
  proposals.set(p.proposalId, p);
}

export function getStoredProposal(proposalId: string): SignedProposal | undefined {
  return proposals.get(proposalId);
}

export function __clearProposals(): void {
  proposals.clear();
}

/* ------------------------------------------------------------------ *
 * Creation
 * ------------------------------------------------------------------ */

export function createProposal({ kind, input, snapshot, userId }: CreateProposalArgs): SignedProposal {
  let terms: ProposalTerms;

  if (kind === 'QUARANTINE') {
    const targetItem = String(input.targetItem ?? '');
    const itemPrice = Number(input.itemPrice);
    const category = input.category as SpendCategory;
    if (!targetItem || !Number.isFinite(itemPrice) || itemPrice <= 0) {
      throw new ProposalError('INVALID_INPUT', 'targetItem and positive itemPrice are required');
    }
    if (itemPrice > snapshot.aiMandate.maxLockAmountRM) {
      throw new ProposalError(
        'EXCEEDS_AI_MANDATE',
        `itemPrice RM ${itemPrice} exceeds the AI Mandate Limit of RM ${snapshot.aiMandate.maxLockAmountRM}`,
      );
    }

    const result = runWhatIfSimulation(
      buildWhatIfInput(snapshot, {
        amount: itemPrice,
        category,
        isNeed: false,
      }),
    );
    const gate = routeIntervention({ result, isNeed: false });
    if (gate.action !== 'QUARANTINE') {
      throw new ProposalError(
        'RISK_TOO_LOW',
        `No contract is warranted (riskLevel=${result.riskLevel}, limitBreach=${JSON.stringify(result.limitBreach)}). Use the non-intervention path.`,
      );
    }

    terms = QuarantineTermsSchema.parse({
      kind: 'QUARANTINE',
      targetItem,
      itemPrice: round2(itemPrice),
      premiumReward: calculateQuarantineReward(itemPrice, snapshot.rewardPool),
      quarantineHours: 24,
      shortfallProbability: result.shortfallProbability,
      cfar95: result.cfar95,
      riskLevel: result.riskLevel,
    });
  } else if (kind === 'ESCROW') {
    const targetItem = String(input.targetItem ?? '');
    const itemPrice = Number(input.itemPrice);
    const lockedCategories = input.lockedCategories as string[];
    const durationDays = Number(input.durationDays);
    if (!targetItem || !Number.isFinite(itemPrice) || !Array.isArray(lockedCategories) || !Number.isInteger(durationDays)) {
      throw new ProposalError('INVALID_INPUT', 'targetItem, itemPrice, lockedCategories, durationDays are required');
    }

    const bills = upcomingFixedBills(snapshot.sandboxClock, snapshot.subscriptions, snapshot.amortizeAnnualFees);
    const dda = computeDynamicDailyAllowance({
      currentBalance: snapshot.currentBalance,
      unpaidFixedBills: unpaidFixedBillTotal(bills),
      monthlySavingsGoal: snapshot.monthlySavingsGoal,
      remainingDaysInMonth: remainingDaysInMonth(snapshot.sandboxClock),
    });

    // Probe for the safe ceiling, then choose a reduction that does not exceed it.
    const probe = validateEscrowFloor({
      lockedCategories: lockedCategories as never,
      dailyBudgetReduction: 1,
      dynamicDailyAllowance: dda,
      durationDays,
      mandate: snapshot.aiMandate,
    });
    if (probe.maxAllowedReduction <= 0) {
      throw new ProposalError(
        'ESCROW_NOT_OFFERED',
        'Daily allowance is too close to the survival floor to offer an Escrow.',
      );
    }
    const requested = Math.min(probe.maxAllowedReduction, round2(itemPrice / Math.max(1, durationDays)));
    const dailyBudgetReduction = Math.max(0.01, round2(requested));

    const check = validateEscrowFloor({
      lockedCategories: lockedCategories as never,
      dailyBudgetReduction,
      dynamicDailyAllowance: dda,
      durationDays,
      mandate: snapshot.aiMandate,
    });
    if (!check.ok) {
      throw new ProposalError('ESCROW_FLOOR_VIOLATION', check.reasons.join(','));
    }

    const result = runWhatIfSimulation(
      buildWhatIfInput(snapshot, {
        amount: itemPrice,
        category: (lockedCategories[0] ?? 'Shopping') as never,
        isNeed: false,
      }),
    );

    terms = EscrowTermsSchema.parse({
      kind: 'ESCROW',
      targetItem,
      itemPrice: round2(itemPrice),
      lockedCategories: lockedCategories.slice(0, 4),
      dailyBudgetReduction,
      durationDays,
      maxAllowedReduction: check.maxAllowedReduction,
      shortfallProbability: result.shortfallProbability,
      cfar95: result.cfar95,
    });
  } else {
    const subscriptionId = String(input.subscriptionId ?? '');
    const action = input.action as 'STUDENT_DOWNGRADE' | 'CANCEL';
    const entry = SUBSCRIPTION_REGISTRY[subscriptionId as keyof typeof SUBSCRIPTION_REGISTRY];
    if (!entry) throw new ProposalError('UNKNOWN_SUBSCRIPTION', `No registry entry for ${subscriptionId}`);

    if (action === 'STUDENT_DOWNGRADE' && entry.studentPriceRM === null) {
      throw new ProposalError('NO_STUDENT_PLAN', `${entry.merchantName} has no student plan; use CANCEL.`);
    }
    const monthlySavings =
      action === 'STUDENT_DOWNGRADE'
        ? round2(entry.fullPriceRM - (entry.studentPriceRM ?? 0))
        : round2(entry.fullPriceRM);
    if (monthlySavings <= 0) {
      throw new ProposalError('NO_SAVINGS', 'This action produces no monthly savings.');
    }

    terms = SweepTermsSchema.parse({
      kind: 'SWEEP',
      subscriptionId,
      action,
      merchantName: entry.merchantName,
      monthlySavings,
      annualSavings: round2(monthlySavings * 12),
      requiresStudentEmailOTP: entry.requiresStudentEmailOTP,
      deepLinkAvailable: entry.officialCancelDeepLink !== null,
      mailtoAvailable: entry.mailtoTemplate !== null,
    });
  }

  const proposal = signProposal(terms, userId, { status: 'PROPOSED' });
  storeProposal(proposal);
  return proposal;
}

/* ------------------------------------------------------------------ *
 * Decision
 * ------------------------------------------------------------------ */

export interface DecideArgs {
  proposalId: string;
  userId: string;
  decision: CardDecision;
  mandate: LedgerSnapshot['aiMandate'];
  snapshot: LedgerSnapshot;
}

export function decideProposal({ proposalId, userId, decision, mandate, snapshot }: DecideArgs): {
  proposal: SignedProposal;
  authorizationRef: string;
} {
  const stored = getStoredProposal(proposalId);
  if (!stored) throw new ProposalError('PROPOSAL_NOT_FOUND', `Unknown proposal ${proposalId}`, 404);

  // Tenant isolation: proposals are keyed by user.
  if (stored.userId !== userId) {
    throw new ProposalError('FORBIDDEN', 'This proposal belongs to another tenant', 403);
  }

  // Re-verify the signature; a tampered proposal is rejected.
  if (!verifyProposal(stored, userId)) {
    throw new ProposalError('INTEGRITY_HASH_MISMATCH', 'Proposal signature failed verification', 409);
  }

  if (decision.status === 'DECLINED') {
    const updated: SignedProposal = { ...stored, status: 'DECLINED' };
    storeProposal(updated);
    return { proposal: updated, authorizationRef: `USER_DECLINE_PROPOSAL_${proposalId.slice(-4)}` };
  }

  const authorizationRef = `USER_CLICK_APPROVE_PROPOSAL_${proposalId.slice(-4)}`;

  if (decision.status === 'MODIFIED') {
    if (stored.terms.kind !== 'ESCROW') {
      throw new ProposalError('MODIFY_NOT_SUPPORTED', 'Only Escrow terms can be modified.');
    }
    const durationDays = decision.newTerms.durationDays ?? stored.terms.durationDays;
    const requestedReduction =
      decision.newTerms.dailyBudgetReduction ?? stored.terms.dailyBudgetReduction;

    const bills = upcomingFixedBills(snapshot.sandboxClock, snapshot.subscriptions, snapshot.amortizeAnnualFees);
    const dda = computeDynamicDailyAllowance({
      currentBalance: snapshot.currentBalance,
      unpaidFixedBills: unpaidFixedBillTotal(bills),
      monthlySavingsGoal: snapshot.monthlySavingsGoal,
      remainingDaysInMonth: remainingDaysInMonth(snapshot.sandboxClock),
    });
    const check = validateEscrowFloor({
      lockedCategories: stored.terms.lockedCategories as never,
      dailyBudgetReduction: requestedReduction,
      dynamicDailyAllowance: dda,
      durationDays,
      mandate,
    });    if (!check.ok) {
      throw new ProposalError('ESCROW_FLOOR_VIOLATION', check.reasons.join(','));
    }
    const newTerms = EscrowTermsSchema.parse({
      ...stored.terms,
      dailyBudgetReduction: requestedReduction,
      durationDays,
      maxAllowedReduction: check.maxAllowedReduction,
    });
    const reSigned = signProposal(newTerms, userId, {
      proposalId: stored.proposalId,
      expiresAt: stored.expiresAt,
      status: 'MODIFIED',
    });
    storeProposal(reSigned);
    return { proposal: reSigned, authorizationRef };
  }

  const approved: SignedProposal = { ...stored, status: 'APPROVED' };
  storeProposal(approved);
  return { proposal: approved, authorizationRef };
}
