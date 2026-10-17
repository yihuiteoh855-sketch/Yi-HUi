'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, CircleDot } from 'lucide-react';

export interface ArcSegment {
  id: string;
  value: number;
  /** Stroke colour of the arc. */
  color: string;
  /** Colour of the text riding inside the band. */
  textColor: string;
  /** Hairline halo so a very pale arc still reads on a light surface. */
  outline?: boolean;
}

export interface ArcCapsule {
  id: string;
  icon: React.ElementType;
  label: string;
}

const CX = 140;
const CY = 140;
/** Centerline radius for 200px outer diameter (outer rim = 100px, band = 28px -> R = 86px, inner rim = 72px / 144px diameter). */
const R = 86;
/** Band thickness — 28px thick ink band per spec. */
const TH = 28;
/** Outer orbit where the 1px track line and the 3 capsule switchers ride. */
const ORBIT_TRACK = 100 + 8; // 108px
const ORBIT_CAPSULES = 120; // 120px center for 46x30 capsules

/** 3 capsule angles from ~10 o'clock to ~12 o'clock. */
const CAPSULE_ANGLES = [-54, -30, -6];

function polar(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

/** Generates SVG arc path between two angles with explicit direction. */
function arcPathDir(fromDeg: number, toDeg: number, r: number, clockwise: boolean): string {
  const a = polar(fromDeg, r);
  const b = polar(toDeg, r);
  let delta = toDeg - fromDeg;
  if (clockwise) {
    while (delta < 0) delta += 360;
    while (delta >= 360) delta -= 360;
  } else {
    while (delta > 0) delta -= 360;
    while (delta <= -360) delta += 360;
  }
  const large = Math.abs(delta) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} ${clockwise ? 1 : 0} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * Pixel-perfect Nexora / Behance 3-segment Arc Donut Gauge:
 *
 * 1. Inner Layer: 136px-144px pure clear center holding a single oversized 32px 800-weight total.
 * 2. Middle Layer: 200px outer diameter, 28px thickness, 3 rounded-cap segments:
 *    - Right-to-bottom main long arc (~210°, #04222B) with curved white 11px textPath
 *      (top label e.g. "Invested"/"Active", bottom amount e.g. "$120k"/"RM 960").
 *    - Lower-left short arc (~45°, #E2F4F0) with dark bold 11px text ("Profit"/"Saved").
 *    - Upper-left mid arc (~50°, #98D8D0) with dark bold 11px text ("$66k"/"Vault").
 * 3. Outer Layer: 1px thin circle track line + 3 tangent-oriented 46px × 30px frosted capsules
 *    (Bar chart, Trend line, Circle symbol) that switch the data view on click.
 */
export function ArcRing({
  segments,
  arcLabels,
  arcAmounts,
  center,
  centerKicker,
  centerSub,
  capsules,
  activeCapsule,
  onCapsule,
  className,
}: {
  segments?: ArcSegment[];
  arcLabels?: string[];
  arcAmounts?: string[];
  center: string;
  centerKicker?: string;
  centerSub?: string;
  capsules?: ArcCapsule[];
  activeCapsule?: string;
  onCapsule?: (id: string) => void;
  className?: string;
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  const defaultCapsules: ArcCapsule[] = React.useMemo(
    () => [
      { id: 'BAR', icon: BarChart3, label: 'Mandate distribution' },
      { id: 'LINE', icon: TrendingUp, label: 'Needs vs Wants' },
      { id: 'CIRCLE', icon: CircleDot, label: 'Defense Vault' },
    ],
    [],
  );

  const activeCaps = capsules ?? defaultCapsules;

  // 3 segments defined by the spec:
  // Arc 1 (main dark arc): +14° to +220° (span 206°, right and bottom)
  // Arc 2 (short ice-mint arc): +226° to +272° (span 46°, bottom-left)
  // Arc 3 (mid mint arc): +278° to +330° (span 52°, top-left)
  const arcConfigs = [
    {
      id: 'main',
      from: 14,
      to: 220,
      color: segments?.[0]?.color ?? '#04222B',
      textColor: segments?.[0]?.textColor ?? '#E2F4F0',
      label: arcLabels?.[0] ?? 'Active',
      amount: arcAmounts?.[0] ?? 'RM 960',
      outline: segments?.[0]?.outline,
    },
    {
      id: 'short',
      from: 226,
      to: 272,
      color: segments?.[1]?.color ?? '#E2F4F0',
      textColor: segments?.[1]?.textColor ?? '#04222B',
      label: arcLabels?.[1] ?? 'Saved',
      amount: arcAmounts?.[1] ?? 'RM 180',
      outline: segments?.[1]?.outline ?? true,
    },
    {
      id: 'mid',
      from: 278,
      to: 330,
      color: segments?.[2]?.color ?? '#98D8D0',
      textColor: segments?.[2]?.textColor ?? '#04222B',
      label: arcLabels?.[2] ?? 'Vault',
      amount: arcAmounts?.[2] ?? 'RM 100',
      outline: segments?.[2]?.outline,
    },
  ];

  return (
    <div className={cn('relative aspect-square w-full max-w-[320px] mx-auto', className)}>
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          {/* Subtle concentric track line 8px outside main ring */}
          <radialGradient id={`${uid}-bloom`}>
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Text paths along centerline radius R = 86 */}
          {/* Main arc top label (14° to 90°, clockwise, upright) */}
          <path id={`${uid}-p-main-top`} d={arcPathDir(20, 110, R, true)} fill="none" />
          {/* Main arc bottom amount (214° to 120°, counter-clockwise, upright) */}
          <path id={`${uid}-p-main-bot`} d={arcPathDir(214, 120, R, false)} fill="none" />
          {/* Short arc label (270° to 228°, counter-clockwise, upright) */}
          <path id={`${uid}-p-short`} d={arcPathDir(270, 228, R, false)} fill="none" />
          {/* Mid arc label (328° to 280°, counter-clockwise, upright) */}
          <path id={`${uid}-p-mid`} d={arcPathDir(328, 280, R, false)} fill="none" />
        </defs>

        {/* 1px semi-transparent concentric circle track line 8px outside ring */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_TRACK}
          fill="none"
          stroke="rgba(4, 34, 43, 0.16)"
          strokeWidth="1"
        />

        {/* Inner clean guide ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(4, 34, 43, 0.04)" strokeWidth={TH} />

        {/* 3 custom rounded segments */}
        {arcConfigs.map((arc) => (
          <g key={arc.id}>
            {arc.outline && (
              <path
                d={arcPathDir(arc.from, arc.to, R, true)}
                fill="none"
                stroke="rgba(4, 34, 43, 0.15)"
                strokeWidth={TH + 2}
                strokeLinecap="round"
              />
            )}
            <path
              d={arcPathDir(arc.from, arc.to, R, true)}
              fill="none"
              stroke={arc.color}
              strokeWidth={TH}
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Arc 1 textPath: Top label "Active" / "Invested" (11px, bold #E2F4F0) */}
        <text
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.06em"
          fill={arcConfigs[0].textColor}
        >
          <textPath href={`#${uid}-p-main-top`} startOffset="48%" textAnchor="middle">
            {arcConfigs[0].label}
          </textPath>
        </text>

        {/* Arc 1 textPath: Bottom amount "RM 960" / "$120k" (11px, bold #E2F4F0) */}
        <text
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.04em"
          fill={arcConfigs[0].textColor}
        >
          <textPath href={`#${uid}-p-main-bot`} startOffset="46%" textAnchor="middle">
            {arcConfigs[0].amount}
          </textPath>
        </text>

        {/* Arc 2 textPath: Short arc label "Saved" / "Profit" (11px, bold #04222B) */}
        <text
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.04em"
          fill={arcConfigs[1].textColor}
        >
          <textPath href={`#${uid}-p-short`} startOffset="50%" textAnchor="middle">
            {arcConfigs[1].label}
          </textPath>
        </text>

        {/* Arc 3 textPath: Mid arc label "Vault" / "$66k" (11px, bold #04222B) */}
        <text
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.04em"
          fill={arcConfigs[2].textColor}
        >
          <textPath href={`#${uid}-p-mid`} startOffset="50%" textAnchor="middle">
            {arcConfigs[2].amount || arcConfigs[2].label}
          </textPath>
        </text>
      </svg>

      {/* Centre — 136px clear space, only the oversized bold core total */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {centerKicker && (
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-holst-600 mb-0.5">
            {centerKicker}
          </span>
        )}
        <span className="text-[32px] font-[800] leading-none tracking-[-0.045em] text-[#04222B] tabular-nums">
          {center}
        </span>
        {centerSub && (
          <span className="mt-1 text-[9.5px] font-medium text-holst-900/60">
            {centerSub}
          </span>
        )}
      </div>

      {/* Outer orbit: 3 capsule buttons along 10 o'clock to 12 o'clock, tangent to the curve */}
      {activeCaps.map((c, i) => {
        const deg = CAPSULE_ANGLES[i] ?? -30;
        const p = polar(deg, ORBIT_CAPSULES);
        // Tangent rotation angle along the circle
        const tangentDeg = deg + 90;
        const Icon = c.icon;
        const isSelected = activeCapsule === c.id || (!activeCapsule && i === 0);

        return (
          <button
            key={c.id}
            type="button"
            className={cn(
              'absolute flex items-center justify-center transition-all duration-200 outline-none',
              'h-[30px] w-[46px] rounded-[16px] border shadow-sm',
              isSelected
                ? 'bg-[#04222B] text-[#E2F4F0] border-[#04222B] shadow-md scale-105'
                : 'bg-white/70 backdrop-blur-md text-[#04222B] border-[rgba(4,34,43,0.28)] hover:bg-white',
            )}
            style={{
              left: `${(p.x / 280) * 100}%`,
              top: `${(p.y / 280) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${tangentDeg}deg)`,
            }}
            aria-label={c.label}
            aria-pressed={isSelected}
            onClick={() => onCapsule?.(c.id)}
          >
            {/* Counter-rotate icon slightly so icon stays easily recognizable */}
            <span style={{ transform: `rotate(${-tangentDeg * 0.4}deg)` }}>
              <Icon className="h-3.5 w-3.5 stroke-[2.2]" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
