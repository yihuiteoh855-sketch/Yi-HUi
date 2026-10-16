'use client';

import * as React from 'react';
import { CalendarClock, FastForward, SkipForward, Timer, Zap } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { PAYMENT_EVENTS } from '@/lib/mock-data';
import type { PermissionTier } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { formatRM } from '@/lib/utils';

function formatClock(ms: number): string {
  return `${new Date(ms).toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

const TIER_INFO: Array<{ tier: PermissionTier; label: string; hint: string }> = [
  { tier: 'T0', label: 'T0 Read-only insights', hint: 'Always on. Analysis, CFaR, Zombie Radar.' },
  { tier: 'T1', label: 'T1 Low-risk organization', hint: 'Tagging, reminders, suspected-zombie flags.' },
  { tier: 'T2', label: 'T2 Assisted preparation', hint: 'Draft mailto: cancellations, deep-link drawers.' },
  { tier: 'T3', label: 'T3 Financial state change', hint: 'Always requires an explicit per-action click.' },
];

export function SimulationToolbar() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const advanceClock = useCtrlPayStore((s) => s.advanceClock);
  const jumpToMonthEnd = useCtrlPayStore((s) => s.jumpToMonthEnd);
  const simulatePaymentIntent = useCtrlPayStore((s) => s.simulatePaymentIntent);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const setTier = useCtrlPayStore((s) => s.setTier);
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Sandbox Clock (simulated)
          </CardTitle>
          <CardDescription>{formatClock(sandboxClock)}</CardDescription>
        </div>
        <Badge variant="outline" className="font-mono">
          {masterAutonomyEnabled ? 'AUTONOMY ON' : 'T0 ADVISORY ONLY'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => advanceClock(24)}>
            <FastForward className="h-4 w-4" /> +24 Hours
          </Button>
          <Button size="sm" variant="outline" onClick={() => advanceClock(24 * 7)}>
            <FastForward className="h-4 w-4" /> +7 Days
          </Button>
          <Button size="sm" variant="outline" onClick={() => jumpToMonthEnd()}>
            <SkipForward className="h-4 w-4" /> Jump to Month-End
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Payment events (mock stand-in for Open Banking / merchant webhooks)
          </p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_EVENTS.map((ev) => (
              <Button
                key={ev.id}
                size="sm"
                variant={ev.merchant === 'Shopee' ? 'destructive' : 'secondary'}
                onClick={() =>
                  simulatePaymentIntent({
                    merchant: ev.merchant,
                    amount: ev.amount,
                    category: ev.category,
                    isNeed: ev.isNeed,
                  })
                }
              >
                <Zap className="h-4 w-4" />
                Simulate {ev.merchant} {formatRM(ev.amount)}
                {ev.merchant === 'Shopee' ? ' Impulse Buy' : ' Checkout'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Master AI Autonomy Switch</p>
            <p className="text-xs text-muted-foreground">
              Default OFF. When OFF, CtrlPay runs T0 advisory/analysis mode only.
            </p>
          </div>
          <Switch
            checked={masterAutonomyEnabled}
            onCheckedChange={setMasterAutonomy}
            aria-label="Master AI Autonomy Switch"
          />
        </div>

        <div className="space-y-2">
          {TIER_INFO.map(({ tier, label, hint }) => {
            const isMasterDependent = tier !== 'T0';
            const disabled = tier === 'T0' || !masterAutonomyEnabled;
            const checked = tier === 'T0' ? true : enabledTiers[tier];
            return (
              <div key={tier} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  checked={tier === 'T3' ? false : checked}
                  disabled={disabled || tier === 'T3'}
                  onCheckedChange={(v) => setTier(tier, v)}
                  aria-label={`${tier} toggle`}
                  className={isMasterDependent ? '' : 'opacity-60'}
                />
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            T3 is never toggleable: it always needs an explicit per-action confirmation click.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4" /> Plan (gates Pro modules only)
            </p>
            <p className="text-xs text-muted-foreground">
              Safety modules are never gated by the plan flag.
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={plan === 'FREE' ? 'default' : 'outline'} onClick={() => setPlan('FREE')}>
              Free
            </Button>
            <Button size="sm" variant={plan === 'PRO' ? 'default' : 'outline'} onClick={() => setPlan('PRO')}>
              Pro
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
