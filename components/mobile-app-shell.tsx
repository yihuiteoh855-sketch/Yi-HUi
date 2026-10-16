'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Ban,
  BatteryFull,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CupSoda,
  FileClock,
  Flame,
  GraduationCap,
  Home as HomeIcon,
  Lock,
  Radar,
  Receipt,
  ScanLine,
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
import { resolveSubscriptionByMerchant } from '@/lib/zombie-radar';
import { upcomingFixedBills } from '@/lib/ledger';
import { cn, formatRM } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CfarStressTester } from '@/components/cfar-stress-tester';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';
import { QuarantineCards } from '@/components/quarantine-cards';
import { SubscriptionTimeline } from '@/components/subscription-timeline';
import { ZombieRadarPanel } from '@/components/zombie-radar-panel';
import type { PermissionTier } from '@/lib/permissions';
import type { SpendCategory } from '@/lib/types';
import type { SubscriptionId } from '@/lib/subscription-registry';

export type MobileTab = 'home' | 'timeline' | 'radar' | 'bookkeep' | 'copilot';

const TABS: Array<{ id: MobileTab; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'radar', label: 'Radar', icon: Radar },
  { id: 'bookkeep', label: 'Bookkeep', icon: ScanLine },
  { id: 'copilot', label: 'Copilot', icon: Bot },
];

export interface MobileAppShellProps {
  /**
   * Rendered inside the "Copilot & Security" tab. The chat is mounted in exactly ONE
   * place per layout, so the parent passes it here only in mobile-focus mode.
   */
  copilot?: React.ReactNode;
  /** Which tab opens first (judges usually start on Home). */
  initialTab?: MobileTab;
  className?: string;
}

/**
 * CtrlPay mobile shell — the visual language of the captain's original e-wallet
 * prototype (docs/legacy/duoMoney_Plus_v36.html), rebuilt on CtrlPay's data model:
 * the same phone frame, gradients, typography, budget bars and 5-tab bottom nav,
 * but every figure comes from the deterministic engine and the sandbox store.
 */
