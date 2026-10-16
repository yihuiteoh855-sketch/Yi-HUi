'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Columns2, LayoutDashboard, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { AgentChat } from '@/components/agent-chat';
import { AuditDrawer } from '@/components/audit-drawer';
import { CfarStressTester } from '@/components/cfar-stress-tester';
import { EventFeed } from '@/components/event-feed';
import { MobileAppShell } from '@/components/mobile-app-shell';
import { PaymentInterceptorModal } from '@/components/payment-interceptor-modal';
import { QuarantineCards } from '@/components/quarantine-cards';
import { SimulationToolbar } from '@/components/simulation-toolbar';
import { SubscriptionTimeline } from '@/components/subscription-timeline';
import { VaultPanel } from '@/components/vault-panel';
import { ZombieRadarPanel } from '@/components/zombie-radar-panel';
import { cn } from '@/lib/utils';

type LayoutMode = 'STUDIO' | 'APP' | 'DASHBOARD';

const LAYOUTS: Array<{
  id: LayoutMode;
  label: string;
  icon: React.ElementType;
  hint: string;
}> = [
  {
    id: 'STUDIO',
    label: 'App + Judge Studio',
    icon: Columns2,
    hint: 'Captain flagship: the student mobile app and the judge console side by side.',
  },
  {
    id: 'APP',
    label: 'Full App Focus',
    icon: Smartphone,
    hint: 'Phone-first demo mode. Judge controls and the audit log slide in from the right.',
  },
  {
    id: 'DASHBOARD',
    label: 'Expanded Dashboard',
    icon: LayoutDashboard,
    hint: 'Full-width multi-column inspection of every panel and log.',
  },
];

export default function Page() {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);

  const [mode, setMode] = React.useState<LayoutMode>('STUDIO');
  const [drawer, setDrawer] = React.useState<'none' | 'judge' | 'audit'>('none');

  const active = LAYOUTS.find((l) => l.id === mode) ?? LAYOUTS[0];

  return (
    <main className="duo-body min-h-screen p-4 lg:p-6">
      <header className="mx-auto mb-6 flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ctrl<span className="text-primary">Pay</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Stop Paying Blindly. Let AI Control the Flow. — a defensive agent for university
            students.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Sandbox · no real money moves
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px]">
            {new Date(sandboxClock).toISOString().slice(0, 16).replace('T', ' ')} UTC
          </Badge>
          <Badge variant={plan === 'PRO' ? 'warning' : 'info'} className="gap-1">
            {plan === 'PRO' ? 'Student Pro · RM 49/yr' : 'Free tier · RM 0'}
          </Badge>
          <button
            type="button"
            onClick={() => setPlan(plan === 'PRO' ? 'FREE' : 'PRO')}
            className="rounded-full border border-input px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent"
          >
            {plan === 'PRO' ? 'Switch to Free' : 'Preview Student Pro'}
          </button>
        </div>
      </header>

      <div className="mx-auto mb-4 flex max-w-[1500px] flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap items-center gap-1 rounded-full bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Layout switcher"
        >
          {LAYOUTS.map((l) => {
            const Icon = l.icon;
            const selected = mode === l.id;
            return (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setMode(l.id);
                  setDrawer('none');
                }}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  selected ? 'text-white' : 'text-[#5c6f87] hover:text-[#18395e]',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="layout-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[#1688ee]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{active.hint}</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {mode === 'STUDIO' && <StudioLayout />}

          {mode === 'APP' && (
            <>
              <div className="flex justify-center">
                <MobileAppShell
                  copilot={
                    <div className="h-[440px]">
                      <AgentChat />
                    </div>
                  }
                />
              </div>

              <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setDrawer(drawer === 'judge' ? 'none' : 'judge')}
                  className="duo-btn shadow-lg"
                >
                  Judge controls
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer(drawer === 'audit' ? 'none' : 'audit')}
                  className="duo-btn duo-btn-ghost shadow-lg"
                >
                  Audit log
                </button>
              </div>

              <AnimatePresence>
                {drawer !== 'none' && (
                  <motion.aside
                    key={drawer}
                    initial={{ x: 480, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 480, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto scroll-thin border-l bg-background/95 p-4 shadow-2xl backdrop-blur"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-bold">
                        {drawer === 'judge' ? 'Judge Simulation & Telemetry' : 'Immutable Audit Log'}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setDrawer('none')}
                        aria-label="Close drawer"
                        className="rounded-full p-1 hover:bg-accent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {drawer === 'judge' ? (
                        <>
                          <SimulationToolbar />
                          <EventFeed />
                        </>
                      ) : (
                        <AuditDrawer />
                      )}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </>
          )}

          {mode === 'DASHBOARD' && <DashboardLayout />}
        </motion.div>
      </AnimatePresence>

      <footer className="mx-auto mt-8 max-w-[1500px] text-center text-[11px] text-muted-foreground">
        Every balance, probability and reward is computed by the deterministic engine
        (`lib/quant-engine.ts`) on the sandbox ledger — the LLM never computes a number and no real
        funds move.
      </footer>

      <PaymentInterceptorModal />
    </main>
  );
}

function StudioLayout() {
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:gap-6">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <MobileAppShell />
      </div>

      <section className="space-y-4" aria-label="Judge studio">
        <div className="h-[min(600px,72vh)]">
          <AgentChat />
        </div>
        <SimulationToolbar />
        <AuditDrawer />
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <EventFeed />
          <VaultPanel />
        </div>
      </section>
    </div>
  );
}

function DashboardLayout() {
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
      <section className="space-y-4" aria-label="Dashboard">
        <VaultPanel />
        <SimulationToolbar />
        <SubscriptionTimeline />
        <CfarStressTester />
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
  );
}
