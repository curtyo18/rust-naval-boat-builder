# Rust Naval Base Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 3D naval base planner for Rust that runs entirely client-side and deploys to GitHub Pages.

**Architecture:** Vite + React + TypeScript SPA. React-three-fiber renders a 5×11×3 grid on a boat hull mesh. Zustand holds a flat `PlacedPiece[]` array as source of truth; a derived `Map<"x,y,z", pieceId>` index enables O(1) validity checks. All persistence is client-side: localStorage auto-save and URL-hash sharing.

**Tech Stack:** Vite, React 18, TypeScript, react-three-fiber, @react-three/drei, Zustand, Vitest, @testing-library/react

---

## File Map

```
src/
  main.tsx                        # entry point
  App.tsx                         # root layout
  App.css                         # layout grid styles
  index.css                       # global reset + font
  data/
    pieces-config.json            # piece definitions, costs, constraints
  types/
    index.ts                      # shared TS types
  store/
    useStore.ts                   # Zustand store
  utils/
    coordinateKey.ts              # "x,y,z" key helpers
    validation.ts                 # placement validity checks
    costs.ts                      # aggregate material cost totals
    serialization.ts              # base64 encode/decode for URL hash
  hooks/
    usePersistence.ts             # localStorage save + URL hash restore
  components/
    TopBar.tsx / TopBar.css       # title, links, action buttons
    Sidebar.tsx / Sidebar.css     # piece picker + floor toggles
    CostBar.tsx / CostBar.css     # running material totals
  scene/
    Viewport.tsx                  # R3F Canvas wrapper
    HullMesh.tsx                  # static boat hull mesh
    SceneGrid.tsx                 # grid lines per visible floor
    PlacedPieces.tsx              # renders placed pieces from store
    GhostPiece.tsx                # semi-transparent hover preview
    HitPlane.tsx                  # invisible click/hover target plane
test/
  setup.ts                        # @testing-library/jest-dom setup
  coordinateKey.test.ts
  validation.test.ts
  costs.test.ts
  serialization.test.ts
  store.test.ts
.github/
  workflows/
    deploy.yml                    # GitHub Actions → gh-pages
```

---

## Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Scaffold into existing directory**

```bash
cd /e/Projects/rust-naval-boat-builder
npm create vite@latest . -- --template react-ts
```

When prompted "Directory is not empty. Remove existing files and continue?", answer **n** (no). The scaffold will warn but Vite only overwrites specific files. Alternatively, choose **y** — the .gitignore was already committed so it's safe; docs/ is gitignored and won't be touched.

- [ ] **Step 2: Verify scaffold output**

```bash
ls src/
```

Expected: `App.css  App.tsx  assets/  index.css  main.tsx  vite-env.d.ts`

- [ ] **Step 3: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

## Task 2: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `test/setup.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install three @react-three/fiber @react-three/drei zustand
npm install @types/three
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Update vite.config.ts**

Replace the entire file contents with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/rust-naval-boat-builder/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
})
```

- [ ] **Step 4: Create test setup file**

```ts
// test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

In `package.json`, add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 6: Verify test runner works**

```bash
npm test
```

Expected: `No test files found, exiting with code 0` (or similar — no failures).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: install deps, configure Vitest with jsdom"
```

---

## Task 3: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy to GitHub Pages"
```

---

## Task 4: Shared TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types**

