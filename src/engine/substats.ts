/**
 * Substat allocation hints (P3) — marginal roll comparison, not GPU search.
 */

import { calculateDamage } from './damage'
import type { AttackerInput, BuffInput, CritMode, DefenderInput } from './types'

/** Approximate value of one mid-roll for common substats. */
export const ROLL = {
  critRate: 0.0324,
  critDamage: 0.0648,
  atkPercent: 0.0389,
  speed: 2.3,
} as const

export type SubstatId = keyof typeof ROLL

export interface SubstatAdvice {
  id: SubstatId
  label: string
  gainRatio: number
  note: string
}

export interface SubstatAdviceInput {
  attacker: AttackerInput
  defender: DefenderInput
  buffs: BuffInput
  critMode?: CritMode
  /** Current SPD (display / breakpoint only). */
  currentSpeed: number
  /** Target SPD breakpoint; if unmet, Speed ranks first. */
  speedFloor: number
  /** Extra rolls to simulate for ranking (default 1). */
  rolls?: number
}

function withAtkPercent(attacker: AttackerInput, pct: number): AttackerInput {
  return {
    ...attacker,
    attributeValue: attacker.attributeValue * (1 + pct),
  }
}

/**
 * Rank +N substat rolls by expected damage gain.
 * If currentSpeed < speedFloor, Speed is forced to the top with a note.
 */
export function adviseSubstats(input: SubstatAdviceInput): SubstatAdvice[] {
  const critMode = input.critMode ?? 'expected'
  const rolls = Math.max(1, input.rolls ?? 1)
  const baseline = calculateDamage({
    critMode,
    attacker: input.attacker,
    defender: input.defender,
    buffs: input.buffs,
  }).finalDamage

  const trials: Array<{
    id: SubstatId
    label: string
    attacker: AttackerInput
    note: string
  }> = [
    {
      id: 'critRate',
      label: `暴击率 +${(ROLL.critRate * rolls * 100).toFixed(1)}%`,
      attacker: {
        ...input.attacker,
        critRate: Math.min(1, input.attacker.critRate + ROLL.critRate * rolls),
      },
      note: '期望乘区直接受益',
    },
    {
      id: 'critDamage',
      label: `暴伤 +${(ROLL.critDamage * rolls * 100).toFixed(1)}%`,
      attacker: {
        ...input.attacker,
        critDamage: input.attacker.critDamage + ROLL.critDamage * rolls,
      },
      note: '暴击乘区',
    },
    {
      id: 'atkPercent',
      label: `攻击% +${(ROLL.atkPercent * rolls * 100).toFixed(1)}%`,
      attacker: withAtkPercent(input.attacker, ROLL.atkPercent * rolls),
      note: '抬基础伤害',
    },
    {
      id: 'speed',
      label: `速度 +${(ROLL.speed * rolls).toFixed(1)}`,
      attacker: input.attacker,
      note: '不直接改单次伤害；用于门槛',
    },
  ]

  const ranked: SubstatAdvice[] = trials.map((t) => {
    if (t.id === 'speed') {
      const need = input.speedFloor - input.currentSpeed
      const gainRatio =
        need > 0 ? Math.min(0.15, need / Math.max(input.speedFloor, 1)) : 0
      return {
        id: t.id,
        label: t.label,
        gainRatio,
        note:
          need > 0
            ? `距门槛 ${input.speedFloor} 还差 ${need.toFixed(1)} 速`
            : `已达速度门槛 ${input.speedFloor}`,
      }
    }
    const next = calculateDamage({
      critMode,
      attacker: t.attacker,
      defender: input.defender,
      buffs: input.buffs,
    }).finalDamage
    return {
      id: t.id,
      label: t.label,
      gainRatio: baseline > 0 ? next / baseline - 1 : 0,
      note: t.note,
    }
  })

  ranked.sort((a, b) => b.gainRatio - a.gainRatio)

  if (input.currentSpeed + 1e-6 < input.speedFloor) {
    const spd = ranked.find((r) => r.id === 'speed')
    const rest = ranked.filter((r) => r.id !== 'speed')
    if (spd) return [spd, ...rest]
  }

  return ranked
}
