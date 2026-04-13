# Rust Naval Boat Builder

A 3D boat builder for [Rust](https://rust.facepunch.com/). Design naval vessels by placing hulls, floors, walls, and deployables, then share your builds via URL.

**[Try it live](https://curtyo18.github.io/rust-naval-boat-builder/)**

## Features

- 3D viewport with orbit camera controls
- Square and triangle hull pieces on a hex-based grid
- Multi-floor building with wall stacking and floor snapping
- Wall variants: walls, doorways, windows, window bars, embrasures, fences
- Real-time stats: resource costs, HP, mass, speed requirements, raid cost
- Undo/redo (Ctrl+Z / Ctrl+Y)
- Share builds via URL — click Share to copy a link encoding your design
- Local storage persistence

## Tech Stack

- **React** + **TypeScript**
- **Three.js** / **React Three Fiber** for 3D rendering
- **Zustand** for state management
- **Vite** for dev server and builds
- **Vitest** for testing

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173/rust-naval-boat-builder/

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## License

[MIT](LICENSE)