```ts
// src/types/index.ts

export interface XYZ {
  x: number
  y: number
  z: number
}

export type PieceRotation = 0 | 90 | 180 | 270

export interface PlacedPiece {
  id: string
  type: string
  position: XYZ
  rotation: PieceRotation
}

export type FloorConstraint = 'ground_only' | 'upper_only' | null

export interface MaterialCosts {
  wood?: number
  lowGrade?: number
  metalFragments?: number
  tarp?: number
  highQualityMetal?: number
  gears?: number
}

export type PieceCategory = 'hull' | 'structural' | 'floor' | 'deployable'

export interface PieceConfig {
  label: string
  category: PieceCategory
  floorConstraint: FloorConstraint
  maxCount: number | null
  cost: MaterialCosts
}

export type PiecesConfig = Record<string, PieceConfig>

export type MaterialKey = keyof MaterialCosts

export const MATERIAL_LABELS: Record<MaterialKey, string> = {
  wood: 'Wood',
  lowGrade: 'Low Grade',
  metalFragments: 'Metal Frags',
  tarp: 'Tarp',
  highQualityMetal: 'High Quality Metal',
  gears: 'Gears',
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 5: pieces-config.json

**Files:**
- Create: `src/data/pieces-config.json`

- [ ] **Step 1: Create the config file**

```json
{
  "square_hull": {
    "label": "Square Hull",
    "category": "hull",
    "floorConstraint": "ground_only",
    "maxCount": null,
    "cost": { "wood": 300, "lowGrade": 15 }
  },
  "triangle_hull": {
    "label": "Triangle Hull",
    "category": "hull",
    "floorConstraint": "ground_only",
    "maxCount": null,
    "cost": { "wood": 150, "lowGrade": 8 }
  },
  "floor_square": {
    "label": "Square Floor",
    "category": "floor",
    "floorConstraint": "upper_only",
    "maxCount": null,
    "cost": { "wood": 150, "lowGrade": 8 }
  },
  "floor_triangle": {
    "label": "Triangle Floor",
    "category": "floor",
    "floorConstraint": "upper_only",
    "maxCount": null,
    "cost": { "wood": 75, "lowGrade": 4 }
  },
  "floor_frame_square": {
    "label": "Square Floor Frame",
    "category": "floor",
    "floorConstraint": "upper_only",
    "maxCount": null,
    "cost": { "wood": 150, "lowGrade": 8 }
  },
  "floor_frame_triangle": {
    "label": "Triangle Floor Frame",
    "category": "floor",
    "floorConstraint": "upper_only",
    "maxCount": null,
    "cost": { "wood": 75, "lowGrade": 4 }
  },
  "wall": {
    "label": "Wall",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 300, "lowGrade": 15 }
  },
  "doorway": {
    "label": "Doorway",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 210, "lowGrade": 11 }
  },
  "window": {
    "label": "Window",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 210, "lowGrade": 11 }
  },
  "low_wall": {
    "label": "Low Wall",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 150, "lowGrade": 8 }
  },
  "low_cannon_wall": {
    "label": "Cannon Wall",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 150, "lowGrade": 8 }
  },
  "low_wall_barrier": {
    "label": "Low Barrier",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 150, "lowGrade": 8 }
  },
  "boat_stairs": {
    "label": "Boat Stairs",
    "category": "structural",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 300, "lowGrade": 15 }
  },
  "anchor": {
    "label": "Anchor",
    "category": "deployable",
    "floorConstraint": "ground_only",
    "maxCount": null,
    "cost": { "wood": 250 }
  },
  "steering_wheel": {
    "label": "Steering Wheel",
    "category": "deployable",
    "floorConstraint": null,
    "maxCount": null,
    "cost": { "wood": 100 }
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

- [ ] **Step 2: Commit**

```bash
git add src/data/pieces-config.json
git commit -m "feat: add pieces-config.json with all piece definitions and costs"
```

---

## Task 6: coordinateKey and validation utilities (TDD)

**Files:**
- Create: `src/utils/coordinateKey.ts`
- Create: `src/utils/validation.ts`
- Create: `test/validation.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/validation.test.ts
import { describe, it, expect } from 'vitest'
import { toKey, fromKey } from '../src/utils/coordinateKey'
import { isInBounds, isFloorAllowed, isOccupied, isMaxCountReached, canPlace } from '../src/utils/validation'
import type { PlacedPiece, PiecesConfig } from '../src/types'

const mockConfig: PiecesConfig = {
  wall: { label: 'Wall', category: 'structural', floorConstraint: null, maxCount: null, cost: { wood: 300 } },
  square_hull: { label: 'Square Hull', category: 'hull', floorConstraint: 'ground_only', maxCount: null, cost: { wood: 300 } },
  floor_square: { label: 'Square Floor', category: 'floor', floorConstraint: 'upper_only', maxCount: null, cost: { wood: 150 } },
  sail: { label: 'Sail', category: 'deployable', floorConstraint: null, maxCount: 10, cost: { wood: 150 } },
}

describe('toKey / fromKey', () => {
  it('encodes position as string', () => {
    expect(toKey({ x: 1, y: 2, z: 3 })).toBe('1,2,3')
  })
  it('decodes key back to position', () => {
    expect(fromKey('1,2,3')).toEqual({ x: 1, y: 2, z: 3 })
  })
})

describe('isInBounds', () => {
  it('accepts valid position', () => {
    expect(isInBounds({ x: 0, y: 0, z: 0 })).toBe(true)
    expect(isInBounds({ x: 4, y: 2, z: 10 })).toBe(true)
  })
  it('rejects x out of range', () => {
    expect(isInBounds({ x: 5, y: 0, z: 0 })).toBe(false)
    expect(isInBounds({ x: -1, y: 0, z: 0 })).toBe(false)
  })
  it('rejects z out of range', () => {
    expect(isInBounds({ x: 0, y: 0, z: 11 })).toBe(false)
  })
  it('rejects y out of range', () => {
    expect(isInBounds({ x: 0, y: 3, z: 0 })).toBe(false)
  })
})

describe('isFloorAllowed', () => {
  it('allows any floor when constraint is null', () => {
    expect(isFloorAllowed({ x: 0, y: 0, z: 0 }, null)).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 2, z: 0 }, null)).toBe(true)
  })
  it('ground_only allows y=0 only', () => {
    expect(isFloorAllowed({ x: 0, y: 0, z: 0 }, 'ground_only')).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 1, z: 0 }, 'ground_only')).toBe(false)
  })
  it('upper_only allows y=1 and y=2 only', () => {
    expect(isFloorAllowed({ x: 0, y: 1, z: 0 }, 'upper_only')).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 2, z: 0 }, 'upper_only')).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 0, z: 0 }, 'upper_only')).toBe(false)
  })
})

describe('isOccupied', () => {
  it('returns false for empty index', () => {
    expect(isOccupied({ x: 0, y: 0, z: 0 }, new Map())).toBe(false)
  })
  it('returns true when cell is in index', () => {
    const index = new Map([['0,0,0', 'piece-1']])
    expect(isOccupied({ x: 0, y: 0, z: 0 }, index)).toBe(true)
  })
})

describe('isMaxCountReached', () => {
  it('returns false when maxCount is null', () => {
    const pieces: PlacedPiece[] = [{ id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0 }]
    expect(isMaxCountReached('wall', pieces, mockConfig)).toBe(false)
  })
  it('returns false when count is below maxCount', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 9 }, (_, i) => ({
      id: String(i), type: 'sail', position: { x: i, y: 0, z: 0 }, rotation: 0,
    }))
    expect(isMaxCountReached('sail', pieces, mockConfig)).toBe(false)
  })
  it('returns true when count equals maxCount', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i), type: 'sail', position: { x: i, y: 0, z: 0 }, rotation: 0,
    }))
    expect(isMaxCountReached('sail', pieces, mockConfig)).toBe(true)
  })
})

describe('canPlace', () => {
  it('returns true for valid placement', () => {
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], new Map(), mockConfig)).toBe(true)
  })
  it('returns false when out of bounds', () => {
    expect(canPlace('wall', { x: 5, y: 0, z: 0 }, [], new Map(), mockConfig)).toBe(false)
  })
  it('returns false when floor constraint violated', () => {
    expect(canPlace('square_hull', { x: 0, y: 1, z: 0 }, [], new Map(), mockConfig)).toBe(false)
  })
  it('returns false when cell is occupied', () => {
    const index = new Map([['0,0,0', 'existing']])
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], index, mockConfig)).toBe(false)
  })
  it('returns false when max count reached', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i), type: 'sail', position: { x: i, y: 0, z: 0 }, rotation: 0,
    }))
    const index = new Map(pieces.map(p => [toKey(p.position), p.id]))
    expect(canPlace('sail', { x: 0, y: 0, z: 5 }, pieces, index, mockConfig)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/utils/coordinateKey'`

- [ ] **Step 3: Implement coordinateKey**

```ts
// src/utils/coordinateKey.ts
import type { XYZ } from '../types'

export const toKey = (pos: XYZ): string => `${pos.x},${pos.y},${pos.z}`

export const fromKey = (key: string): XYZ => {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}
```

- [ ] **Step 4: Implement validation**

```ts
// src/utils/validation.ts
import type { XYZ, FloorConstraint, PlacedPiece, PiecesConfig } from '../types'
import { toKey } from './coordinateKey'

const GRID_X = 5
const GRID_Z = 11
const GRID_Y = 3

export function isInBounds(pos: XYZ): boolean {
  return pos.x >= 0 && pos.x < GRID_X
    && pos.y >= 0 && pos.y < GRID_Y
    && pos.z >= 0 && pos.z < GRID_Z
}

export function isFloorAllowed(pos: XYZ, constraint: FloorConstraint): boolean {
  if (constraint === null) return true
  if (constraint === 'ground_only') return pos.y === 0
  if (constraint === 'upper_only') return pos.y > 0
  return true
}

export function isOccupied(pos: XYZ, coordinateIndex: Map<string, string>): boolean {
  return coordinateIndex.has(toKey(pos))
}

export function isMaxCountReached(type: string, pieces: PlacedPiece[], config: PiecesConfig): boolean {
  const maxCount = config[type]?.maxCount
  if (maxCount === null || maxCount === undefined) return false
  return pieces.filter(p => p.type === type).length >= maxCount
}

export function canPlace(
  type: string,
  position: XYZ,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
): boolean {
  if (!isInBounds(position)) return false
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed(position, pieceConfig.floorConstraint)) return false
  if (isOccupied(position, coordinateIndex)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  return true
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/coordinateKey.ts src/utils/validation.ts test/validation.test.ts
git commit -m "feat: add coordinateKey and validation utilities"
```

---

## Task 7: costs utility (TDD)

**Files:**
- Create: `src/utils/costs.ts`
- Create: `test/costs.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/costs.test.ts
import { describe, it, expect } from 'vitest'
import { computeTotalCosts } from '../src/utils/costs'
import type { PlacedPiece, PiecesConfig } from '../src/types'

const config: PiecesConfig = {
  wall: { label: 'Wall', category: 'structural', floorConstraint: null, maxCount: null, cost: { wood: 300, lowGrade: 15 } },
  cannon: { label: 'Cannon', category: 'deployable', floorConstraint: null, maxCount: null, cost: { wood: 100, metalFragments: 200 } },
  sail: { label: 'Sail', category: 'deployable', floorConstraint: null, maxCount: 10, cost: { wood: 150, tarp: 1 } },
  boat_engine: { label: 'Boat Engine', category: 'deployable', floorConstraint: 'ground_only', maxCount: null, cost: { highQualityMetal: 5, gears: 2, lowGrade: 50 } },
}

const makePiece = (type: string, id: string): PlacedPiece => ({
  id, type, position: { x: 0, y: 0, z: 0 }, rotation: 0,
})

describe('computeTotalCosts', () => {
  it('returns empty object for no pieces', () => {
    expect(computeTotalCosts([], config)).toEqual({})
  })

  it('returns costs for single piece', () => {
    expect(computeTotalCosts([makePiece('wall', '1')], config)).toEqual({ wood: 300, lowGrade: 15 })
  })

  it('sums same material across multiple pieces', () => {
    const pieces = [makePiece('wall', '1'), makePiece('wall', '2')]
    expect(computeTotalCosts(pieces, config)).toEqual({ wood: 600, lowGrade: 30 })
  })

  it('aggregates different materials across different piece types', () => {
    const pieces = [makePiece('wall', '1'), makePiece('cannon', '2')]
    expect(computeTotalCosts(pieces, config)).toEqual({ wood: 400, lowGrade: 15, metalFragments: 200 })
  })

  it('omits materials with zero total', () => {
    const result = computeTotalCosts([makePiece('boat_engine', '1')], config)
    expect(result).toEqual({ highQualityMetal: 5, gears: 2, lowGrade: 50 })
    expect(result.wood).toBeUndefined()
  })

  it('ignores pieces with unknown type', () => {
    const pieces = [makePiece('unknown_piece', '1')]
    expect(computeTotalCosts(pieces, config)).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/utils/costs'`

- [ ] **Step 3: Implement costs utility**

```ts
// src/utils/costs.ts
import type { PlacedPiece, PiecesConfig, MaterialCosts, MaterialKey } from '../types'

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/costs.ts test/costs.test.ts
git commit -m "feat: add costs utility"
```

---

## Task 8: serialization utility (TDD)

**Files:**
- Create: `src/utils/serialization.ts`
- Create: `test/serialization.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/serialization.test.ts
import { describe, it, expect } from 'vitest'
import { encodePieces, decodePieces } from '../src/utils/serialization'
import type { PlacedPiece } from '../src/types'

const pieces: PlacedPiece[] = [
  { id: 'abc', type: 'wall', position: { x: 1, y: 0, z: 2 }, rotation: 0 },
  { id: 'def', type: 'sail', position: { x: 3, y: 1, z: 4 }, rotation: 90 },
]

describe('encodePieces / decodePieces', () => {
  it('round-trips pieces through encode/decode', () => {
    const encoded = encodePieces(pieces)
    expect(decodePieces(encoded)).toEqual(pieces)
  })

  it('encode returns a non-empty string', () => {
    expect(typeof encodePieces(pieces)).toBe('string')
    expect(encodePieces(pieces).length).toBeGreaterThan(0)
  })

  it('encodes empty array', () => {
    expect(decodePieces(encodePieces([]))).toEqual([])
  })

  it('returns null for invalid input', () => {
    expect(decodePieces('!!!not-base64!!!')).toBeNull()
    expect(decodePieces('')).toBeNull()
    expect(decodePieces('aGVsbG8=')).toBeNull() // valid base64 but not valid pieces JSON
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/utils/serialization'`

- [ ] **Step 3: Implement serialization**

```ts
// src/utils/serialization.ts
import type { PlacedPiece } from '../types'

export function encodePieces(pieces: PlacedPiece[]): string {
  return btoa(JSON.stringify(pieces))
}

export function decodePieces(encoded: string): PlacedPiece[] | null {
  if (!encoded) return null
  try {
    const json = atob(encoded)
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    return parsed as PlacedPiece[]
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/serialization.ts test/serialization.test.ts
git commit -m "feat: add serialization utility for URL hash encoding"
```

---

## Task 9: Zustand store (TDD)

**Files:**
- Create: `src/store/useStore.ts`
- Create: `test/store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useStore } from '../src/store/useStore'
import { toKey } from '../src/utils/coordinateKey'

beforeEach(() => {
  act(() => useStore.getState().clearAll())
})

describe('placePiece', () => {
  it('adds piece to pieces array', () => {
    act(() => useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0))
    expect(useStore.getState().pieces).toHaveLength(1)
    expect(useStore.getState().pieces[0].type).toBe('wall')
  })

  it('updates coordinateIndex', () => {
    act(() => useStore.getState().placePiece('wall', { x: 1, y: 0, z: 2 }, 0))
    expect(useStore.getState().coordinateIndex.has('1,0,2')).toBe(true)
  })

  it('assigns unique id to each piece', () => {
    act(() => {
      useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0)
      useStore.getState().placePiece('wall', { x: 1, y: 0, z: 0 }, 0)
    })
    const { pieces } = useStore.getState()
    expect(pieces[0].id).not.toBe(pieces[1].id)
  })
})

describe('removePiece', () => {
  it('removes piece from pieces array', () => {
    act(() => useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0))
    const id = useStore.getState().pieces[0].id
    act(() => useStore.getState().removePiece(id))
    expect(useStore.getState().pieces).toHaveLength(0)
  })

  it('removes piece from coordinateIndex', () => {
    act(() => useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0))
    const id = useStore.getState().pieces[0].id
    act(() => useStore.getState().removePiece(id))
    expect(useStore.getState().coordinateIndex.has('0,0,0')).toBe(false)
  })
})

describe('clearAll', () => {
  it('empties pieces and coordinateIndex', () => {
    act(() => {
      useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0)
      useStore.getState().clearAll()
    })
    expect(useStore.getState().pieces).toHaveLength(0)
    expect(useStore.getState().coordinateIndex.size).toBe(0)
  })
})

describe('loadPieces', () => {
  it('replaces pieces and rebuilds coordinateIndex', () => {
    const incoming = [
      { id: 'x1', type: 'wall', position: { x: 2, y: 1, z: 3 }, rotation: 0 as const },
    ]
    act(() => useStore.getState().loadPieces(incoming))
    expect(useStore.getState().pieces).toEqual(incoming)
    expect(useStore.getState().coordinateIndex.get('2,1,3')).toBe('x1')
  })
})

describe('selectPieceType', () => {
  it('sets selectedPieceType', () => {
    act(() => useStore.getState().selectPieceType('cannon'))
    expect(useStore.getState().selectedPieceType).toBe('cannon')
  })
  it('clears selectedPieceType when set to null', () => {
    act(() => {
      useStore.getState().selectPieceType('cannon')
      useStore.getState().selectPieceType(null)
    })
    expect(useStore.getState().selectedPieceType).toBeNull()
  })
})

describe('setVisibleLevels', () => {
  it('updates visibleLevels', () => {
    act(() => useStore.getState().setVisibleLevels(new Set([0, 2])))
    expect(useStore.getState().visibleLevels).toEqual(new Set([0, 2]))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/store/useStore'`

- [ ] **Step 3: Implement the store**

```ts
// src/store/useStore.ts
import { create } from 'zustand'
import { toKey } from '../utils/coordinateKey'
import type { PlacedPiece, XYZ, PieceRotation } from '../types'

interface AppStore {
  pieces: PlacedPiece[]
  coordinateIndex: Map<string, string>
  visibleLevels: Set<0 | 1 | 2>
  selectedPieceType: string | null

  placePiece(type: string, position: XYZ, rotation: PieceRotation): void
  removePiece(id: string): void
  setVisibleLevels(levels: Set<0 | 1 | 2>): void
  selectPieceType(type: string | null): void
  clearAll(): void
  loadPieces(pieces: PlacedPiece[]): void
}

function buildIndex(pieces: PlacedPiece[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const piece of pieces) {
    index.set(toKey(piece.position), piece.id)
  }
  return index
}

export const useStore = create<AppStore>((set) => ({
  pieces: [],
  coordinateIndex: new Map(),
  visibleLevels: new Set([0, 1, 2]),
  selectedPieceType: null,

  placePiece(type, position, rotation) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = { id, type, position, rotation }
    set((state) => {
      const pieces = [...state.pieces, piece]
      return { pieces, coordinateIndex: buildIndex(pieces) }
    })
  },

  removePiece(id) {
    set((state) => {
      const pieces = state.pieces.filter((p) => p.id !== id)
      return { pieces, coordinateIndex: buildIndex(pieces) }
    })
  },

  setVisibleLevels(levels) {
    set({ visibleLevels: levels })
  },

  selectPieceType(type) {
    set({ selectedPieceType: type })
  },

  clearAll() {
    set({ pieces: [], coordinateIndex: new Map() })
  },

  loadPieces(pieces) {
    set({ pieces, coordinateIndex: buildIndex(pieces) })
  },
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts test/store.test.ts
git commit -m "feat: add Zustand store with piece placement and coordinate index"
```

---

## Task 10: usePersistence hook (TDD)

**Files:**
- Create: `src/hooks/usePersistence.ts`
- Create: `test/serialization.test.ts` *(extend existing file)*

- [ ] **Step 1: Implement usePersistence**

```ts
// src/hooks/usePersistence.ts
import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { encodePieces, decodePieces } from '../utils/serialization'

const STORAGE_KEY = 'naval-planner-design'

export function usePersistence() {
  const pieces = useStore((s) => s.pieces)
  const loadPieces = useStore((s) => s.loadPieces)

  // Restore on mount: URL hash takes priority over localStorage
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#data=')) {
      const encoded = hash.slice('#data='.length)
      const loaded = decodePieces(encoded)
      if (loaded) {
        loadPieces(loaded)
        return
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const loaded = decodePieces(saved)
      if (loaded) loadPieces(loaded)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, encodePieces(pieces))
  }, [pieces])
}
```

This hook has no logic branches worth unit-testing independently (the encode/decode logic is already tested in Task 8). Verify it works via manual testing in Task 22.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePersistence.ts
git commit -m "feat: add usePersistence hook for localStorage and URL hash restore"
```

---

## Task 11: App layout shell

**Files:**
- Modify: `src/App.tsx`, `src/App.css`, `src/index.css`

- [ ] **Step 1: Replace index.css with global reset**

```css
/* src/index.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  background: #1a1a1a;
  color: #e0e0e0;
}

button {
  cursor: pointer;
  font: inherit;
}
```

- [ ] **Step 2: Replace App.css with layout styles**

```css
/* src/App.css */
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app__viewport {
  flex: 1;
}
```

- [ ] **Step 3: Replace App.tsx with layout shell**

```tsx
// src/App.tsx
import './App.css'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import CostBar from './components/CostBar'
import Viewport from './scene/Viewport'

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <div className="app__body">
        <Sidebar />
        <div className="app__viewport">
          <Viewport />
        </div>
      </div>
      <CostBar />
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors only about missing component files (TopBar, Sidebar, CostBar, Viewport) — that's expected, they come next. The commit for this file happens at the end of Task 14 once all components exist.

---

## Task 12: TopBar component

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/TopBar.css`

- [ ] **Step 1: Create TopBar**

```tsx
// src/components/TopBar.tsx
import './TopBar.css'

interface TopBarProps {
  onResetCamera?: () => void
  onShare?: () => void
  onClear?: () => void
}

export default function TopBar({ onResetCamera, onShare, onClear }: TopBarProps) {
  return (
    <header className="topbar">
      <span className="topbar__title">Rust Naval Planner</span>
      <a
        className="topbar__link"
        href="https://krystiandzirba.github.io/Rust-Base-Builder/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Land Planner ↗
      </a>
      <div className="topbar__actions">
        <button className="topbar__btn" onClick={onResetCamera}>Reset Camera</button>
        <button className="topbar__btn" onClick={onShare}>Share</button>
        <button className="topbar__btn topbar__btn--danger" onClick={onClear}>Clear</button>
      </div>
    </header>
  )
}
```

```css
/* src/components/TopBar.css */
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 44px;
  background: #111;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.topbar__title {
  font-weight: 600;
  font-size: 15px;
  color: #fff;
}

