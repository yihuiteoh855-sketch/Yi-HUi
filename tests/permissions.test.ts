import { describe, expect, it } from 'vitest';
import { assertTier, tierOf, TOOL_TIERS } from '@/lib/permissions';

const off = { masterAutonomyEnabled: false, enabledTiers: { T0: true, T1: false, T2: false, T3: false } };
const onT1 = { masterAutonomyEnabled: true, enabledTiers: { T0: true, T1: true, T2: false, T3: false } };
const onAll = { masterAutonomyEnabled: true, enabledTiers: { T0: true, T1: true, T2: true, T3: true } };

describe('permission tiers', () => {
  it('maps every registered tool to a tier', () => {
    expect(tierOf('run_what_if_simulation')).toBe('T0');
    expect(tierOf('draft_cancellation')).toBe('T2');
    expect(tierOf('propose_quarantine')).toBe('T3');
    expect(Object.keys(TOOL_TIERS)).toHaveLength(9);
  });

  it('always allows T0 read-only tools', () => {
    expect(assertTier('run_what_if_simulation', off).ok).toBe(true);
    expect(assertTier('analyze_zombies', off).ok).toBe(true);
  });

  it('blocks T1/T2/T3 when the Master Switch is OFF', () => {
    expect(assertTier('flag_suspected_zombie', off).ok).toBe(false);
    expect(assertTier('draft_cancellation', off).reason).toMatch(/MASTER_AUTONOMY_OFF/);
    expect(assertTier('propose_quarantine', off).ok).toBe(false);
  });

  it('allows T1 when Master is ON and T1 is enabled', () => {
    expect(assertTier('flag_suspected_zombie', onT1).ok).toBe(true);
  });

  it('blocks T2 while T2 is disabled, even with Master ON', () => {
    expect(assertTier('draft_cancellation', onT1).reason).toBe('TIER_T2_DISABLED');
  });

  it('always requires an explicit per-action click for T3, even with Master ON', () => {
    expect(assertTier('propose_escrow', onAll).ok).toBe(false);
    expect(assertTier('propose_escrow', onAll).reason).toMatch(/T3_REQUIRES_EXPLICIT_USER_CLICK/);
  });

  it('accepts a valid USER_CLICK_APPROVE authorization ref for T3', () => {
    expect(
      assertTier('propose_quarantine', onAll, { authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_8f3a' }).ok,
    ).toBe(true);
  });

  it('rejects a forged authorization ref', () => {
    expect(
      assertTier('propose_quarantine', onAll, { authorizationRef: 'MANDATE_DEFAULT_T0' }).ok,
    ).toBe(false);
  });
});
