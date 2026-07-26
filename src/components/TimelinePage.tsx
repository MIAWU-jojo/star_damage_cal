import { useEffect, useMemo, useState } from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import {
  COMMON_BREAKPOINTS,
  checkFirstActionOrder,
  lapAv,
  simulateTimeline,
  type AvActor,
} from '../engine/actionValue'
import { useWorkspace } from '../state/WorkspaceContext'

function formatAv(n: number): string {
  return n.toFixed(2)
}

function formatSpd(n: number): string {
  return n.toFixed(2)
}

type Slot = {
  id: string
  name: string
  speed: number
  advancePct: number
  advanceAtStart: boolean
  role: AvActor['role']
}

const DEFAULT_SLOTS: Slot[] = [
  {
    id: 's1',
    name: '辅助 A',
    speed: 161,
    advancePct: 0,
    advanceAtStart: false,
    role: 'support',
  },
  {
    id: 's2',
    name: '辅助 B',
    speed: 145,
    advancePct: 0,
    advanceAtStart: false,
    role: 'support',
  },
  {
    id: 'c1',
    name: '主 C',
    speed: 134,
    advancePct: 0,
    advanceAtStart: false,
    role: 'carry',
  },
  {
    id: 'v1',
    name: '生存',
    speed: 148,
    advancePct: 0,
    advanceAtStart: false,
    role: 'survival',
  },
]