.topbar__link {
  color: #aaa;
  text-decoration: none;
  font-size: 12px;
}

.topbar__link:hover {
  color: #fff;
}

.topbar__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.topbar__btn {
  padding: 4px 12px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
}

.topbar__btn:hover {
  background: #444;
}

.topbar__btn--danger {
  border-color: #8b2020;
}

.topbar__btn--danger:hover {
  background: #5a1c1c;
}
```

---

## Task 13: Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/Sidebar.css`

- [ ] **Step 1: Create Sidebar**

```tsx
// src/components/Sidebar.tsx
import './Sidebar.css'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory } from '../types'
import { useStore } from '../store/useStore'

const config = piecesConfig as PiecesConfig

const CATEGORY_ORDER: PieceCategory[] = ['hull', 'structural', 'floor', 'deployable']
const CATEGORY_LABELS: Record<PieceCategory, string> = {
  hull: 'Hull',
  structural: 'Structural',
  floor: 'Floor',
  deployable: 'Deployable',
}

const FLOOR_LEVELS = [0, 1, 2] as const

export default function Sidebar() {
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const setVisibleLevels = useStore((s) => s.setVisibleLevels)

  const piecesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    pieces: Object.entries(config).filter(([, v]) => v.category === cat),
  }))

  function handlePieceClick(type: string) {
    selectPieceType(selectedPieceType === type ? null : type)
  }

  function handleFloorToggle(level: 0 | 1 | 2) {
    const next = new Set(visibleLevels)
    if (next.has(level)) {
      next.delete(level)
    } else {
      next.add(level)
    }
    setVisibleLevels(next)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__pieces">
        {piecesByCategory.map(({ category, pieces }) =>
          pieces.length === 0 ? null : (
            <div key={category} className="sidebar__group">
              <div className="sidebar__group-label">{CATEGORY_LABELS[category]}</div>
              {pieces.map(([type, cfg]) => (
                <button
                  key={type}
                  className={`sidebar__piece ${selectedPieceType === type ? 'sidebar__piece--active' : ''}`}
                  onClick={() => handlePieceClick(type)}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <div className="sidebar__floors">
        <div className="sidebar__group-label">Floors</div>
        <div className="sidebar__floor-toggles">
          {FLOOR_LEVELS.map((level) => (
            <button
              key={level}
              className={`sidebar__floor-btn ${visibleLevels.has(level) ? 'sidebar__floor-btn--active' : ''}`}
              onClick={() => handleFloorToggle(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
```

