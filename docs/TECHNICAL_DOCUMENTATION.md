# CtrlPay — Technical Documentation

**2026 Shenzhen FinTechathon · International Track · Topic A (Personal Finance / Defensive AI)**
**Submission Checklist Item 01 — Technical Documentation**

CtrlPay is a defensive personal-finance agent for Malaysian university students. It protects the
user from impulse spending and forgotten ("zombie") subscriptions. Every monetary figure,
probability and percentage is produced by a deterministic TypeScript engine; the large language
model (LLM) extracts intent and identifiers only, and the human always makes the final decision.

This document covers the three areas required by the checklist: **System Architecture**, **Core
Algorithm Description**, and **Security Design**.

---

## 1. System Architecture

### 1.1 Two-Brain Server-Side Authority

CtrlPay deliberately separates *language* from *arithmetic*:

| Brain | Where it lives | Responsibility | What it must never do |
|---|---|---|---|
| **Language brain** | `app/api/chat/route.ts` (Google Gemini via the Vercel AI SDK) | Understand the user, extract intent + identifiers, call tools, write prose | Compute or invent any money figure, see the signing secret, or hold autonomous credentials |
| **Arithmetic brain** | `lib/quant-engine.ts` (pure TypeScript) | Compute every RM figure, probability, ratio and classification deterministically | Call the network or the LLM |

The LLM can only reference a subscription by the `subscriptionId` enum (`lib/subscription-registry.ts`);
it can never supply a URL. The server computes a proposal, signs it with HMAC-SHA256
(`lib/signing.ts`), and only then does the LLM narrate the already-computed numbers. A post-generation
verifier (`verifyNumbers`) rejects any reply that contains an `RM` figure absent from the engine
output for that turn.

### 1.2 Proactive, Event-Driven Sandbox

CtrlPay is *proactive*: instead of waiting to be asked, it reacts to events and intervenes before
money leaves the account.

```
 Sandbox Clock ──▶ Payment Intent Webhook Interceptor ──▶ T0 Quantitative Engine
        │                        │                               │
        │                        │                               ▼
        │                        │                    T3 Interactive Contract Cards
        │                        │                    (Quarantine / Escrow / Sweep)
        │                        │                               │
        ▼                        ▼                               ▼
 Read-Only Structured      Hash-Chained Audit Log (append-only, SHA-256 chained)
 Gmail Receipt Parser
```

- **Sandbox Clock** (`lib/store.ts`, `lib/utils.ts`): a simulated wall clock starting at
  `2026-03-12T09:00:00Z`. The simulation toolbar advances it by **+24 hours**, **+7 days**, or
  **Jump to Month-End**. On each tick, `resolveClock` fires scheduled effects (12:00 PM daily
  spending summaries, billing-date crossings that settle pending sweeps, month-end roast metrics).
- **Payment Intent Webhook Interceptor** (`simulatePaymentIntent`): models a bank/payment webhook.
  It runs the T0 What-If simulation and, when risk is HIGH/CRITICAL or a user limit is breached,
  emits an intercept event that opens the T3 Contract Card.
- **Read-Only Structured Gmail Receipt Parser** (mock, `lib/bookkeeping.ts`): an opt-in, revocable,
  read-only path that yields *structured fields only* (merchant, amount, category) and never raw
  email bodies.
- **T0 Quantitative Engine** (`lib/quant-engine.ts`): computes Cash-Flow-at-Risk, the dynamic
  daily allowance, amortized subscription burden and the intervention gate.
- **T3 Three-Option Interactive Contract Cards** (`components/contract-cards.tsx`): every
  intervention is presented as an explicit **Approve / Modify / Decline** decision (plus a dismiss
  fallback), each carrying a signed proposal.
- **Hash-Chained Audit Log** (`lib/audit-logger.ts`): append-only, tamper-evident, one chain per
  tenant.

### 1.3 End-to-End Module & Route Architecture

#### Libraries (`lib/`)

