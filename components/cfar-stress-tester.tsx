'use client';

import * as React from 'react';
import { Gauge, Sparkles } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { DEMO_CONFIG } from '@/lib/quant-engine';
import { upcomingFixedBills } from '@/lib/ledger';
import { SUBSCRIPTIONS } from '@/lib/mock-data';
import { cn, formatRM } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
<<<<<<< HEAD
import { CorridorCard, buildCorridor } from '@/components/corridor-chart';
=======
import { RiskTailStrip } from '@/components/risk-tail-strip';
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
import type { SpendCategory } from '@/lib/types';
import type { WhatIfResult } from '@/lib/domain';

const PRESETS: Array<{ label: string; amount: number; category: SpendCategory; isNeed: boolean }> = [
  { label: 'GrabFood RM 32', amount: 32, category: 'Food_Delivery_Grab_Foodpanda', isNeed: false },
  { label: 'Shopee RM 180', amount: 180, category: 'Shopping', isNeed: false },
  { label: 'Campus lunch RM 9', amount: 9, category: 'Campus_Cafeteria_Basic', isNeed: true },
];

const CATEGORY_CHOICES: Array<{ label: string; category: SpendCategory; isNeed: boolean }> = [
  { label: 'Wants', category: 'Shopping', isNeed: false },
  { label: 'Food delivery', category: 'Food_Delivery_Grab_Foodpanda', isNeed: false },
  { label: 'Bubble tea', category: 'Bubble_Tea_Dining', isNeed: false },
  { label: 'Needs', category: 'Campus_Cafeteria_Basic', isNeed: true },
];

const RISK_TONE: Record<WhatIfResult['riskLevel'], string> = {
<<<<<<< HEAD
  LOW: 'bg-[#E2F4F0] text-[#10606F]',
  MEDIUM: 'bg-[#FFF8E9] text-[#8F6514]',
  HIGH: 'bg-[#fff1e6] text-[#8F6514]',
  CRITICAL: 'bg-[#fdecec] text-[#c0392b]',
=======
  LOW: 'bg-[#ECFDF5] text-[#065F46]',
  MEDIUM: 'bg-[#FEF3C7] text-[#92400E]',
  HIGH: 'bg-[#FFEDD5] text-[#9A3412]',
  CRITICAL: 'bg-[#FFE4E6] text-[#9F1239]',
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
};

/**
 * Interactive What-If CFaR stress tester (Phase 8/9).
 *
 * Every figure comes from the deterministic engine (`runWhatIfSimulation`): 1,000
 * seeded Monte Carlo paths, the Basel III ES95 tail mean, the intra-month liquidity
 * barrier and the weekday/weekend stratified bootstrap. The LLM never computes these.
 *
 * Phase 9: the human-readable tiles stay on top; the actuarial tail (ES95, NSF dip,
 * present-bias markup, Stone-Geary floor, ISO 20022 mandate) is delivered through the
 * collapsible receipt at the bottom — progressive disclosure, not a numbers dump.
 */