```css
/* src/components/Sidebar.css */
.sidebar {
  width: 160px;
  flex-shrink: 0;
  background: #141414;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar__pieces {
  flex: 1;
  padding: 8px 0;
}

.sidebar__group {
  margin-bottom: 4px;
}

.sidebar__group-label {
  padding: 6px 12px 2px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
}

.sidebar__piece {
  display: block;
  width: 100%;
  padding: 5px 12px;
  text-align: left;
  background: none;
  border: none;
  color: #ccc;
  font-size: 13px;
}

.sidebar__piece:hover {
  background: #222;
  color: #fff;
}

.sidebar__piece--active {
  background: #2a4a2a;
  color: #7cfc7c;
}

.sidebar__floors {
  padding: 8px 12px 12px;
  border-top: 1px solid #333;
}

.sidebar__floor-toggles {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.sidebar__floor-btn {
  flex: 1;
  padding: 4px 0;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #888;
  font-size: 13px;
}

.sidebar__floor-btn--active {
  background: #2a4a2a;
  border-color: #4a8a4a;
  color: #7cfc7c;
}
```

---

## Task 14: CostBar component

**Files:**
- Create: `src/components/CostBar.tsx`
- Create: `src/components/CostBar.css`

- [ ] **Step 1: Create CostBar**

