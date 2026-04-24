export const SAIL_POWER = 2500
export const ENGINE_POWER = 10000
export const MAX_SPEED_RATIO = 12.75
export const MAX_SPEED_KMH = 54
export const MAX_SAILS = 10
export const MAX_ENGINES = 5

export const EXPLOSIVES = {
  c4:         { label: 'C4',         damage: 495, sulfur: 2200 },
  cannonball: { label: 'Cannonball', damage: 51,  sulfur: 15 },
  torpedo:    { label: 'Torpedo',    damage: 36,  sulfur: 12 },
} as const

export type ExplosiveKey = keyof typeof EXPLOSIVES
