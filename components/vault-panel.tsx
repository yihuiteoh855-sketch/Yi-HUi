'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { formatRM } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function Stat({
  label,
  value,
  icon,
  hint,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={`mt-1 text-lg font-semibold ${accent ? 'text-emerald-600' : ''}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function VaultPanel() {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const userLimits = useCtrlPayStore((s) => s.userLimits);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Sandbox Ledger
        </CardTitle>
        <CardDescription>
          No real money. Everything is a labelled sandbox ledger bucket.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Current balance"
            value={formatRM(currentBalance)}
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            hint={`Spent this month ${formatRM(spentThisMonth)} / limit ${formatRM(
              userLimits.monthlyPayLimit,
            )}`}
          />
          <Stat
            label="Dynamic daily allowance"
            value={formatRM(allowance)}
            icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
            hint={amortize ? 'Sinking-fund view (amortized)' : 'Computed by the engine'}
          />
          <motion.div
            key={Math.round(defenseVault * 100)}
            initial={{ scale: 0.97, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Stat
              label="Defense Vault 防御金库"
              value={formatRM(defenseVault)}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
              hint="Non-interest sandbox bucket. Credits only from VERIFIED savings/rewards."
              accent
            />
          </motion.div>
          <Stat
            label="Reward Pool"
            value={formatRM(rewardPool)}
            icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
            hint="Funded only by verified sweep savings."
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Needs/Wants split: engine-computed</Badge>
          <Badge variant="outline">CFaR: 1,000 seeded paths</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
