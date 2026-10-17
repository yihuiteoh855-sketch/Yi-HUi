'use client';

import * as React from 'react';
import { cn, formatRM } from '@/lib/utils';

export interface SpendingPoint {
  /** Short axis label, e.g. a weekday. */
  label: string;
  /** Value in RM. */
  value: number;
}

/** Smooth cubic through the points (Catmull-Rom style midpoint control). */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const cx = (a.x + b.x) / 2;
    d += ` C ${cx.toFixed(2)} ${a.y.toFixed(2)}, ${cx.toFixed(2)} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Hatched gradient area chart — diagonal-stripe fill clipped to a smooth curve,
 * a marker line, data dots and a floating value pill.
 *
 * Purely presentational: every number comes from the deterministic engine.
 */
export function SpendingAreaChart({
  points,
  className,
  height = 152,
  idPrefix = 'ct-spend',
  caption,
}: {
  points: SpendingPoint[];
  className?: string;
  height?: number;
  idPrefix?: string;
  caption?: string;
}) {
  const peak = React.useMemo(() => {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (points[i].value > points[best].value) best = i;
    return best;
  }, [points]);

  const [active, setActive] = React.useState(peak);
  // Keep the marker on a real data point when the underlying series changes.
  React.useEffect(() => setActive(peak), [peak]);

  const W = 360;
  const H = height;
  const top = 34;
  const bottom = 12;
  // Inset far enough that the value pill never overflows the card.
  const padX = 40;
  const n = Math.max(points.length, 1);
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => (n <= 1 ? W / 2 : padX + (i / (n - 1)) * (W - padX * 2));
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);

  const pts = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const line = smoothPath(pts);
  const area = pts.length
    ? `${line} L ${x(n - 1).toFixed(2)} ${H} L ${x(0).toFixed(2)} ${H} Z`
    : '';

  const cur = pts[Math.min(active, pts.length - 1)] ?? { x: W / 2, y: H / 2 };
  const hatchId = `${idPrefix}-hatch`;
  const gradId = `${idPrefix}-grad`;
  const clipId = `${idPrefix}-clip`;

  return (
    <div className={cn('select-none', className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4FB8B4" stopOpacity="0.46" />
              <stop offset="55%" stopColor="#98D8D0" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#E2F4F0" stopOpacity="0.04" />
            </linearGradient>
            {/* 45° diagonal hatching, clipped to the area silhouette. */}
            <pattern
              id={hatchId}
              width="9"
              height="9"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="9" stroke="#1D8B94" strokeWidth="3.4" strokeOpacity="0.42" />
            </pattern>
            <clipPath id={clipId}>
              <path d={area} />
            </clipPath>
          </defs>

          <path d={area} fill={`url(#${gradId})`} />
          <g clipPath={`url(#${clipId})`}>
            <rect x="0" y="0" width={W} height={H} fill={`url(#${hatchId})`} />
          </g>

          {/* Smooth cap line */}
          <path
            d={line}
            fill="none"
            stroke="#0A3D4A"
            strokeWidth="2.4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Baseline ticks */}
          {pts.map((p, i) => (
            <circle key={`t${i}`} cx={p.x} cy={H - 5} r="1.9" fill="#04222B" opacity="0.3" />
          ))}

          {/* Data dots (hidden under the marker) */}
          {pts.map((p, i) =>
            i === active ? null : (
              <circle key={`d${i}`} cx={p.x} cy={p.y} r="2.6" fill="#04222B" opacity="0.85" />
            ),
          )}

          {/* Active marker */}
          <line
            x1={cur.x}
            y1={cur.y}
            x2={cur.x}
            y2={H}
            stroke="#04222B"
            strokeWidth="1.6"
            strokeOpacity="0.42"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={cur.x}
            cy={cur.y}
            r="5.4"
            fill="#04222B"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={cur.x} cy={H - 5} r="3.4" fill="#04222B" />

          {/* Hit bands */}
          {points.map((_, i) => {
            const left = i === 0 ? 0 : (x(i - 1) + x(i)) / 2;
            const right = i === n - 1 ? W : (x(i) + x(i + 1)) / 2;
            return (
              <rect
                key={`h${i}`}
                x={left}
                y={0}
                width={Math.max(2, right - left)}
                height={H}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            );
          })}
        </svg>

        <span
          className="ct-chart-bubble"
          style={{ left: `${(cur.x / W) * 100}%`, top: `${(cur.y / H) * 100}%` }}
        >
          {formatRM(points[active]?.value ?? 0)}
        </span>
      </div>

      <div className="relative mt-2.5 h-6">
        {points.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            style={{ left: `${(x(i) / W) * 100}%` }}
            className={cn(
              'absolute top-0 -translate-x-1/2 rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.06em] transition-colors',
              i === active ? 'bg-holst-950 text-white' : 'duo-muted hover:text-holst-800',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {caption && <p className="mt-2 text-[10.5px] duo-muted">{caption}</p>}
    </div>
  );
}
