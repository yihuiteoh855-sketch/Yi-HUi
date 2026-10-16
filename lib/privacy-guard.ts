/**
 * Three-layer privacy & hallucination guardrails (plan.md Section 6.3).
 *
 * ISOMORPHIC (pure, no node APIs) so the browser can redact receipt/voice text
 * before it ever leaves the device.
 *   (1) Pre-LLM PII redaction
 *   (2) tenant isolation helpers live in lib/session.ts (server-only, signed cookie)
 *   (3) post-LLM RM number verifier tied to engine/ledger outputs
 */

export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

/** Ordered redaction rules. Order matters (IC, then phone, then account). */
export const PII_RULES: RedactionRule[] = [
  // Malaysian IC: YYMMDD-PB-####
  { name: 'IC', pattern: /\b\d{6}-\d{2}-\d{4}\b/g, replacement: '[IC]' },
  // International phone, e.g. +60123456789
  { name: 'PHONE_INTL', pattern: /\+\d{1,3}[\d-]{6,13}\d/g, replacement: '[PHONE]' },
  // Dashed local phone, e.g. 03-12345678 / 012-3456789
  { name: 'PHONE_LOCAL', pattern: /\b0\d{1,2}-\d{6,8}\b/g, replacement: '[PHONE]' },
  // Bank account strings: 10-16 consecutive digits (also covers bare 01x numbers)
  { name: 'ACCOUNT', pattern: /\b\d{10,16}\b/g, replacement: '[ACCOUNT]' },
  // Counterparty personal names after TO / FROM in transfer descriptions
  {
    name: 'PERSON',
    pattern: /(?<=\b(?:TO|FROM)\s+)[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*/g,
    replacement: '[PERSON]',
  },
];

export function redactPII(input: string): string {
  let out = input;
  for (const rule of PII_RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}

export interface ChatMessageLike {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
}

/** Redact every text surface of a message array before it reaches the LLM. */
export function redactMessages<T extends ChatMessageLike>(messages: T[]): T[] {
  return messages.map((m) => {
    const copy: ChatMessageLike = { ...m };
    if (typeof m.content === 'string') copy.content = redactPII(m.content);
    else if (Array.isArray(m.content)) {
      copy.content = (m.content as Array<Record<string, unknown>>).map((part) =>
        typeof part.text === 'string' ? { ...part, text: redactPII(part.text) } : part,
      );
    }
    if (Array.isArray(m.parts)) {
      copy.parts = m.parts.map((p) =>
        p && typeof p.text === 'string' ? { ...p, text: redactPII(p.text) } : p,
      );
    }
    return copy as T;
  });
}

/* ------------------------------------------------------------------ *
 * Post-LLM numerical hallucination verifier
 * ------------------------------------------------------------------ */

const RM_FIGURE_RE = /RM\s?\d[\d,]*(?:\.\d+)?/g;

export interface NumberVerification {
  ok: boolean;
  figures: number[];
  invalid: number[];
  allowed: number[];
}

function collectNumbers(value: unknown, into: number[], depth = 0): void {
  if (depth > 8 || value === null || value === undefined) return;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) into.push(value);
    return;
  }
  if (typeof value === 'string') {
    const matches = value.match(/\d+(?:\.\d+)?/g);
    if (matches) for (const m of matches) into.push(Number(m));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, into, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectNumbers(v, into, depth + 1);
  }
}

export function extractFigures(reply: string): number[] {
  const matches = reply.match(RM_FIGURE_RE);
  if (!matches) return [];
  return matches.map((m) => Number(m.replace(/RM\s?/, '').replace(/,/g, '')));
}

/**
 * Every `RM n` figure in the LLM reply must appear in the deterministic engine
 * output for that turn or in the user's ledger (tolerance +/- RM 0.01).
 */
export function verifyNumbers(
  reply: string,
  engineOutputs: unknown,
  ledger: unknown,
): NumberVerification {
  const figures = extractFigures(reply);
  const allowed: number[] = [];
  collectNumbers(engineOutputs, allowed);
  collectNumbers(ledger, allowed);
  // Derived-but-safe values the LLM is allowed to restate.
  allowed.push(9, 15); // student-unit prices

  const invalid = figures.filter(
    (f) => !allowed.some((a) => Math.abs(a - f) <= 0.01),
  );
  return { ok: invalid.length === 0, figures, invalid, allowed };
}
