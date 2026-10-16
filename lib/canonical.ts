/**
 * Deterministic canonical JSON — ISOMORPHIC (no node APIs).
 * Object keys sorted recursively, no whitespace. This is exactly what gets hashed,
 * so signing, verification and the audit hash-chain all agree byte-for-byte.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}
