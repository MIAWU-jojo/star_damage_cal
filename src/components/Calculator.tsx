import { useId, useMemo, useState, type ChangeEvent } from 'react'
import { calculateDamage } from '../engine/damage'
import type { CritMode, DamageInput } from '../engine/types'
import { ENEMY_TEMPLATES } from '../data/enemyTemplates'

function pctToRate(pct: number): number {
  return pct / 100
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}

function formatZone(n: number): string {
  if (n >= 100) return formatInt(n)
  return `${(n * 100).toFixed(1)}%`
}

function formatGain(ratio: number): string {
  const pct = ratio * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

const DEFAULT_ATTACKER = {
  level: 80,
  attributeValue: 2800,
  baseMultiplierPct: 200,
  multiplierBonusPct: 0,
  critRatePct: 70,
  critDamagePct: 140,
  damageBonusPct: 48.8,
  resPenPct: 0,
  defIgnorePct: 0,
}

const DEFAULT_BUFFS = {
  vulnerabilityPct: 0,
  defReductionPct: 0,
  resReductionPct: 0,
  weakenPct: 0,
}

export function Calculator() {
  const formId = useId()
  const [critMode, setCritMode] = useState<CritMode>('expected')
  const [templateId, setTemplateId] = useState(ENEMY_TEMPLATES[0].id)
  const [attacker, setAttacker] = useState(DEFAULT_ATTACKER)
  const [enemyLevel, setEnemyLevel] = useState(80)
  const [enemyDef, setEnemyDef] = useState<number | ''>('')
  const [enemyResPct, setEnemyResPct] = useState(0)
  const [hasToughness, setHasToughness] = useState(true)
  const [buffs, setBuffs] = useState(DEFAULT_BUFFS)

  const template = ENEMY_TEMPLATES.find((t) => t.id === templateId) ?? ENEMY_TEMPLATES[0]

  const onTemplateChange = (id: string) => {
    setTemplateId(id)
    const next = ENEMY_TEMPLATES.find((t) => t.id === id)
    if (!next) return
    setEnemyLevel(next.level)
    setEnemyResPct(next.resistance * 100)
    setHasToughness(next.hasToughness)
    setEnemyDef(next.defense ?? '')
  }

  const input: DamageInput = useMemo(() => {
    const damageTakenReductions: number[] = []
    if (buffs.weakenPct > 0) damageTakenReductions.push(pctToRate(buffs.weakenPct))

    return {
      critMode,
      attacker: {
        level: attacker.level,
        attributeValue: attacker.attributeValue,
        baseMultiplier: pctToRate(attacker.baseMultiplierPct),
        multiplierBonus: pctToRate(attacker.multiplierBonusPct),
        critRate: pctToRate(attacker.critRatePct),
        critDamage: pctToRate(attacker.critDamagePct),
        damageBonus: pctToRate(attacker.damageBonusPct),
        resPen: pctToRate(attacker.resPenPct),
        defIgnore: pctToRate(attacker.defIgnorePct),
      },
      defender: {
        level: enemyLevel,
        defense: enemyDef === '' ? undefined : Number(enemyDef),
        resistance: pctToRate(enemyResPct),
        hasToughness,
      },
      buffs: {
        vulnerability: pctToRate(buffs.vulnerabilityPct),
        defReduction: pctToRate(buffs.defReductionPct),
        resReduction: pctToRate(buffs.resReductionPct),
        damageTakenReductions,
      },
    }
  }, [attacker, buffs, critMode, enemyDef, enemyLevel, enemyResPct, hasToughness])

  const result = useMemo(() => calculateDamage(input), [input])

  const setAttackerNum =
    (key: keyof typeof DEFAULT_ATTACKER) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setAttacker((prev) => ({ ...prev, [key]: Number(e.target.value) }))
    }

  const setBuffNum =
    (key: keyof typeof DEFAULT_BUFFS) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setBuffs((prev) => ({ ...prev, [key]: Number(e.target.value) }))
    }

  return (
    <div className="nb-layout">
      <section className="nb-panel" aria-labelledby={`${formId}-hunt`}>
        <h2 id={`${formId}-hunt`} className="nb-panel__title">
          输入面板
        </h2>
        <p className="nb-panel__hint">填面板与倍率。Buff 按乘区分块勾选。</p>

        <div className="nb-section">
          <div className="nb-section__label">暴击模式</div>
          <div className="nb-mode" role="group" aria-label="暴击模式">
            {(
              [
                ['expected', '期望'],
                ['crit', '暴击'],
                ['noncrit', '非暴击'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`nb-mode__btn${critMode === mode ? ' is-active' : ''}`}
                onClick={() => setCritMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">攻击方</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor={`${formId}-lv`}>等级</label>
              <input
                id={`${formId}-lv`}
                type="number"
                min={1}
                max={80}
                value={attacker.level}
                onChange={setAttackerNum('level')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-attr`}>属性值（攻/生/防）</label>
              <input
                id={`${formId}-attr`}
                type="number"
                min={0}
                value={attacker.attributeValue}
                onChange={setAttackerNum('attributeValue')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-mult`}>基础倍率 %</label>
              <input
                id={`${formId}-mult`}
                type="number"
                min={0}
                step={0.1}
                value={attacker.baseMultiplierPct}
                onChange={setAttackerNum('baseMultiplierPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-multb`}>倍率修正 %</label>
              <input
                id={`${formId}-multb`}
                type="number"
                step={0.1}
                value={attacker.multiplierBonusPct}
                onChange={setAttackerNum('multiplierBonusPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-cr`}>暴击率 %</label>
              <input
                id={`${formId}-cr`}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={attacker.critRatePct}
                onChange={setAttackerNum('critRatePct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-cd`}>暴击伤害 %</label>
              <input
                id={`${formId}-cd`}
                type="number"
                min={0}
                step={0.1}
                value={attacker.critDamagePct}
                onChange={setAttackerNum('critDamagePct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-db`}>伤害加成 %</label>
              <input
                id={`${formId}-db`}
                type="number"
                step={0.1}
                value={attacker.damageBonusPct}
                onChange={setAttackerNum('damageBonusPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-rp`}>抗性穿透 %</label>
              <input
                id={`${formId}-rp`}
                type="number"
                step={0.1}
                value={attacker.resPenPct}
                onChange={setAttackerNum('resPenPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-di`}>无视防御 %</label>
              <input
                id={`${formId}-di`}
                type="number"
                step={0.1}
                value={attacker.defIgnorePct}
                onChange={setAttackerNum('defIgnorePct')}
              />
            </div>
          </div>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">敌人</div>
          <div className="nb-field">
            <label htmlFor={`${formId}-tpl`}>敌人模板</label>
            <select
              id={`${formId}-tpl`}
              value={templateId}
              onChange={(e) => onTemplateChange(e.target.value)}
            >
              {ENEMY_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <p className="nb-template-note">{template.note}</p>
          <div className="nb-grid" style={{ marginTop: '0.75rem' }}>
            <div className="nb-field">
              <label htmlFor={`${formId}-elv`}>敌人等级</label>
              <input
                id={`${formId}-elv`}
                type="number"
                min={1}
                value={enemyLevel}
                onChange={(e) => setEnemyLevel(Number(e.target.value))}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-edef`}>防御（空=等级推算）</label>
              <input
                id={`${formId}-edef`}
                type="number"
                min={0}
                placeholder={`${enemyLevel * 10 + 200}`}
                value={enemyDef}
                onChange={(e) =>
                  setEnemyDef(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-eres`}>抗性 %</label>
              <input
                id={`${formId}-eres`}
                type="number"
                step={0.1}
                value={enemyResPct}
                onChange={(e) => setEnemyResPct(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="nb-check">
            <input
              type="checkbox"
              checked={hasToughness}
              onChange={(e) => setHasToughness(e.target.checked)}
            />
            目标仍有韧性（未破韧 → ×0.9）
          </label>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">乘区 Buff</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor={`${formId}-vuln`}>易伤 %</label>
              <input
                id={`${formId}-vuln`}
                type="number"
                step={0.1}
                value={buffs.vulnerabilityPct}
                onChange={setBuffNum('vulnerabilityPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-defsh`}>减防 %</label>
              <input
                id={`${formId}-defsh`}
                type="number"
                step={0.1}
                value={buffs.defReductionPct}
                onChange={setBuffNum('defReductionPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-ressh`}>降抗 %</label>
              <input
                id={`${formId}-ressh`}
                type="number"
                step={0.1}
                value={buffs.resReductionPct}
                onChange={setBuffNum('resReductionPct')}
              />
            </div>
            <div className="nb-field">
              <label htmlFor={`${formId}-weak`}>虚弱 / 额外减伤 %</label>
              <input
                id={`${formId}-weak`}
                type="number"
                min={0}
                max={99}
                step={0.1}
                value={buffs.weakenPct}
                onChange={setBuffNum('weakenPct')}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="nb-panel nb-result" aria-labelledby={`${formId}-prey`}>
        <h2 id={`${formId}-prey`} className="nb-panel__title">
          结果拆解
        </h2>
        <p className="nb-panel__hint">最终伤害 + 乘区对照，一眼看清短板。</p>

        <div className="nb-damage">
          <span className="nb-damage__label">最终伤害</span>
          <span key={result.finalDamage.toFixed(2)} className="nb-damage__value">
            {formatInt(result.finalDamage)}
          </span>
        </div>

        <div className="nb-substats">
          <div>
            <span>基础伤害</span>
            <strong>{formatInt(result.baseDamage)}</strong>
          </div>
          <div>
            <span>暴击乘区</span>
            <strong>×{result.critMultiplier.toFixed(3)}</strong>
          </div>
          <div>
            <span>防御乘区</span>
            <strong>×{result.defenseZone.toFixed(3)}</strong>
          </div>
          <div>
            <span>抗性乘区</span>
            <strong>×{result.resistanceZone.toFixed(3)}</strong>
          </div>
        </div>

        <div className="nb-section__label">乘区拆解</div>
        <div className="nb-zones">
          {result.zones.map((zone, index) => (
            <div
              key={zone.id}
              className="nb-zone"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <span className="nb-zone__name">{zone.label}</span>
              <div className="nb-zone__track" aria-hidden>
                <div
                  className="nb-zone__fill"
                  style={{ width: `${Math.max(8, zone.share * 100)}%` }}
                />
              </div>
              <span className="nb-zone__value">
                {zone.id === 'base' ? formatInt(zone.value) : formatZone(zone.value)}
              </span>
            </div>
          ))}
        </div>

        <div className="nb-section__label">边际收益（+10% 试算）</div>
        <ul className="nb-marginals">
          {result.marginals.map((m) => (
            <li key={m.id}>
              <span>{m.label}</span>
              <strong>{formatGain(m.gainRatio)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
