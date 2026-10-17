'use client';

import * as React from 'react';
import { ChevronDown, HandCoins, Receipt, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatisticPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

/**
 * Undulating monthly points matching Image 1 right screen:
 * Feb -> Mar -> Apr -> May -> Jun (Peak) -> Jul -> Aug
 */
const DEFAULT_MONTHLY_POINTS: StatisticPoint[] = [
  { label: 'Jan', value: 3200, secondaryValue: 2400 },
  { label: 'Feb', value: 4100, secondaryValue: 3100 },
  { label: 'Mar', value: 2900, secondaryValue: 2200 },
  { label: 'Apr', value: 5400, secondaryValue: 4000 },
  { label: 'May', value: 3600, secondaryValue: 2800 },
  { label: 'Jun', value: 6890, secondaryValue: 4890 },
  { label: 'Jul', value: 4300, secondaryValue: 3200 },
  { label: 'Aug', value: 7250, secondaryValue: 5300 },
];

const DEFAULT_WEEKLY_POINTS: StatisticPoint[] = [
  { label: 'Mon', value: 320, secondaryValue: 250 },
  { label: 'Tue', value: 480, secondaryValue: 360 },
  { label: 'Wed', value: 290, secondaryValue: 210 },
  { label: 'Thu', value: 650, secondaryValue: 490 },
  { label: 'Fri', value: 1120, secondaryValue: 840 },
  { label: 'Sat', value: 1450, secondaryValue: 980 },
  { label: 'Sun', value: 890, secondaryValue: 620 },
];

/**
 * Builds a silky smooth undulating cubic Bézier curve matching the rhythmic wave
 * in top Behance & Dribbble FinTech concept art.
 */
function buildWavePath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    const c1x = p0.x + dx * 0.45;
    const c1y = p0.y;
    const c2x = p0.x + dx * 0.55;
    const c2y = p1.y;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

export interface SpendingStatisticChartProps {
  points?: StatisticPoint[];
  incomeAmount?: number;
  expenseAmount?: number;
  floor?: number;
  showLimits?: boolean;
  onToggleLimits?: () => void;
  limitsContent?: React.ReactNode;
  className?: string;
}

export function SpendingStatisticChart({
  points,
  incomeAmount = 2400,
  expenseAmount = 754.33,
  floor = 20,
  showLimits,
  onToggleLimits,
  limitsContent,
  className,
}: SpendingStatisticChartProps) {
  const [timeframe, setTimeframe] = React.useState<'Month' | 'Week'>('Month');
  const activeDataset = points ?? (timeframe === 'Month' ? DEFAULT_MONTHLY_POINTS : DEFAULT_WEEKLY_POINTS);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(5); // Default to Jun peak
  const [isHovering, setIsHovering] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const W = 340;
  const H = 140;
  const PAD_Y = 16;
  const PAD_X = 18;

  const minVal = Math.min(...activeDataset.map((p) => p.value), 0);
  const maxVal = Math.max(...activeDataset.map((p) => p.value), 1);
  const span = maxVal - minVal || 1;

  // Primary curve coords
  const primaryCoords = React.useMemo(() => {
    const n = activeDataset.length;
    return activeDataset.map((p, i) => {
      const x = PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
      const y = PAD_Y + (1 - (p.value - minVal) / span) * (H - PAD_Y * 2);
      return { x, y, ...p };
    });
  }, [activeDataset, minVal, span]);

  // Secondary companion ghost curve coords (layered line from Dribbble concept art)
  const secondaryCoords = React.useMemo(() => {
    const n = activeDataset.length;
    return activeDataset.map((p, i) => {
      const secVal = p.secondaryValue ?? p.value * 0.72;
      const x = PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
      const y = PAD_Y + (1 - (secVal - minVal) / span) * (H - PAD_Y * 2);
      return { x, y };
    });
  }, [activeDataset, minVal, span]);

  const primaryWaveD = React.useMemo(() => buildWavePath(primaryCoords), [primaryCoords]);
  const secondaryWaveD = React.useMemo(() => buildWavePath(secondaryCoords), [secondaryCoords]);

  // Pointer scrubbing
  const handlePointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const frac = Math.max(0, Math.min(1, relX / rect.width));
    const closestIdx = Math.round(frac * (activeDataset.length - 1));
    setActiveIdx(closestIdx);
  };

  const activeCoord = activeIdx !== null && primaryCoords[activeIdx] ? primaryCoords[activeIdx] : null;

  return (
    <section
      className={cn(
        'relative rounded-[32px] bg-gradient-to-b from-white/95 via-white/90 to-white/95 p-5 shadow-[0_20px_50px_-15px_rgba(11,30,63,0.14)] border border-white/80 backdrop-blur-xl',
        className,
      )}
    >
      {/* Top Header: +2.50% & Total Spending on left, Timeframe Pill on right */}
      <header className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wide text-[#10B981]">
            <TrendingUp className="h-3 w-3" />
            <span>+ 2.50% vs last month</span>
          </div>
          <h2 className="text-[20px] font-black tracking-tight text-[#0B1E3F]">Total Spending</h2>
        </div>

        {/* High-end Dribbble pill switcher */}
        <div className="flex items-center rounded-full bg-[#F1F5F9] p-1 border border-[#E2E8F0]/60">
          {(['Month', 'Week'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTimeframe(t);
                setActiveIdx(t === 'Month' ? 5 : 4);
              }}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-extrabold transition-all duration-200',
                timeframe === t
                  ? 'bg-[#0B1E3F] text-white shadow-sm scale-100'
                  : 'text-[#64748B] hover:text-[#0B1E3F]',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Undulating Line Wave Curve Section with Volumetric Glow & Accent Pillars */}
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          setIsHovering(true);
          handlePointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || isHovering) handlePointer(e.clientX);
        }}
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
        className="relative mt-3 cursor-ew-resize select-none touch-none"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[145px] w-full overflow-visible"
          aria-hidden
        >
          <defs>
            {/* Multi-stop volumetric area gradient with subtle liquid glow */}
            <linearGradient id="behance-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
              <stop offset="45%" stopColor="#60A5FA" stopOpacity="0.14" />
              <stop offset="85%" stopColor="#818CF8" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing neon stroke gradient with living liquid flow */}
            <linearGradient id="behance-neon-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1C7EC8">
                <animate attributeName="stop-color" values="#1C7EC8;#38BDF8;#2563EB;#1C7EC8" dur="6s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#2563EB">
                <animate attributeName="stop-color" values="#2563EB;#1C7EC8;#06B6D4;#2563EB" dur="6s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#06B6D4">
                <animate attributeName="stop-color" values="#06B6D4;#60A5FA;#1C7EC8;#06B6D4" dur="6s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            {/* Glowing active pillar bar gradient */}
            <linearGradient id="active-pillar-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.05" />
            </linearGradient>

            {/* Soft drop-shadow glow filter */}
            <filter id="dribbble-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#1C7EC8" floodOpacity="0.32" />
            </filter>
          </defs>

          {/* Background vertical frosted accent pillars for each point */}
          {primaryCoords.map((coord, i) => {
            const isActive = i === activeIdx;
            const barW = 28;
            return (
              <rect
                key={coord.label}
                x={coord.x - barW / 2}
                y={PAD_Y}
                width={barW}
                height={H - PAD_Y}
                rx="8"
                fill={isActive ? 'url(#active-pillar-glow)' : 'rgba(30, 64, 175, 0.025)'}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Volumetric glow area fill under the curve */}
          <path
            d={`${primaryWaveD} L ${W - PAD_X} ${H} L ${PAD_X} ${H} Z`}
            fill="url(#behance-area-fill)"
          />

          {/* Secondary companion dashed curve creating rhythmic depth */}
          <path
            d={secondaryWaveD}
            fill="none"
            stroke="#93C5FD"
            strokeWidth="2.2"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.65"
          />

          {/* Primary glowing neon curve */}
          <path
            d={primaryWaveD}
            fill="none"
            stroke="url(#behance-neon-stroke)"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#dribbble-glow)"
          />

          {/* Active scrubber dot and glowing vertical guide */}
          {activeCoord && (
            <g className="transition-all duration-150">
              {/* Vertical dashed guide line */}
              <line
                x1={activeCoord.x}
                y1={PAD_Y}
                x2={activeCoord.x}
                y2={H}
                stroke="#1C7EC8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />

              {/* Outer soft pulse ring */}
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="11"
                fill="rgba(56, 189, 248, 0.24)"
              />

              {/* Inner glowing white dot with cyan halo */}
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="5.5"
                fill="#FFFFFF"
                stroke="#1C7EC8"
                strokeWidth="3.5"
                className="drop-shadow-md"
              />
            </g>
          )}
        </svg>

        {/* Floating Glassmorphic Tooltip with safe bounds */}
        {activeCoord && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-full bg-[#0B1E3F]/95 backdrop-blur-md px-3 py-1 text-[11px] font-black text-white shadow-[0_8px_20px_rgba(11,30,63,0.35)] border border-[#38BDF8]/40 transition-all flex items-center gap-1.5 z-20"
            style={{
              left: `${Math.max(16, Math.min(84, (activeCoord.x / W) * 100))}%`,
              top: `${Math.max(22, (activeCoord.y / H) * 100 - 8)}%`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
            <span>${activeCoord.value.toLocaleString()}</span>
          </div>
        )}

        {/* Month / Period Axis Labels */}
        <div className="mt-2.5 flex items-center justify-between px-2 text-[11.5px] font-semibold text-[#0B1E3F]/60">
          {activeDataset.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                'relative py-1 transition-all duration-150',
                i === activeIdx
                  ? 'font-black text-[#0B1E3F] scale-110'
                  : 'hover:text-[#0B1E3F]/90',
              )}
            >
              {p.label}
              {i === activeIdx && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#1C7EC8]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Two Luxury Behance FinTech Companion Cards */}
      <div className="mt-4 space-y-2.5">
        {/* Card 1: Income */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#1C7EC8] via-[#2563EB] to-[#0284C7] p-3.5 text-white shadow-[0_10px_24px_rgba(28,126,200,0.22)] transition-transform active:scale-[0.98] cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur-md shadow-inner">
              <HandCoins className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[15.5px] font-black leading-tight tracking-tight">+${incomeAmount.toLocaleString()}</p>
              <p className="text-[11px] font-semibold text-white/80">Monthly Income</p>
            </div>
          </div>
          {/* Silky white sparkline wave with round cap */}
          <svg width="68" height="26" viewBox="0 0 68 26" fill="none" className="shrink-0" aria-hidden>
            <path
              d="M 2 18 C 14 6, 26 22, 38 10 C 48 2, 58 18, 66 8"
              stroke="#FFFFFF"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Card 2: Expense */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0B1E3F] via-[#112B58] to-[#1E3A8A] p-3.5 text-white shadow-[0_10px_24px_rgba(11,30,63,0.25)] transition-transform active:scale-[0.98] cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur-md shadow-inner">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[15.5px] font-black leading-tight tracking-tight">-${expenseAmount.toLocaleString()}</p>
              <p className="text-[11px] font-semibold text-white/80">Monthly Expense</p>
            </div>
          </div>
          {/* Silky white sparkline wave with round cap */}
          <svg width="68" height="26" viewBox="0 0 68 26" fill="none" className="shrink-0" aria-hidden>
            <path
              d="M 2 12 C 14 20, 26 4, 38 18 C 48 8, 56 16, 66 6"
              stroke="#FFFFFF"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Optional Survival Floor & Limits Toggle */}
      {onToggleLimits && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#0B1E3F]/5 pt-2.5">
          <p className="text-[10.5px] font-medium text-[#0B1E3F]/75">
            Survival floor <span className="font-extrabold text-[#0B1E3F]">${floor}/day</span>{' '}
            <span className="font-bold text-[#10B981]">safe ✓</span>
          </p>
          <button
            type="button"
            className="ct-chip shrink-0 px-2.5 py-1 text-[11px]"
            onClick={onToggleLimits}
            aria-expanded={showLimits}
          >
            <SlidersHorizontal className="mr-1 h-3 w-3 text-[#1C7EC8]" /> Limits
            <ChevronDown className={cn('ml-1 h-3 w-3 transition-transform', showLimits && 'rotate-180')} />
          </button>
        </div>
      )}

      {showLimits && limitsContent && <div className="mt-2.5">{limitsContent}</div>}
    </section>
  );
}
