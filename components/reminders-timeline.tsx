'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo, type BrandId } from '@/components/brand-logos';
import { GoalsAscent, useGoals } from '@/components/goals-ascent';

export interface ReminderItem {
  id: string;
  brand: BrandId;
  title: string;
  subtitle: string;
  amount: number;
  time: string;
  dateStr: string; // e.g. "TUESDAY 12, 2026"
  dayNum: number; // e.g. 12
  ringColor: string; // e.g. "#6366F1" or "#F59E0B"
  category: string;
  billingCycle: string;
}

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'netflix',
    brand: 'netflix',
    title: 'Netflix Premium',
    subtitle: '9:00 AM · Monthly renewal',
    amount: 25.86,
    time: '9:00 AM',
    dateStr: 'TUESDAY 12, 2026',
    dayNum: 12,
    ringColor: '#6366F1',
    category: 'Streaming · Entertainment',
    billingCycle: 'Monthly · Since Nov, 2024',
  },
  {
    id: 'spotify',
    brand: 'spotify',
    title: 'Spotify Individual',
    subtitle: '2:30 PM · Music streaming',
    amount: 16.43,
    time: '2:30 PM',
    dateStr: 'TUESDAY 12, 2026',
    dayNum: 12,
    ringColor: '#F59E0B',
    category: 'Music · Audio & Podcasts',
    billingCycle: 'Monthly · Since Jan, 2023',
  },
  {
    id: 'claude',
    brand: 'claude',
    title: 'Claude Max',
    subtitle: '12:00 AM · Monthly renewal',
    amount: 299.0,
    time: '12:00 AM',
    dateStr: 'FRIDAY 15, 2026',
    dayNum: 15,
    ringColor: '#6366F1',
    category: 'AI & Developer · Anthropic',
    billingCycle: 'Monthly · Since Feb, 2025',
  },
  {
    id: 'figma',
    brand: 'figma',
    title: 'Figma (Professional)',
    subtitle: '4:30 PM · Creative design',
    amount: 12.0,
    time: '4:30 PM',
    dateStr: 'FRIDAY 15, 2026',
    dayNum: 15,
    ringColor: '#F59E0B',
    category: 'Design & Collaboration',
    billingCycle: 'Monthly · Since Mar, 2024',
  },
  {
    id: 'apple',
    brand: 'apple',
    title: 'Apple One',
    subtitle: '11:00 AM · 2TB Cloud storage',
    amount: 19.9,
    time: '11:00 AM',
    dateStr: 'MONDAY 18, 2026',
    dayNum: 18,
    ringColor: '#3B82F6',
    category: 'Cloud Storage · Backup',
    billingCycle: 'Monthly · Since Aug, 2022',
  },
  {
    id: 'youtube',
    brand: 'youtube',
    title: 'YouTube Premium',
    subtitle: '6:00 PM · Ad-free streaming',
    amount: 17.9,
    time: '6:00 PM',
    dateStr: 'TUESDAY 23, 2026',
    dayNum: 23,
    ringColor: '#EF4444',
    category: 'Video & Music · Family',
    billingCycle: 'Monthly · Since Oct, 2023',
  },
  {
    id: 'chatgpt',
    brand: 'chatgpt',
    title: 'ChatGPT Plus',
    subtitle: '10:00 AM · GPT-4o Reasoning',
    amount: 20.0,
    time: '10:00 AM',
    dateStr: 'MONDAY 25, 2026',
    dayNum: 25,
    ringColor: '#10B981',
    category: 'AI & Copilot · OpenAI',
    billingCycle: 'Monthly · Since Jan, 2024',
  },
  {
    id: 'disney',
    brand: 'disney',
    title: 'Disney+ Hotstar',
    subtitle: '3:00 PM · Quarterly fee',
    amount: 13.3,
    time: '3:00 PM',
    dateStr: 'THURSDAY 28, 2026',
    dayNum: 28,
    ringColor: '#F59E0B',
    category: 'Streaming · Movies',
    billingCycle: 'Quarterly · Since Dec, 2024',
  },
];

