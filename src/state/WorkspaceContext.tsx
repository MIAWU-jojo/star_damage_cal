import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import { ENEMY_TEMPLATES } from '../data/enemyTemplates'
import type { BuffRule } from '../engine/avEvents'

const STORAGE_KEY = 'star-damage-cal:workspace-v2'
const LEGACY_STORAGE_KEY = 'star-damage-cal:workspace-v1'
const DEFAULT_TEAM = ['tingyun', 'pela', 'huohuo']

export interface WorkspaceSnapshot {
  id: string
  name: string
  savedAt: number
  state: WorkspaceState
}

export interface WorkspaceState {
  carryPresetId: string
  enemyTemplateId: string
  teamSlotIds: string[]
  carrySpeed: number
  /** Speeds for timeline slots s1/s2/v1 (and carry via carrySpeed). */
  supportSpeeds: { s1: number; s2: number; v1: number }
  /** Buff rules attached to timeline (sourceActorId = s1/s2/c1…). */
  buffRules: BuffRule[]
  snapshots: WorkspaceSnapshot[]
}

interface WorkspaceContextValue extends WorkspaceState {
  setCarryPresetId: (id: string) => void
  setEnemyTemplateId: (id: string) => void
  setTeamSlotIds: (ids: string[] | ((prev: string[]) => string[])) => void
  setCarrySpeed: (spd: number) => void
  setSupportSpeeds: (
    next: WorkspaceState['supportSpeeds'] | ((prev: WorkspaceState['supportSpeeds']) => WorkspaceState['supportSpeeds']),
  ) => void
  setBuffRules: (rules: BuffRule[] | ((prev: BuffRule[]) => BuffRule[])) => void
  saveSnapshot: (name: string) => void
  loadSnapshot: (id: string) => void
  deleteSnapshot: (id: string) => void
  encodeShare: () => string
  applyShare: (encoded: string) => boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function defaultState(): WorkspaceState {
  return {
    carryPresetId: CHARACTER_PRESETS[0].id,
    enemyTemplateId: ENEMY_TEMPLATES[0].id,
    teamSlotIds: DEFAULT_TEAM,
    carrySpeed: 134,
    supportSpeeds: { s1: 161, s2: 145, v1: 148 },
    buffRules: [],
    snapshots: [],
  }
}

function loadWorkspace(): WorkspaceState {
  try {
    const q = new URLSearchParams(window.location.search).get('w')
    if (q) {
      const parsed = JSON.parse(decodeURIComponent(atob(q))) as Partial<WorkspaceState>
      return { ...defaultState(), ...parsed, snapshots: parsed.snapshots ?? [] }
    }
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    return {
      ...defaultState(),
      ...parsed,
      supportSpeeds: parsed.supportSpeeds ?? defaultState().supportSpeeds,
      buffRules: parsed.buffRules ?? [],
      teamSlotIds:
        parsed.teamSlotIds && parsed.teamSlotIds.length === 3
          ? parsed.teamSlotIds
          : DEFAULT_TEAM,
      snapshots: parsed.snapshots ?? [],
    }
  } catch {
    return defaultState()
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() =>
    typeof window === 'undefined' ? defaultState() : loadWorkspace(),
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const setCarryPresetId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, carryPresetId: id }))
  }, [])

  const setEnemyTemplateId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, enemyTemplateId: id }))
  }, [])

  const setTeamSlotIds = useCallback(
    (ids: string[] | ((prev: string[]) => string[])) => {
      setState((prev) => ({
        ...prev,
        teamSlotIds: typeof ids === 'function' ? ids(prev.teamSlotIds) : ids,
      }))
    },
    [],
  )

  const setCarrySpeed = useCallback((spd: number) => {
    setState((prev) => ({ ...prev, carrySpeed: spd }))
  }, [])

  const setSupportSpeeds = useCallback(
    (
      next:
        | WorkspaceState['supportSpeeds']
        | ((prev: WorkspaceState['supportSpeeds']) => WorkspaceState['supportSpeeds']),
    ) => {
      setState((prev) => ({
        ...prev,
        supportSpeeds: typeof next === 'function' ? next(prev.supportSpeeds) : next,
      }))
    },
    [],
  )

  const setBuffRules = useCallback(
    (rules: BuffRule[] | ((prev: BuffRule[]) => BuffRule[])) => {
      setState((prev) => ({
        ...prev,
        buffRules: typeof rules === 'function' ? rules(prev.buffRules) : rules,
      }))
    },
    [],
  )

  const saveSnapshot = useCallback((name: string) => {
    setState((prev) => {
      const snap: WorkspaceSnapshot = {
        id: `snap-${Date.now()}`,
        name: name.trim() || `方案 ${prev.snapshots.length + 1}`,
        savedAt: Date.now(),
        state: {
          ...prev,
          snapshots: [],
        },
      }
      return { ...prev, snapshots: [...prev.snapshots, snap].slice(-12) }
    })
  }, [])

  const loadSnapshot = useCallback((id: string) => {
    setState((prev) => {
      const snap = prev.snapshots.find((s) => s.id === id)
      if (!snap) return prev
      return {
        ...snap.state,
        snapshots: prev.snapshots,
      }
    })
  }, [])

  const deleteSnapshot = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      snapshots: prev.snapshots.filter((s) => s.id !== id),
    }))
  }, [])

  const encodeShare = useCallback(() => {
    const payload = {
      ...state,
      snapshots: [],
    }
    return btoa(encodeURIComponent(JSON.stringify(payload)))
  }, [state])

  const applyShare = useCallback((encoded: string) => {
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(encoded))) as Partial<WorkspaceState>
      setState((prev) => ({
        ...defaultState(),
        ...parsed,
        supportSpeeds: parsed.supportSpeeds ?? defaultState().supportSpeeds,
        buffRules: parsed.buffRules ?? [],
        snapshots: prev.snapshots,
      }))
      return true
    } catch {
      return false
    }
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      setCarryPresetId,
      setEnemyTemplateId,
      setTeamSlotIds,
      setCarrySpeed,
      setSupportSpeeds,
      setBuffRules,
      saveSnapshot,
      loadSnapshot,
      deleteSnapshot,
      encodeShare,
      applyShare,
    }),
    [
      applyShare,
      deleteSnapshot,
      encodeShare,
      loadSnapshot,
      saveSnapshot,
      setBuffRules,
      setCarryPresetId,
      setCarrySpeed,
      setEnemyTemplateId,
      setSupportSpeeds,
      setTeamSlotIds,
      state,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}