| File | Role |
|---|---|
| `types.ts` | Zod schemas + inferred types for tools, proposals, decisions, mandates and limits |
| `domain.ts` | Domain interfaces (FixedBill, Subscription, WhatIfInput/Result, EscrowFloorCheck, …) |
| `quant-engine.ts` | **Deterministic arithmetic brain** — CFaR Monte Carlo, allowance, escrow floor, amortization, reward, routing |
| `prng.ts` | Seeded `mulberry32` PRNG + `randInt` (reproducible simulations) |
| `utils.ts` | `round2`, RM formatting, ISO date helpers, `remainingDaysInMonth`, `noonsBetween`, `endOfMonthMs` |
| `sha256.ts` | Dependency-free isomorphic SHA-256 (verified against `node:crypto`) |
| `canonical.ts` | Deterministic JSON canonicalisation for hashing |
| `signing.ts` | **Server-only** HMAC-SHA256 proposal signing + verification |
| `ids.ts` | ID generation |
| `ledger.ts` | `LedgerSnapshot` build/parse, upcoming fixed bills, What-If input assembly |
| `subscription-registry.ts` | Hardcoded, team-maintained subscription whitelist (prices + HTTPS deep links) |
| `zombie-radar.ts` | Merchant normalisation, recurring-charge detection, zombie tagging, student-arbitrage detection |
| `privacy-guard.ts` | Pre-LLM PII redaction + post-LLM RM number verifier |
| `audit-logger.ts` | Hash-chained, per-tenant append-only log; `mergeExternal` for server→client unification |
| `audit-sync.ts` | Client helper: pull server AGENT entries and merge them into the local chain |
| `session.ts` | **Server-only** signed-cookie session → `userId` (tenant isolation) |
| `permissions.ts` | Permission tiers T0–T3, `TOOL_TIERS`, `assertTier`, click-authorization regex |
| `proposals.ts` | **Server-only** proposal creation + `decideProposal` (integrity, tenant, expiry, floor, mandate) |
| `server-tools.ts` | Server tool implementations (all numbers from `quant-engine`) |
| `system-prompt.ts` | Locked system prompt + `buildFallbackReply` |
| `mock-data.ts` | Deterministic sandbox fixtures (balance, subscriptions, transactions, receipts, usage) |
| `store.ts` | Zustand client state: clock resolution, decisions, sweeps, quarantine, booking, audit writes |
| `bookkeeping.ts` | `parseBookingText`, `mockReceiptExtraction` (name-only deterministic fixture) |
| `tool-resolution.ts` | Contract-card decision builders + dangling-tool-call guard |
| `api-client.ts` | Browser fetch helpers for proposals, decisions and `mailto:` drafts |

#### API routes (`app/api/`)

| Route | Verb | Purpose |
|---|---|---|
| `/api/chat` | POST | AI SDK v4 `streamText` (Gemini), T0–T2 tools with `execute`, T3 tools without `execute`, `maxSteps: 5`, post-LLM number verifier in `onFinish` |
| `/api/proposals` | POST | Create + HMAC-sign a proposal (server computes all terms) |
| `/api/proposals/[id]/decision` | POST | Decide a proposal; verifies integrity, tenant, expiry, T3 gate, escrow floor and AI mandate. Accepts the echoed signed proposal for **stateless** verification |
| `/api/audit` | GET | Returns server-side AGENT audit entries for the caller's tenant |

#### Components (`components/`)

| Component | Role |
|---|---|
| `agent-chat.tsx` | AI SDK v4 `useChat`, quick chips, roast-tone toggle, contract-card mounting, verifier banner |
| `contract-cards.tsx` | Quarantine / Escrow / Sweep cards (Approve / Modify / Decline) + guaranteed tool resolution |
| `payment-interceptor-modal.tsx` | Payment-intent interceptor with the three T3 options |
| `quarantine-cards.tsx` | Active quarantine list + "Abandon Purchase & Claim Reward" |
| `vault-panel.tsx` | `defenseVault` + `rewardPool` ledger buckets |
| `subscription-timeline.tsx` | Upcoming billing timeline |
| `zombie-radar-panel.tsx` | Zombie tags + student-downgrade sweep entry |
| `student-downgrade-drawer.tsx` | Student-email/OTP check + downgrade sweep flow |
| `multimodal-bookkeeping.tsx` | Receipt upload, voice and typed booking (confirm-before-book) |
| `event-feed.tsx` | Raw `[SANDBOX]` event stream |
| `audit-drawer.tsx` | Unified hash-chained audit log with chain-verified badge |
| `simulation-toolbar.tsx` | Clock controls + Master AI Autonomy Switch |
| `ui/*` | Badge, Button, Card, Slider, Switch primitives |

---

## 2. Core Algorithm Descriptions

All algorithms below live in `lib/quant-engine.ts` (or the named module) and are fully
deterministic: identical inputs always produce identical outputs.

### 2.1 Historical Bootstrap Cash-Flow-at-Risk (CFaR) Monte Carlo

