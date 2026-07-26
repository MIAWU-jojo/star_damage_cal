import { useMemo, useState } from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import { ENEMY_TEMPLATES } from '../data/enemyTemplates'
import {
  DEFAULT_ROTATION,
  simulateRotation,
  type RotationAction,
  type RotationActionKind,
} from '../engine/rotation'
import { useWorkspace } from '../state/WorkspaceContext'

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}

const KIND_OPTIONS: Array<{ id: RotationActionKind; label: string }> = [
  { id: 'basic', label: '普攻' },
  { id: 'skill', label: '战技' },
  { id: 'ult', label: '终结技' },
  { id: 'followup', label: '追击' },
  { id: 'additional', label: '附加伤害' },
  { id: 'dot', label: 'DOT' },
  { id: 'break', label: '击破' },
  { id: 'superbreak', label: '超击破' },
]

let actionSeq = 0

export function RotationPage() {
  const {
    carryPresetId: carryId,
    setCarryPresetId: setCarryId,
    enemyTemplateId: enemyId,
    setEnemyTemplateId: setEnemyId,
  } = useWorkspace()
  const [maxToughness, setMaxToughness] = useState(100)
  const [trackToughness, setTrackToughness] = useState(true)
  const [startBroken, setStartBroken] = useState(false)
  const [breakEffectPct, setBreakEffectPct] = useState(150)
  const [actions, setActions] = useState<RotationAction[]>(() =>
    DEFAULT_ROTATION.map((a) => ({ ...a })),
  )

  const carry = CHARACTER_PRESETS.find((c) => c.id === carryId) ?? CHARACTER_PRESETS[0]
  const enemy = ENEMY_TEMPLATES.find((e) => e.id === enemyId) ?? ENEMY_TEMPLATES[0]

  const result = useMemo(() => {
    const patched = actions.map((a) => {
      if (a.kind === 'break' || a.kind === 'superbreak') {
        return {
          ...a,
          breakEffect: breakEffectPct / 100,
          elementalBreakMult: a.elementalBreakMult ?? 1,
        }
      }
      return a
    })
    return simulateRotation({
      attacker: carry.attacker,
      buffs: {
        vulnerability: 0,
        defReduction: 0,
        resReduction: 0,
        damageTakenReductions: [],
      },
      defender: {
        level: enemy.level,
        defense: enemy.defense,
        resistance: enemy.resistance,
        hasToughness: !startBroken,
        maxToughness,
      },
      actions: patched,
      trackToughness,
    })
  }, [
    actions,
    breakEffectPct,
    carry,
    enemy,
    maxToughness,
    startBroken,
    trackToughness,
  ])

  const updateAction = (id: string, patch: Partial<RotationAction>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const removeAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id))
  }

  const addAction = (kind: RotationActionKind) => {
    actionSeq += 1
    const id = `a-${Date.now()}-${actionSeq}`
    const base: RotationAction = {
      id,
      kind,
      label: KIND_OPTIONS.find((k) => k.id === kind)?.label ?? kind,
      multiplier: kind === 'basic' ? 1 : kind === 'ult' ? 2.8 : 2,
      hits: 1,
      toughnessDamage: kind === 'ult' ? 30 : kind === 'basic' ? 10 : 20,
      dotMultiplier: 0.5,
      dotStacks: 1,
      breakEffect: breakEffectPct / 100,
      elementalBreakMult: 1,
      superBreakMultiplier: 1.2,
      additionalMultiplier: 0.6,
    }
    setActions((prev) => [...prev, base])
  }

  const move = (index: number, dir: -1 | 1) => {
    setActions((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  return (
    <div className="nb-layout">
      <section className="nb-panel">
        <h2 className="nb-panel__title">技能轮次</h2>
        <p className="nb-panel__hint">
          编排普攻 / 战技 / 终结技 / DOT / 击破序列，看一轮总伤与破韧时机。
        </p>

        <div className="nb-section">
          <div className="nb-section__label">主 C / 敌人</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="rot-carry">主 C 预设</label>
              <select
                id="rot-carry"
                value={carryId}
                onChange={(e) => setCarryId(e.target.value)}
              >
                {CHARACTER_PRESETS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="nb-field">
              <label htmlFor="rot-enemy">敌人</label>
              <select
                id="rot-enemy"
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
            <div className="nb-field">
              <label htmlFor="rot-tough">最大韧性</label>
              <input
                id="rot-tough"
                type="number"
                min={1}
                value={maxToughness}
                onChange={(e) => setMaxToughness(Number(e.target.value))}
              />
            </div>
            <div className="nb-field">
              <label htmlFor="rot-be">击破特攻 %</label>
              <input
                id="rot-be"
                type="number"
                min={0}
                value={breakEffectPct}
                onChange={(e) => setBreakEffectPct(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="nb-check">
            <input
              type="checkbox"
              checked={trackToughness}
              onChange={(e) => setTrackToughness(e.target.checked)}
            />
            追踪破韧（中途破韧后后续段按已破韧结算）
          </label>
          <label className="nb-check">
            <input
              type="checkbox"
              checked={startBroken}
              onChange={(e) => setStartBroken(e.target.checked)}
            />
            开场已破韧
          </label>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">序列</div>
          <div className="nb-rot-add">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.id}
                type="button"
                className="nb-btn"
                onClick={() => addAction(k.id)}
              >
                + {k.label}
              </button>
            ))}
          </div>
          <ul className="nb-rot-list">
            {actions.map((a, index) => (
              <li key={a.id} className="nb-rot-item">
                <div className="nb-rot-item__head">
                  <strong>
                    {index + 1}. {a.label}
                  </strong>
                  <span className="nb-rot-item__ops">
                    <button type="button" className="nb-btn" onClick={() => move(index, -1)}>
                      ↑
                    </button>
                    <button type="button" className="nb-btn" onClick={() => move(index, 1)}>
                      ↓
                    </button>
                    <button
                      type="button"
                      className="nb-btn"
                      onClick={() => removeAction(a.id)}
                    >
                      删
                    </button>
                  </span>
                </div>
                <div className="nb-grid">
                  {(a.kind === 'basic' ||
                    a.kind === 'skill' ||
                    a.kind === 'ult' ||
                    a.kind === 'followup') && (
                    <>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-mult`}>倍率</label>
                        <input
                          id={`${a.id}-mult`}
                          type="number"
                          step={0.1}
                          value={a.multiplier ?? 1}
                          onChange={(e) =>
                            updateAction(a.id, { multiplier: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-hits`}>段数</label>
                        <input
                          id={`${a.id}-hits`}
                          type="number"
                          min={1}
                          value={a.hits ?? 1}
                          onChange={(e) =>
                            updateAction(a.id, { hits: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-tough`}>削韧</label>
                        <input
                          id={`${a.id}-tough`}
                          type="number"
                          min={0}
                          value={a.toughnessDamage ?? 0}
                          onChange={(e) =>
                            updateAction(a.id, {
                              toughnessDamage: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                  {a.kind === 'dot' && (
                    <>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-dotm`}>DOT 倍率</label>
                        <input
                          id={`${a.id}-dotm`}
                          type="number"
                          step={0.05}
                          value={a.dotMultiplier ?? 0.5}
                          onChange={(e) =>
                            updateAction(a.id, {
                              dotMultiplier: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-stacks`}>层数</label>
                        <input
                          id={`${a.id}-stacks`}
                          type="number"
                          min={1}
                          value={a.dotStacks ?? 1}
                          onChange={(e) =>
                            updateAction(a.id, { dotStacks: Number(e.target.value) })
                          }
                        />
                      </div>
                    </>
                  )}
                  {(a.kind === 'break' || a.kind === 'superbreak') && (
                    <>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-tough`}>削韧</label>
                        <input
                          id={`${a.id}-tough`}
                          type="number"
                          min={0}
                          value={a.toughnessDamage ?? 20}
                          onChange={(e) =>
                            updateAction(a.id, {
                              toughnessDamage: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="nb-field">
                        <label htmlFor={`${a.id}-elem`}>属性击破倍率</label>
                        <input
                          id={`${a.id}-elem`}
                          type="number"
                          step={0.1}
                          value={a.elementalBreakMult ?? 1}
                          onChange={(e) =>
                            updateAction(a.id, {
                              elementalBreakMult: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      {a.kind === 'superbreak' && (
                        <div className="nb-field">
                        <label htmlFor={`${a.id}-sb`}>超击破倍率</label>
                        <input
                          id={`${a.id}-sb`}
                            type="number"
                            step={0.1}
                            value={a.superBreakMultiplier ?? 1.2}
                            onChange={(e) =>
                              updateAction(a.id, {
                                superBreakMultiplier: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      )}
                    </>
                  )}
                  {a.kind === 'additional' && (
                    <div className="nb-field">
                        <label htmlFor={`${a.id}-add`}>附加倍率</label>
                        <input
                          id={`${a.id}-add`}
                        type="number"
                        step={0.05}
                        value={a.additionalMultiplier ?? 0.6}
                        onChange={(e) =>
                          updateAction(a.id, {
                            additionalMultiplier: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="nb-panel nb-result">
        <h2 className="nb-panel__title">一轮结算</h2>
        <p className="nb-panel__hint">直伤轨 + DOT + 击破 / 超击破合计。</p>

        <div className="nb-damage nb-sticky-summary">
          <span className="nb-damage__label">一轮总伤</span>
          <span key={result.totalDamage.toFixed(2)} className="nb-damage__value">
            {formatInt(result.totalDamage)}
          </span>
        </div>

        <div className="nb-substats">
          <div>
            <span>直伤类</span>
            <strong>{formatInt(result.directLikeTotal)}</strong>
          </div>
          <div>
            <span>DOT</span>
            <strong>{formatInt(result.dotTotal)}</strong>
          </div>
          <div>
            <span>击破轨</span>
            <strong>{formatInt(result.breakTotal)}</strong>
          </div>
          <div>
            <span>结束状态</span>
            <strong>{result.endedBroken ? '已破韧' : '未破韧'}</strong>
          </div>
        </div>

        <div className="nb-section__label">分步</div>
        <ul className="nb-marginals">
          {result.steps.map((s) => (
            <li key={s.actionId}>
              <span>
                {s.label}
                {s.brokeToughness ? ' · 破韧!' : ''}
                <em className="nb-swap-zones">
                  {' '}
                  韧 {Math.round(s.toughnessBefore)}→{Math.round(s.toughnessAfter)}
                </em>
              </span>
              <strong>{formatInt(s.damage)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