```tsx
// src/components/CostBar.tsx
import './CostBar.css'
import { useStore } from '../store/useStore'
import { computeTotalCosts } from '../utils/costs'
import { MATERIAL_LABELS } from '../types'
import type { MaterialKey } from '../types'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig } from '../types'

const config = piecesConfig as PiecesConfig

const MATERIAL_ORDER: MaterialKey[] = ['wood', 'lowGrade', 'metalFragments', 'tarp', 'highQualityMetal', 'gears']

export default function CostBar() {
  const pieces = useStore((s) => s.pieces)
  const totals = computeTotalCosts(pieces, config)
  const activeMaterials = MATERIAL_ORDER.filter((m) => (totals[m] ?? 0) > 0)

  return (
    <footer className="costbar">
      {activeMaterials.length === 0 ? (
        <span className="costbar__empty">Place pieces to see material costs</span>
      ) : (
        activeMaterials.map((mat) => (
          <span key={mat} className="costbar__item">
            <span className="costbar__label">{MATERIAL_LABELS[mat]}:</span>
            <span className="costbar__value">{(totals[mat] ?? 0).toLocaleString()}</span>
          </span>
        ))
      )}
    </footer>
  )
}
```

```css
/* src/components/CostBar.css */
.costbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 16px;
  height: 36px;
  background: #111;
  border-top: 1px solid #333;
  flex-shrink: 0;
}

.costbar__empty {
  color: #555;
  font-size: 12px;
}

.costbar__item {
  font-size: 13px;
  white-space: nowrap;
}

.costbar__label {
  color: #888;
  margin-right: 4px;
}

.costbar__value {
  color: #e0e0e0;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Commit layout shell + all three components**

```bash
git add src/App.tsx src/App.css src/index.css src/components/
git commit -m "feat: add app layout shell, TopBar, Sidebar, and CostBar components"
```

---

## Task 15: R3F Canvas + hull mesh + scene grid

**Files:**
- Create: `src/scene/Viewport.tsx`
- Create: `src/scene/HullMesh.tsx`
- Create: `src/scene/SceneGrid.tsx`

- [ ] **Step 1: Create HullMesh**

```tsx
// src/scene/HullMesh.tsx
// Static decorative boat hull. 5 units wide, 11 units long, centered under the grid.
export default function HullMesh() {
  return (
    <mesh position={[2.5, -0.11, 5.5]} receiveShadow>
      <boxGeometry args={[5, 0.2, 11]} />
      <meshStandardMaterial color="#3d2b1f" />
    </mesh>
  )
}
```

- [ ] **Step 2: Create SceneGrid**

```tsx
// src/scene/SceneGrid.tsx
import { Grid } from '@react-three/drei'
import { useStore } from '../store/useStore'

