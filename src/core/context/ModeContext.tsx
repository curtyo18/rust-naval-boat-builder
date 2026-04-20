import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ModeConfig } from '../types'

const ModeContext = createContext<ModeConfig | null>(null)

export function ModeProvider({ config, children }: { config: ModeConfig; children: ReactNode }) {
  return <ModeContext.Provider value={config}>{children}</ModeContext.Provider>
}

export function useMode(): ModeConfig {
  const config = useContext(ModeContext)
  if (!config) throw new Error('useMode() called outside ModeProvider')
  return config
}
