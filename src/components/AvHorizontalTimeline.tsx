import { useMemo, useState, type CSSProperties } from 'react'
import type { AvActor } from '../engine/actionValue'
import type { CombatEvent, CombatTimelineResult } from '../engine/avEvents'
import type { AvEventKind } from '../engine/avEvents'

function formatAv(n: number): string {
  return n.toFixed(1)
}

function eventKindShort(kind: AvEventKind): string {
  switch (kind) {
    case 'buffStart':
      return 'Buff+'
    case 'buffExpire':
      return 'Buff−'
    case 'ult':
      return '大'
    case 'action':
      return '动'
    case 'speedChange':
      return '速'
    case 'advance':
      return '拉'
    case 'delay':
      return '推'
    case 'break':
      return '破'
    default:
      return kind
  }
}

interface BuffSpan {
  buffId: string
  name: string
  start: number
  end: number
}

function buildBuffSpans(events: CombatEvent[], endTime: number): BuffSpan[] {
  const open = new Map<string, { name: string; start: number }>()
  const spans: BuffSpan[] = []
  for (const e of events) {
    if (e.kind === 'buffStart' && e.buffId) {
      open.set(e.buffId, { name: e.label.replace(/ 开始.*/, ''), start: e.time })
    }
    if (e.kind === 'buffExpire' && e.buffId) {
      const prev = open.get(e.buffId)
      if (prev) {
        spans.push({
          buffId: e.buffId,
          name: prev.name,
          start: prev.start,
          end: e.time,
        })
        open.delete(e.buffId)
      }
    }
  }
  for (const [buffId, prev] of open) {
    spans.push({
      buffId,
      name: prev.name,
      start: prev.start,
      end: endTime,
    })
  }
  return spans
}

export interface AvHorizontalTimelineProps {
  combat: CombatTimelineResult
  actors: AvActor[]
  cycles: number
}

