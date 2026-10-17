'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Ban,
  BatteryFull,
  Bot,
  CheckCircle2,
  ChevronRight,
  CupSoda,
  FileClock,
  Flame,
  GraduationCap,
  LayoutGrid,
  Lock,
  Radar,
  Receipt,
  ScrollText,
  ShieldCheck,
  Signal,
  Utensils,
  Wallet,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { auditLog } from '@/lib/audit-logger';
import { syncServerAudit } from '@/lib/audit-sync';
import {
  calculateAmortizedSubscriptions,
  calculateSubscriptionMetrics,
  DEMO_CONFIG,
  isNeedCategory,
  toStudentUnits,
  unpaidFixedBillTotal,
} from '@/lib/quant-engine';
import {
  FIXED_BILLS,
  HISTORICAL_DAILY_SPENDING,
  PROFILE,
  RECURRING_TRANSACTIONS,
  SUBSCRIPTIONS,
} from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { resolveSubscriptionByMerchant } from '@/lib/zombie-radar';
import { upcomingFixedBills } from '@/lib/ledger';
import { cn, formatRM } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CfarStressTester } from '@/components/cfar-stress-tester';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';
import { QuarantineCards } from '@/components/quarantine-cards';
import { RafSwap, useRafAlive } from '@/components/raf-swap';
import { StudentDowngradeDrawer } from '@/components/student-downgrade-drawer';
import { SubscriptionTimeline } from '@/components/subscription-timeline';
import { ZombieRadarPanel } from '@/components/zombie-radar-panel';
import type { PermissionTier } from '@/lib/permissions';
import type { SpendCategory } from '@/lib/types';
import type { SubscriptionId } from '@/lib/subscription-registry';

/**
 * Phase 9 mobile shell — consumer-grade "Warm Alabaster & Obsidian Ink" identity.
 *
 * Two navigation layers: a sticky bottom 5-tab bar (Wallet · Cash Map · Radar ·
 * Contracts · Guardrails) and a horizontal sliding sub-pill row inside every tab,
 * with a Framer Motion `layoutId` indicator so switching feels native. Every value
 * still comes from the deterministic engine and the sandbox store — this file is
 * presentation only.
 */

export type MobileTab = 'wallet' | 'cashmap' | 'radar' | 'contracts' | 'guardrails';

const TABS: Array<{ id: MobileTab; label: string; icon: React.ElementType }> = [
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'cashmap', label: 'Cash Map', icon: LayoutGrid },
  { id: 'radar', label: 'Radar', icon: Radar },
  { id: 'contracts', label: 'Contracts', icon: ScrollText },
  { id: 'guardrails', label: 'Guardrails', icon: ShieldCheck },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MobileAppShellProps {
  /**
   * Rendered inside the Guardrails → AI Copilot sub-view. The chat is mounted in
   * exactly ONE place per layout, so the parent passes it here only in mobile-focus mode.
   */
  copilot?: React.ReactNode;
  /** Which tab opens first (judges usually start on Wallet). */
  initialTab?: MobileTab;
  className?: string;
}

