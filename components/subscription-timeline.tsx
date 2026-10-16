'use client';

import * as React from 'react';
import { CalendarDays, FastForward, SkipForward } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTIONS } from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { calculateAmortizedSubscriptions } from '@/lib/quant-engine';
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
    calculateAmortizedSubscriptions(SUBSCRIPTIONS).map((a) => [a.subscriptionId, a]),
  );

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
