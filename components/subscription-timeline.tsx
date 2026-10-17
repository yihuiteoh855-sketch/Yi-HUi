'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  FastForward,
  LayoutGrid,
  SkipForward,
  Utensils,
  X,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { FIXED_BILLS, SUBSCRIPTIONS } from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
<<<<<<< HEAD
import { calculateAmortizedSubscriptions, MATURITY_GATE_WINDOW_DAYS } from '@/lib/quant-engine';
import { upcomingFixedBills } from '@/lib/ledger';
import { cn, dayOfMonth, daysInMonth, formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
=======
import { calculateAmortizedSubscriptions, MATURITY_GATE_WINDOW_DAYS, toStudentUnits } from '@/lib/quant-engine';
import { cn, dayOfMonth, daysInMonth, formatRM } from '@/lib/utils';
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
import { Switch } from '@/components/ui/switch';
import { CorridorCard, buildCorridor } from '@/components/corridor-chart';

<<<<<<< HEAD
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
=======
type TimelineView = 'grid' | 'sinking';
type GridFilter = 'ALL' | 'BILLS' | 'QUARANTINE' | 'SAFE';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FILTERS: Array<{ id: GridFilter; label: string }> = [
  { id: 'ALL', label: 'All Days' },
  { id: 'BILLS', label: 'Fixed Bills' },
  { id: 'QUARANTINE', label: 'Quarantine' },
  { id: 'SAFE', label: 'Safe Days' },
];

/**
 * Spatial cash-flow view (Phase 9).
 *
 * `view="grid"` renders the interactive 5x6 "30-Day Cash-Flow Lot Grid": one tactile
 * tile per day of the sandbox month, filter pills on top, and a bottom detail card
 * for the selected day (bills, sinking-fund burden, maturity gate, quick time jumps).
 *
 * `view="sinking"` keeps the classic sinking-fund inspector: amortized monthly/daily
 * burdens, set-aside amounts and the next-month strip.
 *
 * Every figure comes from the deterministic engine + the sandbox clock; this file
 * contains no business logic of its own.
 */
export function SubscriptionTimeline({
  view = 'grid',
  className,
}: {
  view?: TimelineView;
  className?: string;
}) {
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const setAmortize = useCtrlPayStore((s) => s.setAmortize);
  const advanceClock = useCtrlPayStore((s) => s.advanceClock);
  const jumpToMonthEnd = useCtrlPayStore((s) => s.jumpToMonthEnd);
<<<<<<< HEAD
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
=======
  const quarantines = useCtrlPayStore((s) => s.quarantines);

  const [filter, setFilter] = React.useState<GridFilter>('ALL');
  const [selected, setSelected] = React.useState<number | null>(null);
  const uid = React.useId();
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067

  const today = dayOfMonth(sandboxClock);
  const total = daysInMonth(sandboxClock);
  const clockDate = new Date(sandboxClock);
  const monthIndex = clockDate.getUTCMonth();
  const monthKey = new Date(sandboxClock).toISOString().slice(0, 7);
<<<<<<< HEAD
  const monthIndex = new Date(sandboxClock).getUTCMonth();
  const year = new Date(sandboxClock).getUTCFullYear();
  const amortized = new Map(
    calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock }).map((a) => [a.subscriptionId, a]),
=======
  const monthLabel = `${MONTHS[monthIndex]} ${clockDate.getUTCFullYear()}`;

  const amortized = React.useMemo(
    () =>
      new Map(
        calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock }).map((a) => [a.subscriptionId, a]),
      ),
    [sandboxClock],
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  );

  // Treasury maturity gate: non-monthly charges due inside the settlement window need
  // the FULL amount in spot cash — the 1/12 amortized figure alone is an illusion.
  const gated = SUBSCRIPTIONS.map((s) => ({ sub: s, view: amortized.get(s.subscriptionId) })).filter(
    (x) => x.view?.maturityGateTriggered === true,
  );
  const gatedTotal = gated.reduce((sum, x) => sum + x.sub.amountRM, 0);

  const inMonth = SUBSCRIPTIONS.filter((s) => s.nextBillingDate.slice(0, 7) === monthKey);
  const nextMonth = SUBSCRIPTIONS.filter((s) => s.nextBillingDate.slice(0, 7) !== monthKey);

