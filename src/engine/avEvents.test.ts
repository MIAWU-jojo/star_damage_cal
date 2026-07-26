import { describe, expect, it } from 'vitest'
import {
  applyGaugeAdvance,
  recalcAvAfterSpeedChange,
  simulateCombatEvents,
} from './avEvents'

describe('gauge helpers (KQM-style)', () => {
  it('recalculates remaining AV after speed change', () => {
    // 100 AV left at 100 spd → 10000 distance; at 200 spd → 50 AV
    expect(recalcAvAfterSpeedChange(100, 100, 200)).toBeCloseTo(50, 6)
  })

  it('applies advance on remaining gauge', () => {
    // 100 AV at 100 spd → 10000 dist; 20% advance → 8000 → 80 AV
    expect(applyGaugeAdvance(100, 100, 0.2)).toBeCloseTo(80, 6)
  })
})

describe('simulateCombatEvents', () => {
  it('starts buff on support action and covers following carry actions', () => {
    const result = simulateCombatEvents({
      cycles: 1,
      actors: [
        { id: 'sup', name: '辅', speed: 161, role: 'support' },
        { id: 'carry', name: '主', speed: 134, role: 'carry' },
      ],
      buffs: [
        {
          id: 'b1',
          name: '同谐战技增伤',
          sourceActorId: 'sup',
          durationKind: 'sourceTurns',
          duration: 2,
          coversCarry: true,
        },
      ],
      carryId: 'carry',
    })

    expect(result.events.some((e) => e.kind === 'buffStart')).toBe(true)
    const cov = result.coverage.find((c) => c.buffId === 'b1')!
    expect(cov.carryActionsTotal).toBeGreaterThan(0)
    expect(cov.carryActionsCovered).toBeGreaterThan(0)
    expect(cov.coverageRatio).toBeGreaterThan(0)
  })

  it('reports missed carry actions when support is too slow', () => {
    const result = simulateCombatEvents({
      cycles: 1,
      actors: [
        { id: 'sup', name: '慢辅', speed: 100, role: 'support' },
        { id: 'carry', name: '主', speed: 134, role: 'carry' },
      ],
      buffs: [
        {
          id: 'b1',
          name: '同谐战技增伤',
          sourceActorId: 'sup',
          durationKind: 'sourceTurns',
          duration: 2,
          coversCarry: true,
        },
      ],
      carryId: 'carry',
    })
    const cov = result.coverage.find((c) => c.buffId === 'b1')!
    expect(cov.missedActionIndexes.length).toBeGreaterThan(0)
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })
})
