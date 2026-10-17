'use client';

import * as React from 'react';
import { ChevronDown, Clock3, Hourglass, Microscope, ShieldAlert, TrendingDown } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { calculateBehavioralMetrics, DEMO_CONFIG, ESCROW_RULES } from '@/lib/quant-engine';
import { ZOMBIE_RULES } from '@/lib/zombie-radar';
import { cn, formatRM } from '@/lib/utils';
import type { WhatIfResult } from '@/lib/domain';
import type { SpendCategory } from '@/lib/types';

export interface RiskTailStripProps {
  amount: number;
  category: SpendCategory;
  isNeed?: boolean;
  /** Pre-computed engine result (the interceptor modal already has one). */
  result?: WhatIfResult;
  /** `grid` = collapsible actuarial receipt; `inline` = compact chip row for cards. */
  variant?: 'grid' | 'inline';
  className?: string;
}

/**
 * Phase 8/9 fintech telemetry, delivered as an "Actuarial & Basel III Receipt".
 *
 * Human language first: collapsed, the strip is a perforated receipt bar showing three
 * high-trust chips (ES95 tail risk, intra-month NSF probability, pre-auth engine time)
 * and an "Expand Quant Proof" toggle. Expanded, it reveals the full deterministic
 * telemetry — CFaR95, the path-minimum barrier, the weekday/weekend stratified
 * bootstrap, the Laibson present-bias markup, the Stone-Geary subsistence floor and
 * the ISO 20022 mandate category. No number is ever invented: everything is read from
 * the engine result of `runWhatIfSimulation`.
 */
export function RiskTailStrip({
  amount,
  category,
  isNeed = false,
  result,
  variant = 'grid',
  className,
}: RiskTailStripProps) {
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);

  const [open, setOpen] = React.useState(false);

  const engine = React.useMemo<WhatIfResult>(() => {
    if (result) return result;
    return runWhatIf({ merchant: 'risk-preview', amount, category, isNeed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    result,
    runWhatIf,
    amount,
    category,
    isNeed,
    sandboxClock,
    currentBalance,
    spentThisWeek,
    spentThisMonth,
    amortizeAnnualFees,
  ]);

  const behavioral = React.useMemo(
    () => calculateBehavioralMetrics(amount, engine.shortfallProbability, rewardPool),
    [amount, engine.shortfallProbability, rewardPool],
  );

  const nsfRisk = engine.intraMonthLiquidityBreachProb;
  const nsfTone =
    nsfRisk >= 20 ? 'text-[#E11D48]' : nsfRisk > 0 ? 'text-[#B45309]' : 'text-[#059669]';

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5 text-[11px]', className)}>
        <span className="cp-chip cp-chip-zinc">ES95 {formatRM(engine.es95)}</span>
        <span className={cn('cp-chip bg-[#F7F6F2]', nsfTone)}>NSF dip {nsfRisk.toFixed(2)}%</span>
        <span className="cp-chip bg-[#F7F6F2] text-zinc-500">
          Pre-auth {engine.executionTimeMs.toFixed(2)} ms
        </span>
        <span className="cp-chip cp-chip-amber">
          Present bias β={DEMO_CONFIG.presentBiasBeta.toFixed(2)} ·{' '}
          {behavioral.presentBiasInflationRatio.toFixed(2)}×
        </span>
        {behavioral.riskElasticRewardRM > behavioral.baseRewardRM ? (
          <span className="cp-chip cp-chip-emerald">
            Reward {formatRM(behavioral.baseRewardRM)} → {formatRM(behavioral.riskElasticRewardRM)}{' '}
            risk-elastic
          </span>
        ) : null}
      </div>
    );
  }

  const tiles: Array<{ icon: React.ReactNode; label: string; value: string; tone: string }> = [
    {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      label: 'ES95 tail risk',
      value: formatRM(engine.es95),
      tone: 'text-[#059669]',
    },
    {
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: 'Mid-month NSF dip',
      value: `${nsfRisk.toFixed(2)}%`,
      tone: nsfTone,
    },
    {
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: 'Pre-auth engine',
      value: `${engine.executionTimeMs.toFixed(2)} ms`,
      tone: 'text-zinc-500',
    },
    {
      icon: <Hourglass className="h-3.5 w-3.5" />,
      label: 'Present-bias markup',
      value: `${behavioral.presentBiasInflationRatio.toFixed(2)}× (β=${behavioral.presentBiasBeta.toFixed(2)})`,
      tone: 'text-[#B45309]',
    },
  ];

  const rows: Array<{ label: string; value: string }> = [
    { label: '95% CFaR', value: formatRM(engine.cfar95) },
    { label: 'Path floor · 5th pct.', value: formatRM(engine.lowestProjectedBalanceRM) },
    {
      label: 'Stratified bootstrap',
      value: `${engine.stratifiedShortfallProbability.toFixed(2)}%`,
    },
    { label: 'Stone-Geary floor', value: `${formatRM(ESCROW_RULES.minDailySurvivalFloorRM)}/day` },
    { label: 'ISO 20022 mandate', value: ZOMBIE_RULES.iso20022MandateCategory },
  ];

  return (
    <div className={cn('receipt-divider mt-3 pt-2.5', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle quant details"
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="cp-chip cp-chip-zinc">Basel III ES95 {formatRM(engine.es95)}</span>
          <span className={cn('cp-chip bg-[#F7F6F2]', nsfTone)}>NSF risk {nsfRisk.toFixed(2)}%</span>
          <span className="cp-chip bg-[#F7F6F2] text-zinc-500">
            Engine {engine.executionTimeMs.toFixed(2)} ms
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-zinc-500">
          <Microscope className="h-3 w-3" /> {open ? 'Hide' : 'Expand'} Quant Proof
          <ChevronDown
            className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>

      <div className="cp-collapse" data-open={open}>
        <div aria-hidden={!open}>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tiles.map((t) => (
                  <div key={t.label} className="rounded-xl bg-[#F7F6F2] px-3 py-2">
                    <div className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', t.tone)}>
                      {t.icon}
                      {t.label}
                    </div>
                    <div className={cn('mt-1 text-sm font-bold tabular-nums', t.tone)}>{t.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-[#FAF9F5] px-3 py-2 text-[11px]">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between gap-2 border-b border-dashed border-zinc-200 py-1.5 last:border-0"
                  >
                    <span className="text-zinc-500">{r.label}</span>
                    <span className="font-bold tabular-nums text-[#18181B]">{r.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] leading-relaxed text-zinc-400">
                Coherent expected shortfall (Artzner et al., 1999) · intra-month path-minimum barrier ·
                weekday/weekend stratified bootstrap (Künsch, 1989) · Laibson (1997) quasi-hyperbolic
                present bias with a risk-elastic reward of {formatRM(behavioral.baseRewardRM)} →{' '}
                {formatRM(behavioral.riskElasticRewardRM)}. Every proposal is HMAC-SHA256 signed and
                verified server-side at decision time.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
