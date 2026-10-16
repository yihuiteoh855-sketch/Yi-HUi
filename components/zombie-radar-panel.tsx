'use client';

import * as React from 'react';
import { AlertOctagon, GraduationCap, Mail, MailX, Radar } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTIONS, MOCK_RECEIPTS } from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { analyzeZombies, ZOMBIE_RULES } from '@/lib/zombie-radar';
import { calculateSubscriptionMetrics } from '@/lib/quant-engine';
import { formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { StudentDowngradeDrawer } from '@/components/student-downgrade-drawer';

const TAG_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'secondary' | 'info'> = {
  ACTIVE: 'success',
  ENDANGERED: 'warning',
  ZOMBIE: 'danger',
  SUSPECTED_ZOMBIE: 'info',
};

export function ZombieRadarPanel() {
  const zombieTags = useCtrlPayStore((s) => s.zombieTags);
  const answerZombie = useCtrlPayStore((s) => s.answerZombie);
  const gmailConsent = useCtrlPayStore((s) => s.gmailConsent);
  const setGmailConsent = useCtrlPayStore((s) => s.setGmailConsent);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);

  const [drawerFor, setDrawerFor] = React.useState<string | null>(null);

  const analysis = React.useMemo(
    () =>
      analyzeZombies({
        transactions: [],
        subscriptions: SUBSCRIPTIONS,
        usageSignals: [],
        sandboxClock,
      }),
    [sandboxClock],
  );
  const studentCandidates = new Set(analysis.studentDowngradeCandidates);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-4 w-4" /> Zombie Radar
          </CardTitle>
          <CardDescription>
            Recurring charges from the mock bank statement + opt-in Gmail receipts. Tagging is a T1 action.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {gmailConsent ? <Mail className="h-3 w-3" /> : <MailX className="h-3 w-3" />} Gmail receipts
          </span>
          <Switch checked={gmailConsent} onCheckedChange={setGmailConsent} aria-label="Gmail receipt consent" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {gmailConsent ? (
          <div className="rounded-md border bg-secondary/40 p-2 text-xs text-muted-foreground">
            Read-only consent granted. Structured fields only ({MOCK_RECEIPTS.length} mock receipts):{' '}
            {MOCK_RECEIPTS.map((r) => `${r.merchant} ${formatRM(r.amountRM)}`).join(' · ')}
          </div>
        ) : (
          <div className="rounded-md border bg-secondary/40 p-2 text-xs text-muted-foreground">
            Gmail receipt scanning is OFF by default (data minimization). CtrlPay still detects recurring charges
            from bank-statement patterns alone.
          </div>
        )}

        <div className="space-y-2">
          {SUBSCRIPTIONS.map((sub) => {
            const entry = SUBSCRIPTION_REGISTRY[sub.subscriptionId];
            const tag = zombieTags[sub.subscriptionId] ?? 'ACTIVE';
            const metrics = calculateSubscriptionMetrics({
              fullPriceRM: entry.fullPriceRM,
              studentPriceRM: entry.studentPriceRM,
            });
            const isSuspect = tag === 'SUSPECTED_ZOMBIE';
            const canDowngrade = studentCandidates.has(sub.subscriptionId) && entry.studentPriceRM !== null;

            return (
              <div key={sub.subscriptionId} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{entry.merchantName}</p>
                      <Badge variant={TAG_VARIANT[tag] ?? 'secondary'}>{tag}</Badge>
                      {tag === 'ZOMBIE' && <AlertOctagon className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatRM(sub.amountRM)} · {sub.billingCycle.toLowerCase()} · next {sub.nextBillingDate} ·{' '}
                      {formatRM(metrics.annualizedCost)}/yr
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {metrics.opportunityCostMeals} mixed-rice meals/mo
                      {metrics.studentAnnualSavings !== null &&
                        ` · student plan saves ${formatRM(metrics.studentAnnualSavings)}/yr`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Clearing telemetry: amount tolerance ±{ZOMBIE_RULES.fxDriftTolerancePct}% (FX + card-scheme
                      drift) · settlement window ±{ZOMBIE_RULES.settlementLagWindowDays}d · mandate{' '}
                      <span className="font-mono">{ZOMBIE_RULES.iso20022MandateCategory}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {isSuspect && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">Used in 30 days?</span>
                        <Button size="sm" variant="outline" onClick={() => answerZombie(sub.subscriptionId, true)}>
                          Yes
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => answerZombie(sub.subscriptionId, false)}>
                          No
                        </Button>
                      </div>
                    )}
                    {canDowngrade && (
                      <Button size="sm" variant="secondary" onClick={() => setDrawerFor(sub.subscriptionId)}>
                        <GraduationCap className="h-4 w-4" /> Student downgrade
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {drawerFor && (
        <StudentDowngradeDrawer
          subscriptionId={drawerFor}
          open={drawerFor !== null}
          onClose={() => setDrawerFor(null)}
        />
      )}
    </Card>
  );
}