// Days in May 2026: 1 to 31.
// Starts on Friday (index 5 of SUN=0, MON=1, TUE=2, WED=3, THU=4, FRI=5, SAT=6).
const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function RemindersTimeline({
  onBack,
  onOpenSheet,
}: {
  onBack?: () => void;
  onOpenSheet?: (s: any) => void;
}) {
  const goals = useGoals();
  const [viewMode, setViewMode] = React.useState<'timeline' | 'ascent'>('timeline');
  const [selectedDay, setSelectedDay] = React.useState<number>(12);
  const [activeItem, setActiveItem] = React.useState<ReminderItem | null>(null);

  // Group reminders by date string
  const groupedReminders = React.useMemo(() => {
    const map = new Map<string, ReminderItem[]>();
    for (const r of DEFAULT_REMINDERS) {
      const list = map.get(r.dateStr) ?? [];
      list.push(r);
      map.set(r.dateStr, list);
    }
    return Array.from(map.entries());
  }, []);

  // Calendar dates layout: 5 leading empties for May 2026 (starts on Friday)
  const calendarCells = React.useMemo(() => {
    const cells: Array<{ day: number | null; dots?: string[] }> = [];
    for (let i = 0; i < 5; i++) cells.push({ day: null });
    for (let d = 1; d <= 31; d++) {
      let dots: string[] | undefined;
      if (d === 3 || d === 5) dots = ['#10B981'];
      else if (d === 15) dots = ['#F59E0B', '#F59E0B'];
      else if (d === 18 || d === 23 || d === 25) dots = ['#3B82F6'];
      else if (d === 28) dots = ['#F59E0B'];
      cells.push({ day: d, dots });
    }
    return cells;
  }, []);

  if (viewMode === 'ascent') {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3">
        <header className="flex items-center justify-between pt-1 px-1">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white transition-all active:scale-95"
            aria-label="Back to Reminders"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center rounded-full bg-white/80 p-0.5 border border-white/90 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className="rounded-full px-3 py-1 text-[11px] font-black text-[#64748B] hover:text-[#0B1E3F]"
            >
              Reminders
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ascent')}
              className="rounded-full bg-[#0B1E3F] px-3 py-1 text-[11px] font-black text-white shadow-xs"
            >
              Goals 🏔️
            </button>
          </div>

          <div className="w-9" />
        </header>

        <GoalsAscent goals={goals} onOpenGoal={(id) => onOpenSheet?.(id)} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in -mx-1 pb-16 space-y-4">
      {/* 1. Header matching Image 3: Back arrow, Reminders, Prev/Next buttons */}
      <header className="flex items-center justify-between pt-1 px-1">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white transition-all active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center rounded-full bg-white/80 p-0.5 border border-white/90 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className="rounded-full bg-[#0B1E3F] px-3 py-1 text-[11px] font-black text-white shadow-xs"
          >
            Reminders
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ascent')}
            className="rounded-full px-3 py-1 text-[11px] font-black text-[#64748B] hover:text-[#0B1E3F]"
          >
            Goals 🏔️
          </button>
        </div>

        <div className="flex items-center rounded-full bg-white/80 border border-white/90 p-0.5 shadow-sm">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-[#64748B] hover:text-[#0B1E3F] hover:bg-white/60 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-[#64748B] hover:text-[#0B1E3F] hover:bg-white/60 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Subheader: May 12, 2026 & 8 active subscriptions */}
      <div className="flex items-baseline justify-between px-2 pt-1">
        <h2 className="text-[20px] font-black tracking-tight text-[#0B1E3F]">
          May {selectedDay}, 2026
        </h2>
        <span className="text-[12px] font-semibold text-[#64748B]">
          8 active subscriptions
        </span>
      </div>

      {/* 3. Frosted Translucent Calendar Widget */}
      <section className="relative rounded-[30px] bg-gradient-to-b from-white/95 via-white/85 to-white/90 p-4 shadow-[0_12px_36px_rgba(11,30,63,0.06)] border border-white/90 backdrop-blur-xl">
        {/* Subtle background ambient glow behind calendar */}
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-[30px] bg-gradient-to-tr from-[#93C5FD]/20 via-[#DDD6FE]/15 to-transparent blur-xl" />

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-[10.5px] font-extrabold tracking-wider text-[#94A3B8]">
          {DAYS_OF_WEEK.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
          {calendarCells.map((c, idx) => {
            if (!c.day) {
              return <div key={`empty-${idx}`} className="h-9 w-9" />;
            }

            const isSelected = c.day === selectedDay;
            const hasBills = Boolean(c.dots && c.dots.length > 0);

            return (
              <button
                key={`day-${c.day}`}
                type="button"
                onClick={() => setSelectedDay(c.day!)}
                className="group relative flex flex-col items-center justify-center py-1 transition-transform active:scale-90"
              >
                <div
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold transition-all duration-150',
                    isSelected
                      ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/40 scale-105'
                      : 'text-[#1E293B] hover:bg-black/5'
                  )}
                >
                  {c.day}
                </div>

                {/* Sub-badge / Dots */}
                {isSelected ? (
                  <div className="mt-0.5 flex items-center justify-center">
                    <span className="h-1 w-3 rounded-full bg-[#2563EB]" />
                  </div>
                ) : (
                  <div className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                    {c.dots?.map((dotColor, dotIdx) => (
                      <span
                        key={dotIdx}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Timeline Section */}
      <section className="space-y-4 pt-1">
        {groupedReminders.map(([dateStr, items]) => {
          const isToday = dateStr.includes('12');
          return (
            <div key={dateStr} className="space-y-2.5">
              {/* Date Header + Badge */}
              <div className="flex items-center justify-between px-2 pt-1">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-[#0B1E3F]">
                  {dateStr}
                </h3>
                <span className="text-[11.5px] font-bold text-[#64748B]">
                  {isToday ? 'Today' : `${items.length} reminders`}
                </span>
              </div>

              {/* Connected Timeline Items */}
              <div className="relative pl-6 space-y-2.5">
                {/* Vertical continuous connector line */}
                <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-[#E2E8F0]" />

                {items.map((item) => (
                  <div key={item.id} className="relative flex items-center gap-3">
                    {/* Ring Node on Timeline */}
                    <div
                      className="absolute -left-6 grid h-4 w-4 place-items-center rounded-full bg-white border-2 shadow-xs z-10"
                      style={{ borderColor: item.ringColor }}
                    >
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: item.ringColor }}
                      />
                    </div>

                    {/* Subscription Card */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveItem(item)}
                      className="flex flex-1 items-center justify-between rounded-2xl bg-white/95 p-3.5 shadow-sm border border-white/80 hover:bg-white transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BrandLogo brand={item.brand} className="h-10 w-10 p-2" />
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[15px] font-extrabold text-[#0B1E3F] leading-tight">
                            {item.title}
                          </h4>
                          <p className="truncate text-[11px] font-semibold text-[#64748B] mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <p className="text-[15.5px] font-black text-[#0B1E3F] leading-tight">
                          ${item.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] font-bold text-[#64748B] mt-0.5">
                          per month
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Floating Add Button (+) in bottom right */}
      <button
        type="button"
        onClick={() => onOpenSheet?.('expense')}
        className="fixed right-6 bottom-24 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-lg shadow-[#6366F1]/40 transition-transform active:scale-90 hover:scale-105 z-30"
        aria-label="Add reminder"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* 5. Subscription Manage Modal Drawer (matching left peek of Image 3) */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-white space-y-4 animate-slide-up">
            {/* Header: Logo, Title, Close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo brand={activeItem.brand} className="h-11 w-11 p-2" />
                <div>
                  <h3 className="text-[17px] font-black text-[#0B1E3F]">
                    {activeItem.title}
                  </h3>
                  <p className="text-[11px] font-bold text-[#64748B]">
                    ${activeItem.amount.toFixed(2)} / month
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1E3F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Action Buttons matching image: Pay now & Cancel */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#4F46E5] text-white text-[12.5px] font-black shadow-md shadow-[#4F46E5]/30 active:scale-95"
              >
                <span>Pay now</span>
                <span className="text-[14px]">↗</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#DC2626] text-white text-[12.5px] font-black shadow-md shadow-[#DC2626]/30 active:scale-95"
              >
                <span>Cancel</span>
                <span>✕</span>
              </button>
            </div>

            {/* Billing Cycle Card */}
            <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-[#E2E8F0]/60 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Billing Cycle
              </p>
              <p className="text-[13.5px] font-bold text-[#0B1E3F]">
                {activeItem.billingCycle}
              </p>
            </div>

            {/* Category Card */}
            <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-[#E2E8F0]/60 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Category
              </p>
              <p className="text-[13.5px] font-bold text-[#0B1E3F]">
                {activeItem.category}
              </p>
            </div>

            {/* Protection Toggles */}
            <div className="space-y-2 pt-1 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] font-bold text-[#0B1E3F]">
                  Auto-renewal Alert (3 days before)
                </span>
                <span className="text-[11.5px] font-extrabold text-[#10B981]">
                  ON ✓
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] font-bold text-[#0B1E3F]">
                  Anti-Impulse AI Quarantine
                </span>
                <span className="text-[11.5px] font-extrabold text-[#2563EB]">
                  Protected
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
