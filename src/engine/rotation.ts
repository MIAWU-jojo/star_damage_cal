/**
 * Skill rotation simulator: sequence of actions → total damage,
 * with toughness break mid-rotation.
 */

import { calculateDamage } from './damage'
import {
  calculateAdditionalDamage,
  calculateBreakDamage,
  calculateDotDamage,
  calculateSuperBreakDamage,
} from './tracks'
import type { AttackerInput, BuffInput, CritMode, DefenderInput } from './types'

export type RotationActionKind =
  | 'basic'
  | 'skill'
  | 'ult'
  | 'followup'
  | 'dot'
  | 'break'
  | 'superbreak'
  | 'additional'

export interface RotationAction {
  id: string
  kind: RotationActionKind
  label: string
  /** Direct / follow-up / basic multiplier (single hit). */
  multiplier?: number
  hits?: number
  /** Toughness damage in game units (usually 10/20/30…). */
  toughnessDamage?: number
  /** DOT tick multiplier × stacks. */
  dotMultiplier?: number
  dotStacks?: number
  /** Break Effect rate for break / superbreak actions. */
  breakEffect?: number
  elementalBreakMult?: number
  superBreakMultiplier?: number
  additionalMultiplier?: number
  additionalCanCrit?: boolean
}

export interface RotationStepResult {
  actionId: string
  label: string
  kind: RotationActionKind
  damage: number
  brokeToughness: boolean
  toughnessBefore: number
  toughnessAfter: number
}

export interface RotationResult {
  steps: RotationStepResult[]
  totalDamage: number
  /** Direct + additional + follow-up. */
  directLikeTotal: number
  dotTotal: number
  breakTotal: number
  endedBroken: boolean
}

export interface RotationSimInput {
  attacker: AttackerInput
  buffs: BuffInput
  /** Starting defender; hasToughness + optional maxToughness. */
  defender: DefenderInput & { maxToughness?: number }
  actions: RotationAction[]
  critMode?: CritMode
  /**
   * When true, after toughness hits 0, subsequent steps use broken mitigation
   * until end (no re-toughen in P2 model).
   */
  trackToughness?: boolean
}

function directHitDamage(
  attacker: AttackerInput,
  defender: DefenderInput,
  buffs: BuffInput,
  multiplier: number,
  critMode: CritMode,
): number {
  return calculateDamage({
    critMode,
    attacker: {
      ...attacker,
      baseMultiplier: multiplier,
      multiplierBonus: 0,
    },
    defender,
    buffs,
  }).finalDamage
}

/**
 * Simulate a rotation. Toughness starts at maxToughness (default 100).
 * Each action with toughnessDamage reduces the bar; at ≤0, defender breaks.
 */
