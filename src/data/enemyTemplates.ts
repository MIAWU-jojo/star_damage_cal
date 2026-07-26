export interface EnemyTemplate {
  id: string
  name: string
  level: number
  defense?: number
  /** Default RES when hitting a non-weakness element. */
  resistance: number
  hasToughness: boolean
  note: string
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id: 'equal-weak',
    name: '同级 · 弱点属性',
    level: 80,
    resistance: 0,
    hasToughness: true,
    note: '抗性 0%，未破韧（韧性减伤 10%）',
  },
  {
    id: 'equal-nonweak',
    name: '同级 · 非弱点',
    level: 80,
    resistance: 0.2,
    hasToughness: true,
    note: '抗性 20%，未破韧',
  },
  {
    id: 'equal-broken',
    name: '同级 · 已破韧',
    level: 80,
    resistance: 0,
    hasToughness: false,
    note: '弱点属性，破韧后无韧性减伤',
  },
  {
    id: 'boss-extra-res',
    name: '精英 · 额外抗性',
    level: 90,
    resistance: 0.4,
    hasToughness: true,
    note: '高等级 + 高抗，用来压测降抗收益',
  },
  {
    id: 'custom',
    name: '自定义敌人',
    level: 80,
    resistance: 0.2,
    hasToughness: true,
    note: '手动改等级 / 防御 / 抗性',
  },
]
