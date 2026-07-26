/** Damage calculation types for Honkai: Star Rail (P0 direct damage). */

export type CritMode = 'expected' | 'crit' | 'noncrit'

export interface AttackerInput {
  level: number
  /** Final combat attribute used by the skill (ATK / HP / DEF already resolved). */
  attributeValue: number
  /** Skill base multiplier, e.g. 2.0 for 200%. */
  baseMultiplier: number
  /** Extra multiplier modifiers (additive with base), e.g. 0.2 for +20%. */
  multiplierBonus: number
  critRate: number
  critDamage: number
  /** Additive DMG boosts: elemental, "deals more DMG", etc. */
  damageBonus: number
  /** RES PEN from attacker side. */
  resPen: number
  /** DEF ignore (additive with DEF reduction in the DEF zone). */
  defIgnore: number
}

export interface DefenderInput {
  level: number
  /** Absolute DEF. If omitted, derived as level*10+200 (same-level baseline). */
  defense?: number
  /** Elemental RES before shred/pen, e.g. 0.2 for non-weak, 0 for weak. */
  resistance: number
  /** True while toughness bar still exists (10% toughness DR → 0.9). */
  hasToughness: boolean
}

export interface BuffInput {
  /** Additive vulnerability on the target ("takes more DMG"). */
  vulnerability: number
  /** Additive DEF reduction on the target. */
  defReduction: number
  /** Additive RES reduction on the target. */
  resReduction: number
  /**
   * Independent multiplicative damage taken reductions / weaken effects.
   * Each entry is a fraction, e.g. 0.1 for 10% DR → contributes (1-0.1).
   */
  damageTakenReductions: number[]
}

export interface DamageInput {
  attacker: AttackerInput
  defender: DefenderInput
  buffs: BuffInput
  critMode: CritMode
}

export interface ZoneBreakdown {
  id: string
  label: string
  value: number
  /** Relative share of log-contribution for visualization. */
  share: number
}

export interface MarginalGain {
  id: string
  label: string
  /** Relative damage increase if this zone gets +10% absolute additive (or equivalent). */
  gainRatio: number
}

export interface DamageResult {
  baseDamage: number
  critMultiplier: number
  damageBonusZone: number
  defenseZone: number
  resistanceZone: number
  vulnerabilityZone: number
  reductionZone: number
  finalDamage: number
  zones: ZoneBreakdown[]
  marginals: MarginalGain[]
}
