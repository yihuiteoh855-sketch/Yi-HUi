import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE,
  getUserIdFromSession,
  parseCookies,
  signSession,
  verifySessionToken,
} from '@/lib/session';

describe('sandbox session (tenant isolation)', () => {
  it('round-trips a signed session token', () => {
    const token = signSession('student_usm_001');
    expect(verifySessionToken(token)).toBe('student_usm_001');
  });

  it('rejects a tampered token', () => {
    const token = signSession('student_usm_001');
    expect(verifySessionToken(token.replace(/.$/, 'x'))).not.toBe('student_usm_001');
    expect(verifySessionToken('student_usm_001.deadbeef')).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });

  it('parses cookie headers', () => {
    expect(parseCookies('a=1; b=hello%20world')).toEqual({ a: '1', b: 'hello world' });
  });

  it('takes the userId from the signed cookie, never the body', () => {
    const token = signSession('student_other_777');
    const req = new Request('http://sandbox.local/api/chat', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      body: JSON.stringify({ userId: 'attacker_injected' }),
    });
    expect(getUserIdFromSession(req)).toBe('student_other_777');
  });

  it('falls back to the demo tenant only when no valid cookie is present', () => {
    const req = new Request('http://sandbox.local/api/chat', { method: 'POST' });
    expect(getUserIdFromSession(req)).toBe('student_usm_001');
  });
});
