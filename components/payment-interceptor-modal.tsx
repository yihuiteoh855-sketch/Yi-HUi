'use client';

import * as React from 'react';
import { AlertTriangle, Lock, ShieldAlert, Wallet } from 'lucide-react';
import { useCtrlPayStore, type PaymentIntent } from '@/lib/store';
import { requestProposal, submitDecision } from '@/lib/api-client';
import { approveProposal } from '@/lib/tool-resolution';
import { formatRM } from '@/lib/utils';
import type { WhatIfResult } from '@/lib/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskTailStrip } from '@/components/risk-tail-strip';
import { TierGateHint } from '@/components/tier-gate-hint';

interface Units {
  mixedRiceMeals: number;
  bubbleTea: number;
}

export function PaymentInterceptorModal() {
  const events = useCtrlPayStore((s) => s.events);
  const dismissEvent = useCtrlPayStore((s) => s.dismissEvent);
  const applyDecision = useCtrlPayStore((s) => s.applyDecision);
  const proceedPayment = useCtrlPayStore((s) => s.proceedPayment);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const found = [...events].reverse().find((e) => e.type === 'PAYMENT_INTERCEPT');
  if (!found) return null;
  const intercept = found; // narrowed, stable for use inside async handlers

  const intent = intercept.payload.intent as PaymentIntent;
  const result = intercept.payload.result as WhatIfResult;
  const units = intercept.payload.units as Units;
  const isWant = !intent.isNeed;

  async function acceptQuarantine() {
    setBusy(true);
    setError(null);
    try {
      const proposal = await requestProposal('QUARANTINE', {
        targetItem: `${intent.merchant} ${formatRM(intent.amount)}`,
        itemPrice: intent.amount,
        category: intent.category,
      });
      const { authorizationRef } = await submitDecision(
        proposal,
        approveProposal(proposal.proposalId, proposal.terms).decision!,
      );
      applyDecision(
        { ...proposal, status: 'APPROVED' },
        'APPROVED',
      );
      void authorizationRef;
      dismissEvent(intercept.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function acceptEscrow() {
    setBusy(true);
    setError(null);
    try {
      const proposal = await requestProposal('ESCROW', {
        targetItem: `${intent.merchant} ${formatRM(intent.amount)}`,
        itemPrice: intent.amount,
        lockedCategories: [intent.category],
        durationDays: 7,
      });
      await submitDecision(proposal, approveProposal(proposal.proposalId, proposal.terms).decision!);
      applyDecision({ ...proposal, status: 'APPROVED' }, 'APPROVED');
      dismissEvent(intercept.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg border-destructive/40">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Payment intercepted
            </CardTitle>
            <CardDescription>
              CtrlPay ran a Cash-Flow-at-Risk simulation before the payment completed.
            </CardDescription>
          </div>
          <Badge variant={result.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}>{result.riskLevel}</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {intent.merchant} · {formatRM(intent.amount)}
                </p>
                <p className="text-xs text-muted-foreground">{intent.category.replaceAll('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>
                ≈ {units.mixedRiceMeals} mixed-rice meals
              </p>
              <p>≈ {units.bubbleTea} bubble tea</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border p-2">
              <p className="text-[11px] text-muted-foreground">Shortfall prob.</p>
              <p className="text-sm font-semibold">{result.shortfallProbability}%</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-[11px] text-muted-foreground">CFaR 95</p>
              <p className="text-sm font-semibold">{formatRM(result.cfar95)}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-[11px] text-muted-foreground">Projected month-end</p>
              <p className="text-sm font-semibold">{formatRM(result.projectedMonthEndBalance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border p-2">
              <p className="text-[11px] text-muted-foreground">ES95 tail risk</p>
              <p className="text-sm font-semibold text-blue-700">{formatRM(result.es95)}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-[11px] text-muted-foreground">NSF dip risk (mid-month)</p>
              <p
                className={
                  result.intraMonthLiquidityBreachProb > 0
                    ? 'text-sm font-semibold text-red-600'
                    : 'text-sm font-semibold text-emerald-600'
                }
              >
                {result.intraMonthLiquidityBreachProb}%
              </p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-[11px] text-muted-foreground">Path floor (5th pct.)</p>
              <p className="text-sm font-semibold">{formatRM(result.lowestProjectedBalanceRM)}</p>
            </div>
          </div>

          <RiskTailStrip
            amount={intent.amount}
            category={intent.category}
            isNeed={intent.isNeed}
            result={result}
            variant="inline"
          />

          {(result.limitBreach.weekly || result.limitBreach.monthly) && (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" /> This breaches your{' '}
              {result.limitBreach.weekly ? 'weekly' : 'monthly'} User Spending Limit.
            </p>
          )}

          {result.lowHistoryWarning && (
            <p className="text-xs text-amber-700">Based on limited history, estimate only.</p>
          )}

          {!masterAutonomyEnabled && (
            <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
              Master Autonomy is OFF, so Lock/Escrow (T3) is blocked. Turn it on in the Simulation Toolbar to
              accept a contract. You can still proceed or dismiss.
            </p>
          )}

          {error && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
          <TierGateHint error={error} />

          <p className="text-xs text-muted-foreground">
            You are always in control. Nothing moves until you click.
          </p>

          <div className="flex flex-wrap gap-2">
            {isWant && (
              <Button size="sm" disabled={busy} onClick={acceptQuarantine}>
                <Lock className="h-4 w-4" /> 24h Quarantine
              </Button>
            )}
            {isWant && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={acceptEscrow}>
                <Lock className="h-4 w-4" /> Wants-Category Escrow
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                proceedPayment(intent);
              }}
            >
              Proceed anyway
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => dismissEvent(intercept.id)}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
