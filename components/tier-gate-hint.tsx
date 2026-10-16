'use client';

import { cn } from '@/lib/utils';

/**
 * Human explanation for a T3-gate rejection (403 TIER_BLOCKED).
 *
 * The gate is the security feature, not a failure: analysis and simulations are
 * never blocked, but any money-state change needs the Master AI Autonomy Switch
 * ON plus an explicit per-action click. Judges hit this on purpose in step 1 of
 * the demo (default-OFF safety), so the raw reason code is paired with guidance
 * instead of leaving a bare MASTER_AUTONOMY_OFF string on screen.
 */
export function TierGateHint({ error, className }: { error: string | null; className?: string }) {
  if (!error || !/MASTER_AUTONOMY_OFF|TIER/i.test(error)) return null;
  return (
    <p
      className={cn(
        'rounded-md bg-secondary/60 p-2 text-[11px] leading-snug text-muted-foreground',
        className,
      )}
    >
      This is the T3 safety gate (default-OFF by design). Approvals need the Master AI Autonomy
      Switch ON and tier T3 enabled in the judge controls — the Simulation Toolbar, or Judge
      controls in Full App Focus. Declining always works, and the analysis above is never blocked.
    </p>
  );
}