const FLOOR_Y = [0, 1, 2] as const

export default function SceneGrid() {
  const visibleLevels = useStore((s) => s.visibleLevels)

  return (
    <>
      {FLOOR_Y.map((y) =>
        visibleLevels.has(y) ? (
          <Grid
            key={y}
            position={[2.5, y, 5.5]}
            args={[5, 11]}
            cellSize={1}
            cellThickness={0.4}
            cellColor="#444"
            sectionSize={5}
            sectionThickness={0.8}
            sectionColor="#666"
            fadeDistance={50}
            infiniteGrid={false}
          />
        ) : null
      )}
    </>
  )
}
```

- [ ] **Step 3: Create Viewport**

```tsx
// src/scene/Viewport.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useCallback } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import HullMesh from './HullMesh'
import SceneGrid from './SceneGrid'
import { useStore } from '../store/useStore'

// Grid center used for camera target
const SCENE_CENTER: [number, number, number] = [2.5, 0, 5.5]

export default function Viewport() {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  const resetCamera = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.target.set(...SCENE_CENTER)
    controls.object.position.set(2.5, 18, 5.5)
    controls.update()
  }, [])

  // Expose resetCamera to TopBar via store
  const setCameraResetFn = useStore((s) => s.setCameraResetFn)
  useEffect(() => { setCameraResetFn(resetCamera) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Canvas
      camera={{ position: [2.5, 18, 5.5], fov: 50 }}
      style={{ background: '#1a1a2e' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <HullMesh />
      <SceneGrid />
      <OrbitControls
        ref={controlsRef}
        target={SCENE_CENTER}
        makeDefault
      />
    </Canvas>
  )
}
```

- [ ] **Step 4: Add `setCameraResetFn` to the store**

In `src/store/useStore.ts`, add to the interface and implementation:

```ts
// Add to AppStore interface:
cameraResetFn: (() => void) | null
setCameraResetFn(fn: () => void): void

// Add to initial state:
cameraResetFn: null,

// Add action:
setCameraResetFn(fn) {
  set({ cameraResetFn: fn })
},
```

- [ ] **Step 5: Start the dev server and verify**

```bash
npm run dev
```

Open the URL printed (e.g., `http://localhost:5173/rust-naval-boat-builder/`). Expected: a dark blue canvas with a brown hull rectangle and grid lines visible. Orbit with left-drag, zoom with scroll.

- [ ] **Step 6: Commit**

```bash
git add src/scene/ src/store/useStore.ts
git commit -m "feat: add R3F viewport with hull mesh, scene grid, and orbit controls"
```

---

## Task 16: PlacedPieces renderer

**Files:**
- Create: `src/scene/PlacedPieces.tsx`
- Modify: `src/scene/Viewport.tsx`

- [ ] **Step 1: Create PlacedPieces**

```tsx
// src/scene/PlacedPieces.tsx
import { useStore } from '../store/useStore'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory } from '../types'

const config = piecesConfig as PiecesConfig

// One distinct color per category
const CATEGORY_COLORS: Record<PieceCategory, string> = {
  hull: '#5c4a32',
  structural: '#4a7a4a',
  floor: '#4a6a8a',
  deployable: '#8a4a4a',
}

export default function PlacedPieces() {
  const pieces = useStore((s) => s.pieces)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const removePiece = useStore((s) => s.removePiece)

  return (
    <>
      {pieces.map((piece) => {
        if (!visibleLevels.has(piece.position.y as 0 | 1 | 2)) return null
        const category = config[piece.type]?.category ?? 'structural'
        const color = CATEGORY_COLORS[category]
        const isDeleteMode = selectedPieceType === null

        return (
          <mesh
            key={piece.id}
            position={[piece.position.x + 0.5, piece.position.y + 0.5, piece.position.z + 0.5]}
            onClick={(e) => {
              if (isDeleteMode) {
                e.stopPropagation()
                removePiece(piece.id)
              }
            }}
          >
            <boxGeometry args={[0.92, 0.92, 0.92]} />
            <meshStandardMaterial
              color={color}
              opacity={isDeleteMode ? 0.8 : 1}
              transparent={isDeleteMode}
            />
          </mesh>
        )
      })}
    </>
  )
}
```

- [ ] **Step 2: Add PlacedPieces to Viewport**

In `src/scene/Viewport.tsx`, import and add `<PlacedPieces />` inside the Canvas after `<SceneGrid />`:

```tsx
import PlacedPieces from './PlacedPieces'

// Inside Canvas:
<PlacedPieces />
```

- [ ] **Step 3: Commit**

```bash
git add src/scene/PlacedPieces.tsx src/scene/Viewport.tsx
git commit -m "feat: render placed pieces in 3D scene, delete on click in select mode"
```

---

## Task 17: HitPlane and GhostPiece

**Files:**
- Create: `src/scene/GhostPiece.tsx`
- Create: `src/scene/HitPlane.tsx`
- Modify: `src/scene/Viewport.tsx`

- [ ] **Step 1: Create GhostPiece**

```tsx
// src/scene/GhostPiece.tsx
import type { XYZ } from '../types'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory } from '../types'

const config = piecesConfig as PiecesConfig

const CATEGORY_COLORS: Record<PieceCategory, string> = {
  hull: '#5c4a32',
  structural: '#4a7a4a',
  floor: '#4a6a8a',
  deployable: '#8a4a4a',
}

interface GhostPieceProps {
  position: XYZ
  type: string
  valid: boolean
}

export default function GhostPiece({ position, type, valid }: GhostPieceProps) {
  const category = config[type]?.category ?? 'structural'
  const color = valid ? CATEGORY_COLORS[category] : '#ff3333'

  return (
    <mesh position={[position.x + 0.5, position.y + 0.5, position.z + 0.5]}>
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      <meshStandardMaterial color={color} opacity={0.45} transparent />
    </mesh>
  )
}
```

- [ ] **Step 2: Create HitPlane**

```tsx
// src/scene/HitPlane.tsx
import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { canPlace } from '../utils/validation'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, XYZ } from '../types'
import GhostPiece from './GhostPiece'

const config = piecesConfig as PiecesConfig
const GRID_W = 5
const GRID_L = 11

interface HitPlaneProps {
  floorY: 0 | 1 | 2
}

export default function HitPlane({ floorY }: HitPlaneProps) {
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const pieces = useStore((s) => s.pieces)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const placePiece = useStore((s) => s.placePiece)
  const [ghostPos, setGhostPos] = useState<XYZ | null>(null)

  if (!selectedPieceType) return null

  function toGridPos(point: { x: number; z: number }): XYZ {
    const x = Math.max(0, Math.min(GRID_W - 1, Math.floor(point.x)))
    const z = Math.max(0, Math.min(GRID_L - 1, Math.floor(point.z)))
    return { x, y: floorY, z }
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setGhostPos(toGridPos(e.point))
  }

  function handlePointerLeave() {
    setGhostPos(null)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    const pos = toGridPos(e.point)
    if (canPlace(selectedPieceType, pos, pieces, coordinateIndex, config)) {
      placePiece(selectedPieceType, pos, 0)
    }
  }

  const isValid = ghostPos ? canPlace(selectedPieceType, ghostPos, pieces, coordinateIndex, config) : false

  return (
    <>
      <mesh
        position={[GRID_W / 2, floorY, GRID_L / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID_W, GRID_L]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {ghostPos && <GhostPiece position={ghostPos} type={selectedPieceType} valid={isValid} />}
    </>
  )
}
```

- [ ] **Step 3: Add HitPlane to Viewport**

In `src/scene/Viewport.tsx`:

```tsx
import HitPlane from './HitPlane'

// Inside Canvas, after <PlacedPieces />:
<HitPlane floorY={0} />
<HitPlane floorY={1} />
<HitPlane floorY={2} />
```

- [ ] **Step 4: Start dev server and test placement manually**

```bash
npm run dev
```

Verify:
1. Select a piece from the sidebar
2. Hover over the grid — ghost piece appears (green) and turns red over occupied/invalid cells
3. Left-click places the piece (colored box appears)
4. Deselect piece (click active piece again) — clicking placed pieces removes them

- [ ] **Step 5: Commit**

```bash
git add src/scene/GhostPiece.tsx src/scene/HitPlane.tsx src/scene/Viewport.tsx
git commit -m "feat: add ghost piece preview and click-to-place interaction"
```

---

## Task 18: Wire TopBar actions

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to wire TopBar actions**

```tsx
// src/App.tsx
import { useState } from 'react'
import './App.css'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import CostBar from './components/CostBar'
import Viewport from './scene/Viewport'
import { useStore } from './store/useStore'
import { encodePieces } from './utils/serialization'

export default function App() {
  const clearAll = useStore((s) => s.clearAll)
  const pieces = useStore((s) => s.pieces)
  const cameraResetFn = useStore((s) => s.cameraResetFn)
  const [shareLabel, setShareLabel] = useState('Share')

  function handleShare() {
    const encoded = encodePieces(pieces)
    window.location.hash = `#data=${encoded}`
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareLabel('Copied!')
      setTimeout(() => setShareLabel('Share'), 2000)
    })
  }

  function handleClear() {
    if (window.confirm('Remove all placed pieces?')) {
      clearAll()
      window.location.hash = ''
    }
  }

  return (
    <div className="app">
      <TopBar
        onResetCamera={() => cameraResetFn?.()}
        onShare={handleShare}
        onClear={handleClear}
        shareLabel={shareLabel}
      />
      <div className="app__body">
        <Sidebar />
        <div className="app__viewport">
          <Viewport />
        </div>
      </div>
      <CostBar />
    </div>
  )
}
```

- [ ] **Step 2: Update TopBar to accept shareLabel prop**

In `src/components/TopBar.tsx`, update props and the Share button:

```tsx
interface TopBarProps {
  onResetCamera?: () => void
  onShare?: () => void
  onClear?: () => void
  shareLabel?: string
}

