import { beforeEach, describe, expect, it } from 'vitest';
import { useCtrlPayStore } from '@/lib/store';
import { BOOKING_CATEGORIES, mockReceiptExtraction, parseBookingText } from '@/lib/bookkeeping';
import { INITIAL_BALANCE, SANDBOX_START_MS, SPENT_THIS_MONTH, SPENT_THIS_WEEK } from '@/lib/mock-data';
import { toISODate } from '@/lib/utils';

const TODAY = toISODate(SANDBOX_START_MS);

describe('parseBookingText', () => {
  it('parses a NEED meal with the cafeteria category', () => {
    const d = parseBookingText('I spent RM 12 on lunch', { todayISO: TODAY });
    expect(d).not.toBeNull();
    expect(d?.amountRM).toBe(12);
    expect(d?.category).toBe('Campus_Cafeteria_Basic');
    expect(d?.isNeed).toBe(true);
    expect(d?.date).toBe(TODAY);
    expect(d?.merchant.length).toBeGreaterThan(0);
    expect(d?.source).toBe('CHAT');
  });

  it('parses a WANT bubble tea', () => {
    const d = parseBookingText('Paid RM 8.90 for bubble tea', { todayISO: TODAY, source: 'VOICE' });
    expect(d?.amountRM).toBe(8.9);
    expect(d?.category).toBe('Bubble_Tea_Dining');
    expect(d?.isNeed).toBe(false);
    expect(d?.source).toBe('VOICE');
  });

  it('recognises food delivery and transport keywords', () => {
    expect(parseBookingText('GrabFood RM 23.40', { todayISO: TODAY })?.category).toBe(
      'Food_Delivery_Grab_Foodpanda',
    );
    expect(parseBookingText('Bus fare RM 1.50', { todayISO: TODAY })?.category).toBe('Transport_Essential');
  });

  it('caps the parsed amount at 2 decimals', () => {
    expect(parseBookingText('spent RM 4.999', { todayISO: TODAY })?.amountRM).toBe(4.99);
  });

  it('returns null when there is no amount to book', () => {
    expect(parseBookingText('hello world', { todayISO: TODAY })).toBeNull();
    expect(parseBookingText('', { todayISO: TODAY })).toBeNull();
    expect(parseBookingText('spent RM 0 on nothing', { todayISO: TODAY })).toBeNull();
  });
});

describe('mockReceiptExtraction (sandbox OCR stand-in)', () => {
  it('is deterministic for the same file name', () => {
    const a = mockReceiptExtraction('IMG_1024.jpg', { todayISO: TODAY });
    const b = mockReceiptExtraction('IMG_1024.jpg', { todayISO: TODAY });
    expect(a).toEqual(b);
  });

  it('returns a valid, bookable draft', () => {
    const d = mockReceiptExtraction('receipt.png', { todayISO: TODAY });
    expect(d.source).toBe('RECEIPT');
    expect(d.amountRM).toBeGreaterThan(0);
    expect(BOOKING_CATEGORIES).toContain(d.category);
    expect(d.date).toBe(TODAY);
    expect(d.confidence).toBeGreaterThan(0);
  });
});

describe('store.bookExpense', () => {
  beforeEach(() => {
    useCtrlPayStore.setState({
      sandboxClock: SANDBOX_START_MS,
      currentBalance: INITIAL_BALANCE,
      spentThisWeek: SPENT_THIS_WEEK,
      spentThisMonth: SPENT_THIS_MONTH,
      events: [],
    });
  });

  it('debits the balance, updates spend totals and records a BOOKING event', () => {
    useCtrlPayStore.getState().bookExpense({
      merchant: 'Tealive',
      amount: 8.9,
      category: 'Bubble_Tea_Dining',
      isNeed: false,
      source: 'RECEIPT',
    });

    const s = useCtrlPayStore.getState();
    expect(s.currentBalance).toBeCloseTo(INITIAL_BALANCE - 8.9, 2);
    expect(s.spentThisWeek).toBeCloseTo(SPENT_THIS_WEEK + 8.9, 2);
    expect(s.spentThisMonth).toBeCloseTo(SPENT_THIS_MONTH + 8.9, 2);

    const booking = s.events.find((e) => e.type === 'BOOKING');
    expect(booking).toBeDefined();
    expect(booking?.payload.merchant).toBe('Tealive');
    expect(booking?.payload.amount).toBe(8.9);
    expect(booking?.payload.source).toBe('RECEIPT');
  });
});
