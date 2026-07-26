/**
 * Buff layering by source — keeps character / light cone / relic / manual
 * additive contributions visible so users can avoid double-counting.
 */

import type { AttackerInput, BuffInput } from './types'

export type BuffSourceKind = 'character' | 'lightCone' | 'relic' | 'manual'

export interface BuffLayer {
  kind: BuffSourceKind
  id: string
  name: string
  /** Additive DMG%. */
  damageBonus?: number
  /** Additive skill multiplier (e.g. 0.24 for +24%). */
  multiplierBonus?: number
  defIgnore?: number
  resPen?: number
  atkPercent?: number
  critRate?: number
  critDamage?: number
  vulnerability?: number
  defReduction?: number
  resReduction?: number
}

export interface SourceSummaryRow {
  kind: BuffSourceKind
  id: string
  name: string
  parts: string[]
}

export interface MergedCombatStats {
  attacker: AttackerInput
  buffs: BuffInput
  sources: SourceSummaryRow[]
}

const KIND_LABEL: Record<BuffSourceKind, string> = {
  character: '角色',
  lightCone: '光锥',
  relic: '遗器',
  manual: '手动',
}

function pushPart(parts: string[], label: string, value: number | undefined) {
  if (value == null || Math.abs(value) < 1e-9) return
  parts.push(`${label}${(value * 100).toFixed(0)}%`)
}

export function summarizeLayer(layer: BuffLayer): SourceSummaryRow {
  const parts: string[] = []
  pushPart(parts, '增伤+', layer.damageBonus)
  pushPart(parts, '倍率+', layer.multiplierBonus)
  pushPart(parts, '无视防+', layer.defIgnore)
  pushPart(parts, '抗穿+', layer.resPen)
  pushPart(parts, '攻%+', layer.atkPercent)
  pushPart(parts, '暴击+', layer.critRate)
  pushPart(parts, '暴伤+', layer.critDamage)
  pushPart(parts, '易伤+', layer.vulnerability)
  pushPart(parts, '减防+', layer.defReduction)
  pushPart(parts, '降抗+', layer.resReduction)
  return {
    kind: layer.kind,
    id: layer.id,
    name: `${KIND_LABEL[layer.kind]} · ${layer.name}`,
    parts,
  }
}

/**
 * Merge a naked character panel with optional gear / manual layers.
 * ATK% from gear multiplies attributeValue; other fields add.
 */
export function mergeCombatLayers(args: {
  baseAttacker: AttackerInput
  baseBuffs: BuffInput
  layers: BuffLayer[]
}): MergedCombatStats {
  let damageBonus = 0
  let multiplierBonus = 0
  let defIgnore = 0
  let resPen = 0
  let atkPercent = 0
  let critRate = 0
  let critDamage = 0
  let vulnerability = 0
  let defReduction = 0
  let resReduction = 0

  const sources: SourceSummaryRow[] = [
    {
      kind: 'character',
      id: 'panel',
      name: `${KIND_LABEL.character} · 面板`,
      parts: [
        `属性${Math.round(args.baseAttacker.attributeValue)}`,
        `增伤${(args.baseAttacker.damageBonus * 100).toFixed(0)}%`,
        `暴击${(args.baseAttacker.critRate * 100).toFixed(0)}%`,
        `暴伤${(args.baseAttacker.critDamage * 100).toFixed(0)}%`,
      ],
    },
  ]

  for (const layer of args.layers) {
    damageBonus += layer.damageBonus ?? 0
    multiplierBonus += layer.multiplierBonus ?? 0
    defIgnore += layer.defIgnore ?? 0
    resPen += layer.resPen ?? 0
    atkPercent += layer.atkPercent ?? 0
    critRate += layer.critRate ?? 0
    critDamage += layer.critDamage ?? 0
    vulnerability += layer.vulnerability ?? 0
    defReduction += layer.defReduction ?? 0
    resReduction += layer.resReduction ?? 0
    const row = summarizeLayer(layer)
    if (row.parts.length > 0) sources.push(row)
  }

  if (
    args.baseBuffs.vulnerability ||
    args.baseBuffs.defReduction ||
    args.baseBuffs.resReduction ||
    args.baseBuffs.damageTakenReductions.length > 0
  ) {
    const parts: string[] = []
    pushPart(parts, '易伤+', args.baseBuffs.vulnerability)
    pushPart(parts, '减防+', args.baseBuffs.defReduction)
    pushPart(parts, '降抗+', args.baseBuffs.resReduction)
    if (args.baseBuffs.damageTakenReductions.length > 0) {
      const w = args.baseBuffs.damageTakenReductions.reduce((a, b) => a + b, 0)
      pushPart(parts, '虚弱+', w)
    }
    sources.push({
      kind: 'manual',
      id: 'manual-buffs',
      name: `${KIND_LABEL.manual} · Buff`,
      parts,
    })
  }

  return {
    attacker: {
      ...args.baseAttacker,
      attributeValue: args.baseAttacker.attributeValue * (1 + Math.max(0, atkPercent)),
      damageBonus: args.baseAttacker.damageBonus + damageBonus,
      multiplierBonus: args.baseAttacker.multiplierBonus + multiplierBonus,
      defIgnore: args.baseAttacker.defIgnore + defIgnore,
      resPen: args.baseAttacker.resPen + resPen,
      critRate: Math.min(1, args.baseAttacker.critRate + critRate),
      critDamage: args.baseAttacker.critDamage + critDamage,
    },
    buffs: {
      vulnerability: args.baseBuffs.vulnerability + vulnerability,
      defReduction: Math.min(1, args.baseBuffs.defReduction + defReduction),
      resReduction: args.baseBuffs.resReduction + resReduction,
      damageTakenReductions: [...args.baseBuffs.damageTakenReductions],
    },
    sources,
  }
}

export { KIND_LABEL }
