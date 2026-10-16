import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex } from '@/lib/sha256';

function nodeSha256(message: string): string {
  return createHash('sha256').update(message, 'utf8').digest('hex');
}

describe('pure SHA-256', () => {
  const fixtures = [
    '',
    'abc',
    'hello world',
    'a'.repeat(55),
    'a'.repeat(56),
    'a'.repeat(64),
    'a'.repeat(1000),
    JSON.stringify({ b: 1, a: [1, 2, 3], c: '中文 🚀' }),
    'TRANSFER TO [PERSON] [ACCOUNT]',
  ];

  it.each(fixtures)('matches node:crypto for %s', (message) => {
    expect(sha256Hex(message)).toBe(nodeSha256(message));
  });

  it('handles multi-byte UTF-8 correctly', () => {
    expect(sha256Hex('中文测试')).toBe(nodeSha256('中文测试'));
  });
});
