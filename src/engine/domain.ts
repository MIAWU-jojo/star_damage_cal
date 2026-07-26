/**
 * Engine-facing domain protocols.
 * Data presets implement these; engine must not import UI/data modules.
 */

export interface SupportBuffs {
  damageBonus: number
  vulnerability: number
  defReduction: number
  resReduction: number
  atkPercent: number
  critRate: number
  critDamage: number
}

export type SupportZoneId = 'bonus' | 'vuln' | 'def' | 'res' | 'crit' | 'atk'

/** Minimal support effect used by team aggregation / search. */
export interface SupportEffect {
  id: string
  name: string
  isSurvival: boolean
  buffs: SupportBuffs
  zones: SupportZoneId[]
  element?: string
  implantsWeakness?: boolean
}

/** Shared encounter selector used across calculator / team / timeline. */
export interface EncounterConfig {
  id: string
  name: string
  level: number
  defense?: number
  resistance: number
  hasToughness: boolean
  maxToughness?: number
}
