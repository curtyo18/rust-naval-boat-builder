export type ModeId = 'boat' | 'base'

export interface HashRoute {
  mode: ModeId
  data: string | null
  legacy?: boolean
}

export function parseHashRoute(hash: string): HashRoute | null {
  if (!hash || hash === '#') return null

  // Legacy format: #data=...
  if (hash.startsWith('#data=')) {
    return { mode: 'boat', data: hash.slice('#data='.length), legacy: true }
  }

  // Modern format: #/mode[?data=...]
  if (!hash.startsWith('#/')) return null
  const pathAndQuery = hash.slice(2)
  const [path, query = ''] = pathAndQuery.split('?')
  if (path !== 'boat' && path !== 'base') return null

  const mode = path as ModeId
  const params = new URLSearchParams(query)
  const data = params.get('data')
  return { mode, data }
}

export function buildHashRoute(route: { mode: ModeId; data: string | null }): string {
  if (route.data) return `#/${route.mode}?data=${route.data}`
  return `#/${route.mode}`
}
