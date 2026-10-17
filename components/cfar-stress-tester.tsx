'use client';

import * as React from 'react';
import { Gauge, Sparkles } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { DEMO_CONFIG } from '@/lib/quant-engine';
import { cn, formatRM } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { RiskTailStrip } from '@/components/risk-tail-strip';
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
  LOW: 'bg-[#ECFDF5] text-[#065F46]',
  MEDIUM: 'bg-[#FEF3C7] text-[#92400E]',
  HIGH: 'bg-[#FFEDD5] text-[#9A3412]',
  CRITICAL: 'bg-[#FFE4E6] text-[#9F1239]',
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
  );
}
