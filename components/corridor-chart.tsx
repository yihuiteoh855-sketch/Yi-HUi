'use client';

import * as React from 'react';
import { cn, formatRM } from '@/lib/utils';

export interface CorridorPoint {
  /** Axis label, e.g. a weekday. */
  label: string;
  /** Normal balance path (upper boundary). */
  upper: number;
  /** 95% CFaR / ES95 tail lower boundary. */
  lower: number;
  /** Small chip under the axis label (e.g. a scheduled deduction). */
  note?: string;
}

const W = 360;
const H = 176;
const PAD_TOP = 44;
const PAD_BOTTOM = 26;
const PAD_X = 26;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface CorridorBill {
  dueDay: number;
  amountRM: number;
  paid: boolean;
}

/**
 * Projects the next N days into a corridor: the upper boundary is the normal balance path
 * (allowance + scheduled bills, minus any proposed spend on day 0) and the lower boundary
 * is that path minus the engine's ES95 tail, widening with √t (diffusion scaling).
 */
export function buildCorridor({
  clock,
  balance,
  allowance,
  bills,
  tail,
  proposedOnDay0 = 0,
  days = 7,
}: {
  clock: number;
  balance: number;
  allowance: number;
  bills: CorridorBill[];
  tail: number;
  proposedOnDay0?: number;
  days?: number;
}): { points: CorridorPoint[]; riskIndex: number } {
  const today = new Date(clock).getUTCDate();
  const points: CorridorPoint[] = [];
  let bal = balance - proposedOnDay0;

  for (let i = 0; i < days; i++) {
    const due = bills
      .filter((b) => !b.paid && b.dueDay === today + i)
      .reduce((sum, b) => sum + b.amountRM, 0);
    if (i > 0) bal -= allowance;
    bal -= due;
    const widen = tail * Math.sqrt(i / Math.max(1, days - 1));
    const day = new Date(clock + i * 86_400_000);
    points.push({
      label: WEEKDAYS[day.getUTCDay()],
      upper: Math.round(bal * 100) / 100,
      lower: Math.round((bal - widen) * 100) / 100,
      note: due > 0 ? `-${formatRM(due)}` : undefined,
    });
  }

  const riskIndex = points.reduce((best, p, i) => (p.upper < points[best].upper ? i : best), 0);
  return { points, riskIndex };
}

/**
 * 45° hatched corridor band: every node carries a 4px dot on the normal balance path and
 * one on the tail bound, the two boundaries are joined into a polygon and the key risk day
 * gets a dumbbell plus a white capsule showing the exact money.
 */
