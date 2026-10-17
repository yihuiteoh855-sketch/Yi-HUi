'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

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
const R = 88;
/** Band thickness — the reference ring is 28px of ink. */
const TH = 28;
/** Geometric gap between segment paths, so the round caps still leave a ~5° ink gap. */
const GAP = 22;
/** Smallest span a segment may take, so a round cap never swallows it. */
const FLOOR = 40;
const AVAIL = 360 - 3 * GAP;
/** Orbit the capsule switchers ride on. */
const ORBIT = R + TH / 2 + 4 + 15;
/** Capsule angles: 10 o'clock → 12 o'clock. */
const CAPSULE_ANGLES = [-52, -30, -8];

function polar(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

function arcPath(fromDeg: number, toDeg: number, r: number): string {
  return arcPathDir(fromDeg, toDeg, r, true);
}

/**
 * Arc between two angles. `clockwise` must agree with the flag, otherwise the renderer
 * resolves the inconsistency onto a mirrored circle centre and draws the arc elsewhere.
 */
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
 * Proportional spans with a legibility floor: anything below `FLOOR` is raised and the
 * deficit is taken from the largest arc, so three rounded caps never collide.
 */
export function layOutArcs(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  const safeTotal = total > 0 ? total : 1;
  const raw = values.map((v) => (Math.max(0, v) / safeTotal) * AVAIL);
  const spans = raw.slice();
  const index = raw.map((_, i) => i);
  const small = index.filter((i) => raw[i] < FLOOR);
  if (small.length === 0) return spans;

  const deficit = small.reduce((sum, i) => sum + (FLOOR - raw[i]), 0);
  const largest = index.reduce((best, i) => (raw[i] > raw[best] ? i : best), 0);
  if (raw[largest] - deficit >= FLOOR) {
    for (const i of small) spans[i] = FLOOR;
    spans[largest] = raw[largest] - deficit;
    return spans;
  }
  return [AVAIL / 3, AVAIL / 3, AVAIL / 3];
}

/**
 * Nexora right-hand-screen ring: one 28px band cut into three rounded arcs whose labels
 * and amounts ride the curvature through `<textPath>`, plus an outer concentric orbit
 * holding capsule switchers packed into the 10-to-12 o'clock arc.
 */
export function ArcRing({
  segments,
  arcLabels,
  arcShortLabels = [],
  arcAmounts,
  center,
  centerKicker,
  centerSub,
  capsules,
  activeCapsule,
  onCapsule,
  className,
}: {
  segments: ArcSegment[];
  arcLabels: string[];
  /** Compact fallback for arcs too short to carry the full label. */
  arcShortLabels?: string[];
  arcAmounts: string[];
  center: string;
  centerKicker?: string;
  centerSub?: string;
  capsules: ArcCapsule[];
  activeCapsule?: string;
  onCapsule?: (id: string) => void;
  className?: string;
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const spans = React.useMemo(() => layOutArcs(segments.map((s) => s.value)), [segments]);

  let cursor = 0;
  const arcs = segments.map((seg, i) => {
    const from = cursor;
    const to = from + spans[i];
    cursor = to + GAP;
    return { seg, from, to, span: spans[i] };
  });

  /**
   * Usable arc length at the band centreline, minus one round-cap radius at each end, so
   * text never runs under a segment's rounded endpoint.
   */
  const bandBudget = (from: number, to: number) => {
    const insetDeg = ((TH / 2) / R) * (180 / Math.PI);
    const a = from + insetDeg;
    const b = to - insetDeg;
    if (b <= a) return null;
    return { a, b, length: ((b - a) * Math.PI * R) / 180 };
  };

  return (
    <div className={cn('relative aspect-square w-full', className)}>
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`${uid}-bloom`}>
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Faint concentric orbit the capsule switchers sit on. */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT}
          fill="none"
          stroke="rgba(4,34,43,0.10)"
          strokeWidth="1"
          strokeDasharray="2 7"
        />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(4,34,43,0.06)" strokeWidth={TH} />

        {arcs.map(({ seg, from, to }, i) => {
          const mid = (from + to) / 2;
          const topHalf = Math.cos((mid * Math.PI) / 180) > 0;
          const label = arcLabels[i] ?? '';
          const amount = arcAmounts[i] ?? '';
          const band = bandBudget(from, to);
          // ~0.6em advance + letter-spacing, so these are length budgets, not char counts.
          const fit = (s: string, size: number, ls: number) => s.length * size * (0.6 + ls);
          const full = band !== null && band.length >= 92;
          const shortFit = band !== null && band.length >= 30;
          const tiny = band !== null && band.length >= 24;
          // Prefer the real label; fall back to the compact form when the arc is too short.
          const shortLabel =
            band !== null && fit(label, 7.5, 0.1) <= band.length
              ? label
              : arcShortLabels[i] ?? (label.length > 4 ? label.slice(0, 4) : label);

          // Same geometric arc, traversed the other way, so glyphs on the lower half stay upright.
          const ink = (a: number, b: number, r: number) =>
            topHalf ? arcPathDir(a, b, r, true) : arcPathDir(b, a, r, false);

          return (
            <g key={seg.id}>
              {seg.outline && (
                <path
                  d={arcPath(from, to, R)}
                  fill="none"
                  stroke="rgba(16,96,111,0.22)"
                  strokeWidth={TH + 2}
                  strokeLinecap="round"
                />
              )}
              <path
                d={arcPath(from, to, R)}
                fill="none"
                stroke={seg.color}
                strokeWidth={TH}
                strokeLinecap="round"
              />
              {band && full && (
                <>
                  <path id={`${uid}-t${i}a`} d={ink(band.a, band.b, R + 6.5)} fill="none" />
                  <path id={`${uid}-t${i}b`} d={ink(band.a, band.b, R - 6.5)} fill="none" />
                  <text
                    fontSize="8"
                    fontWeight="800"
                    letterSpacing="0.16em"
                    fill={seg.textColor}
                    fillOpacity="0.85"
                  >
                    <textPath href={`#${uid}-t${i}a`} startOffset="50%" textAnchor="middle">
                      {label}
                    </textPath>
                  </text>
                  <text fontSize="8.5" fontWeight="800" fill={seg.textColor}>
                    <textPath href={`#${uid}-t${i}b`} startOffset="50%" textAnchor="middle">
                      {amount}
                    </textPath>
                  </text>
                </>
              )}
              {band && !full && shortFit && (
                <>
                  <path id={`${uid}-t${i}c`} d={ink(band.a, band.b, R + 6.5)} fill="none" />
                  <path id={`${uid}-t${i}d`} d={ink(band.a, band.b, R - 6.5)} fill="none" />
                  <text
                    fontSize="7.5"
                    fontWeight="800"
                    letterSpacing="0.1em"
                    fill={seg.textColor}
                    fillOpacity="0.85"
                  >
                    <textPath href={`#${uid}-t${i}c`} startOffset="50%" textAnchor="middle">
                      {shortLabel}
                    </textPath>
                  </text>
                  <text fontSize="8" fontWeight="800" fill={seg.textColor}>
                    <textPath href={`#${uid}-t${i}d`} startOffset="50%" textAnchor="middle">
                      {amount}
                    </textPath>
                  </text>
                </>
              )}
              {band && !full && !shortFit && tiny && (
                <>
                  <path id={`${uid}-t${i}e`} d={ink(band.a, band.b, R)} fill="none" />
                  <text fontSize="8" fontWeight="800" fill={seg.textColor}>
                    <textPath href={`#${uid}-t${i}e`} startOffset="50%" textAnchor="middle">
                      {amount}
                    </textPath>
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Centre — only the oversized total, per the reference. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {centerKicker && <span className="ct-kicker duo-muted">{centerKicker}</span>}
        <span className="text-[32px] font-extrabold leading-none tracking-[-0.045em] text-[#04222B] tabular-nums">
          {center}
        </span>
        {centerSub && <span className="mt-1 text-[9.5px] duo-muted">{centerSub}</span>}
      </div>

      {/* Capsule switchers on the outer orbit. */}
      {capsules.map((c, i) => {
        const p = polar(CAPSULE_ANGLES[i] ?? -30, ORBIT);
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            className="ct-orbit-cap absolute"
            data-on={activeCapsule === c.id}
            aria-label={c.label}
            aria-pressed={activeCapsule === c.id}
            onClick={() => onCapsule?.(c.id)}
            style={{ left: `${(p.x / 280) * 100}%`, top: `${(p.y / 280) * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
