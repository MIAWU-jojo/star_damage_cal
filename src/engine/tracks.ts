/**
 * Alternate damage rails (P2): DOT / Break / Super Break / Additional.
 * Simplified Huiji-wiki-aligned models — not full kit parsers.
 */

import {
  defenseZone,
  reductionZone,
  resistanceZone,
  resolveDefense,
  critZone,
} from './damage'
import type { AttackerInput, BuffInput, CritMode, DefenderInput } from './types'

/** Shared DEF × RES × Vuln × Reduction after base (and optional crit / bonus). */
export function mitigationProduct(args: {
  attackerLevel: number
  defender: DefenderInput
  buffs: BuffInput
  defIgnore: number
  resPen: number
}): {
  defenseZone: number
  resistanceZone: number
  vulnerabilityZone: number
  reductionZone: number
  product: number
} {
  const def = defenseZone(
    args.attackerLevel,
    resolveDefense(args.defender),
    args.buffs.defReduction,
    args.defIgnore,
  )
  const res = resistanceZone(
    args.defender.resistance,
    args.buffs.resReduction,
    args.resPen,
  )
  const vuln = 1 + Math.max(0, args.buffs.vulnerability)
  const redu = reductionZone(
    args.defender.hasToughness,
    args.buffs.damageTakenReductions,
  )
  return {
    defenseZone: def,
    resistanceZone: res,
    vulnerabilityZone: vuln,
    reductionZone: redu,
    product: def * res * vuln * redu,
  }
}

export interface DotInput {
  attacker: Pick<AttackerInput, 'level' | 'attributeValue' | 'damageBonus' | 'defIgnore' | 'resPen'>
  defender: DefenderInput
  buffs: BuffInput
  /** DOT skill multiplier, e.g. 0.5 for 50% ATK per tick. */
  dotMultiplier: number
  /** Stack count (bleed etc.). */
  stacks?: number
}

export interface DotResult {
  baseDamage: number
  damageBonusZone: number
  finalDamage: number
  /** DOT has no crit zone. */
  hasCrit: false
}

/**
 * Classic DOT: Base × DMG Bonus × DEF × RES × Vuln × Reduction (no crit).
 */
export function calculateDotDamage(input: DotInput): DotResult {
  const stacks = Math.max(1, input.stacks ?? 1)
  const baseDamage =
    Math.max(0, input.attacker.attributeValue) *
    Math.max(0, input.dotMultiplier) *
    stacks
  const bonus = 1 + Math.max(0, input.attacker.damageBonus)
  const mit = mitigationProduct({
    attackerLevel: input.attacker.level,
    defender: input.defender,
    buffs: input.buffs,
    defIgnore: input.attacker.defIgnore,
    resPen: input.attacker.resPen,
  })
  return {
    baseDamage,
    damageBonusZone: bonus,
    finalDamage: baseDamage * bonus * mit.product,
    hasCrit: false,
  }
}

/** Approx. break base by character level (wiki table simplified). */
export function breakBaseByLevel(level: number): number {
  const lv = Math.min(80, Math.max(1, Math.floor(level)))
  // Piecewise linear toward commonly used Lv80 ≈ 3767.55
  if (lv >= 80) return 3767.5533
  if (lv >= 70) return 2000 + ((lv - 70) / 10) * (3767.5533 - 2000)
  if (lv >= 50) return 1000 + ((lv - 50) / 20) * 1000
  return 400 + (lv / 50) * 600
}

export interface BreakInput {
  attackerLevel: number
  /** Break Effect as rate, e.g. 1.5 for 150%. */
  breakEffect: number
  /** Elemental break multiplier (Fire 2.0, Physical 2.0, Ice 1.0, etc.). */
  elementalMultiplier: number
  /**
   * Toughness damage dealt by the break hit, in "10ths of a bar" units
   * (skill toughness / 10). Default 2 (= 20 toughness).
   */
  toughnessDamageUnits?: number
  defender: DefenderInput
  buffs: BuffInput
  defIgnore?: number
  resPen?: number
}

export interface BreakResult {
  breakBase: number
  breakEffectZone: number
  elementalZone: number
  toughnessZone: number
  finalDamage: number
}

/**
 * Break DMG ≈ BreakBase × (1+BE) × Element × (Toughness/10) × DEF × RES × Vuln × Redu
 */
export function calculateBreakDamage(input: BreakInput): BreakResult {
  const breakBase = breakBaseByLevel(input.attackerLevel)
  const be = 1 + Math.max(0, input.breakEffect)
  const elemental = Math.max(0, input.elementalMultiplier)
  const toughUnits = Math.max(0, input.toughnessDamageUnits ?? 2)
  const toughnessZone = toughUnits // already /10 units
  const mit = mitigationProduct({
    attackerLevel: input.attackerLevel,
    defender: input.defender,
    buffs: input.buffs,
    defIgnore: input.defIgnore ?? 0,
    resPen: input.resPen ?? 0,
  })
  const finalDamage =
    breakBase * be * elemental * toughnessZone * mit.product
  return {
    breakBase,
    breakEffectZone: be,
    elementalZone: elemental,
    toughnessZone,
    finalDamage,
  }
}

export interface SuperBreakInput extends BreakInput {
  /** Super Break skill multiplier (e.g. 1.0–2.5 depending on source). */
  superBreakMultiplier: number
}

/**
 * Super Break while enemy is broken: extra rail on toughness damage actions.
 * Uses broken-state reduction (hasToughness forced false for this hit).
 */
export function calculateSuperBreakDamage(input: SuperBreakInput): BreakResult {
  const brokenDefender: DefenderInput = { ...input.defender, hasToughness: false }
  const base = calculateBreakDamage({ ...input, defender: brokenDefender })
  const mult = Math.max(0, input.superBreakMultiplier)
  return {
    ...base,
    finalDamage: base.finalDamage * mult,
    elementalZone: base.elementalZone * mult,
  }
}

export interface AdditionalDamageInput {
  attacker: AttackerInput
  defender: DefenderInput
  buffs: BuffInput
  /** Additional hit multiplier. */
  additionalMultiplier: number
  /** Some additional hits can crit; default true. */
  canCrit?: boolean
  critMode?: CritMode
}

export interface AdditionalDamageResult {
  baseDamage: number
  critMultiplier: number
  damageBonusZone: number
  finalDamage: number
}

/**
 * Additional damage: similar to direct, optional crit.
 */
export function calculateAdditionalDamage(
  input: AdditionalDamageInput,
): AdditionalDamageResult {
  const canCrit = input.canCrit !== false
  const mode = input.critMode ?? 'expected'
  const baseDamage =
    Math.max(0, input.attacker.attributeValue) *
    Math.max(0, input.additionalMultiplier)
  const crit = canCrit
    ? critZone(mode, input.attacker.critRate, input.attacker.critDamage)
    : 1
  const bonus = 1 + Math.max(0, input.attacker.damageBonus)
  const mit = mitigationProduct({
    attackerLevel: input.attacker.level,
    defender: input.defender,
    buffs: input.buffs,
    defIgnore: input.attacker.defIgnore,
    resPen: input.attacker.resPen,
  })
  return {
    baseDamage,
    critMultiplier: crit,
    damageBonusZone: bonus,
    finalDamage: baseDamage * crit * bonus * mit.product,
  }
}