<<<<<<< HEAD
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
=======
  const subsOn = (day: number) => inMonth.filter((s) => new Date(s.nextBillingDate).getUTCDate() === day);
  const billsOn = (day: number) =>
    FIXED_BILLS.filter((b) => !b.paid && b.dueDay <= total && b.dueDay === day);

  const quarantineByDay = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const q of quarantines) {
      if (new Date(q.lockedAt).toISOString().slice(0, 7) !== monthKey) continue;
      if (q.status !== 'LOCKED_24H' && q.status !== 'READY_TO_DECIDE') continue;
      const day = dayOfMonth(q.lockedAt);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return map;
  }, [quarantines, monthKey]);

  const dueOn = (day: number) => {
    const subsTotal = subsOn(day).reduce(
      (sum, s) => sum + (amortize ? amortized.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM : s.amountRM),
      0,
    );
    const billsTotal = billsOn(day).reduce((sum, b) => sum + b.amountRM, 0);
    return Math.round((subsTotal + billsTotal) * 100) / 100;
  };

  const weekdayOf = (day: number) => WEEKDAYS[new Date(Date.UTC(clockDate.getUTCFullYear(), monthIndex, day)).getUTCDay()];

  const visibleDays = Array.from({ length: total }, (_, i) => i + 1).filter((day) => {
    if (filter === 'ALL') return true;
    if (filter === 'BILLS') return subsOn(day).length > 0 || billsOn(day).length > 0;
    if (filter === 'QUARANTINE') return quarantineByDay.has(day);
    return subsOn(day).length === 0 && billsOn(day).length === 0;
  });

  const gateBanner =
    gated.length > 0 ? (
      <div className="rounded-2xl border border-amber-300 bg-[#FEF3C7]/70 p-3 text-[11px] text-[#92400E]">
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle className="h-4 w-4" /> Spot Cash Reserve Gate · {formatRM(gatedTotal)} due within{' '}
          {MATURITY_GATE_WINDOW_DAYS} days
        </p>
        <p className="mt-1 leading-snug">
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
          {formatRM(gated.reduce((sum, x) => sum + (x.view?.monthlyBurden ?? 0), 0))}/month does not pay
          the bill.
        </p>
      </div>
    ) : null;

  const amortizeToggle = (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="text-[10px] font-semibold text-zinc-500">Sinking fund</span>
      <Switch checked={amortize} onCheckedChange={setAmortize} aria-label="Amortize Annual Fees" />
    </div>
  );

  const detail = selected !== null ? (
    <DayDetail
      day={selected}
      today={today}
      weekday={weekdayOf(selected)}
      subs={subsOn(selected)}
      bills={billsOn(selected)}
      amortized={amortized}
      amortize={amortize}
      quarantineLocks={quarantineByDay.get(selected) ?? 0}
      onClose={() => setSelected(null)}
      onJump={(hours) => advanceClock(hours)}
      onJumpMonthEnd={() => jumpToMonthEnd()}
    />
  ) : null;

  if (view === 'sinking') {
    return (
      <section className={cn('soft-card space-y-3 p-4', className)}>
        <header className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="h-4 w-4 text-[#8B5CF6]" /> Sinking fund inspector
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
              {amortize
                ? 'Annual and quarterly fees spread into smooth monthly and daily burdens — the daily allowance recomputes.'
                : 'Real charges, exactly as they hit. Flip the switch to see the amortized hiding curve.'}
            </p>
          </div>
          {amortizeToggle}
        </header>

        {gateBanner}

        <ul className="space-y-2">
          {SUBSCRIPTIONS.map((s) => {
            const entry = SUBSCRIPTION_REGISTRY[s.subscriptionId];
            const v = amortized.get(s.subscriptionId);
            return (
              <li key={s.subscriptionId} className="rounded-2xl border border-[#18181B]/10 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-bold">{entry.merchantName}</p>
                  <span className="shrink-0 text-xs font-extrabold tabular-nums">
                    {amortize ? `${formatRM(v?.monthlyBurden ?? s.amountRM)}/mo` : formatRM(s.amountRM)}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  {s.billingCycle.toLowerCase()} · next {s.nextBillingDate}
                  {amortize && v
                    ? ` · ${formatRM(v.dailyBurden)}/day · set aside ${formatRM(v.setAsideThisMonth)} this month`
                    : ''}
                </p>
                {v?.maturityGateTriggered && (
                  <p className="mt-1.5 flex">
                    <span className="cp-chip cp-chip-rose">SPOT CASH DUE · full amount inside 7 days</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {nextMonth.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="font-semibold">Next month:</span>
            {nextMonth.map((s) => (
              <span key={s.subscriptionId} className="cp-chip cp-chip-zinc">
                {SUBSCRIPTION_REGISTRY[s.subscriptionId].merchantName} · {s.nextBillingDate} ·{' '}
                {formatRM(amortize ? amortized.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM : s.amountRM)}
              </span>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cn('soft-card space-y-3 p-4', className)}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <LayoutGrid className="h-4 w-4 text-[#4F46E5]" /> 30-Day Cash-Flow Lot Grid
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
            Every tile is one day-lot of the {monthLabel} sandbox month. Rose tiles carry scheduled
            money out.
          </p>
        </div>
        {amortizeToggle}
      </header>

      {gateBanner}

      <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Grid filters">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={cn(
                'relative shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                active ? 'border-transparent text-white' : 'border-[#18181B]/10 bg-white text-zinc-500',
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${uid}-grid-filter`}
                  className="absolute inset-0 rounded-full bg-[#18181B]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{f.label}</span>
            </button>
          );
        })}
      </div>

      {visibleDays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#18181B]/15 bg-[#F7F6F2] p-3 text-[11px] text-zinc-500">
          {filter === 'QUARANTINE'
            ? 'No active 24h quarantine locks this month — simulate an impulse buy from the judge dock to see one here.'
            : 'Nothing matches this filter on the current ledger.'}
        </div>
      ) : (
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1.5">
          {visibleDays.map((day) => {
            const bills = billsOn(day);
            const subs = subsOn(day);
            const due = dueOn(day);
            const hasOutflow = subs.length > 0 || bills.length > 0;
            const isToday = day === today;
            const gatedHere = subs.some((s) => amortized.get(s.subscriptionId)?.maturityGateTriggered);
            const locked = quarantineByDay.has(day);
            const isSelected = selected === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(isSelected ? null : day)}
                aria-label={`Day ${day}${hasOutflow ? `, bills ${formatRM(due)}` : ''}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] text-center transition-all',
                  hasOutflow
                    ? 'border-[#E11D48]/25 bg-[#FFE4E6] text-[#9F1239]'
                    : 'border-[#18181B]/10 bg-white text-zinc-400',
                  isToday && 'ring-2 ring-[#10B981] ring-offset-1 ring-offset-[#F7F6F2]',
                  isSelected && 'border-[#18181B] shadow-[0_3px_0_#18181B]',
                )}
              >
                <span className="text-[10px] font-extrabold tabular-nums">{day}</span>
                {hasOutflow ? (
                  <span className="text-[8px] font-bold leading-none tabular-nums">-{formatRM(due)}</span>
                ) : (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-[#10B981]/50" />
                )}
                {isToday && (
                  <span className="absolute -top-1.5 rounded-full bg-[#10B981] px-1.5 py-[1px] text-[7px] font-black tracking-wide text-white">
                    TODAY
                  </span>
                )}
                {gatedHere && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />}
                {locked && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#E11D48]/40" /> scheduled outflows
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> spot-cash gate
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#4F46E5]" /> quarantine lock
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#10B981]" /> today
        </span>
      </div>

      {detail}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Selected-day bottom detail card
 * ------------------------------------------------------------------ */

function DayDetail({
  day,
  today,
  weekday,
  subs,
  bills,
  amortized,
  amortize,
  quarantineLocks,
  onClose,
  onJump,
  onJumpMonthEnd,
}: {
  day: number;
  today: number;
  weekday: string;
  subs: Array<(typeof SUBSCRIPTIONS)[number]>;
  bills: typeof FIXED_BILLS;
  amortized: Map<string, { monthlyBurden: number; dailyBurden: number; maturityGateTriggered?: boolean }>;
  amortize: boolean;
  quarantineLocks: number;
  onClose: () => void;
  onJump: (hours: number) => void;
  onJumpMonthEnd: () => void;
}) {
  const dueTotal =
    subs.reduce(
      (sum, s) => sum + (amortize ? amortized.get(s.subscriptionId)?.monthlyBurden ?? s.amountRM : s.amountRM),
      0,
    ) + bills.reduce((sum, b) => sum + b.amountRM, 0);
  const units = toStudentUnits(dueTotal);
  const gatedHere = subs.some((s) => amortized.get(s.subscriptionId)?.maturityGateTriggered);

  return (
    <div key={day} className="cp-detail-enter tactile-card p-3">
      <header className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold">
          Day {day} · {weekday}
          {day === today && <span className="cp-chip cp-chip-emerald">TODAY</span>}
        </p>
        <button type="button" onClick={onClose} aria-label="Close day detail" className="rounded-full p-1 text-zinc-400 hover:text-[#18181B]">
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-2 space-y-1.5">
        {subs.map((s) => {
          const entry = SUBSCRIPTION_REGISTRY[s.subscriptionId];
          const v = amortized.get(s.subscriptionId);
          return (
            <div key={s.subscriptionId} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-semibold">{entry.merchantName}</span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {amortize && v ? `${formatRM(v.monthlyBurden)}/mo · ${formatRM(v.dailyBurden)}/day` : `-${formatRM(s.amountRM)}`}
              </span>
            </div>
          );
        })}
        {bills.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-semibold">{b.label} (unpaid)</span>
            <span className="shrink-0 tabular-nums text-zinc-500">-{formatRM(b.amountRM)}</span>
          </div>
        ))}
        {subs.length === 0 && bills.length === 0 && (
          <p className="text-[11px] text-zinc-500">No scheduled outflows — free cash stays in the wallet.</p>
        )}
      </div>

      {dueTotal > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Utensils className="h-3 w-3" /> equals ≈ {units.mixedRiceMeals} USM mixed-rice meals
        </p>
      )}

      {gatedHere && (
        <p className="mt-1.5 flex">
          <span className="cp-chip cp-chip-rose">Spot Cash Reserve Gate active — keep the full amount in cash</span>
        </p>
      )}
      {quarantineLocks > 0 && (
        <p className="mt-1.5 flex">
          <span className="cp-chip cp-chip-indigo">
            {quarantineLocks} quarantine lock{quarantineLocks > 1 ? 's' : ''} opened here
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" className="tactile-btn-dark px-2.5 py-1.5 text-[10px]" onClick={() => onJump(24)}>
          <FastForward className="h-3 w-3" /> +24h
        </button>
        <button type="button" className="tactile-btn-dark px-2.5 py-1.5 text-[10px]" onClick={() => onJump(24 * 7)}>
          <FastForward className="h-3 w-3" /> +7d
        </button>
        <button type="button" className="tactile-btn-primary px-2.5 py-1.5 text-[10px]" onClick={onJumpMonthEnd}>
          <SkipForward className="h-3 w-3" /> Month-End
        </button>
      </div>
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
    </div>
  );
}
