'use client';

import * as React from 'react';
import { ArrowUpRight, BarChart2, Bell, CircleDot, TrendingUp, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ArcRing, type ArcCapsule, type ArcSegment } from '@/components/arc-ring';
import { FolderTabCard } from '@/components/folder-tab-card';
import { SteppedLogo, UnequalMenuIcon } from '@/components/ui/design-icons';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTIONS } from '@/lib/mock-data';
import { calculateAmortizedSubscriptions } from '@/lib/quant-engine';

export function SubscriptionTab({
  onOpenSheet,
  onVerifyStudent,
}: {
  onOpenSheet: (s: 'notifications' | 'sandbox' | 'audit' | 'expense') => void;
  onVerifyStudent?: () => void;
}) {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const [activeCapsule, setActiveCapsule] = React.useState<string>('invested');
  const [viewMode, setViewMode] = React.useState<'concept' | 'subscriptions'>('concept');

  const monthly = React.useMemo(
    () => calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock }),
    [sandboxClock],
  );

  const totalMonthly = React.useMemo(
    () => monthly.reduce((sum, v) => sum + v.monthlyBurden, 0),
    [monthly],
  );

  const capsules: ArcCapsule[] = [
    { id: 'invested', icon: BarChart2, label: 'Column metrics' },
    { id: 'trend', icon: TrendingUp, label: 'Trend line' },
    { id: 'circle', icon: CircleDot, label: 'Distribution' },
  ];

  const segments: ArcSegment[] = [
    { id: 'invested', value: 210, color: '#0B1E3F', textColor: '#EBF4FF' },
    { id: 'profit', value: 120, color: '#93C5FD', textColor: '#0B1E3F' },
    { id: 'buffer', value: 45, color: '#DBEAFE', textColor: '#0B1E3F', outline: true },
  ];

  return (
    <div className="animate-fade-in -mx-1 pb-6 space-y-3">
      {/* 1. Header matching Image 2 right screen: Stepped Logo + Nexora on left, Bell & Menu on right */}
      <header className="flex items-center justify-between pt-1 px-1">
        <div className="flex items-center gap-2.5">
          <SteppedLogo className="h-5 w-7 text-[#0B1E3F]" />
          <h1 className="text-[21px] font-black tracking-tight text-[#0B1E3F]">Nexora</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'concept' ? 'subscriptions' : 'concept'))}
            className="rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-bold text-[#0B1E3F] border border-white/80 shadow-xs hover:bg-white"
            title="Toggle between Image 2 showcase and live subscriptions"
          >
            {viewMode === 'concept' ? 'Showcase' : 'Subscriptions'}
          </button>

          {/* Bell Icon Button */}
          <button
            type="button"
            onClick={() => onOpenSheet('notifications')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white transition-all active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Unequal Menu Icon Button */}
          <button
            type="button"
            onClick={() => onOpenSheet('sandbox')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white transition-all active:scale-95"
            aria-label="Menu"
          >
            <UnequalMenuIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Donut Arc Progress Meter matching Image 2 right screen 1:1 */}
      <div className="relative pt-1">
        <ArcRing
          segments={segments}
          arcLabels={
            viewMode === 'concept'
              ? ['Invested', 'Profit', '$66k']
              : ['Active', 'Saved', 'Buffer']
          }
          arcAmounts={
            viewMode === 'concept'
              ? ['$120k', '', '']
              : [`$${Math.round(totalMonthly)}`, '', '']
          }
          center={viewMode === 'concept' ? '$186k' : `$${Math.round(totalMonthly)}`}
          centerKicker={viewMode === 'concept' ? undefined : 'Monthly Burn'}
          capsules={capsules}
          activeCapsule={activeCapsule}
          onCapsule={setActiveCapsule}
        />
      </div>

      {/* 3. Folder-Tab Cutout Cards matching Image 2 right screen 1:1 */}
      <div className="space-y-3 pt-1">
        {viewMode === 'concept' ? (
          <>
            {/* Card 1: Coinbase Global (COIN) matching image */}
            <FolderTabCard
              tone="sky"
              tab="Invested"
              metaTime="16:00"
              metaDate="01-06-2026"
              title="Coinbase Global (COIN)"
              pills={
                <>
                  <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                    <ArrowUpRight className="h-3 w-3" /> +4.73%
                  </span>
                  <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F]">
                    +$1,286 - Today
                  </span>
                </>
              }
              footerLeft="Total Invested : $96k"
              footerRight="Profit : $16k"
            />

            {/* Card 2: MicroStrategy (MSTR) matching image */}
            <FolderTabCard
              tone="sky"
              tab="Withdraw"
              metaTime="08:42"
              metaDate="02-06-2026"
              title="MicroStrategy (MSTR)"
              pills={
                <>
                  <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                    <ArrowUpRight className="h-3 w-3" /> +2.12%
                  </span>
                  <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F]">
                    +$942.65 - Today
                  </span>
                </>
              }
              footerLeft="Total Invested : $18,632"
              footerRight="Profit : +$942.65"
            />
          </>
        ) : (
          <>
            {/* Live Subscriptions: Disney+ Hotstar */}
            <FolderTabCard
              tone="sky"
              tab="Suspected Zombie"
              metaTime="30d idle"
              metaDate="15-10-2026"
              title="Disney+ Hotstar (MYR)"
              pills={
                <>
                  <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                    <ArrowUpRight className="h-3 w-3" /> 1.43× impulse
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenSheet('sandbox')}
                    className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F] hover:bg-white/50"
                  >
                    Flag Zombie →
                  </button>
                </>
              }
              footerLeft="Monthly burn : $39.90"
              footerRight="Recoverable : +$39.90"
            />

            {/* Live Subscriptions: Spotify Student Arbitrage */}
            <FolderTabCard
              tone="sky"
              tab={studentVerified ? 'Student Arbitrage · Verified' : 'Student Arbitrage'}
              metaTime="24h lock"
              metaDate="02-06-2026"
              title="Spotify Premium (Student Plan)"
              pills={
                <>
                  <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                    <ArrowUpRight className="h-3 w-3" /> Save $7.40/mo
                  </span>
                  <button
                    type="button"
                    onClick={onVerifyStudent}
                    className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F] hover:bg-white/50"
                  >
                    Verify &amp; Save →
                  </button>
                </>
              }
              footerLeft="Full price : $15.90"
              footerRight="Student : $8.50"
            />
          </>
        )}
      </div>
    </div>
  );
}