Implemented by `runWhatIfSimulation(input: WhatIfInput)`. Let

- `B` = current balance,
- `U` = total **unpaid** fixed bills,
- `P` = proposed expense amount,
- `G` = monthly savings goal,
- `D` = remaining days in the month,
- `H` = historical daily spending vector (length `m`).

We draw **N = 1,000** bootstrap paths using a seeded `mulberry32(seed)` generator. For path *i*:

```
S_i = Σ_{j=1..D} H[ randInt(rng, m) ]        (simulated remaining spend)
E_i = B − U − P − S_i                        (projected month-end balance)
L_i = max(0, G − E_i)                        (shortfall vs. savings goal)
```

Then:

- `projectedMonthEndBalance = round2( (1/N) Σ E_i )`
- `shortfallProbability = round2( 100 · #{E_i < G} / N )` (%)
- `negativeProbability = 100 · #{E_i < 0} / N` (%)
- `CfaR95 = round2( percentile_95( sortedAscending(L_i) ) )` where
  `percentile(sorted, p) = sorted[ min(len−1, ceil(p·len) − 1) ]`.

**Risk classification** (`classifyRisk`), with thresholds `low = 10%`, `medium = 30%`, `high = 60%`
and `criticalNegativeProbability = 20%`:

| Condition | Level |
|---|---|
| `shortfallProbability ≥ 60` **or** `negativeProbability > 20` | `CRITICAL` |
| `shortfallProbability ≥ 30` | `HIGH` |
| `shortfallProbability ≥ 10` | `MEDIUM` |
| otherwise | `LOW` |

Any weekly/monthly user-limit breach raises the level to at least `HIGH` via `maxRisk`. When fewer
than `MIN_HISTORY_DAYS = 14` days of history exist, the bootstrap falls back to a flat estimate
(the historical mean, or `campusMixedRice × 2 = RM 18/day` when there is no history) and sets
`lowHistoryWarning = true`.

The **dynamic daily allowance** is:

```
dynamicDailyAllowance = round2( max(0, (B − U − savingsGoal − proposedExpense) / max(1, D) ) )
```

### 2.2 Sinking Fund — Annual/Quarterly Fee Amortization

Implemented by `calculateAmortizedSubscriptions(subs)`. Recurring fees are smoothed into a monthly
and daily burden so they hit the allowance every day rather than all at once:

```
monthlyBurden = amountRM / 12      (ANNUAL)
              = amountRM / 3       (QUARTERLY)
              = amountRM           (MONTHLY)

dailyBurden   = monthlyBurden × 12 / 365
setAsideThisMonth = monthlyBurden
```

The total monthly burden feeds `computeDynamicDailyAllowance` through the
`amortizedMonthlyBurden` argument, so enabling amortization in the UI lowers the safe daily
allowance in real time. (Example: the RM 180/year gym membership becomes RM 15.00/month, or
~RM 0.49/day.)

### 2.3 Needs vs. Wants Protection Floor

Implemented by `validateEscrowFloor({ lockedCategories, dailyBudgetReduction,
dynamicDailyAllowance, durationDays, mandate })`. The floor is enforced at two levels:

1. **Type level.** `NeedsCategorySchema` (`Bills_Utilities`, `Campus_Cafeteria_Basic`, `Medical`,
   `Transport_Essential`) is disjoint from `WantsCategorySchema`
   (`Food_Delivery_Grab_Foodpanda`, `Entertainment`, `Bubble_Tea_Dining`, `Shopping`).
   `isNeedCategory()` provides a runtime backstop; if any NEEDS category appears, the result is
   `NEEDS_CATEGORY_LOCKED`.

2. **Runtime level.**

```
byRatio            = 0.40 × dynamicDailyAllowance            (40% maximum reduction)
byFloor            = dynamicDailyAllowance − 15.0            (RM 15/day survival floor)
maxAllowedReduction= round2( max(0, min(byRatio, byFloor)) )
```

   - `maxAllowedReduction ≤ 0` → `BELOW_SURVIVAL_FLOOR`.
   - `dailyBudgetReduction > maxAllowedReduction` → `REDUCTION_OVER_40_PERCENT` when it exceeds
     `byRatio`, and/or `BELOW_SURVIVAL_FLOOR` when `dda − reduction < 15`.
   - `durationDays > mandate.maxLockDurationDays` **or**
     `dailyBudgetReduction × durationDays > mandate.maxLockAmountRM` → `EXCEEDS_AI_MANDATE`.

   The function also returns the rounded `maxAllowedReduction`, which the modify flow re-signs into
   the new escrow terms (this fixes a rounding path where the cap itself could be exceeded).