export function CorridorChart({
  points,
  riskIndex,
  idPrefix = 'ct-corridor',
  className,
}: {
  points: CorridorPoint[];
  riskIndex: number;
  idPrefix?: string;
  className?: string;
}) {
  const n = Math.max(points.length, 1);
  const all = points.flatMap((p) => [p.upper, p.lower]);
  const rawMax = Math.max(...all, 1);
  const rawMin = Math.min(...all);
  // 8% headroom so the risk capsule and the tail dots never touch the frame.
  const pad = (rawMax - rawMin || 1) * 0.08;
  const max = rawMax + pad;
  const min = rawMin - pad;
  const span = max - min || 1;

  const x = (i: number) => (n <= 1 ? W / 2 : PAD_X + (i / (n - 1)) * (W - PAD_X * 2));
  const y = (v: number) => PAD_TOP + (1 - (v - min) / span) * (H - PAD_TOP - PAD_BOTTOM);

  const upper = points.map((p, i) => ({ x: x(i), y: y(p.upper) }));
  const lower = points.map((p, i) => ({ x: x(i), y: y(p.lower) }));

  const band = [
    ...upper.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ...[...lower].reverse().map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    'Z',
  ].join(' ');

  const risk = Math.max(0, Math.min(riskIndex, n - 1));
  const riskUpper = upper[risk];
  const riskLower = lower[risk];
  const riskPoint = points[risk];

  const hatchId = `${idPrefix}-hatch`;
  const clipId = `${idPrefix}-clip`;
  const capId = `${idPrefix}-cap`;

  const frac = riskUpper.x / W;
  // Keep the capsule inside the card and slide its caret back under the risk dot.
  const tx = frac > 0.62 ? -92 : frac < 0.38 ? -8 : -50;
  const caret = frac > 0.62 ? 92 : frac < 0.38 ? 8 : 50;

  return (
    <div className={cn('relative', className)}>
      {/* Positioning box for the capsule: matches the SVG box exactly. */}
      <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[176px] w-full" aria-hidden>
        <defs>
          <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#0A3D4A" strokeWidth="3" strokeOpacity="0.34" />
          </pattern>
          <linearGradient id={capId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D8B94" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#98D8D0" stopOpacity="0.05" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d={band} />
          </clipPath>
        </defs>

        {/* Hatched corridor interior. */}
        <path d={band} fill={`url(#${capId})`} />
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={W} height={H} fill={`url(#${hatchId})`} />
        </g>

        {/* Upper + lower boundaries. */}
        <path
          d={upper.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke="#04222B"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={lower.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke="#0A3D4A"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />

        {/* 4px node dots on both boundaries. */}
        {upper.map((p, i) => (
          <circle key={`u${i}`} cx={p.x} cy={p.y} r="2" fill="#04222B" />
        ))}
        {lower.map((p, i) => (
          <circle key={`l${i}`} cx={p.x} cy={p.y} r="2" fill="#0A3D4A" fillOpacity="0.6" />
        ))}

        {/* Dumbbell on the key risk day. */}
        <line
          x1={riskUpper.x}
          y1={riskUpper.y}
          x2={riskLower.x}
          y2={riskLower.y}
          stroke="#B3253F"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={riskUpper.x} cy={riskUpper.y} r="4.4" fill="#04222B" stroke="#FFFFFF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={riskLower.x} cy={riskLower.y} r="4.4" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* White capsule on the risk day. */}
      <span
        className="ct-chart-bubble"
        style={{
          left: `${(riskUpper.x / W) * 100}%`,
          top: `${(riskUpper.y / H) * 100}%`,
          transform: `translate(${tx}%, -132%)`,
          ['--caret-x' as string]: `${caret}%`,
        }}
      >
        {riskPoint ? formatRM(riskPoint.upper) : ''}
        <span className="ml-1 font-bold text-holst-950/50">
          ↓ {riskPoint ? formatRM(riskPoint.lower) : ''}
        </span>
      </span>
      </div>

      {/* Axis. */}
      <div className="relative mt-1 h-8">
        {points.map((p, i) => (
          <span
            key={`${p.label}-${i}`}
            className={cn(
              'absolute top-0 -translate-x-1/2 text-center text-[9px] font-bold uppercase tracking-[0.06em]',
              i === risk ? 'text-[#B3253F]' : 'duo-muted',
            )}
            style={{ left: `${(x(i) / W) * 100}%` }}
          >
            {p.label}
            {p.note && (
              <span className="mt-0.5 block whitespace-nowrap text-[8.5px] font-extrabold tracking-normal text-[#04222B]">
                {p.note}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The Expense-Overview card that hosts a corridor band: ice-mint rounded-[28px] surface, a
 * 42px thin-stroke circle + title on the left, calendar and ↗ round buttons on the right.
 */
export function CorridorCard({
  icon: Icon,
  kicker,
  title,
  badge,
  points,
  riskIndex,
  metrics,
  footer,
  children,
  className,
  onDrill,
  defaultOpen = false,
  calendarLabel = 'Toggle day breakdown',
  drillLabel = 'Run to the end of the corridor',
}: {
  icon: React.ElementType;
  kicker: string;
  title: string;
  badge?: React.ReactNode;
  points: CorridorPoint[];
  riskIndex: number;
  metrics: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onDrill?: () => void;
  defaultOpen?: boolean;
  calendarLabel?: string;
  drillLabel?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className={cn('ct-corridor p-4', className)}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="ct-corridor-icon shrink-0">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="ct-kicker duo-muted">{kicker}</p>
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-holst-950">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="ct-round-btn"
            aria-label={calendarLabel}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <CalendarGlyph />
          </button>
          <button type="button" className="ct-round-btn" aria-label={drillLabel} onClick={onDrill}>
            <DrillGlyph />
          </button>
        </div>
      </header>

      {badge && <div className="mt-2.5">{badge}</div>}

      <CorridorChart points={points} riskIndex={riskIndex} className="mt-2" />

      <div className="mt-2">{metrics}</div>

      {footer && <div className="mt-3">{footer}</div>}

      {open && children && <div className="mt-3">{children}</div>}
    </section>
  );
}

function CalendarGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.8" y="3" width="12.4" height="11.2" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.8 6.6h12.4M5.4 1.8v2.6M10.6 1.8v2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DrillGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4.4 11.6 11.6 4.4M5.6 4.4h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
