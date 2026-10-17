'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BatteryFull,
<<<<<<< HEAD
  Bell,
  Bus,
  CalendarDays,
  CalendarRange,
  Camera,
=======
  Bot,
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  CreditCard,
  CupSoda,
  Filter,
  Flame,
  GraduationCap,
<<<<<<< HEAD
  HeartPulse,
  Home as HomeIcon,
=======
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  LayoutGrid,
  Lock,
  Mail,
  Mic,
  PiggyBank,
  Plus,
  Radar,
  Receipt,
<<<<<<< HEAD
  Search,
  Send,
=======
  ScrollText,
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Utensils,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useCtrlPayStore, type SandboxEvent } from '@/lib/store';
import type { SpendCategory } from '@/lib/types';
import {
  calculateAmortizedSubscriptions,
  calculateSubscriptionMetrics,
  DEMO_CONFIG,
  ESCROW_RULES,
  toStudentUnits,
} from '@/lib/quant-engine';
import {
  FIXED_BILLS,
  HISTORICAL_DAILY_SPENDING,
  PAYMENT_EVENTS,
  PROFILE,
  RECURRING_TRANSACTIONS,
  SUBSCRIPTIONS,
  USAGE_SIGNALS,
} from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
<<<<<<< HEAD
import { analyzeZombies, ZOMBIE_RULES } from '@/lib/zombie-radar';
=======
import { resolveSubscriptionByMerchant } from '@/lib/zombie-radar';
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
import { upcomingFixedBills } from '@/lib/ledger';
import { cn, formatRM, remainingDaysInMonth } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AgentChat } from '@/components/agent-chat';
import { AuditDrawer } from '@/components/audit-drawer';
import { CfarStressTester } from '@/components/cfar-stress-tester';
import { EventFeed } from '@/components/event-feed';
import { GoalZoom, GoalsAscent, useGoals, type AscentGoal } from '@/components/goals-ascent';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';
import { PaymentInterceptorModal } from '@/components/payment-interceptor-modal';
import { QuarantineCards } from '@/components/quarantine-cards';
<<<<<<< HEAD
import { SimulationToolbar } from '@/components/simulation-toolbar';
import { SpendingBars } from '@/components/spending-bars';
import { ArcRing } from '@/components/arc-ring';
import { FolderTabCard } from '@/components/folder-tab-card';
=======
import { RafSwap, useRafAlive } from '@/components/raf-swap';
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
import { StudentDowngradeDrawer } from '@/components/student-downgrade-drawer';
import { SubscriptionTimeline } from '@/components/subscription-timeline';
import { VaultPanel } from '@/components/vault-panel';
import { ZombieRadarPanel } from '@/components/zombie-radar-panel';

<<<<<<< HEAD
export type MobileTab = 'home' | 'timeline' | 'radar' | 'vault';

type SheetId =
  | 'none'
  | 'expense'
  | 'payments'
  | 'notifications'
  | 'summary'
  | 'audit'
  | 'commitments'
  | 'ai'
  | 'sandbox';
type AiSegment = 'OCR' | 'VOICE' | 'COPILOT';
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MobileAppShellProps {
<<<<<<< HEAD
  /** Rendered inside the AI drawer's Copilot segment. Falls back to `<AgentChat />`. */
  copilot?: React.ReactNode;
=======
  /**
   * Rendered inside the Guardrails → AI Copilot sub-view. The chat is mounted in
   * exactly ONE place per layout, so the parent passes it here only in mobile-focus mode.
   */
  copilot?: React.ReactNode;
  /** Which tab opens first (judges usually start on Wallet). */
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  initialTab?: MobileTab;
  className?: string;
}

<<<<<<< HEAD
/* ------------------------------------------------------------------ *
 * Small display primitives
 * ------------------------------------------------------------------ */
=======
export function MobileAppShell({ copilot, initialTab = 'wallet', className }: MobileAppShellProps) {
  const [tab, setTab] = React.useState<MobileTab>(initialTab);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const rafAlive = useRafAlive();
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067

/** Integer / decimal split typography — the anti-"generic AI" money treatment. */
function SplitAmount({
  value,
  size = 40,
  tone = 'dark',
  className,
}: {
  value: number;
  size?: number;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const [int, dec] = formatRM(value).replace('RM', '').trim().split('.');
  return (
<<<<<<< HEAD
    <span className={cn('inline-flex items-start', tone === 'light' ? 'text-white' : 'text-holst-950', className)}>
      <span
        className={cn('ct-kicker mr-1 mt-1', tone === 'light' ? 'text-holst-200' : 'text-holst-800')}
        style={{ fontSize: Math.max(9, size * 0.26) }}
      >
        RM
      </span>
      <span className="ct-int" style={{ fontSize: size }}>
        {int}
      </span>
      <span className="ct-dec mt-[3px]" style={{ fontSize: size * 0.52 }}>
        .{dec ?? '00'}
      </span>
    </span>
  );
}

function ScreenTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="pb-1 pt-2">
      <p className="ct-kicker text-holst-600">{kicker}</p>
      <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-holst-950">{title}</h1>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
    </div>
  );
}

function greetingFor(clock: number): string {
  const h = new Date(clock).getUTCHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
<<<<<<< HEAD
 * Status bar
 * ------------------------------------------------------------------ */

function StatusBar({ onOpenSandbox }: { onOpenSandbox: () => void }) {
  const clock = useCtrlPayStore((s) => s.sandboxClock);
  const time = new Date(clock).toISOString().slice(11, 16);
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-between px-6 pb-1 pt-3 text-holst-950">
      <span className="duo-num text-[12px] font-bold">{time}</span>
      <span className="ct-island absolute left-1/2 top-1.5 h-6 w-[92px] -translate-x-1/2 rounded-full" />
      <span className="flex items-center gap-2">
        <button
          type="button"
          className="ct-sandbox-pill"
          onClick={onOpenSandbox}
          aria-label="Open the judge sandbox drawer"
        >
          <Zap className="h-3 w-3" /> Sandbox
        </button>
        <span className="flex items-center gap-1.5">
          <SignalIcon />
          <BatteryFull className="h-4 w-4" />
        </span>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
      </span>
    </div>
  );
}

<<<<<<< HEAD
function SignalIcon() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[3, 5, 7, 9].map((h) => (
        <span key={h} className="w-[3px] rounded-sm bg-holst-950" style={{ height: h }} />
      ))}
    </span>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  );
}

/* ------------------------------------------------------------------ *
<<<<<<< HEAD
 * Bottom dock + multimodal AI orb
 * ------------------------------------------------------------------ */

const DOCK_ITEMS: Array<{ id: MobileTab; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'timeline', label: 'Timeline', icon: CalendarRange },
  { id: 'radar', label: 'Radar', icon: Radar },
  { id: 'vault', label: 'Vault', icon: ShieldCheck },
];

