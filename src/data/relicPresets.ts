import type { BuffLayer } from '../engine/buffSources'

/**
 * Relic set combat buffs only (2pc / 4pc / planar).
 * No substat enumeration — pick sets to stack as `relic` layers.
 */

export type RelicSlot = 'cavern' | 'planar'

export interface RelicPreset {
  id: string
  name: string
  slot: RelicSlot
  /** 2 or 4 for cavern; 2 for planar. */
  pieces: 2 | 4
  note: string
  layer: Omit<BuffLayer, 'kind' | 'id' | 'name'>
}

export const RELIC_PRESETS: RelicPreset[] = [
  {
    id: 'none-cavern',
    name: '洞窟 · 无 / 已计入',
    slot: 'cavern',
    pieces: 4,
    note: '不叠加洞窟套；面板已含套装效果时选此项',
    layer: {},
  },
  {
    id: 'none-planar',
    name: '位面 · 无 / 已计入',
    slot: 'planar',
    pieces: 2,
    note: '不叠加位面饰品战斗效果',
    layer: {},
  },
  {
    id: 'quantum-4',
    name: '密林卧尸 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '量子增伤 + 无视防（简化）',
    layer: { damageBonus: 0.1, defIgnore: 0.1 },
  },
  {
    id: 'genius-4',
    name: '繁星璀璨的天才 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '量子增伤 + 对量子弱点无视防（简化为常驻无视）',
    layer: { damageBonus: 0.1, defIgnore: 0.2 },
  },
  {
    id: 'lightning-4',
    name: '雷电的乐队 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '雷增伤 + 战技增伤（简化）',
    layer: { damageBonus: 0.2 },
  },
  {
    id: 'fire-4',
    name: '熔岩锻铸的火匠 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '火增伤 + 战技增伤（简化）',
    layer: { damageBonus: 0.2 },
  },
  {
    id: 'ice-4',
    name: '密林卧雪的猎人 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '冰增伤 + 终结技暴伤（简化为暴伤）',
    layer: { damageBonus: 0.1, critDamage: 0.25 },
  },
  {
    id: 'wind-4',
    name: '晨昏交界的翔鹰 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '风增伤为主（简化）',
    layer: { damageBonus: 0.1 },
  },
  {
    id: 'physical-4',
    name: '野穗伴天倾 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '物理增伤 + 攻击%（简化）',
    layer: { damageBonus: 0.1, atkPercent: 0.1 },
  },
  {
    id: 'imaginary-4',
    name: '净庭教宗的圣骑士 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '虚数增伤 + 暴击（简化）',
    layer: { damageBonus: 0.1, critRate: 0.08 },
  },
  {
    id: 'scholar-4',
    name: '大伟学士的暇日 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '暴击 + 战技/终结技增伤（简化）',
    layer: { critRate: 0.08, damageBonus: 0.2 },
  },
  {
    id: 'poet-4',
    name: '静谧的诗歌 · 4件',
    slot: 'cavern',
    pieces: 4,
    note: '量子增伤 + 暴击（简化）',
    layer: { damageBonus: 0.1, critRate: 0.08 },
  },
  {
    id: 'salsotto',
    name: '停转的萨尔索图',
    slot: 'planar',
    pieces: 2,
    note: '暴击 + 终结技/追击增伤（简化）',
    layer: { critRate: 0.08, damageBonus: 0.15 },
  },
  {
    id: 'space',
    name: '太空封印站',
    slot: 'planar',
    pieces: 2,
    note: '攻击%（简化）',
    layer: { atkPercent: 0.24 },
  },
  {
    id: 'izumo',
    name: '出云显世与高天神国',
    slot: 'planar',
    pieces: 2,
    note: '攻击% + 同属性暴击（简化为暴击）',
    layer: { atkPercent: 0.12, critRate: 0.12 },
  },
  {
    id: 'sigonia',
    name: '苍穹前线格拉默',
    slot: 'planar',
    pieces: 2,
    note: '攻击% + 暴伤（简化）',
    layer: { atkPercent: 0.12, critDamage: 0.24 },
  },
  {
    id: 'duran',
    name: '盗贼公国塔利亚',
    slot: 'planar',
    pieces: 2,
    note: '追击增伤向（简化为增伤）',
    layer: { damageBonus: 0.2 },
  },
  {
    id: 'rutilant',
    name: '露莎卡的神觉',
    slot: 'planar',
    pieces: 2,
    note: '暴击 + 普攻/战技增伤（简化）',
    layer: { critRate: 0.08, damageBonus: 0.2 },
  },
]

export function getRelic(id: string): RelicPreset | undefined {
  return RELIC_PRESETS.find((r) => r.id === id)
}

export function relicToLayer(preset: RelicPreset): BuffLayer | null {
  if (preset.id.startsWith('none-')) return null
  const empty = Object.keys(preset.layer).length === 0
  if (empty) return null
  return {
    kind: 'relic',
    id: preset.id,
    name: preset.name,
    ...preset.layer,
  }
}

export function cavernRelics(): RelicPreset[] {
  return RELIC_PRESETS.filter((r) => r.slot === 'cavern')
}

export function planarRelics(): RelicPreset[] {
  return RELIC_PRESETS.filter((r) => r.slot === 'planar')
}