export default function TopBar({ onResetCamera, onShare, onClear, shareLabel = 'Share' }: TopBarProps) {
  // ... rest unchanged, but update the Share button:
  // <button className="topbar__btn" onClick={onShare}>{shareLabel}</button>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/components/TopBar.tsx
git commit -m "feat: wire Share, Clear, and Reset Camera actions"
```

---

## Task 19: Wire persistence hook

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Call usePersistence in App**

In `src/App.tsx`, add at the top of the component body:

```tsx
import { usePersistence } from './hooks/usePersistence'

export default function App() {
  usePersistence()
  // ... rest of component unchanged
}
```

- [ ] **Step 2: Verify persistence manually**

```bash
npm run dev
```

1. Place several pieces
2. Refresh the page — pieces should reappear (localStorage restore)
3. Click Share — copy the URL
4. Open the URL in a new tab — pieces should reappear (URL hash restore)
5. Click Clear — all pieces removed, hash cleared

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: enable auto-save and restore from localStorage and URL hash"
```

---

## Task 20: Keyboard shortcut — Escape to deselect

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Escape key listener**

In `src/App.tsx`, add inside the component:

```tsx
import { useEffect } from 'react'

// Inside App():
const selectPieceType = useStore((s) => s.selectPieceType)

useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') selectPieceType(null)
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [selectPieceType])
```

- [ ] **Step 2: Verify manually**

Select a piece in the sidebar, press Escape — piece should deselect (no longer highlighted, ghost disappears).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: Escape key deselects active piece type"
```

---

## Task 21: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: `dist/` folder generated, no build errors.

- [ ] **Step 4: Smoke test the production build locally**

```bash
npm run preview
```

Open the preview URL. Verify:
- Grid and hull mesh render
- Piece picker populates from config
- Placing a hull piece (Square Hull) on floor 0 works
- Placing a hull piece on floor 1 — ghost turns red (floor constraint)
- Placing a sail, then attempting to place an 11th — ghost turns red (max count)
- Cost bar updates as pieces are placed
- Floor visibility toggles show/hide pieces and grid per floor
- Share copies URL hash; pasting in new tab restores design
- Clear removes all pieces after confirmation
- Reset Camera snaps back to top-down view
- Land Planner link opens in new tab

- [ ] **Step 5: Push to GitHub and verify deployment**

```bash
git push origin main
```

Wait ~2 minutes, then open `https://curtyo18.github.io/rust-naval-boat-builder/`. Expected: same as production build preview.

---

## Appendix: Grid Constants Reference

| Constant | Value | Meaning |
|----------|-------|---------|
| GRID_W | 5 | x: 0–4 |
| GRID_L | 11 | z: 0–10 |
| GRID_Y | 3 | y: 0–2 (floors) |
| Scene center | [2.5, 0, 5.5] | Camera target |
| Camera position | [2.5, 18, 5.5] | Default top-down |