export function MobileAppShell({ copilot, initialTab = 'wallet', className }: MobileAppShellProps) {
  const [tab, setTab] = React.useState<MobileTab>(initialTab);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const rafAlive = useRafAlive();

  return (
    <div
      className={cn(
        'app-canvas relative mx-auto flex h-[min(840px,calc(100vh-6rem))] w-full max-w-[430px] flex-col overflow-hidden rounded-[42px] border-[8px] border-[#18181B] shadow-2xl',
        className,
      )}
    >
      <PhoneStatusBar clock={sandboxClock} />
      <CampusHeader />

      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-4">
        <RafSwap viewKey={tab} animate={rafAlive} className="space-y-4 pt-2">
          {tab === 'wallet' && <WalletTab animate={rafAlive} />}
          {tab === 'cashmap' && <CashMapTab animate={rafAlive} />}
          {tab === 'radar' && <RadarTab animate={rafAlive} />}
          {tab === 'contracts' && <ContractsTab animate={rafAlive} />}
          {tab === 'guardrails' && <GuardrailsTab copilot={copilot} animate={rafAlive} />}
        </RafSwap>
      </div>

      <TabBar tab={tab} onChange={setTab} animate={rafAlive} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shared hooks + navigation layers
 * ------------------------------------------------------------------ */

/** Sandbox daily allowance, recomputed whenever a ledger input changes. */
function useDailyAllowance(): number {
  const dynamicDailyAllowance = useCtrlPayStore((s) => s.dynamicDailyAllowance);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const eventsLength = useCtrlPayStore((s) => s.events.length);
  return React.useMemo(
    () => dynamicDailyAllowance(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dynamicDailyAllowance, sandboxClock, amortizeAnnualFees, currentBalance, defenseVault, eventsLength],
  );
}

function PhoneStatusBar({ clock }: { clock: number }) {
  const iso = new Date(clock).toISOString();
  return (
    <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-[#18181B]">
      <span className="tabular-nums">{iso.slice(11, 16)}</span>
      <span className="text-[9px] font-black tracking-[0.22em] text-zinc-400">CTRLPAY · SANDBOX</span>
      <span className="flex items-center gap-1.5">
        <span className="text-[9px] font-black text-zinc-500">5G</span>
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

/** Contextual campus header: wordmark, sandbox month, meals/day and vault pills. */
function CampusHeader() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const plan = useCtrlPayStore((s) => s.plan);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const allowance = useDailyAllowance();
  const meals = Math.max(0, Math.round(allowance / DEMO_CONFIG.studentUnits.campusMixedRice));
  const month = MONTHS[new Date(sandboxClock).getUTCMonth()];

  return (
    <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-2">
      <div className="min-w-0">
        <p className="text-[16px] font-black tracking-tight text-[#18181B]">
          Ctrl<span className="text-[#059669]">Pay</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
          <span className="truncate">USM Penang · {month} Sandbox</span>
          <span className={cn('cp-chip', plan === 'PRO' ? 'cp-chip-amber' : 'cp-chip-emerald')}>
            {plan === 'PRO' ? 'PRO' : 'FREE'}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="cp-chip cp-chip-amber">
          <Utensils className="h-3 w-3" /> {meals} meals/day
        </span>
        <span className="cp-chip cp-chip-emerald">
          <ShieldCheck className="h-3 w-3" /> {formatRM(defenseVault)}
        </span>
      </div>
    </header>
  );
}

/**
 * Layer 1 — sticky bottom tab bar. The active tab slides as an obsidian ink pill
 * behind the icon so switching feels native.
 */
function TabBar({
  tab,
  onChange,
  animate,
}: {
  tab: MobileTab;
  onChange: (t: MobileTab) => void;
  animate: boolean;
}) {
  return (
    <nav className="flex items-center justify-around border-t border-[#18181B]/[0.07] bg-white/90 px-2 pb-3 pt-2 backdrop-blur">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-label={`${t.label} tab`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 text-[9px] font-bold transition-colors',
              active ? 'text-white' : 'text-zinc-400',
            )}
          >
            {active &&
              (animate ? (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-2xl bg-[#18181B]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-2xl bg-[#18181B]" />
              ))}
            <span className="relative flex flex-col items-center gap-1">
              <Icon className="h-[18px] w-[18px]" />
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Layer 2 — horizontal sliding sub-pills inside a tab. The active pill is obsidian
 * ink with white text and a Framer Motion `layoutId` sliding indicator.
 */
function SubPills<T extends string>({
  options,
  value,
  onChange,
  idPrefix,
  animate,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  idPrefix: string;
  animate: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={`${idPrefix} views`}
      className="scroll-thin sticky top-0 z-[5] -mx-1 flex gap-1.5 overflow-x-auto bg-[#F7F6F2]/95 px-1 pb-1.5 pt-1 backdrop-blur"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'relative shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'border-transparent text-white'
                : 'border-[#18181B]/10 bg-white text-zinc-500 hover:text-[#18181B]',
            )}
          >
            {active &&
              (animate ? (
                <motion.span
                  layoutId={`subpill-${idPrefix}`}
                  className="absolute inset-0 rounded-full bg-[#18181B]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-full bg-[#18181B]" />
              ))}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Animates sub-view swaps: subtle y 6→0 + fade over 0.18s (rAF-aware). */
function SubView({
  viewKey,
  animate,
  children,
}: {
  viewKey: string;
  animate: boolean;
  children: React.ReactNode;
}) {
  return (
    <RafSwap viewKey={viewKey} animate={animate} className="space-y-4">
      {children}
    </RafSwap>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 1 — Wallet
 * ------------------------------------------------------------------ */

type WalletView = 'overview' | 'needs' | 'limits' | 'summary';

function WalletTab({ animate }: { animate: boolean }) {
  const [view, setView] = React.useState<WalletView>('overview');
  return (
    <>
      <SubPills
        idPrefix="wallet"
        animate={animate}
        value={view}
        onChange={setView}
        options={[
          { id: 'overview', label: 'Overview' },
          { id: 'needs', label: 'Needs vs Wants' },
          { id: 'limits', label: 'Dual Limits' },
          { id: 'summary', label: '12PM Summary' },
        ]}
      />
      <SubView viewKey={view} animate={animate}>
        {view === 'overview' && <WalletOverview />}
        {view === 'needs' && <NeedsWantsCard />}
        {view === 'limits' && <DualLimitsCard />}
        {view === 'summary' && <DailySummaryCard />}
      </SubView>
    </>
  );
}

function WalletOverview() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const allowance = useDailyAllowance();
  const units = React.useMemo(() => toStudentUnits(allowance), [allowance]);

  return (
    <>
      <section className="tactile-hero p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
              Available balance · {new Date(sandboxClock).toISOString().slice(0, 10)}
            </p>
            <p className="mt-1.5 text-[34px] font-black leading-none tabular-nums">
              {formatRM(currentBalance)}
            </p>
          </div>
          <span className="cp-chip bg-white/10 text-white/80">
            {PROFILE.fullName.split(' ')[1] ?? PROFILE.fullName} · {PROFILE.memberId}
          </span>
        </div>

        <Sparkline values={HISTORICAL_DAILY_SPENDING.slice(-14)} className="mt-4 h-8 w-full opacity-50" />

        <div className="mt-4 rounded-2xl bg-white/[0.07] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
            You can safely spend today
          </p>
          <p className="mt-1 text-[22px] font-black tabular-nums text-[#34D399]">{formatRM(allowance)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="cp-chip cp-chip-amber">
              <Utensils className="h-3 w-3" /> {units.mixedRiceMeals} USM mixed rice
            </span>
            <span className="cp-chip cp-chip-amber">
              <CupSoda className="h-3 w-3" /> {units.bubbleTea} bubble teas
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[0.07] px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">Defense Vault</p>
            <p className="mt-0.5 text-sm font-extrabold tabular-nums text-[#34D399]">{formatRM(defenseVault)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">Reward pool</p>
            <p className="mt-0.5 text-sm font-extrabold tabular-nums">{formatRM(rewardPool)}</p>
          </div>
        </div>
      </section>

      <p className="px-1 text-[10px] leading-snug text-zinc-400">
        Every figure is computed by the deterministic engine on the sandbox ledger — the agent never
        does the math.
      </p>
    </>
  );
}

function NeedsWantsCard() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const split = React.useMemo(() => {
    const categoryBySubscription = new Map<SubscriptionId, SpendCategory>();
    for (const txn of RECURRING_TRANSACTIONS) {
      const id = resolveSubscriptionByMerchant(txn.merchant);
      if (id) categoryBySubscription.set(id, txn.category);
    }
    const amortized = calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock });
    let needs = FIXED_BILLS.reduce((sum, b) => sum + b.amountRM, 0);
    let wants = 0;
    for (const view of amortized) {
      const category = categoryBySubscription.get(view.subscriptionId) ?? 'Bills_Utilities';
      if (isNeedCategory(category)) needs += view.monthlyBurden;
      else wants += view.monthlyBurden;
    }
    return { needs: Math.round(needs * 100) / 100, wants: Math.round(wants * 100) / 100 };
  }, [sandboxClock]);

  return (
    <section className="soft-card p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Committed outflows · needs vs wants</h3>
        <span className="text-[10px] font-semibold text-zinc-400">amortized / month</span>
      </header>
      <div className="mt-3 flex items-center gap-4">
        <NeedsWantsRing needs={split.needs} wants={split.wants} />
        <div className="flex-1 space-y-2 text-xs">
          <LegendRow
            color="#059669"
            label="Needs (bills, utilities)"
            value={split.needs}
            total={split.needs + split.wants}
          />
          <LegendRow
            color="#F59E0B"
            label="Wants (entertainment)"
            value={split.wants}
            total={split.needs + split.wants}
          />
          <p className="text-[10px] leading-snug text-zinc-400">
            Both sides are ledger facts — the sandbox bills on one side, the statement&apos;s own
            entertainment charges on the other.
          </p>
        </div>
      </div>
    </section>
  );
}

function DualLimitsCard() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const userLimits = useCtrlPayStore((s) => s.userLimits);
  const aiMandate = useCtrlPayStore((s) => s.aiMandate);
  const setAiMandate = useCtrlPayStore((s) => s.setAiMandate);

  const unmetBills = React.useMemo(
    () => unpaidFixedBillTotal(upcomingFixedBills(sandboxClock, SUBSCRIPTIONS, amortizeAnnualFees)),
    [sandboxClock, amortizeAnnualFees],
  );

  const weeklyPct = Math.min(100, (spentThisWeek / userLimits.weeklyPayLimit) * 100);
  const monthlyPct = Math.min(100, (spentThisMonth / userLimits.monthlyPayLimit) * 100);

  return (
    <section className="soft-card p-4">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-[#059669]" /> Dual limits & AI mandate
        </h3>
        <span className="text-[10px] font-semibold text-zinc-400">{formatRM(unmetBills)} bills unpaid</span>
      </header>

      <div className="mt-3 space-y-3">
        <LimitBar label="Weekly pay limit" spent={spentThisWeek} limit={userLimits.weeklyPayLimit} pct={weeklyPct} />
        <LimitBar label="Monthly pay limit" spent={spentThisMonth} limit={userLimits.monthlyPayLimit} pct={monthlyPct} />
      </div>

      <div className="mt-4 rounded-2xl bg-[#F7F6F2] p-3">
        <p className="flex items-center gap-2 text-xs font-bold">
          <ShieldCheck className="h-4 w-4 text-[#059669]" /> AI mandate ceiling
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-zinc-500">Max auto-lock amount</span>
              <span className="font-bold tabular-nums text-[#18181B]">{formatRM(aiMandate.maxLockAmountRM)}</span>
            </div>
            <Slider
              value={aiMandate.maxLockAmountRM}
              min={10}
              max={1000}
              step={10}
              onValueChange={(v) => setAiMandate({ maxLockAmountRM: v })}
              aria-label="AI mandate max lock amount"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-zinc-500">Max auto-lock duration</span>
              <span className="font-bold tabular-nums text-[#18181B]">{aiMandate.maxLockDurationDays} days</span>
            </div>
            <Slider
              value={aiMandate.maxLockDurationDays}
              min={1}
              max={30}
              step={1}
              onValueChange={(v) => setAiMandate({ maxLockDurationDays: v })}
              aria-label="AI mandate max lock duration"
            />
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-zinc-400">
          The agent can never lock more than this without your explicit click (T3). Clamped to RM
          10–1,000 · 1–30 days.
        </p>
      </div>
    </section>
  );
}

function DailySummaryCard() {
  const userId = useCtrlPayStore((s) => s.userId);
  const events = useCtrlPayStore((s) => s.events);
  const latestSummary = React.useMemo(
    () => [...events].reverse().find((e) => e.type === 'DAILY_SUMMARY'),
    [events],
  );

  return (
    <section className="soft-card p-4">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Receipt className="h-4 w-4 text-[#059669]" /> 12:00 PM daily spending summary
        </h3>
        <span className="text-[10px] font-semibold text-zinc-400">{userId}</span>
      </header>
      {latestSummary ? (
        <DailySummaryBody payload={latestSummary.payload} at={latestSummary.at} />
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FEF3C7] px-3 py-2 text-[11px] text-[#92400E]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No summary yet. The agent posts one each noon the sandbox clock crosses — press{' '}
            <strong>+24h</strong> in the judge dock to trigger it.
          </span>
        </div>
      )}
    </section>
  );
}

function DailySummaryBody({ payload, at }: { payload: Record<string, unknown>; at: number }) {
  const spentToday = Number(payload.spentToday ?? 0);
  const allowance = Number(payload.allowance ?? 0);
  const units = (payload.units ?? { mixedRiceMeals: 0, bubbleTea: 0 }) as {
    mixedRiceMeals: number;
    bubbleTea: number;
  };
  const over = spentToday > allowance;
  return (
    <div
      className={cn(
        'mt-3 rounded-2xl px-3 py-2 text-[11px]',
        over ? 'bg-[#FFE4E6] text-[#9F1239]' : 'bg-[#ECFDF5] text-[#065F46]',
      )}
    >
      <p className="tabular-nums">
        <strong>{formatRM(spentToday)}</strong> spent today · allowance {formatRM(allowance)} ·{' '}
        {units.mixedRiceMeals} mixed-rice meals / {units.bubbleTea} bubble tea
      </p>
      <p className="mt-1 text-[10px] opacity-70">
        {new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC
      </p>
    </div>
  );
}

function LimitBar({ label, spent, limit, pct }: { label: string; spent: number; limit: number; pct: number }) {
  const breach = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-zinc-500">{label}</span>
        <span className={cn('font-bold tabular-nums', breach ? 'text-[#E11D48]' : 'text-[#18181B]')}>
          {formatRM(spent)} / {formatRM(limit)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#18181B]/[0.07]">
        <div
          className={cn('h-full rounded-full', breach ? 'bg-[#E11D48]' : 'bg-[#10B981]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[11px] text-zinc-500">{label}</span>
      </span>
      <span className="text-[11px] font-bold tabular-nums">
        {formatRM(value)} · {pct}%
      </span>
    </div>
  );
}

function NeedsWantsRing({ needs, wants }: { needs: number; wants: number }) {
  const total = needs + wants;
  const needsShare = total > 0 ? needs / total : 0;
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#18181B" strokeOpacity="0.08" strokeWidth="13" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${needsShare * c} ${c}`}
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${(1 - needsShare) * c} ${c}`}
          strokeDashoffset={-needsShare * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold tabular-nums">{Math.round(needsShare * 100)}%</span>
        <span className="text-[9px] font-semibold uppercase text-zinc-400">needs</span>
      </div>
    </div>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="#10B981"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 2 — Cash Map
 * ------------------------------------------------------------------ */

type CashView = 'grid' | 'sinking' | 'whatif';

function CashMapTab({ animate }: { animate: boolean }) {
  const [view, setView] = React.useState<CashView>('grid');
  return (
    <>
      <SubPills
        idPrefix="cashmap"
        animate={animate}
        value={view}
        onChange={setView}
        options={[
          { id: 'grid', label: '30-Day Grid' },
          { id: 'sinking', label: 'Sinking Fund' },
          { id: 'whatif', label: 'What-If Slider' },
        ]}
      />
      <SubView viewKey={view} animate={animate}>
        {view === 'grid' && <SubscriptionTimeline view="grid" />}
        {view === 'sinking' && <SubscriptionTimeline view="sinking" />}
        {view === 'whatif' && <CfarStressTester />}
      </SubView>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 3 — Zombie Radar & Student Deals
 * ------------------------------------------------------------------ */

type RadarView = 'active' | 'deals' | 'zombies' | 'roast';

function RadarTab({ animate }: { animate: boolean }) {
  const [view, setView] = React.useState<RadarView>('active');
  return (
    <>
      <SubPills
        idPrefix="radar"
        animate={animate}
        value={view}
        onChange={setView}
        options={[
          { id: 'active', label: `All Active (${SUBSCRIPTIONS.length})` },
          { id: 'deals', label: 'Student Deals' },
          { id: 'zombies', label: 'Zombies' },
          { id: 'roast', label: 'Month Roast' },
        ]}
      />
      <SubView viewKey={view} animate={animate}>
        {view === 'active' && <ActiveSubscriptionsCard />}
        {view === 'deals' && <StudentDealsCard />}
        {view === 'zombies' && <ZombiesView />}
        {view === 'roast' && <RoastView />}
      </SubView>
    </>
  );
}

function ActiveSubscriptionsCard() {
  return (
    <section className="soft-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Radar className="h-4 w-4 text-[#059669]" /> Active subscriptions
      </h3>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">
        All {SUBSCRIPTIONS.length} recurring charges on the sandbox ledger, straight from the mock
        bank statement.
      </p>
      <div className="mt-3 space-y-2">
        {SUBSCRIPTIONS.map((s) => {
          const entry = SUBSCRIPTION_REGISTRY[s.subscriptionId];
          return (
            <div
              key={s.subscriptionId}
              className="flex items-center justify-between gap-2 rounded-2xl border border-[#18181B]/10 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{entry.merchantName}</p>
                <p className="text-[10px] text-zinc-500">
                  {s.billingCycle.toLowerCase()} · next {s.nextBillingDate}
                </p>
              </div>
              <span className="shrink-0 text-xs font-extrabold tabular-nums">{formatRM(s.amountRM)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudentDealsCard() {
  const [drawerFor, setDrawerFor] = React.useState<string | null>(null);
  const candidates = SUBSCRIPTIONS.filter((s) => {
    const entry = SUBSCRIPTION_REGISTRY[s.subscriptionId];
    return entry.studentPriceRM !== null && entry.studentPriceRM < entry.fullPriceRM;
  });

  return (
    <>
      <section className="soft-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <GraduationCap className="h-4 w-4 text-[#059669]" /> Student deals found
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          These merchants officially publish a student rate. CtrlPay opens their own page — we never
          ask for your password, and the deep link comes from our reviewed registry.
        </p>
      </section>

      {candidates.map((s) => {
        const entry = SUBSCRIPTION_REGISTRY[s.subscriptionId];
        const metrics = calculateSubscriptionMetrics({
          fullPriceRM: entry.fullPriceRM,
          studentPriceRM: entry.studentPriceRM,
        });
        return (
          <section key={s.subscriptionId} className="soft-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{entry.merchantName}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {formatRM(entry.fullPriceRM)} → student{' '}
                  {entry.studentPriceRM !== null ? formatRM(entry.studentPriceRM) : 'n/a'}
                </p>
              </div>
              {metrics.studentAnnualSavings !== null && (
                <span className="cp-chip cp-chip-emerald">
                  Save {formatRM(metrics.studentAnnualSavings)}/yr
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDrawerFor(s.subscriptionId)}
              className="tactile-btn-primary mt-3 w-full px-3 py-2 text-xs"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Switch to Student Plan
            </button>
          </section>
        );
      })}

      {candidates.length === 0 && (
        <p className="px-1 text-[11px] text-zinc-500">
          No student-plan discounts are flagged on the current ledger.
        </p>
      )}

      {drawerFor && (
        <StudentDowngradeDrawer subscriptionId={drawerFor} open onClose={() => setDrawerFor(null)} />
      )}
    </>
  );
}

function ZombiesView() {
  const gmailConsent = useCtrlPayStore((s) => s.gmailConsent);
  const setGmailConsent = useCtrlPayStore((s) => s.setGmailConsent);

  return (
    <>
      <section className="soft-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Lock className="h-4 w-4" /> Read-only Gmail receipts
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              <strong className="text-[#18181B]">Structured fields only · No email bodies stored · Revocable anytime.</strong>{' '}
              The detector reads merchant, amount and billing date; receipt text is redacted on the
              device before anything leaves it.
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className={cn('cp-chip', gmailConsent ? 'cp-chip-emerald' : 'cp-chip-amber')}>
                {gmailConsent ? 'Consent granted' : 'Consent not granted'}
              </span>
              audit entry <span className="font-mono">SET_GMAIL_CONSENT</span>
            </p>
          </div>
          <Switch
            checked={gmailConsent}
            onCheckedChange={(v) => setGmailConsent(v)}
            aria-label="Gmail receipt consent"
          />
        </div>
      </section>

      <ZombieRadarPanel />
    </>
  );
}

function RoastView() {
  const roastTone = useCtrlPayStore((s) => s.roastTone);
  const setRoastTone = useCtrlPayStore((s) => s.setRoastTone);
  const zombieTags = useCtrlPayStore((s) => s.zombieTags);
  const events = useCtrlPayStore((s) => s.events);

  const roastEvent = React.useMemo(
    () => [...events].reverse().find((e) => e.type === 'MONTH_END_ROAST'),
    [events],
  );

  const preview = React.useMemo(() => {
    const wasted = SUBSCRIPTIONS.filter(
      (s) => zombieTags[s.subscriptionId] === 'ZOMBIE' || zombieTags[s.subscriptionId] === 'SUSPECTED_ZOMBIE',
    ).reduce((sum, s) => sum + s.amountRM, 0);
    const monthly = Math.round(wasted * 100) / 100;
    const annual = Math.round(monthly * 12 * 100) / 100;
    return { monthly, annual, units: toStudentUnits(monthly) };
  }, [zombieTags]);

  const payload = roastEvent?.payload;
  const wastedMonthly = payload ? Number(payload.wastedMonthly) : preview.monthly;
  const wastedAnnual = payload ? Number(payload.wastedAnnual) : preview.annual;
  const units = (payload?.units ?? preview.units) as { mixedRiceMeals: number; bubbleTea: number };
  const isPreview = !payload;

  return (
    <section className="soft-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Flame className="h-4 w-4 text-[#F59E0B]" /> Month-end subscription roast
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {isPreview
              ? 'Preview — the same formula the agent uses at month end.'
              : `Posted ${new Date(roastEvent?.at ?? 0).toISOString().slice(0, 10)}`}
          </p>
        </div>
        <div className="flex gap-1">
          {(['GENTLE', 'SPICY'] as const).map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => setRoastTone(tone)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors',
                roastTone === tone ? 'bg-[#18181B] text-white' : 'border border-[#18181B]/10 bg-white text-zinc-500',
              )}
            >
              {tone}
            </button>
          ))}
        </div>
      </header>

      <p className="mt-3 text-[13px] font-semibold leading-snug">
        {roastTone === 'GENTLE'
          ? `You are paying ${formatRM(wastedMonthly)}/month (${formatRM(wastedAnnual)}/year) for subscriptions you barely use — about ${units.mixedRiceMeals} USM mixed-rice meals a month.`
          : `RM ${wastedMonthly.toFixed(2)}/month (RM ${wastedAnnual.toFixed(2)}/year) quietly funding streaming shareholders — that is ${units.bubbleTea} bubble teas you will never sip. Cancel one and the roast stops.`}
      </p>
      <p className="mt-2 text-[10px] text-zinc-400">
        Wasted = recurring charges tagged ZOMBIE or SUSPECTED_ZOMBIE by the radar.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 4 — Contracts
 * ------------------------------------------------------------------ */

type ContractsView = 'quarantine' | 'escrow' | 'sweeps' | 'bookkeep';

function ContractsTab({ animate }: { animate: boolean }) {
  const [view, setView] = React.useState<ContractsView>('quarantine');
  return (
    <>
      <SubPills
        idPrefix="contracts"
        animate={animate}
        value={view}
        onChange={setView}
        options={[
          { id: 'quarantine', label: 'Quarantine 24h' },
          { id: 'escrow', label: 'Escrow Locks' },
          { id: 'sweeps', label: 'Pending Sweeps' },
          { id: 'bookkeep', label: '+ Bookkeep' },
        ]}
      />
      <SubView viewKey={view} animate={animate}>
        {view === 'quarantine' && <QuarantineCards filter="QUARANTINE" />}
        {view === 'escrow' && <QuarantineCards filter="ESCROW" />}
        {view === 'sweeps' && <QuarantineCards filter="SWEEP" />}
        {view === 'bookkeep' && (
          <>
            <section className="soft-card p-4">
              <p className="flex items-start gap-2 text-[11px] leading-snug text-zinc-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                <span>
                  <strong className="text-[#18181B]">Privacy first.</strong> Receipt images and voice
                  memos are redacted on-device (IC numbers, phone numbers, account strings) before the
                  structured fields are sent. Raw images and audio never leave the browser.
                </span>
              </p>
            </section>
            <MultimodalBookkeeping />
          </>
        )}
      </SubView>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 5 — Guardrails (Copilot · Safety Presets · Audit Trail)
 * ------------------------------------------------------------------ */

type GuardrailsView = 'copilot' | 'presets' | 'audit';

const TIER_NOTES: Record<PermissionTier, string> = {
  T0: 'Read & simulate',
  T1: 'Tag, book, categorise',
  T2: 'Draft cancellations',
  T3: 'Money movement — per-action click only',
};

function GuardrailsTab({ copilot, animate }: { copilot?: React.ReactNode; animate: boolean }) {
  const [view, setView] = React.useState<GuardrailsView>('copilot');
  return (
    <>
      <SubPills
        idPrefix="guardrails"
        animate={animate}
        value={view}
        onChange={setView}
        options={[
          { id: 'copilot', label: 'AI Copilot' },
          { id: 'presets', label: 'Safety Presets' },
          { id: 'audit', label: 'Audit Trail' },
        ]}
      />
      <SubView viewKey={view} animate={animate}>
        {view === 'copilot' && (copilot ?? <CopilotHintCard />)}
        {view === 'presets' && <SafetyPresetsView />}
        {view === 'audit' && <AuditTrailView />}
      </SubView>
    </>
  );
}

function CopilotHintCard() {
  return (
    <section className="soft-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Bot className="h-4 w-4 text-[#059669]" /> AI Copilot
      </h3>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">
        The copilot chat is mounted in the judge-studio panel in this layout — switch to{' '}
        <strong className="text-[#18181B]">Full App Focus</strong> to chat inside the phone. It only
        ever restates numbers the engine computed and every tool call is written to the audit chain.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
        <li className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" /> &ldquo;What if I buy the RM 180 Shopee bag?&rdquo;
        </li>
        <li className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" /> &ldquo;Find subscription zombies and draft the
          cancellation.&rdquo;
        </li>
        <li className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" /> &ldquo;Roast my wasted subscriptions.&rdquo;
        </li>
      </ul>
    </section>
  );
}

const SAFETY_PRESETS: Array<{
  id: 'observer' | 'campus' | 'exam';
  name: string;
  tag?: string;
  desc: string;
  master: boolean;
  t1: boolean;
  t2: boolean;
}> = [
  {
    id: 'observer',
    name: 'Observer Mode',
    tag: 'Default',
    desc: 'T0 read-only insights. Zero popups, zero auto-actions — the agent only watches and explains.',
    master: false,
    t1: false,
    t2: false,
  },
  {
    id: 'campus',
    name: 'Campus Copilot',
    tag: 'Recommended',
    desc: 'Master ON · T1 + T2 active. The agent tags, books and drafts — money movement still needs your click.',
    master: true,
    t1: true,
    t2: true,
  },
  {
    id: 'exam',
    name: 'Exam-Month Lockdown',
    desc: 'Master ON · T1 only. Drafting pauses while you study; the agent flags everything for review instead.',
    master: true,
    t1: true,
    t2: false,
  },
];

function SafetyPresetsView() {
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const setTier = useCtrlPayStore((s) => s.setTier);

  const activeId =
    SAFETY_PRESETS.find(
      (p) => p.master === masterAutonomyEnabled && p.t1 === enabledTiers.T1 && p.t2 === enabledTiers.T2,
    )?.id ?? null;

  return (
    <>
      <section className="soft-card p-4">
        <h3 className="text-sm font-bold">1-tap safety presets</h3>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          No configuration fatigue — pick the mode that matches your week, then fine-tune below.
        </p>
        <div className="mt-3 space-y-2">
          {SAFETY_PRESETS.map((p) => {
            const active = activeId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setMasterAutonomy(p.master);
                  setTier('T1', p.t1);
                  setTier('T2', p.t2);
                }}
                className={cn(
                  'w-full rounded-2xl border p-3 text-left transition-colors',
                  active ? 'border-[#18181B] bg-[#F7F6F2] shadow-[0_2px_0_#18181B]' : 'border-[#18181B]/10 bg-white',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{p.name}</span>
                  <span className="flex items-center gap-1">
                    {p.tag && <span className="cp-chip cp-chip-emerald">{p.tag}</span>}
                    {active && <span className="cp-chip cp-chip-ink">Active</span>}
                  </span>
                </span>
                <span className="mt-1 block text-[10px] leading-snug text-zinc-500">{p.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="soft-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 text-[#059669]" /> Autonomy & permission tiers
        </h3>
        <div className="mt-3 space-y-2">
          <ToggleRow
            label="Master autonomy"
            hint="Agent may act on T0–T2 without asking"
            checked={masterAutonomyEnabled}
            onChange={setMasterAutonomy}
          />
          {(['T1', 'T2', 'T3'] as PermissionTier[]).map((tier) => (
            <ToggleRow
              key={tier}
              label={`Tier ${tier} — ${TIER_NOTES[tier]}`}
              hint={tier === 'T3' ? 'Locked: never auto-executes, by design' : undefined}
              checked={tier === 'T3' ? false : enabledTiers[tier]}
              disabled={tier === 'T3'}
              onChange={(v) => setTier(tier, v)}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-zinc-400">
          Tier T3 (money movement) can never be switched on for autonomous use: every T3 action
          requires your explicit per-action click and a signed proposal.
        </p>
      </section>

      <StudentPlanCard />
    </>
  );
}

function StudentPlanCard() {
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);
  return (
    <section className="soft-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <GraduationCap className="h-4 w-4 text-[#059669]" /> Student plan
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {plan === 'PRO' ? 'Student Pro · RM 49/year' : 'Free tier · RM 0'} — every safety feature
            stays on the free tier. Pro is cosmetic (roast personas, themes).
          </p>
        </div>
        <Switch
          checked={plan === 'PRO'}
          onCheckedChange={(v) => setPlan(v ? 'PRO' : 'FREE')}
          aria-label="Toggle Student Pro"
        />
      </header>
    </section>
  );
}

function AuditTrailView() {
  const userId = useCtrlPayStore((s) => s.userId);
  const events = useCtrlPayStore((s) => s.events);
  const [entries, setEntries] = React.useState<ReturnType<typeof auditLog.list>>([]);
  const [chainOk, setChainOk] = React.useState(true);

  const pull = React.useCallback(async () => {
    await syncServerAudit();
    setEntries(auditLog.list(userId).slice(-4).reverse());
    setChainOk(auditLog.verifyChain(userId));
  }, [userId]);

  React.useEffect(() => {
    void pull();
  }, [pull, events]);

  return (
    <section className="soft-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <FileClock className="h-4 w-4" /> Immutable audit log
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Append-only, hash-chained. Field names only — never raw PII values.
          </p>
        </div>
        <span
          className={cn(
            'flex items-center gap-1',
            chainOk ? 'cp-chip cp-chip-emerald' : 'cp-chip cp-chip-rose',
          )}
        >
          {chainOk ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {chainOk ? 'Chain verified' : 'Chain broken'}
        </span>
      </header>

      <div className="mt-3 space-y-2">
        {entries.map((e) => (
          <div key={e.logId} className="rounded-2xl bg-[#F7F6F2] px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="cp-chip cp-chip-ink">{e.permissionTier}</span>
              <span className="font-semibold">{e.actionType}</span>
              <span className="ml-auto font-mono text-[9px] text-zinc-400">
                {new Date(e.timestamp).toISOString().slice(11, 19)}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[9px] text-zinc-400">hash {e.entryHash}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-[11px] text-zinc-500">No entries yet — interact with the sandbox.</p>
        )}
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold">{label}</p>
        {hint && <p className="text-[10px] text-zinc-400">{hint}</p>}
      </div>
      {disabled ? (
        <span className="cp-chip cp-chip-zinc">
          <Ban className="h-3 w-3" /> locked
        </span>
      ) : (
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      )}
    </div>
  );
}