export function CfarStressTester({ className }: { className?: string }) {
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const jumpToMonthEnd = useCtrlPayStore((s) => s.jumpToMonthEnd);

  const [amount, setAmount] = React.useState(180);
  const [category, setCategory] = React.useState<SpendCategory>('Shopping');
  const [isNeed, setIsNeed] = React.useState(false);

  const result = React.useMemo(
    () => runWhatIf({ merchant: 'stress-tester', amount, category, isNeed }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      runWhatIf,
      amount,
      category,
      isNeed,
      sandboxClock,
      currentBalance,
      spentThisWeek,
      spentThisMonth,
      amortizeAnnualFees,
    ],
  );

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Corridor: the stress scenario books the proposed spend today, then runs the next 7 days
  // of allowance + scheduled bills with the engine's ES95 tail widening as the lower bound.
  const corridor = React.useMemo(() => {
    const bills = upcomingFixedBills(sandboxClock, SUBSCRIPTIONS, amortizeAnnualFees).map((b) => ({
      dueDay: b.dueDay,
      amountRM: b.amountRM,
      paid: b.paid,
    }));
    return buildCorridor({
      clock: sandboxClock,
      balance: currentBalance,
      allowance: result.dynamicDailyAllowance,
      bills,
      tail: result.es95,
      proposedOnDay0: amount,
      days: 7,
    });
  }, [sandboxClock, currentBalance, amortizeAnnualFees, result.dynamicDailyAllowance, result.es95, amount]);

  const metrics: Array<{ label: string; value: string; tone?: string; hint: string }> = [
    {
      label: 'Shortfall prob.',
      value: `${result.shortfallProbability.toFixed(2)}%`,
      hint: 'P(month-end balance < savings goal)',
    },
    {
      label: 'CFaR95',
      value: formatRM(result.cfar95),
      hint: '95th-percentile month-end shortfall',
    },
    {
<<<<<<< HEAD
      label: 'ES95 tail',
      value: formatRM(result.es95),
      tone: 'text-[#10606F]',
      hint: 'Mean of the worst 5% (coherent, Artzner 1999)',
    },
    {
      label: 'NSF dip risk',
      value: `${result.intraMonthLiquidityBreachProb.toFixed(2)}%`,
      tone: result.intraMonthLiquidityBreachProb > 0 ? 'text-[#c0392b]' : 'text-[#10606F]',
      hint: 'P(intra-month running balance < 0)',
    },
    {
=======
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
      label: 'Lowest balance',
      value: formatRM(result.lowestProjectedBalanceRM),
      hint: '5th percentile of the path minima',
    },
    {
      label: 'Stratified',
      value: `${result.stratifiedShortfallProbability.toFixed(2)}%`,
      tone: 'text-[#4F46E5]',
      hint: 'Weekday/weekend bootstrap (Künsch 1989)',
    },
  ];

  return (
<<<<<<< HEAD
    <CorridorCard
      className={className}
      icon={Gauge}
      kicker="What-If CFaR stress test"
      title="Expense corridor"
      onDrill={() => jumpToMonthEnd()}
      badge={
        <div className="flex items-center gap-2 text-[11px]">
          <span className={cn('rounded-full px-2.5 py-1 font-bold', RISK_TONE[result.riskLevel])}>
            {result.riskLevel}
          </span>
          <span className="font-semibold text-holst-950/70">
            {formatRM(amount)} booked today · {result.pathsRun.toLocaleString('en-MY')} seeded paths ·
            allowance spent daily
          </span>
        </div>
      }
      points={corridor.points}
      riskIndex={corridor.riskIndex}
      metrics={
        <div className="grid grid-cols-2 gap-2">
          <Metric label="CFaR95" value={formatRM(result.cfar95)} hint="95th-pct shortfall" />
          <Metric label="ES95 tail" value={formatRM(result.es95)} hint="worst-5% mean" tone="text-[#10606F]" />
          <Metric
            label="Intra-month NSF risk"
            value={`${result.intraMonthLiquidityBreachProb.toFixed(2)}%`}
            hint="running balance < 0"
            tone={result.intraMonthLiquidityBreachProb > 0 ? 'text-[#c0392b]' : 'text-[#10606F]'}
          />
          <Metric
            label="Pre-auth hook"
            value={mounted ? `${result.executionTimeMs.toFixed(2)} ms` : '… ms'}
            hint="budget < 50 ms"
            tone="text-[#10606F]"
          />
        </div>
      }
      footer={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setAmount(p.amount);
                  setCategory(p.category);
                  setIsNeed(p.isNeed);
                }}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  amount === p.amount && category === p.category
                    ? 'bg-[#04222B] text-white'
                    : 'bg-white/70 text-[#10606F]',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-holst-950/80">Proposed spend</span>
              <span className="duo-num font-bold text-holst-950">{formatRM(amount)}</span>
            </div>
            <Slider
              className="mt-1.5"
              value={amount}
              min={0}
              max={300}
              step={1}
              onValueChange={setAmount}
              aria-label="Proposed spend amount"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORY_CHOICES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    setCategory(c.category);
                    setIsNeed(c.isNeed);
                  }}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    category === c.category ? 'bg-[#10606F] text-white' : 'bg-white/70 text-[#10606F]',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 p-3 text-[10.5px] leading-relaxed text-holst-950/80">
            <p className="flex items-start gap-1.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-holst-600" />
              <span>
                Month-end plan: <strong>{formatRM(result.projectedMonthEndBalance)}</strong> on committed cash
                only · <strong>{formatRM(result.projectedMonthEndBalanceWithIncomeRM)}</strong> once the day-
                {DEMO_CONFIG.allowanceDayOfMonth} allowance is credited · allowance today{' '}
                <strong>{formatRM(result.dynamicDailyAllowance)}</strong>/day · reward pool{' '}
                {formatRM(rewardPool)}.
              </span>
            </p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="ct-metric">
            <p className="duo-muted text-[10px] font-bold uppercase tracking-[0.1em]">{m.label}</p>
            <p className={cn('duo-num mt-0.5 text-base font-extrabold', m.tone)}>{m.value}</p>
            <p className="duo-muted mt-0.5 text-[10px] leading-snug">{m.hint}</p>
          </div>
        ))}
      </div>
      <p className="duo-muted mt-2 flex items-center gap-1.5 text-[10px]">
        <Activity className="h-3 w-3" /> Pre-authorization latency{' '}
        {mounted ? `${result.executionTimeMs.toFixed(2)} ms` : '…'} (budget &lt; 50 ms)
      </p>
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
    <div className="ct-metric">
      <p className="duo-muted text-[9.5px] font-bold uppercase tracking-[0.09em]">{label}</p>
      <p className={cn('duo-num mt-0.5 text-[15px] font-extrabold text-holst-950', tone)}>{value}</p>
      <p className="duo-muted mt-0.5 text-[9.5px] leading-snug">{hint}</p>
    </div>
