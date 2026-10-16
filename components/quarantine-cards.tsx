'use client';

import * as React from 'react';
import { Lock, LockOpen, Timer } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function QuarantineCards() {
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const claim = useCtrlPayStore((s) => s.claimQuarantineReward);
  const release = useCtrlPayStore((s) => s.releaseQuarantine);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);

  const escrows = useCtrlPayStore((s) => s.escrows);
  const sweeps = useCtrlPayStore((s) => s.pendingSweeps);

  if (quarantines.length === 0 && escrows.length === 0 && sweeps.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" /> Commitment devices
        </CardTitle>
        <CardDescription>
          Quarantines, escrows and pending sweeps. Everything here needed your click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {quarantines.map((q) => {
          const ready = q.status === 'READY_TO_DECIDE';
          const payable = Math.min(q.premiumReward, rewardPool);
          return (
            <div key={q.proposalId} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{q.targetItem}</p>
                  <p className="text-xs text-muted-foreground">
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
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Fast-forward the sandbox clock +24h to unlock the decision.
                </p>
              )}
            </div>
          );
        })}

        {escrows.map((e) => (
          <div key={e.proposalId} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Escrow · {e.lockedCategories.join(', ').replaceAll('_', ' ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  -{formatRM(e.dailyBudgetReduction)}/day for {e.durationDays} days · total{' '}
                  {formatRM(e.dailyBudgetReduction * e.durationDays)}
                </p>
              </div>
              <Badge variant={e.status === 'ACTIVE' ? 'info' : 'success'}>{e.status}</Badge>
            </div>
          </div>
        ))}

        {sweeps.map((s) => (
          <div key={s.proposalId} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending sweep · {s.subscriptionId}</p>
                <p className="text-xs text-muted-foreground">
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
