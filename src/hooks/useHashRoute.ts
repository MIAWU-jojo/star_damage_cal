import { useEffect, useState } from 'react'

export type AppRoute = 'calc' | 'formula' | 'team'

function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#\/?/, '').split('?')[0]
  if (raw === 'formula') return 'formula'
  if (raw === 'team') return 'team'
  return 'calc'
}

export function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRouteState] = useState<AppRoute>(() =>
    typeof window === 'undefined' ? 'calc' : parseHash(window.location.hash),
  )

  useEffect(() => {
    const onHash = () => setRouteState(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setRoute = (next: AppRoute) => {
    const path = next === 'calc' ? '#/' : `#/${next}`
    if (window.location.hash !== path) {
      window.location.hash = path
    }
    setRouteState(next)
  }

  return [route, setRoute]
}