function DockButton({
  item,
  active,
  onSelect,
}: {
  item: { id: MobileTab; label: string; icon: React.ElementType };
  active: boolean;
  onSelect: (t: MobileTab) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className="ct-dock-btn"
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(item.id)}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span>{item.label}</span>
      <span className="ct-dock-dot" />
    </button>
  );
}

function AiOrb({
  listening,
  onTap,
  onHold,
  onRelease,
}: {
  listening: boolean;
  onTap: () => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const hold = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = React.useRef(0);
  const longFired = React.useRef(false);
  const pointerHandled = React.useRef(false);

  const clearHold = React.useCallback(() => {
    if (hold.current) {
      clearTimeout(hold.current);
      hold.current = null;
    }
  }, []);

  React.useEffect(() => clearHold, [clearHold]);

  function onPointerDown() {
    pointerHandled.current = true;
    longFired.current = false;
    started.current = Date.now();
    clearHold();
    // Long press threshold: 280ms opens the voice drawer.
    hold.current = setTimeout(() => {
      longFired.current = true;
      onHold();
    }, 280);
  }

  function onPointerUp() {
    clearHold();
    const held = Date.now() - started.current;
    if (longFired.current) {
      onRelease();
      return;
    }
    // Short tap: under 250ms opens the OCR scanner.
    if (held < 250) onTap();
  }

  function onCancel() {
    clearHold();
    longFired.current = false;
    onRelease();
  }

  function onClick() {
    // Keyboard / programmatic activation skips pointer events — treat as a tap.
    if (pointerHandled.current) {
      pointerHandled.current = false;
      return;
    }
    onTap();
  }

  return (
    <button
      type="button"
      className="ct-orb shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-holst-200"
      data-listening={listening}
      aria-label="Multimodal AI — tap for receipt OCR, hold to talk"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onCancel}
      onPointerLeave={onCancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {listening && (
        <>
          <span className="ct-wave" />
          <span className="ct-wave ct-wave-2" />
          <span className="ct-wave ct-wave-3" />
        </>
      )}
      <Sparkles className="relative z-10 h-6 w-6" />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * In-phone sheet
 * ------------------------------------------------------------------ */

function PhoneSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="ct-scrim absolute inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '104%' }}
            animate={{ y: 0 }}
            exit={{ y: '104%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="ct-sheet absolute inset-x-0 bottom-0 z-50 flex max-h-[86%] flex-col overflow-hidden"
          >
            <div className="flex flex-col items-center gap-2 px-4 pt-3">
              <span className="ct-grabber" />
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-extrabold text-holst-950">{title}</p>
                  {subtitle && <p className="truncate text-[11px] duo-muted">{subtitle}</p>}
                </div>
                <button type="button" className="ct-icon-btn h-9 w-9" onClick={onClose} aria-label="Close sheet">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex-1 overflow-y-auto no-scrollbar px-4 pb-6">{children}</div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ *
 * Home tab
 * ------------------------------------------------------------------ */

/** Ratified non-negotiable term: every impulse buy is held for a 24-hour human cooling-off click. */
const QUARANTINE_HOLD_HOURS = 24;

/** Compact RM string for the arc-ring <textPath> labels (the legend carries the exact value). */
function arcRM(value: number): string {
  return `RM ${Math.round(value).toLocaleString('en-MY')}`;
}

function spendingWeek(clock: number) {
  const hist = HISTORICAL_DAILY_SPENDING.slice(-7);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return hist.map((value, i) => {
    const offsetDays = hist.length - 1 - i;
    const day = new Date(clock - offsetDays * 86_400_000);
    return { label: dayNames[day.getUTCDay()], value };
  });
}

const CATEGORY_ICON: Record<SpendCategory, React.ElementType> = {
  Bills_Utilities: Receipt,
  Campus_Cafeteria_Basic: Utensils,
  Medical: HeartPulse,
  Transport_Essential: Bus,
  Food_Delivery_Grab_Foodpanda: UtensilsCrossed,
  Entertainment: Clapperboard,
  Bubble_Tea_Dining: CupSoda,
  Shopping: ShoppingBag,
};

/** Muted in-family tints so every row gets its own colour without leaving the palette. */
const CATEGORY_TINT: Record<SpendCategory, string> = {
  Bills_Utilities: 'bg-[#FFF1E4] text-[#8A5408]',
  Campus_Cafeteria_Basic: 'bg-[#E3F3EF] text-[#0F6B55]',
  Medical: 'bg-[#DCF7EE] text-[#0B5F4A]',
  Transport_Essential: 'bg-[#E9F4F3] text-[#0A3D4A]',
  Food_Delivery_Grab_Foodpanda: 'bg-[#FFEBE0] text-[#A14E1E]',
  Entertainment: 'bg-[#FDEBEF] text-[#B3253F]',
  Bubble_Tea_Dining: 'bg-[#F6EFE3] text-[#7A5A2E]',
  Shopping: 'bg-[#10606F] text-[#EAF7F4]',
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

function prettyMerchant(name: string): string {
  const cleaned = name
    .replace(/\.(COM|MY|NET|ORG)(\/[A-Z]+)?/gi, ' ')
    .replace(/\b(PTE|LTD|SDN|BHD|ONLINE|BILL)\b/gi, ' ')
    .replace(/[*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = (cleaned || name).toLowerCase();
  return title.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

interface TxnRow {
  id: string;
  merchant: string;
  amount: number;
  category: SpendCategory;
  at: number;
}

/** Merges real booked expenses with the seeded statement history, newest first. */
function buildRecentTransactions(clock: number, events: SandboxEvent[]): TxnRow[] {
  const rows: TxnRow[] = [];

  for (const e of events) {
    if (e.type !== 'BOOKING') continue;
    const p = e.payload as { merchant?: unknown; amount?: unknown; category?: unknown };
    if (typeof p.merchant !== 'string' || typeof p.amount !== 'number' || typeof p.category !== 'string') continue;
    rows.push({ id: e.id, merchant: p.merchant, amount: p.amount, category: p.category as SpendCategory, at: e.at });
  }

  const now = new Date(clock);
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  for (const b of FIXED_BILLS) {
    if (!b.paid) continue;
    rows.push({
      id: `bill_${b.id}`,
      merchant: b.label,
      amount: b.amountRM,
      category: 'Bills_Utilities',
      at: monthStart + (b.dueDay - 1) * 86_400_000,
    });
  }

  for (const t of RECURRING_TRANSACTIONS) {
    rows.push({
      id: t.id,
      merchant: t.merchant,
      amount: t.amountRM,
      category: t.category,
      at: new Date(`${t.date}T00:00:00Z`).getTime(),
    });
  }

  const seen = new Set<string>();
  return rows
    .sort((a, b) => b.at - a.at)
    .filter((r) => {
      const key = `${prettyMerchant(r.merchant)}|${r.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function CategoryTile({ category }: { category: SpendCategory }) {
  const Icon = CATEGORY_ICON[category] ?? Receipt;
  return (
    <span className={cn('ct-cat-tile', CATEGORY_TINT[category] ?? CATEGORY_TINT.Bills_Utilities)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function DualLimits() {
  const userLimits = useCtrlPayStore((s) => s.userLimits);
  const aiMandate = useCtrlPayStore((s) => s.aiMandate);
  const setAiMandate = useCtrlPayStore((s) => s.setAiMandate);

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-holst-50/70 p-3">
      <div>
        <p className="ct-kicker duo-muted">Constraints on you</p>
        <div className="mt-1.5 space-y-1.5">
          <LimitRow label="Weekly cap" value={userLimits.weeklyPayLimit} />
          <LimitRow label="Monthly cap" value={userLimits.monthlyPayLimit} />
        </div>
      </div>
      <div className="h-px bg-holst-950/8" />
      <div>
        <p className="ct-kicker duo-muted">Constraints on the AI</p>
        <label className="mt-2 block text-[11px] font-semibold text-holst-950">
          Max lock amount · {formatRM(aiMandate.maxLockAmountRM)}
          <Slider
            className="mt-1.5"
            min={10}
            max={500}
            step={10}
            value={aiMandate.maxLockAmountRM}
            onValueChange={(v) => setAiMandate({ maxLockAmountRM: v })}
            aria-label="Max lock amount"
          />
        </label>
        <label className="mt-2 block text-[11px] font-semibold text-holst-950">
          Max lock duration · {aiMandate.maxLockDurationDays} days
          <Slider
            className="mt-1.5"
            min={1}
            max={30}
            step={1}
            value={aiMandate.maxLockDurationDays}
            onValueChange={(v) => setAiMandate({ maxLockDurationDays: v })}
            aria-label="Max lock duration"
          />
        </label>
      </div>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="duo-muted">{label}</span>
      <span className="duo-num font-bold text-holst-950">{formatRM(value)}</span>
    </div>
  );
}

function HomeTab({
  onOpenSheet,
  onGoTab,
}: {
  onOpenSheet: (s: SheetId) => void;
  onGoTab: (t: MobileTab) => void;
}) {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const events = useCtrlPayStore((s) => s.events);
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());
  const [showLimits, setShowLimits] = React.useState(false);

  const units = toStudentUnits(allowance);
  const floor = ESCROW_RULES.minDailySurvivalFloorRM;

  const week = React.useMemo(() => spendingWeek(sandboxClock), [sandboxClock]);
  const recent = React.useMemo(() => buildRecentTransactions(sandboxClock, events), [sandboxClock, events]);
  const weekTotal = week.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="animate-fade-in">
      <header className="flex items-center justify-between pt-1">
        <button type="button" className="flex items-center gap-3 text-left" onClick={() => onGoTab('vault')}>
          <span className="ct-avatar grid h-10 w-10 place-items-center rounded-full text-[12px] font-extrabold">
            {PROFILE.fullName
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)}
          </span>
          <span>
            <span className="block text-[11px] duo-muted">{greetingFor(sandboxClock)}</span>
            <span className="block text-[14.5px] font-extrabold tracking-[-0.02em] text-holst-950">
              Here&apos;s your overview
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="ct-icon-btn h-9 w-9"
            onClick={() => onOpenSheet('ai')}
            aria-label="Search with the copilot"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ct-icon-btn relative h-9 w-9"
            onClick={() => onOpenSheet('notifications')}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {quarantines.length > 0 && (
              <span className="absolute right-1 top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-[#F43F5E] px-1 text-[9px] font-extrabold text-white">
                {quarantines.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" className="ct-chip px-2.5 py-1.5" onClick={() => onOpenSheet('summary')}>
          <Timer className="mr-1 h-3 w-3 text-holst-600" /> 12:00 PM daily summary
        </button>
        <button type="button" className="ct-chip px-2.5 py-1.5" onClick={() => onOpenSheet('audit')}>
          <CheckCircle2 className="mr-1 h-3 w-3 text-[#0F6B55]" /> Chain verified
        </button>
      </div>

      {/* Unboxed hero balance with a soft mint bloom behind it */}
      <section className="relative mt-5">
        <span className="ct-hero-bloom" aria-hidden />
        <div className="relative flex items-center gap-2">
          <span className="ct-kicker duo-muted">Total balance</span>
          <span className="ct-chip">MYR</span>
        </div>
        <div className="relative mt-1.5 flex items-end justify-between gap-3">
          <SplitAmount value={currentBalance} size={40} />
          <span className="ct-badge-up shrink-0">
            <ArrowUpRight className="h-3 w-3" /> Safe today {formatRM(allowance)}
          </span>
        </div>
        <p className="relative mt-1.5 text-[10.5px] duo-muted">
          ≈ {units.mixedRiceMeals}× RM{DEMO_CONFIG.studentUnits.campusMixedRice.toFixed(0)} campus rice ·{' '}
          {units.bubbleTea}× RM{DEMO_CONFIG.studentUnits.bubbleTea.toFixed(0)} bubble tea left today
        </p>
      </section>

      {/* Three quick actions */}
      <div className="mt-4 flex gap-2">
        <button type="button" className="ct-action flex-1 justify-center" onClick={() => onOpenSheet('expense')}>
          <Plus className="h-4 w-4 text-holst-600" /> Add
        </button>
        <button type="button" className="ct-action flex-1 justify-center" onClick={() => onOpenSheet('notifications')}>
          <LayoutGrid className="h-4 w-4 text-holst-600" /> All activity
        </button>
        <button type="button" className="ct-action flex-1 justify-center" onClick={() => onOpenSheet('payments')}>
          <Send className="h-4 w-4 text-holst-600" /> Send
        </button>
      </div>

      {/* Total spending — hatched area curve on the soft gradient surface */}
      <section className="ct-card-soft mt-4 p-4">
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="ct-kicker duo-muted">Total spending</p>
            <SplitAmount value={spentThisMonth} size={26} className="mt-1" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="ct-icon-btn h-8 w-8"
              onClick={() => onGoTab('timeline')}
              aria-label="Open the deduction calendar"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="ct-icon-btn h-8 w-8"
              onClick={() => onGoTab('timeline')}
              aria-label="Drill into the forecast"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <SpendingBars
          className="mt-4"
          points={week}
          height={152}
          todayIndex={week.length - 1}
          caption={`Last 7 days · ${formatRM(weekTotal)} variable spend. Tap a column to inspect it.`}
        />

        <div className="relative mt-3 flex items-center justify-between gap-2">
          <p className="text-[10.5px] duo-muted">
            Survival floor {formatRM(floor)}/day <span className="font-bold text-[#0F6B55]">safe ✓</span>
          </p>
          <button
            type="button"
            className="ct-chip shrink-0 px-2.5 py-1.5"
            onClick={() => setShowLimits((v) => !v)}
            aria-expanded={showLimits}
          >
            <SlidersHorizontal className="mr-1 h-3 w-3 text-holst-600" /> Limits
            <ChevronDown className={cn('ml-1 h-3 w-3 transition-transform', showLimits && 'rotate-180')} />
          </button>
        </div>

        {showLimits && <DualLimits />}
      </section>

      {/* Vault · quarantine · reward shortcuts */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" className="ct-metric text-left" onClick={() => onGoTab('vault')}>
          <ShieldCheck className="h-4 w-4 text-holst-600" />
          <p className="ct-kicker duo-muted mt-1.5">Vault</p>
          <p className="duo-num mt-0.5 text-[13.5px] font-extrabold text-holst-950">{formatRM(defenseVault)}</p>
        </button>
        <button type="button" className="ct-metric text-left" onClick={() => onOpenSheet('commitments')}>
          <Timer className="h-4 w-4 text-holst-600" />
          <p className="ct-kicker duo-muted mt-1.5">Quarantine</p>
          <p className="duo-num mt-0.5 text-[13.5px] font-extrabold text-holst-950">{quarantines.length} parked</p>
        </button>
        <button type="button" className="ct-metric text-left" onClick={() => onOpenSheet('summary')}>
          <PiggyBank className="h-4 w-4 text-holst-600" />
          <p className="ct-kicker duo-muted mt-1.5">Reward pool</p>
          <p className="duo-num mt-0.5 text-[13.5px] font-extrabold text-holst-950">{formatRM(rewardPool)}</p>
        </button>
      </div>

      <div className="mt-4">
        <QuarantineCards />
      </div>

      {/* Latest transactions */}
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-extrabold tracking-[-0.01em] text-holst-950">Latest transaction</h2>
          <button
            type="button"
            className="ct-icon-btn h-8 w-8"
            onClick={() => onOpenSheet('notifications')}
            aria-label="Filter transactions"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="space-y-1.5">
          {recent.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-white/80 p-2.5 ring-1 ring-inset ring-holst-950/5">
              <CategoryTile category={t.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-holst-950">{prettyMerchant(t.merchant)}</p>
                <p className="text-[10.5px] duo-muted">
                  {stamp(t.at)} · {t.category.replaceAll('_', ' ')}
                </p>
              </div>
              <span className="duo-num text-[13px] font-extrabold text-holst-950">-{formatRM(t.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
    </div>
  );
}

<<<<<<< HEAD
/* ------------------------------------------------------------------ *
 * Timeline tab — CFaR projection curve
 * ------------------------------------------------------------------ */

function buildSmoothPath(series: number[], w: number, h: number, pad = 10) {
  const n = series.length;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => ({
    x: n === 1 ? 0 : (i / (n - 1)) * w,
    y: pad + (1 - (v - min) / span) * (h - pad * 2),
  }));

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(2)} ${p0.y.toFixed(2)}, ${cx.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const minIndex = series.indexOf(min);
  return { d, area, pts, minIndex, min, max };
}

function CfarCurve() {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());

  const series = React.useMemo(() => {
    const bills = upcomingFixedBills(sandboxClock, SUBSCRIPTIONS, amortize);
    const days = remainingDaysInMonth(sandboxClock);
    const today = new Date(sandboxClock).getUTCDate();
    const out: number[] = [currentBalance];
    let bal = currentBalance;
    for (let i = 1; i <= days; i++) {
      const due = bills
        .filter((b) => !b.paid && b.dueDay === today + i)
        .reduce((sum, b) => sum + b.amountRM, 0);
      bal = bal - allowance - due;
      out.push(bal);
    }
    return out;
  }, [currentBalance, sandboxClock, amortize, allowance]);

  const W = 320;
  const H = 132;
  const { d, area, pts, minIndex, min } = buildSmoothPath(series, W, H);
  const last = pts[pts.length - 1];
  const minPt = pts[minIndex];
  const monthEnd = series[series.length - 1];

  return (
    <section className="rounded-[32px] bg-white p-4 shadow-soft ring-1 ring-inset ring-holst-950/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="ct-kicker duo-muted">Projected month-end</p>
          <SplitAmount value={monthEnd} size={26} className="mt-1" />
        </div>
        <span className={cn(monthEnd >= currentBalance ? 'ct-badge-up' : 'ct-badge-down')}>
          {monthEnd >= currentBalance ? <ArrowUpRight className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {formatRM(Math.abs(monthEnd - currentBalance))}
        </span>
      </div>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[132px] w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="ct-cfar-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D8B94" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1D8B94" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* daily vertical dividers */}
          {pts.map((p, i) =>
            i % 3 === 0 ? (
              <line key={i} x1={p.x} y1={0} x2={p.x} y2={H} stroke="rgba(4,34,43,0.05)" strokeWidth="1" />
            ) : null,
          )}
          {/* sparkle dots */}
          {pts.map((p, i) =>
            i % 4 === 0 ? <circle key={`d${i}`} cx={p.x} cy={p.y} r="1.6" fill="#98D8D0" /> : null,
          )}
          <path d={area} fill="url(#ct-cfar-fill)" />
          <path d={d} fill="none" stroke="#10606F" strokeWidth="3" strokeLinecap="round" />
          {/* min node */}
          <circle cx={minPt.x} cy={minPt.y} r="5" fill="#ffffff" stroke="#1D8B94" strokeWidth="3" />
          {/* endpoint arrow */}
          <path
            d={`M ${last.x - 14} ${last.y + 9} L ${last.x - 2} ${last.y - 1} M ${last.x - 12} ${last.y - 1} L ${last.x - 2} ${last.y - 1} L ${last.x - 9} ${last.y + 6}`}
            fill="none"
            stroke="#10606F"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="ct-bubble absolute -translate-x-1/2 -translate-y-full"
          style={{
            left: `${Math.min(80, (minPt.x / W) * 100)}%`,
            top: `${(minPt.y / H) * 100}%`,
          }}
        >
          Min {formatRM(min)}
        </span>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed duo-muted">
        Smooth CFaR trajectory from the deterministic engine · daily allowance minus scheduled bills. The glowing node
        is the lowest projected balance this month.
      </p>
    </section>
  );
}

<<<<<<< HEAD
function TimelineTab({
  goals,
  onOpenGoal,
}: {
  goals: AscentGoal[];
  onOpenGoal: (goalId: string) => void;
}) {
  return (
    <div className="animate-fade-in">
      <ScreenTitle kicker="Forecast & stress-test" title="Timeline" />
      <div className="space-y-3">
        <CfarCurve />
        <GoalsAscent goals={goals} onOpenGoal={onOpenGoal} />
        <SubscriptionTimeline />
        <CfarStressTester />
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
      </div>
    </div>
  );
}

<<<<<<< HEAD
/* ------------------------------------------------------------------ *
 * Radar tab — Nexora-style recurring mandate console
 * ------------------------------------------------------------------ */

type RadarFilter = 'ALL' | 'ZOMBIE' | 'ARBITRAGE';

function RadarTab({ onVerifyStudent }: { onVerifyStudent: () => void }) {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const gmailConsent = useCtrlPayStore((s) => s.gmailConsent);
  const setGmailConsent = useCtrlPayStore((s) => s.setGmailConsent);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const setAmortize = useCtrlPayStore((s) => s.setAmortize);
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  const roastTone = useCtrlPayStore((s) => s.roastTone);
  const setRoastTone = useCtrlPayStore((s) => s.setRoastTone);
  const zombieTags = useCtrlPayStore((s) => s.zombieTags);
  const answerZombie = useCtrlPayStore((s) => s.answerZombie);
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const [filter, setFilter] = React.useState<RadarFilter>('ALL');

  const analysis = React.useMemo(
    () =>
      analyzeZombies({
        transactions: RECURRING_TRANSACTIONS,
        subscriptions: SUBSCRIPTIONS,
        usageSignals: USAGE_SIGNALS,
        sandboxClock,
      }),
    [sandboxClock],
  );

<<<<<<< HEAD
  const monthly = React.useMemo(
    () => calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock }),
    [sandboxClock],
  );
=======
  const preview = React.useMemo(() => {
    const wasted = SUBSCRIPTIONS.filter(
      (s) => zombieTags[s.subscriptionId] === 'ZOMBIE' || zombieTags[s.subscriptionId] === 'SUSPECTED_ZOMBIE',
    ).reduce((sum, s) => sum + s.amountRM, 0);
    const monthly = Math.round(wasted * 100) / 100;
    const annual = Math.round(monthly * 12 * 100) / 100;
    return { monthly, annual, units: toStudentUnits(monthly) };
  }, [zombieTags]);
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067

  const monthlyBySub = new Map(monthly.map((m) => [m.subscriptionId, m.monthlyBurden]));

  let activeAmt = 0;
  let zombieAmt = 0;
  for (const sub of SUBSCRIPTIONS) {
    const tag = zombieTags[sub.subscriptionId];
    const amt = monthlyBySub.get(sub.subscriptionId) ?? sub.amountRM;
    if (tag === 'ZOMBIE' || tag === 'SUSPECTED_ZOMBIE') zombieAmt += amt;
    else activeAmt += amt;
  }

  const arbitrageIds = analysis.studentDowngradeCandidates;
  const arbitrageSavings = arbitrageIds.reduce((sum, id) => {
    const entry = SUBSCRIPTION_REGISTRY[id];
    if (entry.studentPriceRM === null) return sum;
    return sum + (entry.fullPriceRM - entry.studentPriceRM);
  }, 0);

  /** Idle days from the usage telemetry; 0 when there is no signal at all. */
  const idleDaysFor = (id: string) => USAGE_SIGNALS.find((u) => u.subscriptionId === id)?.lastUsedDaysAgo ?? 0;
  /** Next billing date as MM-DD. */
  const billingDateFor = (id: string) => SUBSCRIPTIONS.find((s) => s.subscriptionId === id)?.nextBillingDate.slice(5) ?? '—';

  const totalMonthly = activeAmt + zombieAmt;
  const recoverableAnnual = zombieAmt * 12 + arbitrageSavings * 12;

  const zombieCardId = SUBSCRIPTIONS.map((s) => s.subscriptionId).find(
    (id) => zombieTags[id] === 'SUSPECTED_ZOMBIE' || zombieTags[id] === 'ZOMBIE',
  );
  const arbitrageCardId = arbitrageIds[0];

  const showZombie = filter !== 'ARBITRAGE' && Boolean(zombieCardId);
  const showArbitrage = filter !== 'ZOMBIE' && Boolean(arbitrageCardId);

  return (
<<<<<<< HEAD
    <div className="animate-fade-in">
      <ScreenTitle kicker="Recurring mandate console" title="Radar" />

      {/* Module A — radial glass overview */}
      <section className="ct-hero-radial p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="ct-kicker text-holst-200/90">Recurring mandate exposure</span>
          <span className="ct-pill-glass">{ZOMBIE_RULES.iso20022MandateCategory}</span>
        </div>
        <SplitAmount value={totalMonthly} size={36} tone="light" className="mt-2" />
        <p className="mt-1.5 text-[10.5px] text-holst-200/80">
          {formatRM(recoverableAnnual)}/year recoverable if every zombie and student price is fixed.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="ct-pill-glass">
            ±{ZOMBIE_RULES.fxDriftTolerancePct}% FX drift (USD/MYR)
          </span>
          <span className="ct-pill-glass">{ZOMBIE_RULES.settlementLagWindowDays}±3d settlement lag</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" className="ct-brick" data-on={gmailConsent} onClick={() => setGmailConsent(!gmailConsent)}>
            <Mail className="h-4 w-4" />
            <span>Gmail read-only</span>
            <span className="text-[9px] font-semibold opacity-70">{gmailConsent ? 'ON' : 'OFF'}</span>
          </button>
          <button type="button" className="ct-brick" data-on={amortize} onClick={() => setAmortize(!amortize)}>
            <CalendarRange className="h-4 w-4" />
            <span>Amortize annual</span>
            <span className="text-[9px] font-semibold opacity-70">Fee/12</span>
          </button>
          <button
            type="button"
            className="ct-brick"
            data-on={roastTone === 'SPICY'}
            onClick={() => setRoastTone(roastTone === 'SPICY' ? 'GENTLE' : 'SPICY')}
          >
            <Flame className="h-4 w-4" />
            <span>Roast tone</span>
            <span className="text-[9px] font-semibold opacity-70">
              {roastTone === 'SPICY' ? 'Spicy' : 'Gentle'}
            </span>
          </button>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
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

<<<<<<< HEAD
      {/* Module B — three-segment arc ring whose labels ride the curvature */}
      <section className="duo-card relative mt-4">
        <ArcRing
          segments={[
            { id: 'active', value: activeAmt, color: '#04222B', textColor: '#FFFFFF' },
            { id: 'arbitrage', value: arbitrageSavings, color: '#1D8B94', textColor: '#FFFFFF' },
            { id: 'zombie', value: zombieAmt, color: '#E2F4F0', textColor: '#04222B', outline: true },
          ]}
          arcLabels={['ACTIVE', 'ARBITRAGE', 'ZOMBIE']}
          arcShortLabels={['ACT', 'ARB', 'ZOM']}
          arcAmounts={[arcRM(activeAmt), arcRM(arbitrageSavings), arcRM(zombieAmt)]}
          center={formatRM(totalMonthly)}
          centerKicker="Monthly exposure"
          centerSub="active + zombie mandates"
          capsules={[
            { id: 'ALL', icon: Activity, label: 'All mandates' },
            { id: 'ZOMBIE', icon: AlertTriangle, label: 'Suspected zombies' },
            { id: 'ARBITRAGE', icon: GraduationCap, label: 'Student arbitrage' },
          ]}
          activeCapsule={filter}
          onCapsule={(id) => setFilter(id as RadarFilter)}
        />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Legend color="#04222B" label="Active" value={formatRM(activeAmt)} />
          <Legend color="#1D8B94" label="Arbitrage" value={formatRM(arbitrageSavings)} />
          <Legend color="#E2F4F0" label="Zombie" value={formatRM(zombieAmt)} />
        </div>
      </section>

      {/* Module C — stacked folder-tab cutout cards */}
      {showZombie && zombieCardId && (
        <FolderTabCard
          tab="Suspected zombie"
          metaTime={`🕒 ${idleDaysFor(zombieCardId)}d idle`}
          metaDate={`📅 ${billingDateFor(zombieCardId)}`}
          tone="jade"
          title={`${SUBSCRIPTION_REGISTRY[zombieCardId].merchantName} (MYR)`}
          pills={
            <>
              <button
                type="button"
                className="ct-action flex-1 justify-center text-[11px]"
                onClick={() => answerZombie(zombieCardId, true)}
              >
                Yes, keep active
              </button>
              <button
                type="button"
                className="ct-action ct-action-primary flex-1 justify-center text-[11px]"
                onClick={() => answerZombie(zombieCardId, false)}
              >
                No, flag zombie
              </button>
            </>
          }
          footerLeft={`Monthly burn : ${formatRM(monthlyBySub.get(zombieCardId) ?? 0)}`}
          footerRight={`Sweep to vault : +${formatRM(monthlyBySub.get(zombieCardId) ?? 0)}`}
        />
      )}

      {showArbitrage && arbitrageCardId && (
        <FolderTabCard
          tab={studentVerified ? 'Student arbitrage · verified' : 'Student arbitrage'}
          metaTime={`🕒 ${idleDaysFor(arbitrageCardId)}d since use`}
          metaDate={`📅 ${billingDateFor(arbitrageCardId)}`}
          tone="mint"
          title={`${SUBSCRIPTION_REGISTRY[arbitrageCardId].merchantName} → Student`}
          pills={
            <>
              <span className="ct-badge-up flex-1 justify-center py-2.5">
                <ArrowUpRight className="h-3 w-3" /> Save{' '}
                {formatRM(
                  SUBSCRIPTION_REGISTRY[arbitrageCardId].fullPriceRM -
                    (SUBSCRIPTION_REGISTRY[arbitrageCardId].studentPriceRM ?? 0),
                )}
                /mo
              </span>
              <button
                type="button"
                className="ct-action ct-action-primary flex-1 justify-center text-[11px]"
                onClick={onVerifyStudent}
              >
                Verify &amp; downgrade →
              </button>
            </>
          }
          footerLeft={`Full price : ${formatRM(SUBSCRIPTION_REGISTRY[arbitrageCardId].fullPriceRM)}`}
          footerRight={`Student : ${formatRM(SUBSCRIPTION_REGISTRY[arbitrageCardId].studentPriceRM ?? 0)}`}
        />
      )}

      {/* Module D — dark roster + capped double-bar chart */}
      <div className="mt-4">
        <ZombieRadarPanel />
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-holst-50/70 px-2 py-2">
      <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={{ background: color }} />
      <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] duo-muted">{label}</p>
      <p className="duo-num text-[11.5px] font-extrabold text-holst-950">{value}</p>
    </div>
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  );
}

/* ------------------------------------------------------------------ *
<<<<<<< HEAD
 * Vault & security tab
 * ------------------------------------------------------------------ */

function PermissionMatrix() {
=======
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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const setTier = useCtrlPayStore((s) => s.setTier);
<<<<<<< HEAD
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const setStudentVerified = useCtrlPayStore((s) => s.setStudentVerified);

  const tiers = [
    { tier: 'T0' as const, label: 'T0 Read-only insights', hint: 'Analysis, CFaR, Zombie Radar. Always on.' },
    { tier: 'T1' as const, label: 'T1 Low-risk organization', hint: 'Tagging, reminders, suspected-zombie flags.' },
    { tier: 'T2' as const, label: 'T2 Assisted preparation', hint: 'Draft cancellations, deep-link drawers.' },
    { tier: 'T3' as const, label: 'T3 Financial state change', hint: 'Always needs a per-action click.' },
  ];

  return (
    <section className="duo-card border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="ct-kicker duo-muted">Permission ladder</p>
          <h2 className="mt-0.5 flex items-center gap-2 text-[14px] font-extrabold text-holst-950">
            <Lock className="h-4 w-4 text-holst-600" /> T0 – T3 control
          </h2>
        </div>
        <span className="ct-chip">{masterAutonomyEnabled ? 'AUTONOMY ON' : 'ADVISORY ONLY'}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-holst-50/70 p-3">
        <div>
          <p className="text-[12px] font-bold text-holst-950">Master AI autonomy</p>
          <p className="text-[10.5px] duo-muted">Default OFF — CtrlPay runs T0 advisory mode only.</p>
        </div>
        <Switch
          checked={masterAutonomyEnabled}
          onCheckedChange={setMasterAutonomy}
          aria-label="Master AI Autonomy Switch"
        />
      </div>

      <div className="mt-2 space-y-1.5">
        {tiers.map(({ tier, label, hint }) => {
          const disabled = tier === 'T0' || !masterAutonomyEnabled || tier === 'T3';
          const checked = tier === 'T0' ? true : tier === 'T3' ? false : enabledTiers[tier];
          return (
            <div key={tier} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-holst-950/5">
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-holst-950">{label}</p>
                <p className="text-[10px] duo-muted">{hint}</p>
              </div>
              {disabled && tier === 'T3' ? (
                <span className="ct-chip shrink-0">per-click</span>
              ) : (
                <Switch
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => setTier(tier, v)}
                  aria-label={`${tier} toggle`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-holst-50/70 p-3">
        <div>
          <p className="text-[12px] font-bold text-holst-950">Student status</p>
          <p className="text-[10.5px] duo-muted">{PROFILE.studentEmail}</p>
        </div>
        <Switch checked={studentVerified} onCheckedChange={setStudentVerified} aria-label="Student verification" />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-holst-50/70 p-3">
        <div>
          <p className="text-[12px] font-bold text-holst-950">Plan (gates Pro modules only)</p>
          <p className="text-[10.5px] duo-muted">Safety modules are never gated.</p>
        </div>
        <div className="ct-seg shrink-0">
          <button
            type="button"
            data-on={plan === 'FREE'}
            className="ct-seg-btn"
            onClick={() => setPlan('FREE')}
          >
            Free
          </button>
          <button type="button" data-on={plan === 'PRO'} className="ct-seg-btn" onClick={() => setPlan('PRO')}>
            Student Pro
          </button>
        </div>
      </div>
    </section>
  );
}

function VaultHero({ onOpenAudit }: { onOpenAudit: () => void }) {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const sweeps = useCtrlPayStore((s) => s.pendingSweeps);
  const verified = sweeps.filter((s) => s.status === 'VERIFIED').length;
  const [bucket, setBucket] = React.useState<'free' | 'vault' | 'reward' | null>(null);

  const totalHeld = currentBalance + defenseVault + rewardPool;
  const shown =
    bucket === 'free' ? currentBalance : bucket === 'vault' ? defenseVault : bucket === 'reward' ? rewardPool : totalHeld;
  const kicker =
    bucket === 'free'
      ? 'Free balance'
      : bucket === 'vault'
        ? 'Defense Vault'
        : bucket === 'reward'
          ? 'Reward pool'
          : 'Total held';

  return (
    <section className="duo-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="ct-kicker duo-muted">Sandbox holdings · non-interest</span>
        <button type="button" className="ct-chip shrink-0" onClick={onOpenAudit}>
          <CheckCircle2 className="mr-1 h-3 w-3 text-[#0F6B55]" /> SHA-256 chain
        </button>
      </div>

      <ArcRing
        segments={[
          { id: 'free', value: currentBalance, color: '#04222B', textColor: '#FFFFFF' },
          { id: 'vault', value: defenseVault, color: '#1D8B94', textColor: '#FFFFFF' },
          { id: 'reward', value: rewardPool, color: '#E2F4F0', textColor: '#04222B', outline: true },
        ]}
        arcLabels={['FREE', 'VAULT', 'REWARD']}
        arcAmounts={[arcRM(currentBalance), arcRM(defenseVault), arcRM(rewardPool)]}
        center={formatRM(shown)}
        centerKicker={kicker}
        centerSub="no interest · no leverage"
        capsules={[
          { id: 'free', icon: Wallet, label: 'Free balance' },
          { id: 'vault', icon: ShieldCheck, label: 'Defense Vault' },
          { id: 'reward', icon: PiggyBank, label: 'Reward pool' },
        ]}
        activeCapsule={bucket ?? undefined}
        onCapsule={(id) =>
          setBucket((b) => (b === id ? null : (id as 'free' | 'vault' | 'reward')))
        }
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Reward pool</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">{formatRM(rewardPool)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Verified sweeps</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">{verified}</p>
        </div>
      </div>
    </section>
  );
}

function VaultTab({ onOpenAudit }: { onOpenAudit: () => void }) {
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const armedTiers = (['T1', 'T2'] as const).filter((t) => enabledTiers[t]).length;

  return (
    <div className="animate-fade-in">
      <ScreenTitle kicker="Vault & security" title="Defense" />
      <div className="space-y-3">
        <VaultHero onOpenAudit={onOpenAudit} />

        <FolderTabCard
          tab="Commitment device"
          metaTime={`🕒 ${quarantines.length} parked`}
          metaDate={`📅 ${QUARANTINE_HOLD_HOURS}h lock`}
          tone="mint"
          title="Quarantine escrow"
          pills={
            <>
              <span className="ct-chip flex-1 justify-center py-2.5">never auto-releases</span>
              <button
                type="button"
                className="ct-action ct-action-primary flex-1 justify-center text-[11px]"
                onClick={onOpenAudit}
              >
                Open audit chain
              </button>
            </>
          }
          footerLeft="A human click is required to release locked escrow."
          footerRight={formatRM(rewardPool)}
        />

        <FolderTabCard
          tab="Permission ladder"
          metaTime="🕒 T0 advisory"
          metaDate="📅 T3 per-click"
          tone="jade"
          title="T0 – T3 control"
          pills={
            <>
              <span className="ct-chip flex-1 justify-center py-2.5">{armedTiers} tiers armed</span>
              <button
                type="button"
                className="ct-action ct-action-primary flex-1 justify-center text-[11px]"
                onClick={() => setMasterAutonomy(!masterAutonomyEnabled)}
              >
                {masterAutonomyEnabled ? 'Disarm autonomy' : 'Arm autonomy'}
              </button>
            </>
          }
          footerLeft="Financial state change always needs a per-action click."
          footerRight={masterAutonomyEnabled ? 'AUTONOMY ON' : 'ADVISORY ONLY'}
        />

        <VaultPanel />
        <PermissionMatrix />
        <AuditDrawer />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sheets
 * ------------------------------------------------------------------ */

function PaymentsSheet({ onClose }: { onClose: () => void }) {
  const simulate = useCtrlPayStore((s) => s.simulatePaymentIntent);
  return (
    <div className="space-y-2">
      <p className="text-[11px] duo-muted">
        Stand-in for Open Banking / merchant webhooks. Simulation only — no real money moves.
      </p>
      {PAYMENT_EVENTS.map((ev) => (
        <button
          key={ev.id}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-2xl bg-holst-50/80 p-3 text-left ring-1 ring-inset ring-holst-950/5"
          onClick={() => {
            simulate({ merchant: ev.merchant, amount: ev.amount, category: ev.category, isNeed: ev.isNeed });
            onClose();
          }}
        >
          <span>
            <span className="block text-[12.5px] font-bold text-holst-950">
              {ev.merchant} {formatRM(ev.amount)}
            </span>
            <span className="block text-[10.5px] duo-muted">
              {ev.category.replaceAll('_', ' ')} · {ev.isNeed ? 'NEED' : 'WANT'}
            </span>
          </span>
          <span className="ct-chip">Simulate</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Judge Sandbox — the ONLY debug surface, and it lives inside the phone as a
 * bottom sheet so the App chrome stays 100% consumer-grade.
 *
 * Holds the sandbox clock controls, the payment-injection events, the
 * autonomy/permission ladder, the plan switch and the raw event feed.
 */
function JudgeSandboxSheet() {
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-holst-50/80 p-3 text-[11px] leading-relaxed duo-muted ring-1 ring-inset ring-holst-950/5">
        <span className="font-bold text-holst-800">Simulation only.</span> No real money moves. Fast-forward the
        clock to trigger time-based events, inject a mock merchant payment to fire the CFaR interceptor, or flip the
        permission ladder. Everything below is faithful to the shipped engine.
      </p>
      <SimulationToolbar />
      <EventFeed />
    </div>
  );
}

function SummarySheet({ onSimulate }: { onSimulate: () => void }) {
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const events = useCtrlPayStore((s) => s.events);
  const units = toStudentUnits(allowance);

  const last = [...events].reverse().find((e) => e.type === 'DAILY_SUMMARY');
  const spentToday = Number((last?.payload as { spentToday?: number } | undefined)?.spentToday ?? 0);

  return (
    <div className="space-y-3">
      <div className="ct-hero-radial p-4">
        <p className="ct-kicker text-holst-200/90">12:00 PM daily summary</p>
        <SplitAmount value={spentToday} size={34} tone="light" className="mt-2" />
        <p className="mt-1 text-[10.5px] text-holst-200/80">spent so far today</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="ct-pill-glass">Safe today {formatRM(allowance)}</span>
          <span className="ct-pill-glass">
            ≈ {units.mixedRiceMeals} rice · {units.bubbleTea} tea
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Spent this month</p>
          <p className="ct-int mt-1 text-[18px] text-holst-950">{formatRM(spentThisMonth)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Student units</p>
          <p className="ct-int mt-1 text-[18px] text-holst-950">
            {units.mixedRiceMeals}×{DEMO_CONFIG.studentUnits.campusMixedRice.toFixed(0)}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="ct-action ct-action-primary w-full justify-center py-3 text-[12.5px]"
        onClick={onSimulate}
      >
        <CreditCard className="h-4 w-4" /> Simulate an incoming payment
      </button>
    </div>
  );
}

function AiDrawer({
  segment,
  onSegment,
  listening,
  copilot,
}: {
  segment: AiSegment;
  onSegment: (s: AiSegment) => void;
  listening: boolean;
  copilot?: React.ReactNode;
}) {
  const segs: Array<{ id: AiSegment; icon: React.ElementType; label: string }> = [
    { id: 'OCR', icon: Camera, label: 'OCR scan' },
    { id: 'VOICE', icon: Mic, label: 'Voice' },
    { id: 'COPILOT', icon: Sparkles, label: 'Copilot' },
  ];

  return (
    <div className="space-y-3">
      <div className="ct-seg w-full justify-between">
        {segs.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              data-on={segment === s.id}
              className="ct-seg-btn flex-1 justify-center"
              onClick={() => onSegment(s.id)}
            >
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      {segment === 'OCR' && (
        <MultimodalBookkeeping key="ocr" defaultOpen defaultMode="RECEIPT" />
      )}
      {segment === 'VOICE' && (
        <MultimodalBookkeeping key="voice" defaultOpen defaultMode="VOICE" autoStartVoice={listening} />
      )}
      {segment === 'COPILOT' && (
        <div className="h-[52vh]">{copilot ?? <AgentChat withBookkeeping={false} />}</div>
=======

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
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

export function MobileAppShell({ copilot, initialTab = 'home', className }: MobileAppShellProps) {
  const [tab, setTab] = React.useState<MobileTab>(initialTab);
  const [sheet, setSheet] = React.useState<SheetId>('none');
  const [segment, setSegment] = React.useState<AiSegment>('OCR');
  const [listening, setListening] = React.useState(false);
  const [downgradeId, setDowngradeId] = React.useState<string | null>(null);
  const [goalId, setGoalId] = React.useState<string | null>(null);

  const goals = useGoals();
  const activeGoal = goals.find((g) => g.id === goalId) ?? null;

  const openSheet = React.useCallback((s: SheetId) => {
    setListening(false);
    setSheet(s);
  }, []);
  const closeSheet = React.useCallback(() => {
    setListening(false);
    setSheet('none');
  }, []);

  const openOcr = React.useCallback(() => {
    setSegment('OCR');
    setSheet('ai');
  }, []);
  const openVoice = React.useCallback(() => {
    setSegment('VOICE');
    setListening(true);
    setSheet('ai');
  }, []);
  const releaseVoice = React.useCallback(() => setListening(false), []);

  const aiOpen = sheet === 'ai';
  const listeningActive = aiOpen && segment === 'VOICE' && listening;

  return (
    <div
      className={cn(
        // Explicit iPhone-class viewport. On narrow devices it becomes the whole screen.
        'duo-phone relative flex h-[932px] max-h-[calc(100svh-64px)] w-[430px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-phone',
        'max-[500px]:h-[100dvh] max-[500px]:max-h-none max-[500px]:w-full max-[500px]:max-w-none max-[500px]:rounded-none',
        className,
      )}
    >
      <StatusBar onOpenSandbox={() => openSheet('sandbox')} />

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto no-scrollbar px-4 pb-[104px] pt-1">
          {tab === 'home' && <HomeTab onOpenSheet={openSheet} onGoTab={setTab} />}
          {tab === 'timeline' && <TimelineTab goals={goals} onOpenGoal={setGoalId} />}
          {tab === 'radar' && <RadarTab onVerifyStudent={() => setDowngradeId('spotify_my')} />}
          {tab === 'vault' && <VaultTab onOpenAudit={() => openSheet('audit')} />}
        </div>
      </div>

      {/* Floating glass dock + multimodal AI orb */}
      <nav className="ct-dock" aria-label="Primary">
        <DockButton item={DOCK_ITEMS[0]} active={tab === 'home'} onSelect={setTab} />
        <DockButton item={DOCK_ITEMS[1]} active={tab === 'timeline'} onSelect={setTab} />
        <AiOrb listening={listeningActive} onTap={openOcr} onHold={openVoice} onRelease={releaseVoice} />
        <DockButton item={DOCK_ITEMS[2]} active={tab === 'radar'} onSelect={setTab} />
        <DockButton item={DOCK_ITEMS[3]} active={tab === 'vault'} onSelect={setTab} />
      </nav>

      <PhoneSheet
        open={aiOpen}
        onClose={closeSheet}
        title="CtrlPay multimodal"
        subtitle={segment === 'VOICE' && listening ? 'Listening… release or stop to capture' : 'OCR · voice · copilot'}
      >
        <AiDrawer
          segment={segment}
          onSegment={(s) => {
            setSegment(s);
            if (s !== 'VOICE') setListening(false);
          }}
          listening={listeningActive}
          copilot={copilot}
        />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'expense'} onClose={closeSheet} title="Add an expense" subtitle="Confirm before book">
        <MultimodalBookkeeping defaultOpen />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'payments'} onClose={closeSheet} title="Simulate a payment" subtitle="Judge controls">
        <PaymentsSheet onClose={closeSheet} />
      </PhoneSheet>

      <PhoneSheet
        open={sheet === 'notifications'}
        onClose={closeSheet}
        title="Notifications"
        subtitle="Proactive events"
      >
        <EventFeed bare />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'summary'} onClose={closeSheet} title="Daily summary" subtitle="12:00 PM snapshot">
        <SummarySheet onSimulate={() => openSheet('payments')} />
      </PhoneSheet>

      <PhoneSheet
        open={sheet === 'sandbox'}
        onClose={closeSheet}
        title="Judge sandbox"
        subtitle="Clock · payment injection · event feed"
      >
        <JudgeSandboxSheet />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'commitments'} onClose={closeSheet} title="Commitment devices" subtitle="Quarantines & sweeps">
        <QuarantineCards />
      </PhoneSheet>

      <PhoneSheet
        open={sheet === 'audit'}
        onClose={closeSheet}
        title="Audit hash chain"
        subtitle="Append-only · SHA-256"
      >
        <AuditDrawer />
      </PhoneSheet>

      <PhoneSheet
        open={activeGoal !== null}
        onClose={() => setGoalId(null)}
        title={activeGoal?.title ?? 'Milestone'}
        subtitle="Zoom-in · what-if projection"
      >
        {activeGoal && <GoalZoom key={activeGoal.id} goal={activeGoal} />}
      </PhoneSheet>

      <StudentDowngradeDrawer
        subscriptionId={downgradeId ?? 'spotify_my'}
        open={downgradeId !== null}
        onClose={() => setDowngradeId(null)}
      />

      <PaymentInterceptorModal />
    </div>
  );
}