export function MobileAppShell({ copilot, initialTab = 'home', className }: MobileAppShellProps) {
  const [tab, setTab] = React.useState<MobileTab>(initialTab);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);

  return (
    <div
      className={cn(
        'duo-phone mx-auto flex h-[min(860px,calc(100vh-7.5rem))] w-full max-w-[430px] flex-col overflow-hidden rounded-[40px] border border-[#c8ddf0]',
        className,
      )}
    >
      <StatusBar clock={sandboxClock} />

      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-4 pt-1"
          >
            {tab === 'home' && <HomeTab />}
            {tab === 'timeline' && <TimelineTab />}
            {tab === 'radar' && <RadarTab />}
            {tab === 'bookkeep' && <BookkeepTab />}
            {tab === 'copilot' && <CopilotTab copilot={copilot} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="duo-muted flex items-center justify-around border-t border-[#dbeaff] bg-white/80 px-2 pb-3 pt-2 backdrop-blur">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-label={`${t.label} tab`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-semibold transition-colors',
                active ? 'text-[#1684e9]' : 'text-[#7c91aa]',
              )}
            >
              {active && (
                <motion.span
                  layoutId="duo-nav-pill"
                  className="absolute inset-0 -z-10 rounded-2xl bg-[#e7f3ff]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="h-[18px] w-[18px]" />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status bar + header
 * ------------------------------------------------------------------ */

function StatusBar({ clock }: { clock: number }) {
  const iso = new Date(clock).toISOString();
  const plan = useCtrlPayStore((s) => s.plan);
  return (
    <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold">
      <span className="duo-num">{iso.slice(11, 16)}</span>
      <span className="duo-muted tracking-wide">CtrlPay · SANDBOX</span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'rounded-full px-2 py-[1px] text-[9px] font-bold',
            plan === 'PRO' ? 'bg-[#fff1d6] text-[#a1611a]' : 'bg-[#e7f3ff] text-[#207ac4]',
          )}
        >
          {plan === 'PRO' ? 'PRO' : 'FREE'}
        </span>
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 1 — Home
 * ------------------------------------------------------------------ */

function HomeTab() {
  const userId = useCtrlPayStore((s) => s.userId);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const dynamicDailyAllowance = useCtrlPayStore((s) => s.dynamicDailyAllowance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const userLimits = useCtrlPayStore((s) => s.userLimits);
  const aiMandate = useCtrlPayStore((s) => s.aiMandate);
  const setAiMandate = useCtrlPayStore((s) => s.setAiMandate);
  const events = useCtrlPayStore((s) => s.events);

  const allowance = React.useMemo(
    () => dynamicDailyAllowance(),
    // Recompute whenever any ledger input that feeds the allowance changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dynamicDailyAllowance, sandboxClock, amortizeAnnualFees, currentBalance, defenseVault, events.length],
  );
  const units = React.useMemo(() => toStudentUnits(allowance), [allowance]);

  // Committed monthly outflows (amortized) split by the statement's own category:
  // NEEDS = bills/utilities-style charges, WANTS = entertainment-style charges.
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

  const latestSummary = React.useMemo(
    () => [...events].reverse().find((e) => e.type === 'DAILY_SUMMARY'),
    [events],
  );
  const unmetBills = React.useMemo(
    () => unpaidFixedBillTotal(upcomingFixedBills(sandboxClock, SUBSCRIPTIONS, amortizeAnnualFees)),
    [sandboxClock, amortizeAnnualFees],
  );

  const weeklyPct = Math.min(100, (spentThisWeek / userLimits.weeklyPayLimit) * 100);
  const monthlyPct = Math.min(100, (spentThisMonth / userLimits.monthlyPayLimit) * 100);

  return (
    <>
      <section className="duo-hero">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
              Available balance · {new Date(sandboxClock).toISOString().slice(0, 10)}
            </p>
            <p className="duo-num mt-1 text-[30px] font-extrabold leading-none">
              {formatRM(currentBalance)}
            </p>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
            {PROFILE.fullName.split(' ')[1] ?? PROFILE.fullName} · {PROFILE.memberId}
          </span>
        </div>

        <Sparkline values={HISTORICAL_DAILY_SPENDING.slice(-14)} className="mt-3 h-8 w-full opacity-80" />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
              Safe to spend today
            </p>
            <p className="duo-num mt-0.5 text-lg font-extrabold">{formatRM(allowance)}</p>
            <p className="duo-num mt-0.5 flex items-center gap-1 text-[10px] text-white/85">
              <Utensils className="h-3 w-3" /> {units.mixedRiceMeals} × RM{' '}
              {DEMO_CONFIG.studentUnits.campusMixedRice.toFixed(2)}
              <CupSoda className="ml-1 h-3 w-3" /> {units.bubbleTea} × RM{' '}
              {DEMO_CONFIG.studentUnits.bubbleTea.toFixed(2)}
            </p>
          </div>
          <div className="grid grid-rows-2 gap-2">
            <div className="flex items-center justify-between rounded-2xl bg-white/15 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
                Vault
              </span>
              <span className="duo-num text-xs font-bold">{formatRM(defenseVault)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/15 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
                Reward pool
              </span>
              <span className="duo-num text-xs font-bold">{formatRM(rewardPool)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="duo-card">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Committed outflows · needs vs wants</h3>
          <span className="duo-muted text-[10px]">amortized / month</span>
        </header>
        <div className="mt-3 flex items-center gap-4">
          <NeedsWantsRing needs={split.needs} wants={split.wants} />
          <div className="flex-1 space-y-2 text-xs">
            <LegendRow color="#1684e9" label="Needs (bills, utilities)" value={split.needs} total={split.needs + split.wants} />
            <LegendRow color="#f4a344" label="Wants (entertainment)" value={split.wants} total={split.needs + split.wants} />
            <p className="duo-muted text-[10px] leading-snug">
              Needs come from the sandbox bills; wants from the statement&apos;s own
              entertainment-category charges. Nothing is guessed — both sides are ledger facts.
            </p>
          </div>
        </div>
      </section>

      <section className="duo-card">
        <header className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Wallet className="h-4 w-4 text-[#1684e9]" /> Dual limits & AI mandate
          </h3>
          <span className="duo-muted text-[10px]">{formatRM(unmetBills)} bills unpaid</span>
        </header>

        <div className="mt-3 space-y-3">
          <LimitBar
            label="Weekly pay limit"
            spent={spentThisWeek}
            limit={userLimits.weeklyPayLimit}
            pct={weeklyPct}
          />
          <LimitBar
            label="Monthly pay limit"
            spent={spentThisMonth}
            limit={userLimits.monthlyPayLimit}
            pct={monthlyPct}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-[#f6f9fd] p-3">
          <p className="flex items-center gap-2 text-xs font-bold">
            <ShieldCheck className="h-4 w-4 text-[#0caa91]" /> AI mandate ceiling
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="duo-muted">Max auto-lock amount</span>
                <span className="duo-num font-bold text-[#1684e9]">
                  {formatRM(aiMandate.maxLockAmountRM)}
                </span>
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
                <span className="duo-muted">Max auto-lock duration</span>
                <span className="duo-num font-bold text-[#1684e9]">
                  {aiMandate.maxLockDurationDays} days
                </span>
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
          <p className="duo-muted mt-2 text-[10px] leading-snug">
            The agent can never lock more than this without your explicit click (T3). Clamped to RM
            10–1,000 · 1–30 days.
          </p>
        </div>
      </section>

      <section className="duo-card">
        <header className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Receipt className="h-4 w-4 text-[#1684e9]" /> 12:00 PM daily spending summary
          </h3>
          <span className="duo-muted text-[10px]">{userId}</span>
        </header>
        {latestSummary ? (
          <DailySummaryBody payload={latestSummary.payload} at={latestSummary.at} />
        ) : (
          <div className="duo-warning mt-3 flex items-start gap-2 px-3 py-2 text-[11px]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              No summary yet. The agent posts one each noon the sandbox clock crosses — press{' '}
              <strong>+24h</strong> in the judge dock to trigger it.
            </span>
          </div>
        )}
      </section>

      <QuarantineCards />
    </>
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
    <div className={cn('mt-3 px-3 py-2 text-[11px]', over ? 'duo-warning' : 'duo-safe')}>
      <p className="duo-num">
        <strong>{formatRM(spentToday)}</strong> spent today · allowance {formatRM(allowance)} ·{' '}
        {units.mixedRiceMeals} mixed-rice meals / {units.bubbleTea} bubble tea
      </p>
      <p className="duo-muted mt-1 text-[10px]">{new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
    </div>
  );
}

function LimitBar({
  label,
  spent,
  limit,
  pct,
}: {
  label: string;
  spent: number;
  limit: number;
  pct: number;
}) {
  const breach = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="duo-muted">{label}</span>
        <span className={cn('duo-num font-bold', breach ? 'text-[#ef6573]' : 'text-[#18395e]')}>
          {formatRM(spent)} / {formatRM(limit)}
        </span>
      </div>
      <div className="duo-track mt-1">
        <div
          className={cn('h-full rounded-full', breach ? 'duo-fill-spend' : 'duo-fill-save')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="duo-muted text-[11px]">{label}</span>
      </span>
      <span className="duo-num text-[11px] font-bold">
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
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e7f0fa" strokeWidth="13" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#1684e9"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${needsShare * c} ${c}`}
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#f4a344"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${(1 - needsShare) * c} ${c}`}
          strokeDashoffset={-needsShare * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="duo-num text-sm font-extrabold">{Math.round(needsShare * 100)}%</span>
        <span className="duo-muted text-[9px] font-semibold uppercase">needs</span>
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
        stroke="#ffffff"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 2 — Timeline
 * ------------------------------------------------------------------ */

function TimelineTab() {
  return (
    <>
      <SubscriptionTimeline />
      <CfarStressTester />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 3 — Zombie Radar
 * ------------------------------------------------------------------ */

function RadarTab() {
  const gmailConsent = useCtrlPayStore((s) => s.gmailConsent);
  const setGmailConsent = useCtrlPayStore((s) => s.setGmailConsent);
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
    return { monthly, annual, units: toStudentUnits(monthly), annualUnits: toStudentUnits(annual) };
  }, [zombieTags]);

  const payload = roastEvent?.payload;
  const wastedMonthly = payload ? Number(payload.wastedMonthly) : preview.monthly;
  const wastedAnnual = payload ? Number(payload.wastedAnnual) : preview.annual;
  const units = (payload?.units ?? preview.units) as { mixedRiceMeals: number; bubbleTea: number };
  const isPreview = !payload;

  return (
    <>
      <section
        className={cn(
          'duo-card',
          gmailConsent ? 'duo-safe' : 'duo-warning',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Lock className="h-4 w-4" /> Read-only Gmail receipts
            </h3>
            <p className="mt-1 text-[11px] leading-snug">
              <strong>Structured fields only · No email bodies stored · Revocable anytime.</strong>{' '}
              The detector reads merchant, amount and billing date. Receipt text is redacted on the
              device before anything leaves it.
            </p>
            <p className="duo-muted mt-1 text-[10px]">
              Consent {gmailConsent ? 'granted' : 'not granted'} · audit entry{' '}
              <span className="font-mono">SET_GMAIL_CONSENT</span>
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

      <section className="duo-card">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Flame className="h-4 w-4 text-[#f3983d]" /> Month-end subscription roast
            </h3>
            <p className="duo-muted mt-0.5 text-[11px]">
              {isPreview
                ? 'Preview — same formula the agent uses at month end.'
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
                  'rounded-full px-2.5 py-1 text-[10px] font-bold',
                  roastTone === tone ? 'bg-[#1688ee] text-white' : 'bg-[#e7f3ff] text-[#207ac4]',
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
        <p className="duo-muted mt-2 text-[10px]">
          Wasted = recurring charges tagged ZOMBIE or SUSPECTED_ZOMBIE by the radar.
        </p>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 4 — Bookkeeping
 * ------------------------------------------------------------------ */

function BookkeepTab() {
  return (
    <>
      <section className="duo-card duo-safe">
        <p className="flex items-start gap-2 text-[11px] leading-snug">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Privacy first.</strong> Receipt images and voice memos are redacted on-device
            (IC numbers, phone numbers, account strings) before the structured fields are sent. Raw
            images and audio never leave the browser.
          </span>
        </p>
      </section>
      <MultimodalBookkeeping />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tab 5 — Copilot & Security
 * ------------------------------------------------------------------ */

const TIER_NOTES: Record<PermissionTier, string> = {
  T0: 'Read & simulate',
  T1: 'Tag, book, categorise',
  T2: 'Draft cancellations',
  T3: 'Money movement — per-action click only',
};

function CopilotTab({ copilot }: { copilot?: React.ReactNode }) {
  const userId = useCtrlPayStore((s) => s.userId);
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const setTier = useCtrlPayStore((s) => s.setTier);
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
    <>
      <section className="duo-card">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <GraduationCap className="h-4 w-4 text-[#1684e9]" /> Student plan
            </h3>
            <p className="duo-muted mt-0.5 text-[11px]">
              {plan === 'PRO' ? 'Student Pro · RM 49/year' : 'Free tier · RM 0'} — every safety
              feature stays on the free tier. Pro is cosmetic (roast personas, themes).
            </p>
          </div>
          <Switch
            checked={plan === 'PRO'}
            onCheckedChange={(v) => setPlan(v ? 'PRO' : 'FREE')}
            aria-label="Toggle Student Pro"
          />
        </header>
      </section>

      <section className="duo-card">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 text-[#0caa91]" /> Autonomy & permission tiers
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
        <p className="duo-muted mt-2 text-[10px] leading-snug">
          Tier T3 (money movement) can never be switched on for autonomous use: every T3 action
          requires your explicit per-action click and a signed proposal.
        </p>
      </section>

      {copilot ?? (
        <section className="duo-card">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Bot className="h-4 w-4 text-[#1684e9]" /> AI Copilot
          </h3>
          <p className="duo-muted mt-1 text-[11px] leading-snug">
            The copilot chat is mounted in the judge-studio panel in this layout — switch to{' '}
            <strong>Full App Focus</strong> to chat inside the phone. It only ever restates numbers
            the engine computed and every tool call is written to the audit chain.
          </p>
          <ul className="duo-muted mt-2 space-y-1 text-[11px]">
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
      )}

      <section className="duo-card">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <FileClock className="h-4 w-4" /> Immutable audit log
            </h3>
            <p className="duo-muted mt-0.5 text-[11px]">
              Append-only, hash-chained. Field names only — never raw PII values.
            </p>
          </div>
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold',
              chainOk ? 'bg-[#eafaf3] text-[#12805c]' : 'bg-[#fdecec] text-[#c0392b]',
            )}
          >
            {chainOk ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {chainOk ? 'Chain verified' : 'Chain broken'}
          </span>
        </header>

        <div className="mt-3 space-y-2">
          {entries.map((e) => (
            <div key={e.logId} className="rounded-2xl bg-[#f6f9fd] px-3 py-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2 py-[1px] text-[10px] font-bold text-[#207ac4]">
                  {e.permissionTier}
                </span>
                <span className="font-semibold">{e.actionType}</span>
                <span className="duo-muted ml-auto font-mono text-[9px]">
                  {new Date(e.timestamp).toISOString().slice(11, 19)}
                </span>
              </div>
              <p className="duo-muted mt-1 truncate font-mono text-[9px]">hash {e.entryHash}</p>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="duo-muted text-[11px]">No entries yet — interact with the sandbox.</p>
          )}
        </div>
      </section>
    </>
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
        {hint && <p className="duo-muted text-[10px]">{hint}</p>}
      </div>
      {disabled ? (
        <span className="duo-muted flex items-center gap-1 rounded-full bg-[#eef2f7] px-2 py-1 text-[10px] font-semibold">
          <Ban className="h-3 w-3" /> locked
        </span>
      ) : (
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      )}
    </div>
  );
}