### 2.4 Two-Stage Sweep Settlement & Anti-Farming Quarantine State Machine

**Two-stage sweep settlement.** A subscription savings sweep does not credit the vault immediately:

```
Stage 1  create  : PendingSweep { monthlySavings, status: PENDING_NEXT_BILLING_VERIFICATION }
Stage 2  settle  : on the next billing-date crossing, the sweep becomes VERIFIED and
                   defenseVault += monthlySavings
                   rewardPool   += monthlySavings
```

`defenseVault` is a labelled, **non-interest-bearing ledger bucket** — no real money moves and no
yield is fabricated. The `rewardPool` is funded **only** by VERIFIED sweep savings. Because both
buckets move by exactly the verified `monthlySavings`, the invariant *vault growth ≤ verified
savings* always holds. Manually-processed contracts (e.g. Anytime Fitness, a gym with no
self-service cancellation) resolve to `NOT_VERIFIED` and credit **nothing** (`SWEEP_NOT_VERIFIED`).

**Anti-farming quarantine state machine.**

```
PROPOSED ─(user clicks Approve, valid USER_CLICK_APPROVE_PROPOSAL_* ref)→ LOCKED_24H
LOCKED_24H ─(advanceClock +24h)→ READY_TO_DECIDE
READY_TO_DECIDE ─("Abandon Purchase & Claim Reward")→ CLAIMED
```

The reward is `reward = round2( max(0, min( itemPrice × 0.05, RM 15.00, rewardPool )) )`, and on
claim `rewardPool −= reward`, `defenseVault += reward`. The claim button is disabled until the
sandbox clock has advanced a full 24 hours, so the reward cannot be farmed by locking and
immediately releasing. `releaseQuarantine` (proceed with the purchase) awards no reward.

### 2.5 Zombie Radar — Recurrence & Telemetry Classification

Implemented in `lib/zombie-radar.ts`.

**Detection** (`detectRecurring`): group transactions by `normalizeMerchant(name)` (uppercase,
alphanumeric only). A group is *recurring* when all of the following hold:

- `occurrences ≥ minOccurrences = 3`;
- every amount is within `±5%` of the group mean (`amountTolerancePct = 0.05`);
- consecutive intervals are each within `30 ± 3` days (`intervalDays = 30`,
  `intervalToleranceDays = 3`).

**Classification** (`analyzeZombies`), using `usageSignals.lastUsedDaysAgo` and the sandbox clock:

| Condition | Tag |
|---|---|
| Recurring but no usage telemetry available | `SUSPECTED_ZOMBIE` |
| Recurring ≥ 3 months **and** last used > 30 days ago | `ZOMBIE` |
| Otherwise active | `ACTIVE` |
| `ACTIVE` but renewing within 3 days | `ENDANGERED` |

A one-click answer ("have you used this in the past 30 days?") upgrades `SUSPECTED_ZOMBIE → ZOMBIE`
on "no", or `SUSPECTED_ZOMBIE → ACTIVE` on "yes" (`applyUsageAnswer`). **Student arbitrage**: when
the user pays full price and the registry exposes a student price, the subscription is added to
`studentDowngradeCandidates` (e.g. Spotify RM 15.90 → RM 8.50). Merchant→`subscriptionId`
resolution is a hardcoded token table — no LLM, no network.

---

## 3. Security & Compliance Architecture

### 3.1 Permission Tiers and the Master Autonomy Switch

| Tier | Meaning | Enforcement |
|---|---|---|
| **T0** | Read-only analysis (What-If, budget insights, zombie analysis, roast) | Always allowed, still audit-logged |
| **T1** | Reversible, no money state change (zombie tagging) | Master ON **and** T1 enabled |
| **T2** | Preparation only (cancellation draft) | Master ON **and** T2 enabled |
| **T3** | Money state change (Quarantine / Escrow / Sweep) | Master ON **and** a valid per-action `USER_CLICK_APPROVE_PROPOSAL_*` reference at decision time |

`assertTier(toolName, state, { authorizationRef })` in `lib/permissions.ts` is the single
enforcement point. It runs inside every API route before a tool executes, and again inside the
decision route with the user's click reference. The Master AI Autonomy Switch **defaults to OFF**,
so the out-of-the-box state is T0 advisory only. The T3 gate requires *both* the Master switch ON
*and* the click reference — creating a proposal is preparation, never authorization.

