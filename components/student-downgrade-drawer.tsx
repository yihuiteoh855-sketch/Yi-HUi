'use client';

import * as React from 'react';
import { BadgeCheck, Check, ExternalLink, GraduationCap, Mail, ShieldCheck, X } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTION_REGISTRY, type SubscriptionId } from '@/lib/subscription-registry';
import { ZOMBIE_RULES } from '@/lib/zombie-radar';
import { TierGateHint } from '@/components/tier-gate-hint';
import { calculateSubscriptionMetrics } from '@/lib/quant-engine';
import { PROFILE } from '@/lib/mock-data';
import { buildMailto, requestProposal, submitDecision } from '@/lib/api-client';
import { approveProposal } from '@/lib/tool-resolution';
import { formatRM } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  subscriptionId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Student Downgrade Drawer.
 *
 * Flow: verify student email (mock OTP) -> open the registry deep link OR build a
 * mailto: draft -> confirm the T3 downgrade. The deep link is the ONLY URL shown and
 * it always comes from SUBSCRIPTION_REGISTRY, never from the LLM.
 */
export function StudentDowngradeDrawer({ subscriptionId, open, onClose }: Props) {
  const entry = SUBSCRIPTION_REGISTRY[subscriptionId as SubscriptionId];
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const setStudentVerified = useCtrlPayStore((s) => s.setStudentVerified);
  const applyDecision = useCtrlPayStore((s) => s.applyDecision);

  const [step, setStep] = React.useState<'OTP' | 'CHOOSE' | 'DONE'>('OTP');
  const [otp, setOtp] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep(studentVerified ? 'CHOOSE' : 'OTP');
      setError(null);
    }
  }, [open, studentVerified]);

  if (!open || !entry) return null;

  const metrics = calculateSubscriptionMetrics({
    fullPriceRM: entry.fullPriceRM,
    studentPriceRM: entry.studentPriceRM,
  });
  const mailto = entry.mailtoTemplate ? buildMailto(entry.mailtoTemplate, PROFILE) : null;
  const stepIndex = step === 'OTP' ? 1 : step === 'CHOOSE' ? 2 : 3;

  async function verifyOtp() {
    // Mock OTP: any 6 digits is accepted in the sandbox.
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your student email (any 6 digits work in the sandbox).');
      return;
    }
    setStudentVerified(true);
    setStep('CHOOSE');
  }

  async function confirmDowngrade() {
    setBusy(true);
    setError(null);
    try {
      const proposal = await requestProposal('SWEEP', {
        subscriptionId,
        action: 'STUDENT_DOWNGRADE',
      });
      const built = approveProposal(proposal.proposalId, proposal.terms);
      if (!built.decision) throw new Error('DECISION_MISSING');
      await submitDecision(proposal, built.decision);
      applyDecision({ ...proposal, status: 'APPROVED' }, 'APPROVED');
      setStep('DONE');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
<<<<<<< HEAD
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[rgba(4,34,43,0.45)] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <Card
        className="flex max-h-full w-full animate-sheet-up flex-col overflow-hidden rounded-b-none rounded-t-[30px] border-0 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-3">
          <span className="ct-grabber" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
=======
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 pb-3 pt-10">
      <div className="cp-sheet-enter w-full max-w-lg">
      <Card className="soft-card scroll-thin max-h-[88vh] w-full overflow-y-auto rounded-[26px]">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-zinc-300" aria-hidden />
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-holst-600" /> Student downgrade · {entry.merchantName}
            </CardTitle>
            <CardDescription>
              Full price {formatRM(entry.fullPriceRM)} → student{' '}
              {entry.studentPriceRM !== null ? formatRM(entry.studentPriceRM) : 'n/a'}
              {metrics.studentAnnualSavings !== null && ` · saves ${formatRM(metrics.studentAnnualSavings)}/yr`}
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
<<<<<<< HEAD
          <div className="flex flex-wrap gap-2 text-xs duo-muted">
=======
          <StepBreadcrumb current={stepIndex} />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
            <Badge variant="outline">{formatRM(metrics.annualizedCost)}/yr</Badge>
            <Badge variant="outline">≈ {metrics.opportunityCostMeals} mixed-rice meals/mo</Badge>
            <Badge variant="outline">≈ {metrics.opportunityCostBubbleTea} bubble tea/mo</Badge>
            <Badge variant="outline">
              clearing ±{ZOMBIE_RULES.fxDriftTolerancePct}% FX/scheme drift ·{' '}
              {ZOMBIE_RULES.iso20022MandateCategory}
            </Badge>
          </div>

          {step === 'OTP' && (
<<<<<<< HEAD
            <div className="space-y-2 rounded-2xl border border-holst-950/10 bg-white p-3">
              <p className="text-sm font-bold text-holst-950">Step 1 · Verify student status</p>
              <p className="text-xs duo-muted">
=======
            <div className="space-y-2 rounded-2xl bg-[#F7F6F2] p-3">
              <p className="text-sm font-medium">Step 1 · Verify student status</p>
              <p className="text-xs text-muted-foreground">
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
                We verify the student plan with {PROFILE.studentEmail}. We only ever ask for the one-time code —
                never your password or full student ID.
              </p>
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
<<<<<<< HEAD
                  className="w-40 rounded-xl border border-holst-950/10 bg-white px-3 py-2 text-sm text-holst-950 outline-none focus:border-holst-600"
=======
                  className="w-40 rounded-xl border border-[#18181B]/15 bg-white px-3 py-2 text-sm"
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
                  aria-label="Student OTP"
                />
                <Button size="sm" onClick={verifyOtp}>
                  <BadgeCheck className="h-4 w-4" /> Verify
                </Button>
              </div>
              <p className="text-[11px] duo-muted">Sandbox: submit literally any 6-digit code (demo stand-in for OTP).</p>
            </div>
          )}

          {step === 'CHOOSE' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-holst-950">Step 2 · Do it on the official page</p>
              <p className="text-xs duo-muted">
                CtrlPay never sends URLs from the model. This link comes from our reviewed registry.
              </p>
              <div className="flex flex-wrap gap-2">
                {entry.officialCancelDeepLink && (
                  <a
                    href={entry.officialCancelDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    <ExternalLink className="h-4 w-4" /> Open {entry.merchantName} account page
                  </a>
                )}
                {mailto && (
                  <a href={mailto} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>
                    <Mail className="h-4 w-4" /> Open email draft
                  </a>
                )}
              </div>
              <p className="text-sm font-bold text-holst-950">Step 3 · Record the sweep</p>
              <p className="text-xs duo-muted">
                Confirm here so CtrlPay can verify the savings when the next billing date is crossed. Nothing moves
                into the Vault until the old charge actually disappears.
              </p>
              <Button size="sm" disabled={busy} onClick={confirmDowngrade}>
                <ShieldCheck className="h-4 w-4" /> Confirm downgrade (T3)
              </Button>
            </div>
          )}

          {step === 'DONE' && (
<<<<<<< HEAD
            <div className="duo-safe p-3.5 text-sm">
=======
            <div className="rounded-2xl bg-[#ECFDF5] p-3 text-sm text-[#065F46]">
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
              Recorded as a PENDING sweep. Fast-forward the sandbox clock past the next billing date to verify the
              savings and credit the Defense Vault.
            </div>
          )}

<<<<<<< HEAD
          {error && <p className="rounded-2xl bg-[#FDE7EC] p-2.5 text-xs text-[#B3253F]">{error}</p>}
=======
          {error && <p className="rounded-2xl bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
          <TierGateHint error={error} />
        </CardContent>
        </div>
      </Card>
      </div>
    </div>
  );
}

/**
 * Phase 9 breadcrumb: 1 Verify .edu OTP → 2 Open official merchant page → 3
 * Auto-verify on the next billing date. Presentation only — the flow itself is unchanged.
 */
function StepBreadcrumb({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Verify .edu OTP', 'Open official page', 'Auto-verify next billing'];
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-black',
                done
                  ? 'border-[#059669] bg-[#059669] text-white'
                  : active
                    ? 'border-[#18181B] bg-[#18181B] text-white'
                    : 'border-zinc-300 bg-white text-zinc-400',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : n}
            </span>
            <span className={cn(active ? 'text-[#18181B]' : 'text-zinc-400')}>{label}</span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-zinc-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
