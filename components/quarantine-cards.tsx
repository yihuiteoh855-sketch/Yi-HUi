'use client';

import * as React from 'react';
import { Lock, LockOpen, Timer } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type QuarantineCardsFilter = 'ALL' | 'QUARANTINE' | 'ESCROW' | 'SWEEP';

const EMPTY_COPY: Record<Exclude<QuarantineCardsFilter, 'ALL'>, { title: string; hint: string }> = {
  QUARANTINE: {
    title: 'No quarantines yet',
    hint: 'Simulate an impulse buy (e.g. Shopee RM 180) from the judge dock and choose 24h Quarantine — it will appear here.',
  },
  ESCROW: {
    title: 'No escrow locks yet',
    hint: 'Escrows lock a wants category to a daily budget for a fixed number of days. Create one from an intercepted payment.',
  },
  SWEEP: {
    title: 'No pending sweeps yet',
    hint: 'Student downgrades record a pending sweep and verify the savings on the next billing date.',
  },
};

const FILTER_TITLE: Record<QuarantineCardsFilter, string> = {
  ALL: 'Commitment devices',
  QUARANTINE: '24h quarantines',
  ESCROW: 'Wants-category escrows',
  SWEEP: 'Pending sweeps',
};

/**
 * Quarantines, escrows and pending sweeps.
 *
 * `filter` lets the mobile Contracts tab show one commitment type per sub-pill
 * while the desktop dashboard keeps the combined `ALL` view (default).
 */
export function QuarantineCards({ filter = 'ALL' }: { filter?: QuarantineCardsFilter } = {}) {
  const quarantinesAll = useCtrlPayStore((s) => s.quarantines);
  const claim = useCtrlPayStore((s) => s.claimQuarantineReward);
  const release = useCtrlPayStore((s) => s.releaseQuarantine);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);

  const escrowsAll = useCtrlPayStore((s) => s.escrows);
  const sweepsAll = useCtrlPayStore((s) => s.pendingSweeps);

  const quarantines = filter === 'ALL' || filter === 'QUARANTINE' ? quarantinesAll : [];
  const escrows = filter === 'ALL' || filter === 'ESCROW' ? escrowsAll : [];
  const sweeps = filter === 'ALL' || filter === 'SWEEP' ? sweepsAll : [];

  const empty = quarantines.length === 0 && escrows.length === 0 && sweeps.length === 0;
  if (empty && filter === 'ALL') return null;

  const copy = filter === 'ALL' ? null : EMPTY_COPY[filter];

  return (
    <Card className="soft-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Lock className="h-4 w-4 text-[#4F46E5]" /> {FILTER_TITLE[filter]}
        </CardTitle>
        <CardDescription className="text-[11px]">
          Quarantines, escrows and pending sweeps. Everything here needed your explicit click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {empty && copy && (
          <div className="rounded-2xl border border-dashed border-[#18181B]/15 bg-[#F7F6F2] p-3">
            <p className="text-xs font-bold">{copy.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">{copy.hint}</p>
          </div>
        )}

        {quarantines.map((q) => {
          const ready = q.status === 'READY_TO_DECIDE';
          const payable = Math.min(q.premiumReward, rewardPool);
          return (
            <div key={q.proposalId} className="rounded-2xl border border-[#18181B]/10 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{q.targetItem}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatRM(q.itemPrice)} · reward {formatRM(q.premiumReward)} (from pool:{' '}
                    {formatRM(payable)})
                  </p>
                </div>
                <Badge
                  variant={
                    q.status === 'CLAIMED'
                      ? 'success'
                      : q.status === 'RELEASED'
                        ? 'secondary'
                        : ready
                          ? 'warning'
                          : 'info'
                  }
                >
                  {q.status}
                </Badge>
              </div>
              <p className="mt-2 flex">
                <span className="cp-chip cp-chip-indigo">
                  Principal 100% yours · unlock anytime · zero penalty
                </span>
              </p>
              {(q.status === 'LOCKED_24H' || ready) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!ready}
                    onClick={() => claim(q.proposalId)}
                    title={ready ? 'Claim reward' : 'Available after +24h'}
                  >
                    <Timer className="h-4 w-4" />
                    {ready ? 'Abandon Purchase & Claim Reward' : 'Locked until +24h'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={!ready} onClick={() => release(q.proposalId)}>
                    <LockOpen className="h-4 w-4" /> Proceed with Purchase
                  </Button>
                </div>
              )}
              {q.status === 'LOCKED_24H' && (
                <p className="mt-1 text-[11px] text-zinc-400">
                  Fast-forward the sandbox clock +24h to unlock the decision.
                </p>
              )}
            </div>
          );
        })}

        {escrows.map((e) => (
          <div key={e.proposalId} className="rounded-2xl border border-[#18181B]/10 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  Escrow · {e.lockedCategories.join(', ').replaceAll('_', ' ')}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  -{formatRM(e.dailyBudgetReduction)}/day for {e.durationDays} days · total{' '}
                  {formatRM(e.dailyBudgetReduction * e.durationDays)}
                </p>
              </div>
              <Badge variant={e.status === 'ACTIVE' ? 'info' : 'success'}>{e.status}</Badge>
            </div>
            <p className="mt-2 flex">
              <span className="cp-chip cp-chip-indigo">Daily budget cap · auto-releases on schedule</span>
            </p>
          </div>
        ))}

        {sweeps.map((s) => (
          <div key={s.proposalId} className="rounded-2xl border border-[#18181B]/10 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Pending sweep · {s.subscriptionId}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatRM(s.monthlySavings)}/month · verifies on{' '}
                  {new Date(s.nextBillingDate).toISOString().slice(0, 10)}
                </p>
              </div>
              <Badge
                variant={
                  s.status === 'VERIFIED' ? 'success' : s.status === 'NOT_VERIFIED' ? 'danger' : 'warning'
                }
              >
                {s.status === 'PENDING_NEXT_BILLING_VERIFICATION' ? 'PENDING' : s.status}
              </Badge>
            </div>
            <p className="mt-2 flex">
              <span className="cp-chip cp-chip-emerald">
                Savings credit the vault only after the charge disappears
              </span>
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
