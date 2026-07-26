import { useEffect, useMemo, useState } from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import { ENEMY_TEMPLATES } from '../data/enemyTemplates'
import { adviseSubstats } from '../engine/substats'
import { parseFribbelsCharacter, parseRelicScanBonuses } from '../engine/fribbels'
import type { AttackerInput } from '../engine/types'
import { useWorkspace } from '../state/WorkspaceContext'

function formatGain(ratio: number): string {
  const pct = ratio * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

function attackerToForm(a: AttackerInput) {
  return {
    level: a.level,
    attributeValue: a.attributeValue,
    baseMultiplierPct: a.baseMultiplier * 100,
    critRatePct: a.critRate * 100,
    critDamagePct: a.critDamage * 100,
    damageBonusPct: a.damageBonus * 100,
    defIgnorePct: a.defIgnore * 100,
    resPenPct: a.resPen * 100,
  }
}

export function BuildPage() {
  const {
    carryPresetId: carryId,
    setCarryPresetId,
    enemyTemplateId: enemyId,
    setEnemyTemplateId: setEnemyId,
    carrySpeed: speed,
    setCarrySpeed: setSpeed,
  } = useWorkspace()
  const preset = CHARACTER_PRESETS.find((c) => c.id === carryId) ?? CHARACTER_PRESETS[0]
  const [form, setForm] = useState(() => attackerToForm(preset.attacker))
  const [speedFloor, setSpeedFloor] = useState(134)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [relicText, setRelicText] = useState('')
  const [relicMsg, setRelicMsg] = useState('')

  useEffect(() => {
    setForm(attackerToForm(preset.attacker))
  }, [preset])

  const enemy = ENEMY_TEMPLATES.find((e) => e.id === enemyId) ?? ENEMY_TEMPLATES[0]

  const attacker: AttackerInput = useMemo(
    () => ({
      level: form.level,
      attributeValue: form.attributeValue,
      baseMultiplier: form.baseMultiplierPct / 100,
      multiplierBonus: 0,
      critRate: form.critRatePct / 100,
      critDamage: form.critDamagePct / 100,
      damageBonus: form.damageBonusPct / 100,
      defIgnore: form.defIgnorePct / 100,
      resPen: form.resPenPct / 100,
    }),
    [form],
  )

  const advice = useMemo(
    () =>
      adviseSubstats({
        attacker,
        defender: {
          level: enemy.level,
          defense: enemy.defense,
          resistance: enemy.resistance,
          hasToughness: enemy.hasToughness,
        },
        buffs: {
          vulnerability: 0,
          defReduction: 0,
          resReduction: 0,
          damageTakenReductions: [],
        },
        currentSpeed: speed,
        speedFloor,
        rolls: 1,
      }),
    [attacker, enemy, speed, speedFloor],
  )

  const loadPreset = (id: string) => {
    setCarryPresetId(id)
  }

  const applyFribbels = () => {
    try {
      const raw = JSON.parse(importText) as unknown
      const parsed = parseFribbelsCharacter(raw)
      if (!parsed) {
        setImportMsg('无法解析：需要 atk / critRate 等字段')
        return
      }
      setForm(attackerToForm(parsed.attacker))
      if (parsed.speed > 0) setSpeed(parsed.speed)
      setImportMsg(
        `已导入 ${parsed.label}` +
          (parsed.warnings.length ? `（${parsed.warnings.join('；')}）` : ''),
      )
    } catch {
      setImportMsg('JSON 无效')
    }
  }

  const applyRelicScan = () => {
    try {
      const raw = JSON.parse(relicText) as unknown
      const bonuses = parseRelicScanBonuses(raw)
      if (!bonuses) {
        setRelicMsg('无法解析遗器 JSON')
        return
      }
      setForm((prev) => ({
        ...prev,
        attributeValue: prev.attributeValue * (1 + bonuses.atkPercent),
        critRatePct: prev.critRatePct + bonuses.critRate * 100,
        critDamagePct: prev.critDamagePct + bonuses.critDamage * 100,
        damageBonusPct: prev.damageBonusPct + bonuses.damageBonus * 100,
      }))
      if (bonuses.speed) setSpeed(speed + bonuses.speed)
      setRelicMsg(
        `已叠加：攻%${(bonuses.atkPercent * 100).toFixed(1)} / 暴击${(bonuses.critRate * 100).toFixed(1)} / 暴伤${(bonuses.critDamage * 100).toFixed(1)}` +
          (bonuses.warnings.length ? `（${bonuses.warnings.join('；')}）` : ''),
      )
    } catch {
      setRelicMsg('JSON 无效')
    }
  }

  return (
    <div className="nb-layout">
      <section className="nb-panel">
        <h2 className="nb-panel__title">构筑建议</h2>
        <p className="nb-panel__hint">
          词条边际试算 + Fribbels / 遗器扫描 JSON 导入（不做 GPU 穷举）。
        </p>

        <div className="nb-section">
          <div className="nb-section__label">面板</div>
          <div className="nb-field">
            <label htmlFor="build-preset">从预设加载</label>
            <select
              id="build-preset"
              value={carryId}
              onChange={(e) => loadPreset(e.target.value)}
            >
              {CHARACTER_PRESETS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="nb-grid" style={{ marginTop: '0.75rem' }}>
            {(
              [
                ['attributeValue', '攻击'],
                ['critRatePct', '暴击率 %'],
                ['critDamagePct', '暴伤 %'],
                ['damageBonusPct', '增伤 %'],
                ['speed', '当前速度'],
                ['speedFloor', '速度门槛'],
              ] as const
            ).map(([key, label]) => (
              <div className="nb-field" key={key}>
                <label htmlFor={`build-${key}`}>{label}</label>
                <input
                  id={`build-${key}`}
                  type="number"
                  step={0.1}
                  value={
                    key === 'speed' ? speed : key === 'speedFloor' ? speedFloor : form[key]
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (key === 'speed') setSpeed(v)
                    else if (key === 'speedFloor') setSpeedFloor(v)
                    else setForm((prev) => ({ ...prev, [key]: v }))
                  }}
                />
              </div>
            ))}
          </div>
          <div className="nb-field" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="build-enemy">对照敌人</label>
            <select
              id="build-enemy"
              value={enemyId}
              onChange={(e) => setEnemyId(e.target.value)}
            >
              {ENEMY_TEMPLATES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">Fribbels / 面板 JSON</div>
          <textarea
            className="nb-textarea"
            rows={5}
            placeholder='{"name":"Seele","atk":3000,"critRate":80,"critDamage":160,"dmgBoost":72.8,"speed":134}'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="nb-share-row">
            <button type="button" className="nb-btn" onClick={applyFribbels}>
              导入面板
            </button>
            {importMsg && <span className="nb-share-msg">{importMsg}</span>}
          </div>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">遗器扫描导入（加算，非优化）</div>
          <textarea
            className="nb-textarea"
            rows={4}
            placeholder='{"atkPercent":20,"critRate":10,"critDamage":40,"speed":5}'
            value={relicText}
            onChange={(e) => setRelicText(e.target.value)}
          />
          <div className="nb-share-row">
            <button type="button" className="nb-btn" onClick={applyRelicScan}>
              叠加遗器加成
            </button>
            {relicMsg && <span className="nb-share-msg">{relicMsg}</span>}
          </div>
        </div>
      </section>

      <section className="nb-panel nb-result">
        <h2 className="nb-panel__title">词条倾向</h2>
        <p className="nb-panel__hint">
          模拟 +1 中档词条对期望直伤的相对提升；未达速度门槛时速度优先。
        </p>
        <ul className="nb-marginals">
          {advice.map((a) => (
            <li key={a.id}>
              <span>
                {a.label}
                <em className="nb-swap-zones"> · {a.note}</em>
              </span>
              <strong>{formatGain(a.gainRatio)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
