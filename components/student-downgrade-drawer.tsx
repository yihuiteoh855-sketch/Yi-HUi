'use client';

import * as React from 'react';
import { BadgeCheck, ExternalLink, GraduationCap, Mail, ShieldCheck, X } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTION_REGISTRY, type SubscriptionId } from '@/lib/subscription-registry';
import { calculateSubscriptionMetrics } from '@/lib/quant-engine';
import { PROFILE } from '@/lib/mock-data';
import { buildMailto, requestProposal, submitDecision } from '@/lib/api-client';
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
      await submitDecision(proposal.proposalId, {
        status: 'APPROVED',
        proposalId: proposal.proposalId,
        authorizationRef: `USER_CLICK_APPROVE_PROPOSAL_${proposal.proposalId.slice(-4)}`,
      });
      applyDecision({ ...proposal, status: 'APPROVED' }, 'APPROVED');
      setStep('DONE');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Student downgrade · {entry.merchantName}
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
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{formatRM(metrics.annualizedCost)}/yr</Badge>
            <Badge variant="outline">≈ {metrics.opportunityCostMeals} mixed-rice meals/mo</Badge>
            <Badge variant="outline">≈ {metrics.opportunityCostBubbleTea} bubble tea/mo</Badge>
          </div>

          {step === 'OTP' && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Step 1 · Verify student status</p>
              <p className="text-xs text-muted-foreground">
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
                  className="w-40 rounded-md border bg-background px-3 py-2 text-sm"
                  aria-label="Student OTP"
                />
                <Button size="sm" onClick={verifyOtp}>
                  <BadgeCheck className="h-4 w-4" /> Verify
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sandbox: submit literally any 6-digit code (demo stand-in for OTP).
              </p>
            </div>
          )}

          {step === 'CHOOSE' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 2 · Do it on the official page</p>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-sm font-medium">Step 3 · Record the sweep</p>
              <p className="text-xs text-muted-foreground">
                Confirm here so CtrlPay can verify the savings when the next billing date is crossed. Nothing moves
                into the Vault until the old charge actually disappears.
              </p>
              <Button size="sm" disabled={busy} onClick={confirmDowngrade}>
                <ShieldCheck className="h-4 w-4" /> Confirm downgrade (T3)
              </Button>
            </div>
          )}

          {step === 'DONE' && (
            <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-800">
              Recorded as a PENDING sweep. Fast-forward the sandbox clock past the next billing date to verify the
              savings and credit the Defense Vault.
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
