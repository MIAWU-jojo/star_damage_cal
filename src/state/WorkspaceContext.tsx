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

const STORAGE_KEY = 'star-damage-cal:workspace-v1'
const DEFAULT_TEAM = ['tingyun', 'pela', 'huohuo']

export interface WorkspaceState {
  carryPresetId: string
  enemyTemplateId: string
  teamSlotIds: string[]
  carrySpeed: number
}

interface WorkspaceContextValue extends WorkspaceState {
  setCarryPresetId: (id: string) => void
  setEnemyTemplateId: (id: string) => void
  setTeamSlotIds: (ids: string[] | ((prev: string[]) => string[])) => void
  setCarrySpeed: (spd: number) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        carryPresetId: CHARACTER_PRESETS[0].id,
        enemyTemplateId: ENEMY_TEMPLATES[0].id,
        teamSlotIds: DEFAULT_TEAM,
        carrySpeed: 134,
      }
    }
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    return {
      carryPresetId: parsed.carryPresetId ?? CHARACTER_PRESETS[0].id,
      enemyTemplateId: parsed.enemyTemplateId ?? ENEMY_TEMPLATES[0].id,
      teamSlotIds:
        parsed.teamSlotIds && parsed.teamSlotIds.length === 3
          ? parsed.teamSlotIds
          : DEFAULT_TEAM,
      carrySpeed: parsed.carrySpeed ?? 134,
    }
  } catch {
    return {
      carryPresetId: CHARACTER_PRESETS[0].id,
      enemyTemplateId: ENEMY_TEMPLATES[0].id,
      teamSlotIds: DEFAULT_TEAM,
      carrySpeed: 134,
    }
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() =>
    typeof window === 'undefined'
      ? {
          carryPresetId: CHARACTER_PRESETS[0].id,
          enemyTemplateId: ENEMY_TEMPLATES[0].id,
          teamSlotIds: DEFAULT_TEAM,
          carrySpeed: 134,
        }
      : loadWorkspace(),
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

  const value = useMemo(
    () => ({
      ...state,
      setCarryPresetId,
      setEnemyTemplateId,
      setTeamSlotIds,
      setCarrySpeed,
    }),
    [setCarryPresetId, setCarrySpeed, setEnemyTemplateId, setTeamSlotIds, state],
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