export function simulateRotation(input: RotationSimInput): RotationResult {
  const critMode = input.critMode ?? 'expected'
  const track = input.trackToughness !== false
  let maxTough = Math.max(1, input.defender.maxToughness ?? 100)
  let toughness = input.defender.hasToughness ? maxTough : 0
  let broken = !input.defender.hasToughness || toughness <= 0

  const steps: RotationStepResult[] = []
  let directLikeTotal = 0
  let dotTotal = 0
  let breakTotal = 0

  for (const action of input.actions) {
    const toughnessBefore = toughness
    let brokeToughness = false
    const hits = Math.max(1, action.hits ?? 1)
    let stepDamage = 0

    const applyToughness = (raw: number) => {
      if (!track || broken) return
      toughness = Math.max(0, toughness - Math.max(0, raw))
      if (toughness <= 0) {
        broken = true
        brokeToughness = true
      }
    }

    const defenderNow: DefenderInput = {
      level: input.defender.level,
      defense: input.defender.defense,
      resistance: input.defender.resistance,
      hasToughness: track ? !broken : input.defender.hasToughness,
    }

    switch (action.kind) {
      case 'basic':
      case 'skill':
      case 'ult':
      case 'followup': {
        const mult = action.multiplier ?? 1
        for (let i = 0; i < hits; i++) {
          // Mid-action break: first hits may still see toughness
          const d: DefenderInput = {
            ...defenderNow,
            hasToughness: track ? !broken : defenderNow.hasToughness,
          }
          stepDamage += directHitDamage(
            input.attacker,
            d,
            input.buffs,
            mult,
            critMode,
          )
        }
        applyToughness(action.toughnessDamage ?? 0)
        directLikeTotal += stepDamage
        break
      }
      case 'additional': {
        const mult = action.additionalMultiplier ?? action.multiplier ?? 0.5
        for (let i = 0; i < hits; i++) {
          const d: DefenderInput = {
            ...defenderNow,
            hasToughness: track ? !broken : defenderNow.hasToughness,
          }
          stepDamage += calculateAdditionalDamage({
            attacker: input.attacker,
            defender: d,
            buffs: input.buffs,
            additionalMultiplier: mult,
            canCrit: action.additionalCanCrit !== false,
            critMode,
          }).finalDamage
        }
        applyToughness(action.toughnessDamage ?? 0)
        directLikeTotal += stepDamage
        break
      }
      case 'dot': {
        const d: DefenderInput = {
          ...defenderNow,
          hasToughness: track ? !broken : defenderNow.hasToughness,
        }
        stepDamage = calculateDotDamage({
          attacker: input.attacker,
          defender: d,
          buffs: input.buffs,
          dotMultiplier: action.dotMultiplier ?? 0.5,
          stacks: action.dotStacks ?? 1,
        }).finalDamage
        dotTotal += stepDamage
        break
      }
      case 'break': {
        const units = (action.toughnessDamage ?? 20) / 10
        stepDamage = calculateBreakDamage({
          attackerLevel: input.attacker.level,
          breakEffect: action.breakEffect ?? 1,
          elementalMultiplier: action.elementalBreakMult ?? 1,
          toughnessDamageUnits: units,
          defender: defenderNow,
          buffs: input.buffs,
          defIgnore: input.attacker.defIgnore,
          resPen: input.attacker.resPen,
        }).finalDamage
        applyToughness(action.toughnessDamage ?? 20)
        breakTotal += stepDamage
        break
      }
      case 'superbreak': {
        // Only meaningful while broken; still compute for visibility
        const units = (action.toughnessDamage ?? 20) / 10
        const d: DefenderInput = {
          ...defenderNow,
          hasToughness: false,
        }
        stepDamage = calculateSuperBreakDamage({
          attackerLevel: input.attacker.level,
          breakEffect: action.breakEffect ?? 1,
          elementalMultiplier: action.elementalBreakMult ?? 1,
          toughnessDamageUnits: units,
          superBreakMultiplier: action.superBreakMultiplier ?? 1.2,
          defender: d,
          buffs: input.buffs,
          defIgnore: input.attacker.defIgnore,
          resPen: input.attacker.resPen,
        }).finalDamage
        applyToughness(action.toughnessDamage ?? 0)
        breakTotal += stepDamage
        break
      }
      default:
        break
    }

    steps.push({
      actionId: action.id,
      label: action.label,
      kind: action.kind,
      damage: stepDamage,
      brokeToughness,
      toughnessBefore,
      toughnessAfter: toughness,
    })
  }

  return {
    steps,
    totalDamage: directLikeTotal + dotTotal + breakTotal,
    directLikeTotal,
    dotTotal,
    breakTotal,
    endedBroken: broken,
  }
}

export const DEFAULT_ROTATION: RotationAction[] = [
  {
    id: 's1',
    kind: 'skill',
    label: '战技',
    multiplier: 2.0,
    hits: 1,
    toughnessDamage: 20,
  },
  {
    id: 'b1',
    kind: 'basic',
    label: '普攻',
    multiplier: 1.0,
    hits: 1,
    toughnessDamage: 10,
  },
  {
    id: 'u1',
    kind: 'ult',
    label: '终结技',
    multiplier: 2.8,
    hits: 1,
    toughnessDamage: 30,
  },
  {
    id: 'dot1',
    kind: 'dot',
    label: 'DOT 跳伤',
    dotMultiplier: 0.6,
    dotStacks: 2,
  },
]
