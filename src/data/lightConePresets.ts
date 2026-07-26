import type { BuffLayer } from '../engine/buffSources'

/**
 * Simplified light-cone combat effects (S1-ish approximations).
 * Classified by damage zones — not full refinement / path parsers.
 */

export interface LightConePreset {
  id: string
  name: string
  path: string
  note: string
  /** Combat deltas applied as a `lightCone` buff layer. */
  layer: Omit<BuffLayer, 'kind' | 'id' | 'name'>
}

export const LIGHT_CONE_PRESETS: LightConePreset[] = [
  {
    id: 'none',
    name: '无 / 已计入面板',
    path: '—',
    note: '不叠加光锥层；若面板已含光锥效果请选此项',
    layer: {},
  },
  {
    id: 'cruising',
    name: '于夜色中',
    path: '巡猎',
    note: '暴击 + 对低血增伤（简化为固定增伤）',
    layer: { critRate: 0.18, damageBonus: 0.2 },
  },
  {
    id: 'sleep-like',
    name: '如泥酣眠',
    path: '巡猎',
    note: '暴伤向（简化）',
    layer: { critDamage: 0.36 },
  },
  {
    id: 'in-the-night',
    name: '黑夜如影的眼神',
    path: '巡猎',
    note: '暴击 + 速度向增伤（简化）',
    layer: { critRate: 0.18, damageBonus: 0.12 },
  },
  {
    id: 'something-irreplaceable',
    name: '无可取代的东西',
    path: '毁灭',
    note: '攻击% + 受击回能叙事忽略，仅攻%',
    layer: { atkPercent: 0.24 },
  },
  {
    id: 'on-the-fall',
    name: '到不了的彼岸',
    path: '毁灭',
    note: '暴击 + 增伤（简化）',
    layer: { critRate: 0.18, damageBonus: 0.24 },
  },
  {
    id: 'brighter-than-sun',
    name: '比阳光更明亮的',
    path: '存护/毁灭向通用',
    note: '暴击 + 增伤示例',
    layer: { critRate: 0.18, damageBonus: 0.2 },
  },
  {
    id: 'before-dawn',
    name: '拂晓之前',
    path: '智识',
    note: '暴伤 + 战技/终结技增伤（简化为增伤）',
    layer: { critDamage: 0.36, damageBonus: 0.18 },
  },
  {
    id: 'night-of-fright',
    name: '惊魂夜',
    path: '丰饶（展示用）',
    note: '非输出光锥；几乎无直伤乘区',
    layer: {},
  },
  {
    id: 'baptism',
    name: '炼金与蝶的洗礼',
    path: '虚无',
    note: '易伤向（简化，挂在光锥层）',
    layer: { vulnerability: 0.24 },
  },
  {
    id: 'i-shall-be-my-own',
    name: '我将是自己的明日',
    path: '巡猎',
    note: '暴伤（简化）',
    layer: { critDamage: 0.36 },
  },
  {
    id: 'worrisome',
    name: '烦恼着，幸福着',
    path: '巡猎',
    note: '暴击 + 追击增伤（简化为增伤）',
    layer: { critRate: 0.12, damageBonus: 0.2 },
  },
]

export function getLightCone(id: string): LightConePreset | undefined {
  return LIGHT_CONE_PRESETS.find((c) => c.id === id)
}

export function lightConeToLayer(preset: LightConePreset): BuffLayer | null {
  if (preset.id === 'none') return null
  return {
    kind: 'lightCone',
    id: preset.id,
    name: preset.name,
    ...preset.layer,
  }
}
