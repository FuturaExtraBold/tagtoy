# Legal Grafitti

A WebGPU-powered graffiti painting app built with React.

## What It Does

A canvas-based drawing tool with graffiti-style rendering. Users can:

- Draw freehand strokes with multiple graffiti styles — Tag, Throwup, Burner, and Bubble
- Customize brush size, shadow, outline, and fill colors independently
- Apply effects to tag style: bleed, glow, and chrome gradient
- Enable drips on any layer (shadow, outline, fill)
- Toggle spray paint texture overlay
- Randomize the full color palette (fill, outline, shadow, background) in one click
- Switch between street backgrounds (bricks, concrete, stucco, toys, bodega)
- Export a composited PNG with background included

## Quick Start

```bash
# Install dependencies
npm install

# Dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React** - UI framework
- **WebGPU** - GPU-accelerated stroke rendering with MSAA
- **WGSL** - Custom shaders for gradient, texture, and alpha compositing
- **Vite** - Build tool
- **TypeScript** - Type safety throughout

## Project Structure

```text
src/
├── components/
│   ├── controls/       # BrushRow, ShadowRow, OutlineRow, FillRow, TagRow, StyleRow, etc.
│   ├── App.tsx         # Root component
│   └── Canvas.tsx      # Drawing surface and input handling
├── contexts/
│   ├── CanvasContext.tsx   # Strokes, undo, export, background
│   └── StyleContext.tsx    # All render style state
├── renderer/
│   └── webgpu/
│       ├── GpuRenderer.ts  # Style planners (tag, throwup, burner, bubble)
│       ├── tessellate.ts   # Stroke geometry (round, square, bubble, drips)
│       └── shaders.ts      # WGSL vertex + fragment shaders
├── hooks/              # useDrawingCanvas, useCursor, useKeyboardShortcuts
├── config/             # Style defaults per mode
└── types/              # drawing.ts — shared types
```