export function TimelinePage() {
  const { carryPresetId, carrySpeed, setCarrySpeed, enemyTemplateId } = useWorkspace()
  const carryPreset =
    CHARACTER_PRESETS.find((c) => c.id === carryPresetId) ?? CHARACTER_PRESETS[0]
  const [slots, setSlots] = useState<Slot[]>(() =>
    DEFAULT_SLOTS.map((s) =>
      s.role === 'carry'
        ? { ...s, name: carryPreset.name, speed: carrySpeed }
        : s,
    ),
  )
  const [enemyOn, setEnemyOn] = useState(false)
  const [enemySpeed, setEnemySpeed] = useState(144)
  const [cycles, setCycles] = useState(2)
  const [orderBefore, setOrderBefore] = useState('s1')
  const [orderAfter, setOrderAfter] = useState('c1')

  useEffect(() => {
    setSlots((prev) =>
      prev.map((s) =>
        s.role === 'carry'
          ? { ...s, name: carryPreset.name, speed: carrySpeed }
          : s,
      ),
    )
  }, [carryPreset.name, carrySpeed])

  // keep enemyTemplateId referenced for future P4.3 linkage
  void enemyTemplateId

  const actors: AvActor[] = useMemo(() => {
    const list: AvActor[] = slots
      .filter((s) => s.name.trim() && s.speed > 0)
      .map((s) => ({
        id: s.id,
        name: s.name.trim(),
        speed: s.speed,
        role: s.role,
        advanceOnReset: s.advancePct / 100,
        advanceAtStart: s.advanceAtStart,
      }))
    if (enemyOn && enemySpeed > 0) {
      list.push({
        id: 'enemy',
        name: '敌人',
        speed: enemySpeed,
        role: 'enemy',
      })
    }
    return list
  }, [enemyOn, enemySpeed, slots])

  const timeline = useMemo(
    () => simulateTimeline({ actors, cycles }),
    [actors, cycles],
  )

  const order = useMemo(
    () => checkFirstActionOrder(timeline, orderBefore, orderAfter),
    [orderAfter, orderBefore, timeline],
  )

  const updateSlot = (id: string, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  return (
    <div className="nb-layout">
      <section className="nb-panel">
        <h2 className="nb-panel__title">行动条工坊</h2>
        <p className="nb-panel__hint">
          跑道 10000 · 首轮 150 AV、之后每轮 100。看配速是否乱序、谁先手、每轮几动。
        </p>

        <div className="nb-section">
          <div className="nb-section__label">模拟范围</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="av-cycles">轮次数</label>
              <input
                id="av-cycles"
                type="number"
                min={1}
                max={5}
                value={cycles}
                onChange={(e) => setCycles(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="nb-field">
              <label htmlFor="av-enemy-spd">敌人速度</label>
              <input
                id="av-enemy-spd"
                type="number"
                min={1}
                step={0.1}
                value={enemySpeed}
                disabled={!enemyOn}
                onChange={(e) => setEnemySpeed(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="nb-check">
            <input
              type="checkbox"
              checked={enemyOn}
              onChange={(e) => setEnemyOn(e.target.checked)}
            />
            加入敌人行动（看怪穿插位置）
          </label>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">四人配速</div>
          {slots.map((s) => (
            <div key={s.id} className="nb-av-slot">
              <div className="nb-grid">
                <div className="nb-field">
                  <label htmlFor={`${s.id}-name`}>名称</label>
                  <input
                    id={`${s.id}-name`}
                    value={s.name}
                    onChange={(e) => updateSlot(s.id, { name: e.target.value })}
                  />
                </div>
                <div className="nb-field">
                  <label htmlFor={`${s.id}-spd`}>战斗速度</label>
                  <input
                    id={`${s.id}-spd`}
                    type="number"
                    min={1}
                    step={0.1}
                    value={s.speed}
                    onChange={(e) => {
                      const speed = Number(e.target.value)
                      updateSlot(s.id, { speed })
                      if (s.role === 'carry') setCarrySpeed(speed)
                    }}
                  />
                </div>
                <div className="nb-field">
                  <label htmlFor={`${s.id}-adv`}>回合后拉条 %</label>
                  <input
                    id={`${s.id}-adv`}
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    value={s.advancePct}
                    onChange={(e) =>
                      updateSlot(s.id, { advancePct: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="nb-field">
                  <label htmlFor={`${s.id}-role`}>定位</label>
                  <select
                    id={`${s.id}-role`}
                    value={s.role}
                    onChange={(e) =>
                      updateSlot(s.id, {
                        role: e.target.value as Slot['role'],
                      })
                    }
                  >
                    <option value="carry">主 C</option>
                    <option value="support">辅助</option>
                    <option value="survival">生存</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
              <p className="nb-template-note">
                满圈 AV ≈ {formatAv(lapAv(Math.max(s.speed, 1)))}
                {s.advancePct > 0
                  ? ` · 拉条后 ≈ ${formatAv(lapAv(Math.max(s.speed, 1)) * (1 - s.advancePct / 100))}`
                  : ''}
              </p>
              <label className="nb-check">
                <input
                  type="checkbox"
                  checked={s.advanceAtStart}
                  onChange={(e) =>
                    updateSlot(s.id, { advanceAtStart: e.target.checked })
                  }
                />
                开场也吃拉条（如进战立即推条）
              </label>
            </div>
          ))}
        </div>

        <div className="nb-section">
          <div className="nb-section__label">首动顺序检查</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="av-before">希望先手</label>
              <select
                id="av-before"
                value={orderBefore}
                onChange={(e) => setOrderBefore(e.target.value)}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="nb-field">
              <label htmlFor="av-after">希望后手</label>
              <select
                id="av-after"
                value={orderAfter}
                onChange={(e) => setOrderAfter(e.target.value)}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={`nb-order ${order.ok ? 'is-ok' : 'is-bad'}`}>
            {order.message}
          </p>
        </div>
      </section>

      <section className="nb-panel nb-result">
        <h2 className="nb-panel__title">时间线</h2>
        <p className="nb-panel__hint">
          结束于 AV {formatAv(timeline.endTime)}（前 {cycles} 轮）。
        </p>

        <div className="nb-damage nb-sticky-summary">
          <span className="nb-damage__label">事件数</span>
          <span className="nb-damage__value">{timeline.events.length}</span>
        </div>

        <div className="nb-section__label">每轮行动次数</div>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>角色</th>
                <th>速度</th>
                {Array.from({ length: cycles }, (_, i) => (
                  <th key={i}>第 {i + 1} 轮</th>
                ))}
                <th>合计</th>
              </tr>
            </thead>
            <tbody>
              {timeline.stats.map((s) => (
                <tr key={s.actorId}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{formatSpd(s.speed)}</td>
                  {s.actionsPerCycle.map((n, i) => (
                    <td key={i}>{n}</td>
                  ))}
                  <td>
                    <strong>{s.totalActions}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="nb-section__label">出手序列</div>
        <ol className="nb-av-events">
          {timeline.events.map((e, idx) => (
            <li key={`${e.time}-${e.actorId}-${idx}`}>
              <span className="nb-av-events__t">AV {formatAv(e.time)}</span>
              <span>
                {e.actorName}
                <em className="nb-swap-zones">
                  {' '}
                  · 第 {e.actionIndex} 动 · 轮 {e.cycle}
                </em>
              </span>
            </li>
          ))}
        </ol>

        <div className="nb-section__label">常用速度阈值</div>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>目标</th>
                <th>最低速度</th>
                <th>主 C 是否达标</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_BREAKPOINTS.map((b) => {
                const carry = slots.find((s) => s.role === 'carry') ?? slots[2]
                const ok = carry.speed + 1e-9 >= b.minSpeed
                return (
                  <tr key={b.id}>
                    <td>{b.label}</td>
                    <td>{formatSpd(b.minSpeed)}</td>
                    <td className={ok ? 'nb-ok' : 'nb-bad'}>
                      {ok ? '达标' : '未达标'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