=======
    <section className={cn('soft-card p-4', className)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Gauge className="h-4 w-4 text-[#059669]" /> What-If CFaR stress tester
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {result.pathsRun.toLocaleString('en-MY')} seeded paths · deterministic engine, never the
            LLM
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', RISK_TONE[result.riskLevel])}>
          {result.riskLevel}
        </span>
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setAmount(p.amount);
              setCategory(p.category);
              setIsNeed(p.isNeed);
            }}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              amount === p.amount && category === p.category
                ? 'bg-[#18181B] text-white'
                : 'border border-[#18181B]/10 bg-white text-zinc-500 hover:text-[#18181B]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Proposed spend</span>
          <span className="font-bold tabular-nums text-[#059669]">{formatRM(amount)}</span>
        </div>
        <Slider
          value={amount}
          min={0}
          max={300}
          step={1}
          onValueChange={setAmount}
          aria-label="Proposed spend amount"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORY_CHOICES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                setCategory(c.category);
                setIsNeed(c.isNeed);
              }}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                category === c.category
                  ? 'bg-[#10B981] text-white'
                  : 'border border-[#18181B]/10 bg-white text-zinc-500 hover:text-[#18181B]',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl bg-[#F7F6F2] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{m.label}</p>
            <p className={cn('mt-0.5 text-base font-extrabold tabular-nums', m.tone ?? 'text-[#18181B]')}>
              {m.value}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{m.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#ECFDF5] px-3 py-2 text-[11px] text-[#065F46]">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Month-end plan: <strong>{formatRM(result.projectedMonthEndBalance)}</strong> on committed
          cash only · <strong>{formatRM(result.projectedMonthEndBalanceWithIncomeRM)}</strong> once
          the day-{DEMO_CONFIG.allowanceDayOfMonth} allowance is credited · allowance today{' '}
          <strong>{formatRM(result.dynamicDailyAllowance)}</strong>/day.
        </span>
      </div>

      <RiskTailStrip amount={amount} category={category} isNeed={isNeed} result={result} />
    </section>
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  );
}
