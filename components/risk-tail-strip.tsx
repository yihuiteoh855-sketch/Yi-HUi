'use client';

import * as React from 'react';
import { Clock3, Hourglass, ShieldAlert, TrendingDown } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { calculateBehavioralMetrics, DEMO_CONFIG } from '@/lib/quant-engine';
import { cn, formatRM } from '@/lib/utils';
import type { WhatIfResult } from '@/lib/domain';
import type { SpendCategory } from '@/lib/types';

export interface RiskTailStripProps {
  amount: number;
  category: SpendCategory;
  isNeed?: boolean;
  /** Pre-computed engine result (the interceptor modal already has one). */
  result?: WhatIfResult;
  /** `grid` = full telemetry tiles; `inline` = compact chip row for contract cards. */
  variant?: 'grid' | 'inline';
  className?: string;
}

/**
 * Phase 8 fintech telemetry strip.
 *
 * Surfaces the Basel III tail-risk metrics (ES95, mid-month NSF probability, pre-auth
 * latency) and the Laibson present-bias markup on ONE shared component so the payment
 * interceptor, the commitment-device cards and the mobile app never drift apart.
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
    nsfRisk >= 20 ? 'text-[#c0392b]' : nsfRisk > 0 ? 'text-[#b26a12]' : 'text-[#12805c]';

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5 text-[11px]', className)}>
        <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 font-semibold text-[#207ac4]">
          ES95 {formatRM(engine.es95)}
        </span>
        <span className={cn('rounded-full bg-[#f4f7fb] px-2 py-0.5 font-semibold', nsfTone)}>
          NSF dip {nsfRisk.toFixed(2)}%
        </span>
        <span className="rounded-full bg-[#f4f7fb] px-2 py-0.5 font-semibold text-[#5c6f87]">
          Pre-auth {engine.executionTimeMs.toFixed(2)} ms
        </span>
        <span className="rounded-full bg-[#fff2e8] px-2 py-0.5 font-semibold text-[#b2600f]">
          Present bias β={DEMO_CONFIG.presentBiasBeta.toFixed(2)} ·{' '}
          {behavioral.presentBiasInflationRatio.toFixed(2)}×
        </span>
        {behavioral.riskElasticRewardRM > behavioral.baseRewardRM ? (
          <span className="rounded-full bg-[#eafaf3] px-2 py-0.5 font-semibold text-[#12805c]">
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
      tone: 'text-[#207ac4]',
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
      tone: 'text-[#5c6f87]',
    },
    {
      icon: <Hourglass className="h-3.5 w-3.5" />,
      label: 'Present-bias markup',
      value: `${behavioral.presentBiasInflationRatio.toFixed(2)}× (β=${behavioral.presentBiasBeta.toFixed(2)})`,
      tone: 'text-[#b2600f]',
    },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-[#f4f7fb] px-3 py-2">
            <div className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', t.tone)}>
              {t.icon}
              {t.label}
            </div>
            <div className={cn('duo-num mt-1 text-sm font-bold', t.tone)}>{t.value}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Basel III expected shortfall (Artzner et al., 1999) · intra-month path-minimum barrier ·
        Laibson (1997) present bias with a risk-elastic reward of{' '}
        {formatRM(behavioral.baseRewardRM)} → {formatRM(behavioral.riskElasticRewardRM)}.
      </p>
    </div>
  );
}
