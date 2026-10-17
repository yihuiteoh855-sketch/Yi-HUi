'use client';

import * as React from 'react';
import { cn, formatRM } from '@/lib/utils';

export interface SpendingBarPoint {
  /** Short axis label, e.g. a weekday. */
  label: string;
  /** Value in RM. */
  value: number;
}

/** Tallest column stops here so the value capsule always has headroom. */
const CEILING = 0.86;

/**
 * Solid-column spend chart on full-height 45° hatched channels.
 *
 * Each column is a hatched reference track that runs the whole card height with a solid
 * teal bar rising inside it; the tapped column floats a white capsule with the exact
 * amount. Purely presentational — every number comes from the deterministic engine.
 */
export function SpendingBars({
  points,
  className,
  height = 152,
  caption,
  todayIndex,
}: {
  points: SpendingBarPoint[];
  className?: string;
  height?: number;
  caption?: string;
  todayIndex?: number;
}) {
  const peak = React.useMemo(() => {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (points[i].value > points[best].value) best = i;
    return best;
  }, [points]);

  const [active, setActive] = React.useState(peak);
  // Keep the capsule on a real data point when the underlying series changes.
  React.useEffect(() => setActive(peak), [peak]);

  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-end gap-2" style={{ height }}>
        <span className="absolute inset-x-0 bottom-0 h-px bg-holst-950/10" aria-hidden />
        {points.map((p, i) => {
          const pct = Math.max(3, (p.value / max) * 100 * CEILING);
          const isActive = i === active;
          return (
            <button
              key={`${p.label}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              aria-label={`${p.label} · ${formatRM(p.value)}`}
              className="group relative flex h-full flex-1 items-end justify-center"
            >
              <span
                className={cn(
                  'ct-hatch-45 absolute inset-0 rounded-[12px] transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-60',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'ct-bar relative z-10 w-full rounded-t-[10px] rounded-b-[5px] transition-all duration-300',
                  isActive ? 'shadow-[0_10px_22px_-12px_rgba(4,34,43,0.7)]' : 'opacity-80',
                )}
                style={{ height: `${pct}%` }}
              />
              {isActive && (
                <span className="ct-chart-bubble z-20" style={{ bottom: `${pct}%`, left: '50%' }}>
                  {formatRM(p.value)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {points.map((p, i) => (
          <span
            key={`${p.label}-label-${i}`}
            className={cn(
              'flex-1 text-center text-[9.5px] font-bold uppercase tracking-[0.08em]',
              i === active ? 'text-holst-950' : 'duo-muted',
            )}
          >
            {i === todayIndex ? 'Today' : p.label}
          </span>
        ))}
      </div>

      {caption && <p className="mt-1.5 text-[10.5px] duo-muted">{caption}</p>}
    </div>
  );
}
