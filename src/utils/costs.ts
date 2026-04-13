import type { PlacedPiece, PiecesConfig, MaterialCosts, MaterialKey } from '../types'
import { SAIL_POWER, ENGINE_POWER, MAX_SPEED_RATIO, MAX_SAILS, MAX_ENGINES } from '../data/boat-constants'

export interface BoatStats {
  totalHp: number
  totalMass: number
}

export function computeBoatStats(pieces: PlacedPiece[], config: PiecesConfig): BoatStats {
  let totalHp = 0
  let totalMass = 0

  for (const piece of pieces) {
    const pieceConfig = config[piece.type]
    if (!pieceConfig) continue
    totalHp += pieceConfig.hp
    totalMass += pieceConfig.mass
  }

  return { totalHp, totalMass }
}

export interface SpeedInfo {
  requiredPower: number
  sailsNeeded: number
  canAchieveWithSails: boolean
  enginesNeeded: number | null
  canAchieveMaxSpeed: boolean
}

export function computeSpeedInfo(totalMass: number): SpeedInfo {
  const requiredPower = totalMass * MAX_SPEED_RATIO
  const sailsNeeded = Math.ceil(requiredPower / SAIL_POWER)
  const canAchieveWithSails = sailsNeeded <= MAX_SAILS

  let enginesNeeded: number | null = null
  if (!canAchieveWithSails) {
    const deficit = requiredPower - MAX_SAILS * SAIL_POWER
    enginesNeeded = Math.ceil(deficit / ENGINE_POWER)
  }

  const maxPower = MAX_SAILS * SAIL_POWER + MAX_ENGINES * ENGINE_POWER
  const canAchieveMaxSpeed = requiredPower <= maxPower

  return { requiredPower, sailsNeeded, canAchieveWithSails, enginesNeeded, canAchieveMaxSpeed }
}

export function computeTotalCosts(pieces: PlacedPiece[], config: PiecesConfig): MaterialCosts {
  const totals: Partial<Record<MaterialKey, number>> = {}

  for (const piece of pieces) {
    const pieceConfig = config[piece.type]
    if (!pieceConfig) continue

    for (const [material, amount] of Object.entries(pieceConfig.cost) as [MaterialKey, number][]) {
      if (!amount) continue
      totals[material] = (totals[material] ?? 0) + amount
    }
  }

  return totals
}
