'use client';

import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VaultPanel } from '@/components/vault-panel';
import { SimulationToolbar } from '@/components/simulation-toolbar';
import { SubscriptionTimeline } from '@/components/subscription-timeline';
import { ZombieRadarPanel } from '@/components/zombie-radar-panel';
import { QuarantineCards } from '@/components/quarantine-cards';
import { EventFeed } from '@/components/event-feed';
import { AuditDrawer } from '@/components/audit-drawer';
import { AgentChat } from '@/components/agent-chat';
import { PaymentInterceptorModal } from '@/components/payment-interceptor-modal';

export default function Page() {
  return (
    <main className="mx-auto max-w-[1500px] p-4 lg:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ctrl<span className="text-primary">Pay</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Stop Paying Blindly. Let AI Control the Flow. — a defensive agent for university students.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Sandbox · no real money moves
          </Badge>
          <Badge variant="outline">Proactive defensive agent</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="space-y-4" aria-label="Dashboard">
          <VaultPanel />
          <SimulationToolbar />
          <SubscriptionTimeline />
          <QuarantineCards />
          <ZombieRadarPanel />
          <EventFeed />
        </section>

        <section className="space-y-4" aria-label="Agent and audit">
          <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-9rem)]">
            <AgentChat />
          </div>
          <AuditDrawer />
        </section>
      </div>

      <PaymentInterceptorModal />
    </main>
  );
}
