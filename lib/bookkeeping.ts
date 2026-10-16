/**
 * P2 Multimodal Bookkeeping (plan.md Section 5.5).
 *
 * Three inputs converge on ONE "confirm before book" draft:
 *   - Receipt / transfer screenshot OCR  -> structured fields -> user confirms
 *   - Voice (Web Speech API) transcript  -> parseBookingText  -> user confirms
 *   - Chat text ("I spent RM 12 on lunch") -> parseBookingText -> user confirms
 *
 * Nothing is written to the ledger until the user confirms. Raw images are NEVER
 * uploaded or persisted: the OCR path here is a clearly-labelled sandbox stand-in
 * for a production vision-LLM call, and it only ever reads the file NAME.
 */

import type { SpendCategory } from './types';
import { round2 } from './utils';

export type BookingSource = 'RECEIPT' | 'VOICE' | 'CHAT';

export interface BookingDraft {
  merchant: string;
  amountRM: number;
  date: string; // ISO date (YYYY-MM-DD), sandbox clock
  category: SpendCategory;
  isNeed: boolean;
  source: BookingSource;
  rawText?: string;
  /** 0..1 heuristic confidence in the auto-filled fields (the user always edits/confirms). */
  confidence: number;
}

interface CategoryRule {
  re: RegExp;
  category: SpendCategory;
  isNeed: boolean;
  label: string;
}

/** Deterministic keyword -> category mapping (no model involved). */
const CATEGORY_RULES: CategoryRule[] = [
  { re: /\b(lunch|dinner|breakfast|cafeteria|canteen|mixed rice|nasi|rice|mamak)\b/, category: 'Campus_Cafeteria_Basic', isNeed: true, label: 'Cafeteria meal' },
  { re: /\b(bubble|boba|tea|coffee|latte|dessert|cake|starbucks|tealive)\b/, category: 'Bubble_Tea_Dining', isNeed: false, label: 'Bubble tea' },
  { re: /\b(grab\s?food|foodpanda|delivery|grabfood)\b/, category: 'Food_Delivery_Grab_Foodpanda', isNeed: false, label: 'Food delivery' },
  { re: /\b(medicine|pharmacy|clinic|doctor|hospital|panadol|medical)\b/, category: 'Medical', isNeed: true, label: 'Medical' },
  { re: /\b(bus|lrt|mrt|ktm|train|taxi|grab|petrol|fuel|toll|touch ?n ?go|transport)\b/, category: 'Transport_Essential', isNeed: true, label: 'Transport' },
  { re: /\b(bill|electric|water|wifi|internet|unifi|phone|telco|rent|utility|utilities)\b/, category: 'Bills_Utilities', isNeed: true, label: 'Bills & utilities' },
  { re: /\b(movie|cinema|netflix|game|gaming|concert|entertainment|steam)\b/, category: 'Entertainment', isNeed: false, label: 'Entertainment' },
  { re: /\b(shop|shoes|shirt|clothes|gadget|lazada|shopee|mall|shopping)\b/, category: 'Shopping', isNeed: false, label: 'Shopping' },
];

const AMOUNT_RE = /(?:rm|ringgit|myr)?\s?(\d{1,6}(?:[.,]\d{1,2})?)/i;
const MERCHANT_NOISE =
  /\b(i|we|just|spent|spend|paid|pay|bought|buy|on|for|at|today|yesterday|tonight|morning|afternoon|rm|ringgit|myr|belanja|duit|habis|already)\b/gi;

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parse a natural-language line into a booking draft. Returns null when no amount
 * is present (nothing to book).
 */
export function parseBookingText(
  text: string,
  opts: { todayISO?: string; source?: BookingSource } = {},
): BookingDraft | null {
  const raw = text.trim();
  if (!raw) return null;

  const amountMatch = raw.match(AMOUNT_RE);
  if (!amountMatch) return null;
  const amountRM = round2(Number(amountMatch[1].replace(',', '.')));
  if (!Number.isFinite(amountRM) || amountRM <= 0) return null;

  const lower = raw.toLowerCase();
  const rule = CATEGORY_RULES.find((r) => r.re.test(lower));

  const merchant = titleCase(
    raw
      .replace(AMOUNT_RE, ' ')
      .replace(/\d+(?:[.,]\d{1,2})?/g, ' ')
      .replace(MERCHANT_NOISE, ' ')
      .replace(/[^\p{L}\p{N}\s&-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  ).slice(0, 40);

  return {
    merchant: merchant || rule?.label || 'Unlabeled expense',
    amountRM,
    date: opts.todayISO ?? new Date().toISOString().slice(0, 10),
    category: rule?.category ?? 'Shopping',
    isNeed: rule?.isNeed ?? false,
    source: opts.source ?? 'CHAT',
    rawText: raw,
    confidence: rule ? 0.85 : 0.4,
  };
}

/** Sandbox receipt fixtures the OCR stand-in can "recognise". */
const RECEIPT_FIXTURES: Omit<BookingDraft, 'date' | 'source'>[] = [
  { merchant: 'Tealive', amountRM: 8.9, category: 'Bubble_Tea_Dining', isNeed: false, confidence: 0.91 },
  { merchant: 'USM Cafeteria', amountRM: 6.5, category: 'Campus_Cafeteria_Basic', isNeed: true, confidence: 0.94 },
  { merchant: 'GrabFood', amountRM: 23.4, category: 'Food_Delivery_Grab_Foodpanda', isNeed: false, confidence: 0.88 },
  { merchant: 'Guardian Pharmacy', amountRM: 12.3, category: 'Medical', isNeed: true, confidence: 0.9 },
];

/** Small deterministic string hash (mirrors the seeded-PRNG philosophy). */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Sandbox stand-in for "image -> vision LLM -> structured JSON".
 *
 * It reads ONLY the file name (never the pixels, never the bytes) and picks a
 * fixture deterministically, so the demo is reproducible. The production path is
 * documented in `SECURITY_REPORT.md` §10.1(4): process in memory, never write to
 * disk, discard after extraction + user confirmation.
 */
export function mockReceiptExtraction(
  fileName: string,
  opts: { todayISO?: string } = {},
): BookingDraft {
  const fixture = RECEIPT_FIXTURES[hashString(fileName) % RECEIPT_FIXTURES.length];
  return {
    ...fixture,
    date: opts.todayISO ?? new Date().toISOString().slice(0, 10),
    source: 'RECEIPT',
    rawText: `OCR stub · ${fileName}`,
  };
}

export const BOOKING_CATEGORIES: SpendCategory[] = [
  'Bills_Utilities',
  'Campus_Cafeteria_Basic',
  'Medical',
  'Transport_Essential',
  'Food_Delivery_Grab_Foodpanda',
  'Entertainment',
  'Bubble_Tea_Dining',
  'Shopping',
];
