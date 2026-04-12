# Rust Naval Base Planner — Design Spec
**Date:** 2026-04-12

## Overview

A free, open-source, browser-based 3D naval base planner for the game Rust (Naval Update, February 2026). Hosted on GitHub Pages with no backend — everything runs client-side. Focused exclusively on player-built boats; land base planning is intentionally out of scope. The UI includes a link to the existing land base planner at https://krystiandzirba.github.io/Rust-Base-Builder/.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Build tool | Vite + React + TypeScript |
| 3D rendering | react-three-fiber + @react-three/drei |
| State management | Zustand |
| Deployment | GitHub Pages via GitHub Actions |

**Why react-three-fiber over raw Three.js:** The project is React-based and piece placement is fundamentally a state problem. R3F lets the 3D scene re-render from React state changes automatically, eliminating manual scene-sync code. `@react-three/drei` provides orbit controls, grid helpers, and snapping utilities out of the box.

---

## Architecture

### State Store (Zustand)

```ts
interface PlacedPiece {
  id: string;           // uuid
  type: string;         // matches key in pieces-config.json
  position: { x: number; y: number; z: number };  // grid coordinates
  rotation: number;     // 0 | 90 | 180 | 270 degrees
}

interface AppStore {
  pieces: PlacedPiece[];
  coordinateIndex: Map<string, string>;   // "x,y,z" → pieceId (derived)
  visibleLevels: Set<0 | 1 | 2>;
  selectedPieceType: string | null;

  // Actions
  placePiece(type: string, position: XYZ, rotation: number): void;
  removePiece(id: string): void;
  setVisibleLevels(levels: Set<0 | 1 | 2>): void;
  selectPieceType(type: string | null): void;
  clearAll(): void;
  loadFromJSON(pieces: PlacedPiece[]): void;
}
```

`coordinateIndex` is rebuilt on every `placePiece` / `removePiece` mutation. It is not persisted.

### Piece Config

A static `src/data/pieces-config.json` file maps piece types to display names, categories, placement constraints, and material costs. It is the sole source of truth for cost calculations and placement validation rules.

```json
{
  "square_hull": {
    "label": "Square Hull",
    "category": "hull",
    "floorConstraint": "ground_only",
    "maxCount": null,
    "cost": { "wood": 300, "lowGrade": 15 }
  },
  "cannon": {
    "label": "Cannon",
    "category": "deployable",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 100, "metalFragments": 200 }
  },
  "sail": {
    "label": "Sail",
    "category": "deployable",
    "floorConstraint": null,
    "maxCount": 10,
    "cost": { "wood": 150, "tarp": 1 }
  },
  "boat_engine": {
    "label": "Boat Engine",
    "category": "deployable",
    "floorConstraint": "ground_only",
    "maxCount": null,
    "cost": { "highQualityMetal": 5, "gears": 2, "lowGrade": 50 }
  }
}
```

**Material types used across all pieces:** `wood`, `lowGrade`, `metalFragments`, `tarp`, `highQualityMetal`, `gears`. The cost bar displays only materials with a non-zero total.

**Placement constraints encoded in config:**
- `floorConstraint: "ground_only"` — piece can only be placed on floor 0 (hull pieces, anchor, boat engine)
- `floorConstraint: "upper_only"` — piece can only be placed on floors 1–2 (floor square, floor triangle, floor frame variants)
- `floorConstraint: null` — placeable on any floor
- `maxCount` — if non-null, placement is blocked once this many of this piece type exist in the store

### Persistence

- **Auto-save:** On every store mutation, serialize `pieces` array to `localStorage` under key `naval-planner-design`.
- **Share:** On "Share" click, encode `pieces` as `base64(JSON.stringify(pieces))`, set `window.location.hash = '#data=' + encoded`, copy full URL to clipboard.
- **Restore:** On page load, if `#data=` hash is present, decode and load into store. Otherwise, load from `localStorage`. Hash takes priority.

### Deployment

- GitHub Actions workflow triggers on push to `main`.
- Runs `npm run build` (Vite), deploys `dist/` to the `gh-pages` branch.
- `vite.config.ts` sets `base: '/rust-naval-boat-builder/'` to match the GitHub repo name.

---

## 3D Scene

### Build Surface

A static, non-interactive mesh representing the boat hull — a flat rectangular shape approximately 5 units wide × 11 units long. Visual reference only; all interaction happens on the grid.

### Grid

