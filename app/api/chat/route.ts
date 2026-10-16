import { convertToCoreMessages, streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import {
  AnalyzeZombiesInputSchema,
  DraftCancellationInputSchema,
  FlagSuspectedZombieInputSchema,
  GenerateRoastInputSchema,
  GetBudgetInsightsInputSchema,
  ProposeEscrowInputSchema,
  ProposeQuarantineInputSchema,
  ProposeSweepInputSchema,
  RunWhatIfInputSchema,
} from '@/lib/types';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { redactMessages, verifyNumbers } from '@/lib/privacy-guard';
import { getUserIdFromSession } from '@/lib/session';
import { auditLog } from '@/lib/audit-logger';
import { parseLedgerSnapshot } from '@/lib/ledger';
import { assertTier, type TierState } from '@/lib/permissions';
import {
  analyzeZombiesForUser,
  draftCancellationForUser,
  flagSuspectedZombieForUser,
  generateRoastForUser,
  getBudgetInsightsForUser,
  runWhatIfForUser,
} from '@/lib/server-tools';
import { toISODateTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequestBody {
  messages?: unknown[];
  ledgerSnapshot?: unknown;
  autonomy?: TierState;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      {
        error: 'MISSING_API_KEY',
        message:
          'GOOGLE_GENERATIVE_AI_API_KEY is not set. Copy .env.example to .env.local and add your Gemini key to enable the agent chat. The dashboard, Zombie Radar, timeline and audit log work without a key.',
      },
      { status: 503 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  // userId comes ONLY from the signed session cookie, never the body or the LLM.
  const userId = getUserIdFromSession(req);

  let snapshot;
  try {
    snapshot = parseLedgerSnapshot(body.ledgerSnapshot);
  } catch (err) {
    return Response.json(
      { error: 'INVALID_LEDGER_SNAPSHOT', message: (err as Error).message },
      { status: 400 },
    );
  }

  const autonomy: TierState = body.autonomy ?? {
    masterAutonomyEnabled: false,
    enabledTiers: { T0: true, T1: false, T2: false, T3: false },
  };

  // Guard helper for the server-executed tools. T3 tools have NO execute here.
  const guard = (toolName: string) => (args: unknown) => {
    const check = assertTier(toolName, autonomy);
    if (!check.ok) {
      auditLog.append(
        {
          sandboxClock: toISODateTime(snapshot.sandboxClock),
          actor: 'AGENT',
          actionType: `${toolName.toUpperCase()}_BLOCKED`,
          permissionTier: check.tier,
          data_accessed: [],
          authorization_ref: 'TIER_GATE_REJECTED',
          proposal_hash: null,
          status: 'DECLINED',
        },
        userId,
      );
      throw new Error(`TIER_BLOCKED: ${check.reason}`);
    }
    void args;
  };

  const messages = redactMessages(
    convertToCoreMessages((body.messages ?? []) as never[]) as never,
  ) as never;

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 5,
    temperature: 0.4,
    tools: {
      run_what_if_simulation: tool({
        description:
          'Simulate the effect of a purchase on month-end cash flow. Returns engine numbers only.',
        parameters: RunWhatIfInputSchema,
        execute: async (args) => {
          guard('run_what_if_simulation')(args);
          return runWhatIfForUser(userId, snapshot, args);
        },
      }),
      get_budget_insights: tool({
        description: 'Return the current dynamic daily allowance and budget breakdown.',
        parameters: GetBudgetInsightsInputSchema,
        execute: async (args) => {
          guard('get_budget_insights')(args);
          return getBudgetInsightsForUser(userId, snapshot);
        },
      }),
      analyze_zombies: tool({
        description:
          'Analyse recurring transactions and subscriptions; tags zombies and finds student-downgrade opportunities.',
        parameters: AnalyzeZombiesInputSchema,
        execute: async (args) => {
          guard('analyze_zombies')(args);
          return analyzeZombiesForUser(userId, snapshot);
        },
      }),
      flag_suspected_zombie: tool({
        description: 'Record the user answer to the one-click zombie usage question (T1).',
        parameters: FlagSuspectedZombieInputSchema,
        execute: async (args) => {
          guard('flag_suspected_zombie')(args);
          return flagSuspectedZombieForUser(userId, snapshot, args);
        },
      }),
      draft_cancellation: tool({
        description:
          'Return a registry-based mailto: draft descriptor (T2). Never returns a free-form URL.',
        parameters: DraftCancellationInputSchema,
        execute: async (args) => {
          guard('draft_cancellation')(args);
          return draftCancellationForUser(userId, snapshot, args);
        },
      }),
      generate_roast: tool({
        description:
          'Return engine numbers for the Month-End Subscription Roast. You write the prose only.',
        parameters: GenerateRoastInputSchema,
        execute: async (args) => {
          guard('generate_roast')(args);
          return generateRoastForUser(userId, snapshot, args);
        },
      }),
      // ---- T3 contract tools: NO `execute`. The client card resolves them. ----
      propose_quarantine: tool({
        description:
          'Propose a 24h commitment Quarantine for an impulse WANT purchase. Only when risk is HIGH/CRITICAL or a limit is breached. NEEDS can never be quarantined.',
        parameters: ProposeQuarantineInputSchema,
      }),
      propose_escrow: tool({
        description:
          'Propose a WANTS-category budget Escrow. Only when risk is HIGH/CRITICAL or a limit is breached.',
        parameters: ProposeEscrowInputSchema,
      }),
      propose_sweep: tool({
        description:
          'Propose a student downgrade or cancellation for a registry subscription.',
        parameters: ProposeSweepInputSchema,
      }),
    },
    onFinish: ({ text }) => {
      // Post-LLM numerical hallucination verifier.
      const verification = verifyNumbers(text, snapshot, snapshot);
      auditLog.append(
        {
          sandboxClock: toISODateTime(snapshot.sandboxClock),
          actor: 'AGENT',
          actionType: verification.ok ? 'NUMBER_VERIFIER_PASSED' : 'NUMBER_VERIFIER_BLOCKED',
          permissionTier: 'T0',
          data_accessed: ['engine.outputs', 'ledger'],
          authorization_ref: 'POST_LLM_VERIFIER',
          proposal_hash: null,
          status: verification.ok ? 'EXECUTED' : 'DECLINED',
        },
        userId,
      );
      if (!verification.ok) {
        console.warn('[NUMBER_VERIFIER_BLOCKED] unverified figures:', verification.invalid);
      }
    },
  });

  return result.toDataStreamResponse();
}
