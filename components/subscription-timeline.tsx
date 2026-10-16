'use client';

import * as React from 'react';
import { AlertTriangle, CalendarDays, FastForward, SkipForward } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTIONS } from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { calculateAmortizedSubscriptions, MATURITY_GATE_WINDOW_DAYS } from '@/lib/quant-engine';
import { dayOfMonth, daysInMonth, formatRM } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export function SubscriptionTimeline() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const setAmortize = useCtrlPayStore((s) => s.setAmortize);
  const advanceClock = useCtrlPayStore((s) => s.advanceClock);
  const jumpToMonthEnd = useCtrlPayStore((s) => s.jumpToMonthEnd);

  const today = dayOfMonth(sandboxClock);
  const total = daysInMonth(sandboxClock);
  const monthKey = new Date(sandboxClock).toISOString().slice(0, 7);
  const amortized = new Map(
    calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock }).map((a) => [a.subscriptionId, a]),
  );

  // Treasury maturity gate: non-monthly charges due inside the settlement window need the
  // FULL amount in spot cash — the 1/12 amortized figure alone would be an illusion of liquidity.
  const gated = SUBSCRIPTIONS.map((s) => ({ sub: s, view: amortized.get(s.subscriptionId) })).filter(
    (x) => x.view?.maturityGateTriggered === true,
  );
  const gatedTotal = gated.reduce((sum, x) => sum + x.sub.amountRM, 0);

  const inMonth = SUBSCRIPTIONS.filter((s) => s.nextBillingDate.slice(0, 7) === monthKey);
  const nextMonth = SUBSCRIPTIONS.filter((s) => s.nextBillingDate.slice(0, 7) !== monthKey);

  const badgeFor = (day: number) =>
    inMonth.filter((s) => new Date(s.nextBillingDate).getUTCDate() === day);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Visual Subscription Timeline
          </CardTitle>
          <CardDescription>
            Next recurring deductions this month. Red badges are upcoming charges.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Amortize Annual Fees</span>
          <Switch checked={amortize} onCheckedChange={setAmortize} aria-label="Amortize Annual Fees" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {gated.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Spot Cash Reserve Gate · {formatRM(gatedTotal)} due
              within {MATURITY_GATE_WINDOW_DAYS} days
            </p>
            <p className="mt-1 text-[11px] leading-snug">
              The sinking-fund view is hiding a maturity mismatch:{' '}
              {gated
                .map((x) => {
                  const entry = SUBSCRIPTION_REGISTRY[x.sub.subscriptionId];
                  return `${entry.merchantName} charges the full ${formatRM(x.sub.amountRM)} in ${
                    x.view?.daysUntilBilling ?? 0
                  } day(s)`;
                })
                .join('; ')}
              . Keep the spot amount in cash — amortizing it to{' '}
              {formatRM(gated.reduce((sum, x) => sum + (x.view?.monthlyBurden ?? 0), 0))}/month does not
              pay the bill.
            </p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 scroll-thin">
          {Array.from({ length: total }, (_, i) => i + 1).map((day) => {
            const badges = badgeFor(day);
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`min-w-[86px] shrink-0 rounded-md border p-2 text-center ${
                  isToday ? 'border-primary bg-primary/5' : 'bg-background'
                }`}
              >
                <div className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isToday ? `Today · ${day}` : day}
                </div>
                <div className="mt-1 space-y-1">
                  {badges.map((s) => {
                    const entry = SUBSCRIPTION_REGISTRY[s.subscriptionId];
                    const amount = amortize
                      ? amortized.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM
                      : s.amountRM;
                    return (
                      <Badge key={s.subscriptionId} variant="danger" className="block truncate">
                        -{formatRM(amount)}
                        <span className="ml-1 font-normal">{entry.merchantName}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {nextMonth.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Next month:</span>
            {nextMonth.map((s) => (
              <Badge key={s.subscriptionId} variant="outline">
                {SUBSCRIPTION_REGISTRY[s.subscriptionId].merchantName} · {s.nextBillingDate} ·{' '}
                {formatRM(amortize ? amortized.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM : s.amountRM)}
                {amortized.get(s.subscriptionId)?.maturityGateTriggered ? ' · SPOT CASH DUE' : ''}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => advanceClock(24)}>
            <FastForward className="h-4 w-4" /> +24 Hours
          </Button>
          <Button size="sm" variant="outline" onClick={() => advanceClock(24 * 7)}>
            <FastForward className="h-4 w-4" /> +7 Days
          </Button>
          <Button size="sm" variant="outline" onClick={() => jumpToMonthEnd()}>
            <SkipForward className="h-4 w-4" /> Jump to Month-End
          </Button>
          {amortize && (
            <span className="text-xs text-muted-foreground">
              Sinking-fund view: annual/quarterly fees shown as monthly burdens; daily allowance recomputes.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