- **1 unit = 1 Rust building square**
- **Dimensions:** 5 wide × 11 long × 3 tall (hard-coded)
- Floor 0 sits on the hull surface; floors 1 and 2 stack upward at standard wall height (1 unit)
- Grid lines are rendered on the active/visible floors

### Camera

- **Default:** Top-down perspective looking straight down at floor 0
- **Orbit:** Right-click drag to rotate freely; scroll to zoom; middle-click to pan
- **Reset:** "Reset Camera" button in top bar snaps back to default top-down view

### Piece Placement

1. User selects a piece type from the sidebar — it enters the "hand"
2. Hovering over a valid grid cell shows a ghost (semi-transparent) preview of the piece
3. A cell is valid if: within 5×11×3 bounds AND `coordinateIndex` has no entry for that coordinate
4. Left-click on a valid cell places the piece
5. Right-click on an existing placed piece removes it
6. Escape or clicking the active piece type again deselects — clears the hand
7. All placement is grid-snapped; no free positioning

### Level Visibility

- Three independent toggle buttons (Floor 0 / Floor 1 / Floor 2) in the left sidebar — each can be toggled on/off independently; multiple floors can be visible simultaneously
- Hidden floors: pieces are not rendered; grid lines for that level are hidden
- Hidden floors are still present in the Zustand store — visibility is render-only
- Intended workflow: build floor 0, go to floor 1, hide floor 2 if needed, etc.

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [Rust Naval Planner]  [Land Planner ↗]  [Reset Camera] [Share] [Clear] │
├───────────────┬──────────────────────────────────────────────────┤
│  PIECE PICKER │                                                  │
│  ──────────── │            3D VIEWPORT                           │
│  Hull         │                                                  │
│  > Sq. Hull   │                                                  │
│  > Tri. Hull  │                                                  │
│  Structural   │                                                  │
│  > Wall       │                                                  │
│  > Doorway    │                                                  │
│  > Window     │                                                  │
│  > Low Wall   │                                                  │
│  > Cannon Wall│                                                  │
│  > Barrier    │                                                  │
│  > Stairs     │                                                  │
│  Floor        │                                                  │
│  > Sq. Floor  │                                                  │
│  > Tri. Floor │                                                  │
│  > Sq. Frame  │                                                  │
│  > Tri. Frame │                                                  │
│  Deployable   │                                                  │
│  > Anchor     │                                                  │
│  > Steering   │                                                  │
│  > Cannon     │                                                  │
│  > Sail       │                                                  │
│  > Engine     │                                                  │
│               │                                                  │
│  FLOORS       │                                                  │
│  [0] [1] [2]  │                                                  │
├───────────────┴──────────────────────────────────────────────────┤
│  Wood: 1,240  Low Grade: 86  Metal Frags: 200  Tarp: 1           │
└──────────────────────────────────────────────────────────────────┘
```

### Top Bar
- App title
- Link to land base planner (opens in new tab)
- Reset Camera button
- Share button — encodes design to URL hash, copies to clipboard, shows brief "Copied!" confirmation
- Clear button — shows confirmation prompt before wiping all placed pieces

### Left Sidebar
- Piece picker grouped into **Structural** and **Naval** categories, driven by `pieces-config.json`
- Active/selected piece is highlighted
- Floor visibility toggles (0, 1, 2) below the piece list

### Bottom Cost Bar
- Reads from `pieces-config.json` cost fields
- Sums costs across all pieces in the store (regardless of level visibility)
- Updates live on every placement/removal

---

## Naval Building Rules (Encoded as Validation)

These are Rust's actual constraints for the naval build system:

- Build area is bounded to 5×11×3 grid — no placement outside this volume
- Hull pieces (Square Hull, Triangle Hull) — floor 0 only
- Floor pieces (Square Floor, Triangle Floor, Square Frame, Triangle Frame) — floors 1–2 only
- Anchor — floor 0 only
- Boat Engine — floor 0 only
- Sail — max 10 per boat
- No Tool Cupboard piece
- No electrical pieces
- Only single doorway (no double door frame variant)
- Wood is the only upgrade tier — no stone/metal/HQM
- All constraints are driven by `pieces-config.json` fields — no hard-coded validation logic

---

## Out of Scope (v1)

- Mobile support — desktop browsers only
- Piece rotation in 3D (Y-axis only, 4 cardinal directions is sufficient)
- Multiplayer / cloud save
- Export to image/PDF
- Undo/redo history
- Land base building (by design — this tool is naval-only)