export function AvHorizontalTimeline({
  combat,
  actors,
  cycles,
}: AvHorizontalTimelineProps) {
  const endTime = Math.max(combat.base.endTime, 1)
  const [selected, setSelected] = useState<number | null>(null)

  const laneActors = useMemo(() => {
    return actors.filter((a) => a.name.trim() && a.speed > 0)
  }, [actors])

  const buffSpans = useMemo(
    () => buildBuffSpans(combat.events, endTime),
    [combat.events, endTime],
  )

  const actionEvents = useMemo(
    () =>
      combat.events
        .map((e, index) => ({ e, index }))
        .filter(
          ({ e }) =>
            e.kind === 'action' ||
            e.kind === 'ult' ||
            e.kind === 'buffStart' ||
            e.kind === 'buffExpire',
        ),
    [combat.events],
  )

  const firstSelectable = actionEvents[0]?.index ?? null
  const activeSelected = selected ?? firstSelectable

  const pxPerAv = endTime <= 200 ? 4.2 : endTime <= 350 ? 3.2 : 2.6
  const trackWidth = Math.max(720, Math.ceil(endTime * pxPerAv) + 48)

  const xOf = (time: number) =>
    Math.min(trackWidth - 24, Math.max(8, (time / endTime) * (trackWidth - 32) + 8))

  const selectedEvent =
    activeSelected != null ? combat.events[activeSelected] : undefined

  return (
    <div className="nb-hrail">
      <p className="nb-hrail__hint">
        横向从左到右推进 AV · 每行一个角色 · 薄荷条为 Buff 窗口 · 点节点看详情
      </p>

      <div className="nb-hrail__scroll" tabIndex={0} aria-label="横向行动条时间线">
        <div
          className="nb-hrail__canvas"
          style={{ width: trackWidth, ['--cycles' as string]: cycles } as CSSProperties}
        >
          <div className="nb-hrail__ruler" aria-hidden>
            {Array.from({ length: Math.floor(endTime / 50) + 1 }, (_, i) => {
              const t = i * 50
              if (t > endTime + 1e-6) return null
              return (
                <span
                  key={t}
                  className="nb-hrail__tick"
                  style={{ left: xOf(t) }}
                >
                  {t}
                </span>
              )
            })}
            {combat.base.cycleEnds.map((t, i) => (
              <span
                key={`c-${i}`}
                className="nb-hrail__cycle"
                style={{ left: xOf(t) }}
                title={`第 ${i + 1} 轮结束 AV ${formatAv(t)}`}
              >
                <em>{i === 0 ? '0T|' : `${i}T|`}</em>
              </span>
            ))}
          </div>

          {buffSpans.length > 0 && (
            <div className="nb-hrail__lane is-buff">
              <div className="nb-hrail__lane-label">Buff</div>
              <div className="nb-hrail__lane-body">
                <div className="nb-hrail__axis" />
                {buffSpans.map((b, i) => {
                  const left = xOf(b.start)
                  const right = xOf(b.end)
                  return (
                    <div
                      key={`${b.buffId}-${i}`}
                      className="nb-hrail__buff"
                      style={{ left, width: Math.max(10, right - left) }}
                      title={`${b.name} · AV ${formatAv(b.start)}–${formatAv(b.end)}`}
                    >
                      <span>{b.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {laneActors.map((actor) => {
            const nodes = actionEvents.filter(
              ({ e }) =>
                e.actorId === actor.id &&
                (e.kind === 'action' || e.kind === 'ult'),
            )
            return (
              <div
                key={actor.id}
                className={`nb-hrail__lane is-${actor.role ?? 'other'}`}
              >
                <div className="nb-hrail__lane-label">
                  <strong>{actor.name}</strong>
                  <span>{actor.speed.toFixed(0)}</span>
                </div>
                <div className="nb-hrail__lane-body">
                  <div className="nb-hrail__axis" />
                  {combat.base.cycleEnds.map((t, i) => (
                    <span
                      key={i}
                      className="nb-hrail__vline"
                      style={{ left: xOf(t) }}
                    />
                  ))}
                  {nodes.map(({ e, index }) => {
                    const isSel = activeSelected === index
                    return (
                      <button
                        key={`${actor.id}-${index}`}
                        type="button"
                        className={`nb-hrail__node is-${e.kind}${
                          e.covered === true
                            ? ' is-cover'
                            : e.covered === false
                              ? ' is-miss'
                              : ''
                        }${isSel ? ' is-selected' : ''}`}
                        style={{ left: xOf(e.time) }}
                        title={`AV ${formatAv(e.time)} · ${e.label}`}
                        aria-pressed={isSel}
                        onClick={() => setSelected(index)}
                      >
                        <span className="nb-hrail__node-av">
                          {formatAv(e.time)}
                        </span>
                        <span className="nb-hrail__node-mark">
                          {eventKindShort(e.kind)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Buff start/expire markers on buff lane already; also show as small ticks on all */}
          <div className="nb-hrail__lane is-meta">
            <div className="nb-hrail__lane-label">事件</div>
            <div className="nb-hrail__lane-body">
              <div className="nb-hrail__axis" />
              {actionEvents
                .filter(
                  ({ e }) =>
                    e.kind === 'buffStart' || e.kind === 'buffExpire',
                )
                .map(({ e, index }) => (
                  <button
                    key={`meta-${index}`}
                    type="button"
                    className={`nb-hrail__pin is-${e.kind}${
                      activeSelected === index ? ' is-selected' : ''
                    }`}
                    style={{ left: xOf(e.time) }}
                    title={e.label}
                    aria-pressed={activeSelected === index}
                    onClick={() => setSelected(index)}
                  >
                    {e.kind === 'buffStart' ? '+' : '−'}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="nb-hrail__detail" aria-live="polite">
        {selectedEvent ? (
          <>
            <span className="nb-av-events__t">
              AV {formatAv(selectedEvent.time)}
            </span>
            <span className={`nb-av-events__kind is-${selectedEvent.kind}`}>
              {eventKindShort(selectedEvent.kind)}
            </span>
            <strong>{selectedEvent.label}</strong>
            {selectedEvent.covered === true && (
              <em className="nb-av-tag is-cover">覆盖</em>
            )}
            {selectedEvent.covered === false && (
              <em className="nb-av-tag is-miss">漏覆盖</em>
            )}
            {selectedEvent.activeBuffIds.length > 0 && (
              <span className="nb-hrail__detail-buffs">
                生效：{selectedEvent.activeBuffIds.join(', ')}
              </span>
            )}
          </>
        ) : (
          <span className="nb-template-note">点选时间轴上的节点查看详情</span>
        )}
      </div>
    </div>
  )
}
