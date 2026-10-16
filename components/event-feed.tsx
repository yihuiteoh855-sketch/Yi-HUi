'use client';

import * as React from 'react';
import { Bell, Flame, ShieldCheck, Timer } from 'lucide-react';
import { useCtrlPayStore, type SandboxEvent } from '@/lib/store';
import { formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const INLINE_TYPES: SandboxEvent['type'][] = [
  'DAILY_SUMMARY',
  'SWEEP_VERIFIED',
  'SWEEP_NOT_VERIFIED',
  'QUARANTINE_READY',
  'QUARANTINE_CLAIMED',
  'QUARANTINE_RELEASED',
  'ESCROW_STARTED',
  'ESCROW_COMPLETED',
  'MONTH_END_ROAST',
  'PAYMENT_OK',
];

interface Units {
  mixedRiceMeals: number;
  bubbleTea: number;
}

function describe(e: SandboxEvent): { title: string; body: string; variant: 'info' | 'success' | 'warning' | 'danger' } {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case 'DAILY_SUMMARY': {
      const units = p.units as Units;
      return {
        title: '12:00 PM Daily Spending Summary',
        body: `Spent ~${formatRM(Number(p.spentToday))} today · today's allowance ${formatRM(
          Number(p.allowance),
        )} · ${units.mixedRiceMeals} mixed-rice meals / ${units.bubbleTea} bubble tea.`,
        variant: 'info',
      };
    }
    case 'SWEEP_VERIFIED':
      return {
        title: 'Subscription sweep verified',
        body: `Savings ${formatRM(Number(p.monthlySavings))} moved to the Defense Vault after the next billing date was crossed.`,
        variant: 'success',
      };
    case 'SWEEP_NOT_VERIFIED':
      return {
        title: 'No change detected',
        body: 'Savings not counted. The old price was still charged on the next billing date.',
        variant: 'warning',
      };
    case 'QUARANTINE_READY':
      return {
        title: 'Quarantine ready to decide',
        body: `24 hours passed for "${String(p.targetItem)}". Claim your reward or proceed with the purchase.`,
        variant: 'warning',
      };
    case 'QUARANTINE_CLAIMED':
      return {
        title: 'Reward claimed',
        body: `${formatRM(Number(p.reward))} moved from the rewardPool to the Defense Vault. Nice one.`,
        variant: 'success',
      };
    case 'QUARANTINE_RELEASED':
      return {
        title: 'Purchase released',
        body: `You chose to proceed with "${String(p.targetItem)}". No reward paid.`,
        variant: 'info',
      };
    case 'ESCROW_STARTED':
      return {
        title: 'Escrow active',
        body: 'WANTS-category budget lock started. Your NEEDS floor is protected.',
        variant: 'success',
      };
    case 'ESCROW_COMPLETED':
      return { title: 'Escrow completed', body: 'The budget lock has ended.', variant: 'success' };
    case 'MONTH_END_ROAST': {
      const units = p.units as Units;
      return {
        title: 'Month-End Subscription Roast',
        body: `Wasted subscription spend ~${formatRM(
          Number(p.wastedMonthly),
        )}/month (${formatRM(Number(p.wastedAnnual))}/year) · about ${units.mixedRiceMeals} USM cafeteria mixed-rice meals a month.`,
        variant: 'danger',
      };
    }
    case 'PAYMENT_OK':
      return {
        title: 'Looks fine',
        body: `Today's allowance after this: ${formatRM(
          Number((p.result as { dynamicDailyAllowance?: number })?.dynamicDailyAllowance ?? 0),
        )}.`,
        variant: 'info',
      };
    default:
      return { title: e.type, body: '', variant: 'info' };
  }
}

export function EventFeed() {
  const events = useCtrlPayStore((s) => s.events);
  const dismissEvent = useCtrlPayStore((s) => s.dismissEvent);

  const inline = events.filter((e) => INLINE_TYPES.includes(e.type));
  if (inline.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" /> Proactive events
        </CardTitle>
        <CardDescription>Time-triggered and settlement events from the sandbox clock.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {inline.slice(-6).reverse().map((e) => {
          const d = describe(e);
          const Icon = e.type === 'MONTH_END_ROAST' ? Flame : e.type === 'QUARANTINE_READY' ? Timer : ShieldCheck;
          return (
            <div key={e.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
              <div className="flex gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">{d.title}</p>
                    <Badge variant={d.variant}>{e.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.body}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => dismissEvent(e.id)}>
                Dismiss
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
