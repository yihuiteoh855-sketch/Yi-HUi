# CtrlPay — Let AI Control the Flow

> **Stop Paying Blindly. Let AI Control the Flow.**
> A **proactive, defensive** personal-finance agent for university students.
> Built for the **2026 Shenzhen FinTechathon — Topic A**.

CtrlPay does not just *report* what you spent. It **interrupts** a harmful purchase before it
happens, **quarantines** impulse buys, **sweeps** zombie subscriptions, and **proves every
ringgit** with a tamper-evident audit trail.

> ⚠️ **Sandbox.** No real funds move. Every balance, vault, escrow and reward is a labelled
> local ledger bucket. Not a bank, not financial advice.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then edit .env.local
npm run dev                     # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | For the agent chat | Gemini key for the AI SDK v4 chat route. Without it the route returns **503** and the dashboard, Zombie Radar, timeline and audit log still work fully. |
| `CTRLPAY_SIGNING_SECRET` | Production only | Server secret used to HMAC-SHA256–sign proposals. A labelled dev fallback is used when unset. |

---

## Verify the build

```bash
npm run typecheck           # tsc --noEmit (strict)
npm test                    # vitest (unit + compliance)
npm run build               # next build (production)
npm run lint                # next lint
npm run verify:sdk-version  # AI SDK v4 pin guard (no v5 identifiers)
```

---

## Architecture

Two brains, one rule: **the model never computes money.**

```
LLM (Gemini)  ──extracts intent + identifiers only──▶  tool call
                                                        │
SERVER  lib/quant-engine.ts ──deterministically computes ALL figures──▶ SIGNED proposal
                                                        │
                                          USER ──approve / modify / decline──▶ the exact proposal
```

- **Numbers** come from `lib/quant-engine.ts` (historical-bootstrap **Cash-Flow-at-Risk**,
  sinking fund, dynamic daily allowance), never from the model.
- **Authority** comes from the signed session cookie (`lib/session.ts`), never the request body.
- **Guardrails** are three-stage: pre-LLM PII masking → per-user tenant isolation →
  strict Zod schemas + a post-LLM RM **number verifier** (`lib/privacy-guard.ts`).
- **Audit** is an append-only **hash chain** (`lib/audit-logger.ts`).

### Permission tiers

| Tier | Meaning | Examples |
|---|---|---|
| **T0** | Read-only analysis, always allowed | `run_what_if_simulation`, `get_budget_insights`, `analyze_zombies` |
| **T1** | Reversible, no money state | `flag_suspected_zombie` |
| **T2** | Prepares an external action | `draft_cancellation` |
| **T3** | Needs **Master ON + a per-action click** | `propose_quarantine`, `propose_escrow`, `propose_sweep` |

The Master AI Autonomy Switch is **default OFF**. T0 safety analysis still works off — so the
protective core is **never paywalled or gated** (enforced by `tests/compliance.test.ts`).

### Key source files

| Path | Role |
|---|---|
| `lib/quant-engine.ts` | All money math (CFaR, escrow floor, quarantine reward, amortization) |
| `lib/store.ts` | Zustand sandbox state + event-driven clock (Section 5.1 resolution order) |
| `lib/permissions.ts` | T0–T3 tiers, `assertTier`, click-authorization gate |
| `lib/privacy-guard.ts` | PII masking + `verifyNumbers` | 
| `lib/audit-logger.ts` | Hash-chained, append-only audit log |
| `lib/proposals.ts` | Server-side proposal creation / decision (signs + re-verifies) |
| `app/api/chat/route.ts` | AI SDK v4 `streamText`, tool registry, `maxSteps: 5` |
| `app/api/proposals/**` | Signed proposal + decision routes |
| `lib/tool-resolution.ts` | Contract-card resolution + dangling-tool-call guard |
| `components/agent-chat.tsx` | `useChat` (v4) + the three interactive contract cards |
| `components/subscription-timeline.tsx` | 30-day strip, amortization toggle, fast-forward |

---

## 5-minute demo script

> **Before you begin:** every contract action (Quarantine / Escrow / Sweep) is **T3**, which
> requires the **Master AI Autonomy Switch to be ON** *and* an explicit click. Steps 1–2 show
> it OFF; **turn it ON in the Simulation Toolbar before step 3.**

1. **Open the dashboard.** Master Switch is **OFF** → the toolbar shows `T0 ADVISORY ONLY`, so
   only analysis is available. This demonstrates default-OFF safety.
2. **Click `Simulate Shopee RM 180`.** Auto CFaR runs, then the **intercept modal** appears with
   the **shortfall probability** and duty-of-care figures. (A low-risk purchase would show no contract.)
3. **Turn the Master Switch ON**, then click **`24h Quarantine`** → the purchase becomes
   `LOCKED_24H` and a reward is reserved from the `rewardPool`.
4. **Click `+24 Hours`.** The quarantine flips to `READY_TO_DECIDE`. Click
   **`Abandon Purchase & Claim Reward`** — the reward is paid **from the rewardPool**. (Claiming
   before +24h is impossible; the button is disabled and titled *"Available after +24h"*.)
5. **Zombie Radar** flags **Spotify** as paid at full price while a student plan exists → click
   **`Student downgrade`** → enter **any 6-digit OTP** → use the **registry deep link** or the
   **`mailto:` draft** → **confirm** → a **PendingSweep** is recorded.
6. **Click `Jump to Month-End`.** The sweep is **verified** (the old charge disappeared), the
   **Defense Vault is credited**, and the **Month-End Roast** is shown (Gentle / Spicy).
7. **Open the Audit Drawer.** Show `data_accessed`, `authorization_ref`, `proposal_hash` and the
   **chain-verified** badge — the whole session is tamper-evident.

---

## Security & compliance

- 🔐 **Security Self-Assessment Report:** [`SECURITY_REPORT.md`](./SECURITY_REPORT.md) (Section 10)
- 📦 **Third-party licenses:** [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)
- 📐 **Design blueprint:** [`plan.md`](./plan.md)

Hardening highlights: strict CSP (`default-src 'self'`, no third-party scripts, no pop-up ads),
HSTS, `X-Frame-Options: DENY`, `noopener noreferrer` on all external links, a hardcoded HTTPS
registry whitelist (the LLM can never supply a URL), and **no autonomous credentials** — CtrlPay
holds no OAuth write access.

### Platform-layer limits (disclosed, not claimed)

A web app cannot detect hostile Wi-Fi or block pop-ups from other apps; those are OS/browser
responsibilities. The sandbox session is not strongly authenticated (a signed cookie stands in
for real login), and the audit log lives in memory/`localStorage`. See the report's *Residual
Risk* column for the production path (step-up auth, device binding, WORM storage, eKYC,
certificate pinning).

---

## Multi-turn tool-call integrity

The three contract tools are **client-resolved** (no server `execute`): the card must call
`addToolResult` for its `toolCallId` whatever the user does — **approve, modify, decline, or
clear the chat**. `lib/tool-resolution.ts` centralises these payloads and
`tests/tool-resolution.test.ts` proves no contract call is left dangling. `useChat` runs with
`maxSteps: 5` so the model can continue after a decision.

---

*CtrlPay is a competition sandbox. Merchant names are labels for mock data; no logos or brand
assets are included.*
