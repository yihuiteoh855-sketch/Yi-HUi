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
    <div className="ct-metric">
      <div className="flex items-center justify-between gap-2">
        <p className="ct-kicker duo-muted">{label}</p>
        {icon}
      </div>
      <p className={`ct-int mt-1.5 text-[19px] ${accent ? 'text-holst-800' : 'text-holst-950'}`}>{value}</p>
      {hint && <p className="mt-1 text-[10.5px] leading-snug duo-muted">{hint}</p>}
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
<<<<<<< HEAD
    <Card className="border-0">
      <CardHeader className="p-4 pb-2">
=======
    <Card className="dock-card">
      <CardHeader>
>>>>>>> 79d2074b2e19080fe6517e63c849beeac9f42067
        <CardTitle className="flex items-center gap-2">
          <span className="ct-well h-8 w-8 rounded-xl">
            <Wallet className="h-4 w-4 text-holst-800" />
          </span>
          Sandbox ledger buckets
        </CardTitle>
        <CardDescription>No real money. Everything is a labelled sandbox ledger bucket.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat
            label="Current balance"
            value={formatRM(currentBalance)}
            icon={<Wallet className="h-4 w-4 text-holst-800" />}
            hint={`Spent ${formatRM(spentThisMonth)} / limit ${formatRM(userLimits.monthlyPayLimit)}`}
          />
          <Stat
            label="Safe daily"
            value={formatRM(allowance)}
            icon={<Sparkles className="h-4 w-4 text-holst-800" />}
            hint={amortize ? 'Sinking-fund view (amortized)' : 'Computed by the engine'}
          />
          <motion.div
            key={Math.round(defenseVault * 100)}
            initial={{ scale: 0.97, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Stat
              label="Defense Vault"
              value={formatRM(defenseVault)}
              icon={<ShieldCheck className="h-4 w-4 text-holst-600" />}
              hint="Non-interest sandbox bucket. Credits only from VERIFIED savings."
              accent
            />
          </motion.div>
          <Stat
            label="Reward Pool"
            value={formatRM(rewardPool)}
            icon={<PiggyBank className="h-4 w-4 text-holst-800" />}
            hint="Funded only by verified sweep savings."
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">Needs/Wants split: engine-computed</Badge>
          <Badge variant="secondary">CFaR: 1,000 seeded paths</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
