'use client';

import * as React from 'react';
import { AlertTriangle, CalendarDays, FastForward, SkipForward } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTIONS } from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { calculateAmortizedSubscriptions, MATURITY_GATE_WINDOW_DAYS } from '@/lib/quant-engine';
import { upcomingFixedBills } from '@/lib/ledger';
import { cn, dayOfMonth, daysInMonth, formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CorridorCard, buildCorridor } from '@/components/corridor-chart';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * 30-day horizontal deduction calendar under an Expense-Overview cash corridor.
 *
 * Today is inked, upcoming charges carry a crimson amount badge, and any non-monthly
 * charge landing inside the settlement window raises the Maturity Liquidity Gate —
 * which flips the accounting from Fee/12 smoothing back to 100% spot cash. The corridor
 * above the strip is the engine's normal balance path with its ES95 tail as the lower
 * boundary.
 */
export function SubscriptionTimeline() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const setAmortize = useCtrlPayStore((s) => s.setAmortize);
  const advanceClock = useCtrlPayStore((s) => s.advanceClock);
  const jumpToMonthEnd = useCtrlPayStore((s) => s.jumpToMonthEnd);
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);

  const today = dayOfMonth(sandboxClock);
  const total = daysInMonth(sandboxClock);
  const monthKey = new Date(sandboxClock).toISOString().slice(0, 7);
  const monthIndex = new Date(sandboxClock).getUTCMonth();
  const year = new Date(sandboxClock).getUTCFullYear();
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

  const badgeFor = (day: number) => inMonth.filter((s) => new Date(s.nextBillingDate).getUTCDate() === day);
  const amountFor = (s: (typeof SUBSCRIPTIONS)[number]) =>
    amortize ? amortized.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM : s.amountRM;

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Baseline risk hook (zero proposed spend) — the corridor is built from the same engine.
  const baseline = React.useMemo(
    () => runWhatIf({ merchant: 'deduction-corridor', amount: 0, category: 'Shopping', isNeed: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runWhatIf, sandboxClock, currentBalance, amortize],
  );

  const corridor = React.useMemo(
    () =>
      buildCorridor({
        clock: sandboxClock,
        balance: currentBalance,
        allowance: baseline.dynamicDailyAllowance,
        bills: upcomingFixedBills(sandboxClock, SUBSCRIPTIONS, amortize).map((b) => ({
          dueDay: b.dueDay,
          amountRM: b.amountRM,
          paid: b.paid,
        })),
        tail: baseline.es95,
        days: 7,
      }),
    [sandboxClock, currentBalance, baseline.dynamicDailyAllowance, baseline.es95, amortize],
  );

  return (
    <CorridorCard
      icon={CalendarDays}
      kicker="Deduction calendar"
      title="Cash corridor · next 7 days"
      defaultOpen
      onDrill={() => jumpToMonthEnd()}
      badge={
        <p className="text-[11px] leading-snug text-holst-950/70">
          Next 7 days assuming today&apos;s dynamic allowance is spent every day. Upper edge is the
          normal path, lower edge the ES95 tail; red badges are spot-cash bills.
        </p>
      }
      points={corridor.points}
      riskIndex={corridor.riskIndex}
      metrics={
        <div className="grid grid-cols-2 gap-2">
          <Metric label="CFaR95" value={formatRM(baseline.cfar95)} hint="95th-pct month-end shortfall" />
          <Metric label="ES95 tail" value={formatRM(baseline.es95)} hint="worst-5% mean" tone="text-[#10606F]" />
          <Metric
            label="Intra-month NSF risk"
            value={`${baseline.intraMonthLiquidityBreachProb.toFixed(2)}%`}
            hint="running balance < 0"
            tone={baseline.intraMonthLiquidityBreachProb > 0 ? 'text-[#c0392b]' : 'text-[#10606F]'}
          />
          <Metric
            label="Pre-auth hook"
            value={mounted ? `${baseline.executionTimeMs.toFixed(2)} ms` : '… ms'}
            hint="budget < 50 ms"
            tone="text-[#10606F]"
          />
        </div>
      }
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-3">
            <div>
              <p className="text-[12px] font-bold text-holst-950">Sinking fund · Fee/12</p>
              <p className="text-[10.5px] duo-muted">
                Smooths annual fees to a monthly burden, or bills them as spot cash.
              </p>
            </div>
            <Switch checked={amortize} onCheckedChange={setAmortize} aria-label="Amortize Annual Fees" />
          </div>

          {gated.length > 0 && (
            <div className="duo-warning p-3 text-xs">
              <p className="flex items-center gap-2 font-extrabold">
                <AlertTriangle className="h-4 w-4" /> Maturity Liquidity Gate · {formatRM(gatedTotal)} due within{' '}
                {MATURITY_GATE_WINDOW_DAYS} days
              </p>
              <p className="mt-1 text-[11px] leading-snug">
                The sinking-fund view hides a maturity mismatch:{' '}
                {gated
                  .map((x) => {
                    const entry = SUBSCRIPTION_REGISTRY[x.sub.subscriptionId];
                    return `${entry.merchantName} charges the full ${formatRM(x.sub.amountRM)} in ${
                      x.view?.daysUntilBilling ?? 0
                    } day(s)`;
                  })
                  .join('; ')}
                . Keep the spot amount in cash — amortizing it to{' '}
                {formatRM(gated.reduce((sum, x) => sum + (x.view?.monthlyBurden ?? 0), 0))}/month does not pay the
                bill.
              </p>
            </div>
          )}

          {nextMonth.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold duo-muted">Next month</span>
              {nextMonth.map((s) => (
                <Badge key={s.subscriptionId} variant="secondary">
                  {SUBSCRIPTION_REGISTRY[s.subscriptionId].merchantName} · {s.nextBillingDate.slice(5)} ·{' '}
                  {formatRM(amountFor(s))}
                  {amortized.get(s.subscriptionId)?.maturityGateTriggered ? ' · SPOT CASH' : ''}
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
          </div>
        </div>
      }
    >
      <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {Array.from({ length: total }, (_, i) => i + 1).map((day) => {
          const badges = badgeFor(day);
          const isToday = day === today;
          const weekday = WEEKDAYS[new Date(Date.UTC(year, monthIndex, day)).getUTCDay()];
          return (
            <div
              key={day}
              className={cn(
                'flex min-w-[52px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5',
                isToday
                  ? 'bg-holst-950 text-white shadow-lift'
                  : badges.length > 0
                    ? 'bg-white/85 ring-1 ring-inset ring-holst-950/8'
                    : 'bg-white/40',
              )}
            >
              <span
                className={cn(
                  'text-[9px] font-bold uppercase tracking-[0.14em]',
                  isToday ? 'text-holst-200' : 'duo-muted',
                )}
              >
                {isToday ? 'Today' : weekday}
              </span>
              <span className={cn('ct-int text-[15px]', isToday ? 'text-white' : 'text-holst-950')}>{day}</span>
              {badges.length > 0 ? (
                <span className="rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums text-white">
                  -{formatRM(badges.reduce((sum, s) => sum + amountFor(s), 0)).replace('RM', '').trim()}
                </span>
              ) : (
                <span className={cn('h-1.5 w-1.5 rounded-full', isToday ? 'bg-holst-400' : 'bg-holst-950/10')} />
              )}
            </div>
          );
        })}
      </div>
    </CorridorCard>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-holst-950/5">
      <p className="duo-muted text-[9.5px] font-bold uppercase tracking-[0.09em]">{label}</p>
      <p className={cn('duo-num mt-0.5 text-[15px] font-extrabold text-holst-950', tone)}>{value}</p>
      <p className="duo-muted mt-0.5 text-[9.5px] leading-snug">{hint}</p>
    </div>
  );
}