### 3.2 Dual Limit Architecture

Two independent limits protect the user:

- **`UserSpendingLimit`** — the *user's own* declared weekly/monthly pay limits. Breaching either
  raises the risk level to at least HIGH and can trigger an intervention.
- **`AiMandate`** — the *user's* ceiling on what the agent may even *propose*:
  `maxLockAmountRM`, `maxLockDurationDays` and the allowed lock categories. It is validated at
  proposal creation, re-validated at decision time, and can never be raised by the LLM.

### 3.3 Three-Stage Privacy & Hallucination Guardrails

1. **Pre-LLM PII redaction** (`redactPII` / `redactMessages`). Ordered regex rules mask Malaysian
   IC numbers (`YYMMDD-PB-####`), international and local phone numbers, 10–16 digit bank accounts
   and counterparty names after `TO`/`FROM`. Redaction happens in the browser before any text
   leaves the device and again on the server.
2. **Per-user session isolation** (`lib/session.ts`). The `userId` is derived only from a signed
   HMAC cookie (`ctrlpay_session`), never from the request body or the LLM. Every server read/write
   and every audit chain is keyed by this `userId`.
3. **Post-LLM number verifier** (`verifyNumbers`). Every `RM n` figure in the model's reply must
   appear (within ±RM 0.01) in the deterministic engine output for that turn or in the user's
   ledger. On failure the verifier records `NUMBER_VERIFIER_BLOCKED` in the audit log and the UI
   raises an observable verification notice; on success it records `NUMBER_VERIFIER_PASSED`.

### 3.4 Hardcoded Registry Whitelist and Zero-Write Cancellation

- **Whitelist.** All subscriptions live in `SUBSCRIPTION_REGISTRY` with team-maintained prices and
  **HTTPS-only** deep links. The LLM may reference a subscription only by its `subscriptionId`
  enum; it can never supply a URL, so prompt-injected links cannot reach the user.
- **Zero OAuth write scopes.** CtrlPay holds no autonomous credentials. Cancellations are produced
  as a client-side `mailto:` draft (`buildMailto`) that the user reviews and sends themselves —
  there is no Gmail send scope and no server-side email write path.
- **Tamper-evident audit.** `auditLog` chains entries as
  `entryHash = SHA-256(prevHash + canonicalJson(entry))`, so altering any earlier entry breaks
  every later hash and `verifyChain(userId)` returns `false`. Server-recorded AGENT entries are
  merged into the browser chain via `mergeExternal`, which recomputes hashes locally and is
  idempotent by `logId`, so the Audit Drawer always shows one unified, verified chain.

### 3.5 Serverless Proposal Integrity

On serverless platforms `POST /api/proposals` and `POST /api/proposals/[id]/decision` may run on
different instances. The decision route therefore accepts the client-echoed `SignedProposal` and
**always** recomputes `HMAC-SHA256(serverSecret, canonicalJson(terms) + proposalId + userId)` to
verify the `integrityHash` before any state change. The proposal must be pending and unexpired, and
the escrow floor / AI mandate are re-checked server-side. A single-byte change to any term (for
example `premiumReward + 0.01`) is rejected with `INTEGRITY_HASH_MISMATCH`.

---

## 4. Determinism, Testing & Reproducibility

- **Deterministic math.** All simulations use `mulberry32(seed)`; the default seed is `20260312`.
  Given the same inputs, the CFaR results, risk level and allowance are byte-for-byte reproducible.
- **Test suite.** Vitest covers the engine, PRNG, signing/verification, SHA-256 (against
  `node:crypto`), canonicalisation, audit chaining, permissions, privacy guard, zombie radar,
  proposals, stateless decision, store/clock behaviour, tool schemas, bookkeeping and compliance.
- **Compliance guard.** A test asserts the AI SDK v4 identifier set (`parameters`,
  `toDataStreamResponse`, `addToolResult`, `maxSteps`) and the *absence* of v5 identifiers
  (`inputSchema`, `addToolOutput`, `toUIMessageStreamResponse`, `stopWhen`), and that free-tier
  safety never reads the `plan` flag.
- **Evidence.** The judge walkthrough is reproducible via the sandbox execution-evidence generator
  (see `docs/SANDBOX_EXECUTION_EVIDENCE.md` and `docs/sandbox-operation-log.json`).

---

*Prices, thresholds and fixtures in this document are sandbox/demo values maintained by the team,
not live market data.*
