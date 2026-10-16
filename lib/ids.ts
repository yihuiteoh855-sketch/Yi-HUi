/**
 * ISOMORPHIC id generator for audit rows and correlation ids.
 * NOT a security token and not a secret — never used for authorization.
 */
let seq = 0;

export function newId(prefix: string): string {
  seq = (seq + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}_${rand}`;
}
