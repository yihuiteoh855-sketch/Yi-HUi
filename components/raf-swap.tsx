'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Phase 9 motion-resilience utilities (presentation only).
 *
 * Framer Motion drives animations through requestAnimationFrame. Browsers pause
 * rAF for hidden documents (background tabs, remote / Review-pane renderers,
 * screen-share pipelines), which can leave exit animations suspended forever —
 * with `AnimatePresence mode="wait"` that means the old view never leaves and
 * the new view never mounts, wedging navigation deep in the UI.
 *
 * Two layers of defence:
 *  1. Swaps never rely on an exit phase. The new view mounts immediately and
 *     fades through (Framer `initial`→`animate` when frames tick, a time-based
 *     CSS enter when they do not). There is nothing to wedge.
 *  2. `useRafAlive` probes frames and, when rAF is paused, every animated swap
 *     degrades to a pure CSS enter so the correct content is always on screen.
 */

/** True while requestAnimationFrame actually ticks (normal visible documents). */
export function useRafAlive(): boolean {
  const [alive, setAlive] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const probe = () => {
      if (cancelled) return;
      let fired = false;
      requestAnimationFrame(() => {
        fired = true;
      });
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setAlive(fired);
        if (fired) timer = window.setTimeout(probe, 2000);
      }, 350);
    };
    probe();
    const onVisibility = () => {
      window.clearTimeout(timer);
      probe();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return alive;
}

/**
 * Keyed view swap (tabs, sub-views, page layouts).
 *
 * `animate` (from `useRafAlive`) selects between the spec'd Framer Motion
 * fade-through — y-6→0 / opacity over 0.18s, no exit phase so it can never
 * block the swap — and an instant swap with a time-based CSS enter
 * (`.cp-view-enter`) when animation frames are unavailable.
 */
export function RafSwap({
  viewKey,
  animate,
  className,
  children,
}: {
  viewKey: string;
  animate: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (!animate) {
    return (
      <div key={viewKey} className={cn('cp-view-enter', className)}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
