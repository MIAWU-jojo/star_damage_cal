/**
 * Fribbels / scanner-style JSON import (best-effort subset).
 * Does not run relic GPU optimization — panel numbers only.
 */

import type { AttackerInput } from './types'

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return fallback
}

function rateFromMaybePercent(v: unknown): number {
  const n = num(v, 0)
  // Fribbels often stores 70.5 for 70.5% or 0.705 — heuristic
  if (n > 1.5) return n / 100
  return n
}

export interface FribbelsImportResult {
  attacker: AttackerInput
  speed: number
  label: string
  warnings: string[]
}

/**
 * Accepts common shapes:
 * - Fribbels character export: { form: { atk, crit_rate, ... }, name }
 * - Flat scanner: { atk, critRate, critDamage, speed, level, dmgBoost }
 * - Nested combat: { combat: { ATK, 'CRIT Rate', ... } }
 */
export function parseFribbelsCharacter(raw: unknown): FribbelsImportResult | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const warnings: string[] = []

  const form =
    (root.form as Record<string, unknown> | undefined) ??
    (root.stats as Record<string, unknown> | undefined) ??
    (root.combat as Record<string, unknown> | undefined) ??
    root

  const name =
    String(root.name ?? root.displayName ?? form.name ?? 'Imported') || 'Imported'

  const atk = num(
    form.atk ?? form.ATK ?? form.attack ?? form.Attack,
    NaN,
  )
  if (!Number.isFinite(atk) || atk <= 0) {
    warnings.push('未找到有效攻击力字段')
    return null
  }

  const critRate = rateFromMaybePercent(
    form.crit_rate ?? form.critRate ?? form['CRIT Rate'] ?? form.cr,
  )
  const critDamage = rateFromMaybePercent(
    form.crit_dmg ??
      form.critDamage ??
      form.crit_damage ??
      form['CRIT DMG'] ??
      form.cd,
  )
  let damageBonus = rateFromMaybePercent(
    form.dmgBoost ??
      form.damageBonus ??
      form.ELEMENTAL_DMG ??
      form['DMG%'] ??
      form.dmg_boost,
  )
  const level = Math.min(80, Math.max(1, Math.round(num(form.level ?? root.level, 80))))
  const speed = num(form.spd ?? form.speed ?? form.SPD ?? form.Speed, 0)
  const defIgnore = rateFromMaybePercent(form.defIgnore ?? form.def_ignore ?? 0)
  const resPen = rateFromMaybePercent(form.resPen ?? form.res_pen ?? 0)

  if (critRate <= 0) warnings.push('暴击率缺失，按 0 处理')
  if (critDamage <= 0) warnings.push('暴伤缺失，按 0 处理（游戏基础 50% 请手补）')
  if (damageBonus <= 0) {
    damageBonus = 0
    warnings.push('增伤缺失，按 0；请手补球/套装增伤')
  }

  const attacker: AttackerInput = {
    level,
    attributeValue: atk,
    baseMultiplier: 2,
    multiplierBonus: 0,
    critRate,
    critDamage: critDamage > 0 ? critDamage : 0.5,
    damageBonus,
    resPen,
    defIgnore,
  }

  return {
    attacker,
    speed,
    label: name,
    warnings,
  }
}

/**
 * Minimal relic-scan aggregate: sum ATK% / CR / CD from a list of pieces.
 * Input: { pieces: [{ mainStat, substats: [{ key, value }] }] } or flat bonuses.
 */
export function parseRelicScanBonuses(raw: unknown): {
  atkPercent: number
  critRate: number
  critDamage: number
  damageBonus: number
  speed: number
  warnings: string[]
} | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const warnings: string[] = []

  if (root.atkPercent != null || root.critRate != null) {
    return {
      atkPercent: rateFromMaybePercent(root.atkPercent),
      critRate: rateFromMaybePercent(root.critRate),
      critDamage: rateFromMaybePercent(root.critDamage),
      damageBonus: rateFromMaybePercent(root.damageBonus),
      speed: num(root.speed),
      warnings,
    }
  }

  const pieces = root.pieces ?? root.relics
  if (!Array.isArray(pieces)) {
    warnings.push('需要 pieces[] 或扁平 atkPercent/critRate 字段')
    return null
  }

  let atkPercent = 0
  let critRate = 0
  let critDamage = 0
  let damageBonus = 0
  let speed = 0

  const absorb = (key: string, value: unknown) => {
    const k = key.toLowerCase()
    const v = rateFromMaybePercent(value)
    if (k.includes('atk') && (k.includes('%') || k.includes('percent'))) atkPercent += v
    else if (k.includes('crit rate') || k === 'cr' || k.includes('critrate')) critRate += v
    else if (k.includes('crit dmg') || k.includes('crit damage') || k === 'cd')
      critDamage += v
    else if (k.includes('dmg') && k.includes('%')) damageBonus += v
    else if (k === 'spd' || k === 'speed') speed += num(value)
  }

  for (const piece of pieces) {
    if (!piece || typeof piece !== 'object') continue
    const p = piece as Record<string, unknown>
    if (p.mainStat && typeof p.mainStat === 'object') {
      const ms = p.mainStat as Record<string, unknown>
      absorb(String(ms.key ?? ms.name ?? ms.stat ?? ''), ms.value ?? ms.val)
    }
    const subs = p.substats ?? p.subs
    if (Array.isArray(subs)) {
      for (const s of subs) {
        if (!s || typeof s !== 'object') continue
        const sub = s as Record<string, unknown>
        absorb(String(sub.key ?? sub.name ?? sub.stat ?? ''), sub.value ?? sub.val)
      }
    }
  }

  return { atkPercent, critRate, critDamage, damageBonus, speed, warnings }
}
