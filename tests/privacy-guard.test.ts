import { describe, expect, it } from 'vitest';
import { extractFigures, redactMessages, redactPII, verifyNumbers } from '@/lib/privacy-guard';

describe('pre-LLM PII redaction', () => {
  it('masks a Malaysian IC number', () => {
    expect(redactPII('IC 990101-14-5566 on file')).toBe('IC [IC] on file');
  });

  it('masks bank account strings (10-16 digits)', () => {
    expect(redactPII('acct 1234567890123 credited')).toBe('acct [ACCOUNT] credited');
  });

  it('masks Malaysian phone numbers', () => {
    expect(redactPII('call +60123456789 now')).toContain('[PHONE]');
    expect(redactPII('call 03-12345678 now')).toContain('[PHONE]');
  });

  it('masks the plan.md fixture exactly: TRANSFER TO AHMAD BIN ALI 0123456789', () => {
    expect(redactPII('TRANSFER TO AHMAD BIN ALI 0123456789')).toBe(
      'TRANSFER TO [PERSON] [ACCOUNT]',
    );
  });

  it('leaves ordinary transaction text untouched', () => {
    expect(redactPII('GRABFOOD KL SENTRAL')).toBe('GRABFOOD KL SENTRAL');
  });

  it('redacts every text surface of a message array', () => {
    const out = redactMessages([
      { role: 'user', content: 'send to 990101-14-5566' },
      { role: 'assistant', parts: [{ type: 'text', text: 'ok 1234567890' }] },
    ]);
    expect(out[0].content).toBe('send to [IC]');
    expect(out[1].parts?.[0].text).toBe('ok [ACCOUNT]');
  });
});

describe('post-LLM numerical hallucination verifier', () => {
  it('extracts RM figures with and without a space', () => {
    expect(extractFigures('save RM 7.40 and RM12')).toEqual([7.4, 12]);
  });

  it('accepts figures that exist in engine output (tolerance ±0.01)', () => {
    const r = verifyNumbers('You could save RM 7.40 a month.', { monthlySavings: 7.4 }, {});
    expect(r.ok).toBe(true);
    expect(r.invalid).toEqual([]);
  });

  it('accepts figures from the ledger', () => {
    const r = verifyNumbers('Your balance is RM 1,240.00.', {}, { currentBalance: 1240 });
    expect(r.ok).toBe(true);
  });

  it('rejects an invented RM figure', () => {
    const r = verifyNumbers('That will save you RM 999.99 per year.', { monthlySavings: 7.4 }, {});
    expect(r.ok).toBe(false);
    expect(r.invalid).toContain(999.99);
  });

  it('allows the student-unit benchmark prices', () => {
    const r = verifyNumbers('That is 20 meals at RM 9 or a bubble tea at RM 15.', {}, {});
    expect(r.ok).toBe(true);
  });
});
