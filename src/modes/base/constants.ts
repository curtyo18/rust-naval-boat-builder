export const TIER_IDS = ['wood', 'stone', 'metal', 'hqm'] as const
export type TierId = typeof TIER_IDS[number]

export const TIER_LABELS: Record<TierId, string> = {
  wood: 'Wood',
  stone: 'Stone',
  metal: 'Metal',
  hqm: 'HQM',
}

export const ENTRY_PIECE_TYPES = ['doorway', 'double_door_frame']

export const ENTRY_PIECE_LABELS: Record<string, string> = {
  doorway: 'Doorways',
  double_door_frame: 'Double door frames',
}
