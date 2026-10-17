'use client';

import * as React from 'react';
import {
  Crown,
  Layers,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { ESCROW_RULES } from '@/lib/quant-engine';
import { cn, formatRM } from '@/lib/utils';
import { RiskTailStrip } from '@/components/risk-tail-strip';
import { Slider } from '@/components/ui/slider';

/* ------------------------------------------------------------------ *
 * Goal model — every number is read from the deterministic store.
 * ------------------------------------------------------------------ */

export interface AscentGoal {
  id: string;
  title: string;
  sub: string;
  target: number;
  current: number;
  /** `RM` renders currency, `count` renders plain integers. */
  unit: 'RM' | 'count';
  icon: React.ElementType;
}

function readPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    // Alternating vertical control handles give the winding switchback road.
    d += ` C ${a.x.toFixed(2)} ${(a.y + (b.y - a.y) * 0.55).toFixed(2)}, ${b.x.toFixed(2)} ${(b.y + (a.y - b.y) * 0.55).toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

/** Milestone stops, bottom (first) to top (summit) — viewBox 360 × 430. */
const NODES: Array<{ x: number; y: number }> = [
  { x: 78, y: 396 },
  { x: 278, y: 326 },
  { x: 96, y: 250 },
  { x: 276, y: 174 },
  { x: 118, y: 100 },
  { x: 192, y: 42 },
];

const VIEW_W = 360;
const VIEW_H = 430;

export function useGoals(): AscentGoal[] {
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const pendingSweeps = useCtrlPayStore((s) => s.pendingSweeps);

  return React.useMemo(() => {
    const parked = quarantines.filter((q) => q.status === 'CLAIMED').length;
    const verified = pendingSweeps.filter((s) => s.status === 'VERIFIED').length;

    return [
      {
        id: 'park-3',
        title: 'Park 3 impulse buys',
        sub: '24-hour quarantine streak',
        target: 3,
        current: parked,
        unit: 'count' as const,
        icon: Timer,
      },
      {
        id: 'vault-100',
        title: 'RM 100 in the vault',
        sub: 'credits only from verified savings',
        target: 100,
        current: defenseVault,
        unit: 'RM' as const,
        icon: PiggyBank,
      },
      {
        id: 'cancel-2',
        title: 'Verify 2 cancellations',
        sub: 'swept savings land in the vault',
        target: 2,
        current: verified,
        unit: 'count' as const,
        icon: Layers,
      },
      {
        id: 'reward-100',
        title: 'RM 100 reward pool',
        sub: 'funded by real, verified savings',
        target: 100,
        current: rewardPool,
        unit: 'RM' as const,
        icon: Sparkles,
      },
      {
        id: 'vault-300',
        title: 'RM 300 buffer',
        sub: `${Math.round(300 / ESCROW_RULES.minDailySurvivalFloorRM)} days of basic meals`,
        target: 300,
        current: defenseVault,
        unit: 'RM' as const,
        icon: ShieldCheck,
      },
      {
        id: 'vault-500',
        title: 'RM 500 fortress',
        sub: 'a month of mandates + a buffer',
        target: 500,
        current: defenseVault,
        unit: 'RM' as const,
        icon: Crown,
      },
    ];
  }, [defenseVault, rewardPool, quarantines, pendingSweeps]);
}

export function goalAmount(goal: AscentGoal, value: number): string {
  return goal.unit === 'RM' ? formatRM(value) : `${Math.round(value)}`;
}

export function goalProgress(goal: AscentGoal): number {
  if (goal.target <= 0) return 0;
  return Math.max(0, Math.min(1, goal.current / goal.target));
}

/* ------------------------------------------------------------------ *
 * The winding ascent
 * ------------------------------------------------------------------ */

export function GoalsAscent({
  goals,
  onOpenGoal,
  className,
}: {
  goals: AscentGoal[];
  onOpenGoal: (goalId: string) => void;
  className?: string;
}) {
  const path = React.useMemo(() => readPath(NODES.slice(0, goals.length)), [goals.length]);

  const states = React.useMemo(() => {
    const firstOpen = goals.findIndex((g) => g.current < g.target);
    return goals.map((g, i) => {
      if (g.current >= g.target) return 'achieved' as const;
      if (firstOpen === -1 || i === firstOpen) return 'current' as const;
      return 'locked' as const;
    });
  }, [goals]);

  const achieved = states.filter((s) => s === 'achieved').length;
  const currentIndex = Math.max(0, states.findIndex((s) => s === 'current'));
  const achievedPath = React.useMemo(() => readPath(NODES.slice(0, currentIndex + 1)), [currentIndex]);
  const currentNode = NODES[Math.min(currentIndex, NODES.length - 1)];

  return (
    <section className={cn('ct-card-soft overflow-hidden p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="ct-kicker duo-muted">Milestone path</p>
          <h2 className="mt-0.5 text-[15px] font-extrabold tracking-[-0.02em] text-holst-950">Your ascent</h2>
        </div>
        <span className="ct-chip shrink-0">
          <Target className="mr-1 h-3 w-3 text-holst-600" />
          {goals.length} goals
        </span>
      </div>

      <p className="mt-1 text-[10.5px] duo-muted">
        {achieved} of {goals.length} reached · tap a milestone to zoom in and stress-test it
      </p>

      <div className="relative mt-2 aspect-[360/430] w-full">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="ct-ascent-done" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0A3D4A" />
              <stop offset="60%" stopColor="#1D8B94" />
              <stop offset="100%" stopColor="#4FB8B4" />
            </linearGradient>
            <radialGradient id="ct-ascent-summit">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#98D8D0" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#98D8D0" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Summit halo */}
          <circle cx={NODES[Math.min(goals.length, NODES.length) - 1].x} cy={NODES[Math.min(goals.length, NODES.length) - 1].y} r="62" fill="url(#ct-ascent-summit)" />

          {/* Road */}
          <g className="ct-path-shadow">
            <path d={path} fill="none" stroke="rgba(4,34,43,0.06)" strokeWidth="40" strokeLinecap="round" />
            <path d={path} fill="none" stroke="#FFFFFF" strokeWidth="26" strokeLinecap="round" />
            <path
              d={path}
              fill="none"
              stroke="rgba(4,34,43,0.1)"
              strokeWidth="2"
              strokeDasharray="1 9"
              strokeLinecap="round"
            />
            <path d={achievedPath} fill="none" stroke="url(#ct-ascent-done)" strokeWidth="26" strokeLinecap="round" />
          </g>
        </svg>

        {/* Nodes */}
        {goals.map((goal, i) => {
          const node = NODES[Math.min(i, NODES.length - 1)];
          const leftPct = (node.x / VIEW_W) * 100;
          const topPct = (node.y / VIEW_H) * 100;
          const state = states[i];
          const inward = node.x < VIEW_W / 2 ? 'right' : 'left';
          const Icon = goal.icon;
          const isCurrent = i === currentIndex && state === 'current';

          return (
            <React.Fragment key={goal.id}>
              <button
                type="button"
                onClick={() => onOpenGoal(goal.id)}
                aria-label={`${goal.title} · ${goalAmount(goal, goal.current)} of ${goalAmount(goal, goal.target)}`}
                className="ct-goal-node absolute z-10 -translate-x-1/2 -translate-y-1/2 active:scale-95"
                data-state={state}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>

              <div
                className={cn(
                  'absolute z-10 max-w-[54%] -translate-y-1/2',
                  inward === 'right' ? 'text-left' : 'text-right',
                )}
                style={
                  inward === 'right'
                    ? { left: `calc(${leftPct}% + 30px)`, top: `${topPct}%` }
                    : { right: `calc(${100 - leftPct}% + 30px)`, top: `${topPct}%` }
                }
              >
                <button type="button" className="block w-full" onClick={() => onOpenGoal(goal.id)}>
                  <span className="ct-goal-badge" data-state={isCurrent ? 'current' : state}>
                    {goalAmount(goal, goal.current)} / {goalAmount(goal, goal.target)}
                  </span>
                  <span className="mt-1 block text-[11.5px] font-extrabold leading-tight tracking-[-0.01em] text-holst-950">
                    {goal.title}
                  </span>
                  <span className="mt-0.5 block text-[9.5px] leading-tight duo-muted">{goal.sub}</span>
                </button>
              </div>

              {isCurrent && (
                <span
                  className="pointer-events-none absolute z-20 -translate-x-1/2 translate-y-[34px] rounded-full bg-holst-950 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-white shadow-lift"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  You are here
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-1 flex items-center gap-2 rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-holst-950/5">
        <span className="ct-well h-9 w-9 rounded-[12px]">
          <Target className="h-4 w-4 text-holst-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-extrabold text-holst-950">
            {goals[currentIndex]?.title ?? 'All milestones reached'}
          </p>
          <p className="text-[10px] duo-muted">
            Next milestone · {goals[currentIndex] ? goalAmount(goals[currentIndex], goals[currentIndex].target) : '—'}
          </p>
        </div>
        <span className="ct-chip shrink-0">{Math.round(goalProgress(goals[currentIndex] ?? goals[0]) * 100)}%</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Zoom-in drill-down — the goal's What-If
 * ------------------------------------------------------------------ */

export function GoalZoom({ goal }: { goal: AscentGoal }) {
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);

  const remaining = Math.max(0, goal.target - goal.current);
  const progress = goalProgress(goal);

  const [monthly, setMonthly] = React.useState(() => {
    const seed = Math.ceil((remaining || 40) / 6 / 5) * 5;
    return Math.max(5, Math.min(100, seed || 5));
  });

  const result = React.useMemo(
    () => runWhatIf({ merchant: goal.title, amount: monthly, category: 'Shopping', isNeed: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runWhatIf, goal.title, monthly, sandboxClock, currentBalance, spentThisWeek, spentThisMonth, amortizeAnnualFees],
  );

  const months = remaining <= 0 ? 0 : monthly <= 0 ? Number.POSITIVE_INFINITY : Math.ceil(remaining / monthly);
  const etaMs = Number.isFinite(months) ? sandboxClock + months * 30 * 86_400_000 : null;

  const Icon = goal.icon;
  const r = 30;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative grid h-[86px] w-[86px] shrink-0 place-items-center">
          <svg viewBox="0 0 76 76" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={r} fill="none" stroke="#EAF3F1" strokeWidth="8" />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              stroke="#1D8B94"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(circumference * progress).toFixed(2)} ${circumference.toFixed(2)}`}
            />
          </svg>
          <Icon className="relative z-10 h-6 w-6 text-holst-800" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold tracking-[-0.02em] text-holst-950">{goal.title}</p>
          <p className="text-[10.5px] duo-muted">{goal.sub}</p>
          <p className="mt-1.5 inline-flex items-baseline gap-1">
            <span className="ct-int text-[22px] text-holst-950">{goalAmount(goal, goal.current)}</span>
            <span className="text-[11px] font-bold duo-muted">/ {goalAmount(goal, goal.target)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Progress</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">
            {Math.round(progress * 100)}%
          </p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Remaining</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">{goalAmount(goal, remaining)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">At this rate</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">
            {remaining <= 0 ? 'done' : Number.isFinite(months) ? `${months} mo` : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-holst-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] font-bold text-holst-950">What-if · set aside each month</p>
          <span className="duo-num text-[13px] font-extrabold text-holst-800">{formatRM(monthly)}</span>
        </div>
        <Slider
          className="mt-2.5"
          min={5}
          max={100}
          step={5}
          value={monthly}
          onValueChange={setMonthly}
          aria-label="Monthly set-aside for this goal"
        />
        <p className="mt-2 text-[10px] leading-relaxed duo-muted">
          {etaMs
            ? `Engine projects the milestone complete by ${new Date(etaMs).toISOString().slice(0, 10)} at this rate.`
            : 'Increase the set-aside to project a completion date.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">CFaR95 shortfall</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-950">{formatRM(result.cfar95)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">ES95 expected tail</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-600">{formatRM(result.es95)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Shortfall chance</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-950">
            {result.shortfallProbability.toFixed(1)}%
          </p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Projected month-end</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-950">
            {formatRM(result.projectedMonthEndBalance)}
          </p>
        </div>
      </div>

      <RiskTailStrip amount={monthly} category="Shopping" isNeed result={result} variant="inline" />

      <p className="text-[10px] leading-relaxed duo-muted">
        Read-only projection from the deterministic engine · {result.pathsRun} Monte-Carlo paths · risk{' '}
        <span className="font-bold text-holst-800">{result.riskLevel}</span>. Committing money always needs a per-action
        click in the Vault tab.
      </p>
    </div>
  );
}
