# Artify JS Design

## Intent

Build `@typeofnan/artify-js`, a browser-first, local-only image stylization library inspired by the palette-mapping idea in Ovilia/sunglass, but independently implemented and extended into composable artistic rendering pipelines. The library should make travel, landscape, street, portrait, and everyday photos feel deliberately illustrated without calling an AI service, uploading images, or incurring per-image costs.

## Goals

- Publishable TypeScript library built with Vite, pnpm, ESLint, and Prettier.
- Accept common browser image sources and return a canvas-based result plus convenient export helpers.
- Include a stable preset API and a lower-level composable pipeline API.
- Ship a meaningful first set of distinct styles: watercolor, watercolor journal, oil paint, fragmented oil, impressionism, ink wash, pencil sketch, colored pencil, anime, comic, film, retro, cyberpunk, dreamy, pixel art, and poster.
- Include palette quantization as an independent primitive, with RGB/HSL perceptual-distance options.
- Keep image processing local and deterministic when a seed is supplied.
- Avoid freezing the UI for production-sized images by providing a Worker entry point and sensible resize limits.
- Include a Vite playground that lets a user upload, preview, compare, tune intensity, switch styles, and download the result.
- Provide tests for core algorithms, pipelines, public API behavior, and deterministic random effects.

## Non-goals for the first release

- Semantic image understanding or AI-style content redraw.
- Pixel-perfect imitation of a named living artist or copyrighted visual franchise.
- Native Node image decoding; the primary runtime is modern browsers. Pure `ImageData` transforms remain testable outside the browser.
- WebGL/WebGPU implementation. The architecture must allow it later, but v1 uses Canvas 2D and typed-array algorithms.
- Photoshop-grade RAW processing, color management, or print prepress.
- A hosted backend, user accounts, cloud storage, or paid AI engine.

## Anti-goals

- A collection of CSS filters presented as artistic styles.
- Presets that differ only by minor saturation or contrast changes.
- Hidden network requests or image uploads.
- Copying source code from sunglass; only the general palette-mapping concept is retained.
- An API that requires the demo application or a framework.

## Constraints and chosen stack

- Package identity: public scoped npm package `@typeofnan/artify-js`.
- License: MIT.
- Package manager: pnpm.
- Language: strict TypeScript.
- Bundler/library build and playground: Vite.
- Test runner: Vitest.
- Formatting and linting: Prettier and ESLint flat config.
- Runtime dependencies should stay minimal. Core pixel operations are implemented in-repo.
- Browser baseline: modern evergreen browsers with Canvas 2D, `ImageData`, modules, and Workers.
- No license is assumed from the reference repository. Implementation will be original and repository documentation will describe inspiration without copying code.

## Public API

The ergonomic entry point is:

```ts
const result = await artify(source, {
  style: 'fragmented-oil',
  intensity: 0.85,
  seed: 42,
  maxDimension: 2048,
})

document.body.append(result.canvas)
await result.toBlob('image/png')
```

The configurable engine supports reusable setup and detailed options:

```ts
const engine = new Artify({ maxDimension: 2048 })

const result = await engine.render(source, {
  style: 'fragmented-oil',
  color: { saturation: 1.15, contrast: 1.08, temperature: 0.12 },
  oil: { radius: 5, levels: 24, stroke: 0.7 },
  edge: { fragment: 0.8, splatter: 0.45, fade: 0.3 },
  texture: { type: 'canvas', strength: 0.4 },
})
```

Advanced callers can run registered filters as a custom pipeline:

```ts
const result = await engine.render(source, {
  pipeline: [
    { name: 'soften', amount: 0.4 },
    { name: 'kuwahara', radius: 4 },
    { name: 'posterize', levels: 18 },
    { name: 'canvas-texture', amount: 0.35 },
    { name: 'fragment-edge', amount: 0.75 },
  ],
})
```

Public metadata APIs expose preset names, descriptions, categories, default settings, and capabilities so UIs do not duplicate a style catalog.

## Architecture

```text
src/
  core/       image loading, sizing, ImageData utilities, seeded RNG, pipeline registry
  filters/    reusable pixel transforms (blur, sobel, kuwahara, posterize, palette, grain)
  effects/    artistic composites (paper, bloom, halftone, fragment mask, splatter)
  palettes/   built-in palettes and palette utilities
  styles/     preset definitions made from filter/effect steps
  worker/     transferable request/response protocol and worker client
  index.ts    public exports
playground/   Vite demo application
tests/        algorithm and API tests
```

Filters operate on a small internal frame abstraction containing width, height, and a clamped RGBA buffer. A pipeline step has a name, typed settings, and a pure or explicitly seeded transformation. Presets are data-first pipeline definitions with optional per-style preparation/finalization, rather than sixteen separate rendering engines.

Canvas and DOM dependencies stay at the boundary: decode a source into a frame, transform frames, then encode the final frame into a canvas. This separation makes algorithms testable and makes a future WebGL/WebGPU renderer replaceable.

## Rendering system

The shared processing stages are:

```text
decode and resize
  → tonal/color correction
  → structure-aware smoothing or edge extraction
  → style-specific color/pigment treatment
  → texture and mark making
  → optional palette mapping
  → border/mask treatment
  → canvas result and export
```

Key implementations:

- Oil: Kuwahara-like quadrant variance selection, saturation/contrast shaping, sharpened structure, directional/granular canvas texture.
- Fragmented oil: oil pipeline plus deterministic noisy alpha mask, dry-brush erosion, and sparse edge splatters.
- Watercolor: softened local color, reduced palette/detail, pigment noise, edge darkening, paper grain, soft bleed.
- Watercolor journal: watercolor plus ink-like Sobel contours, warm paper, and imperfect border.
- Pencil: grayscale, inverted blur/color-dodge treatment, edge reinforcement, paper grain.
- Colored pencil: retained chroma, line extraction, grain, and cross-hatch modulation.
- Anime/comic: edge-preserving smoothing approximation, posterization, high-contrast outlines; comic adds halftone.
- Film/retro: tone curves, temperature/tint, grain, vignette; retro adds fade, dust, and deterministic light leak.
- Cyberpunk/dreamy: mapped color grading with bloom; cyberpunk adds channel offset, dreamy adds pastel softening.
- Pixel/poster: block scaling or palette quantization with nearest-neighbor reconstruction and strong tonal grouping.
- Ink wash: grayscale tonal bands, diffused edges, paper response, and sparse seeded ink texture.
- Impressionism: structure-preserving simplification plus seeded short local color strokes.

Every preset has an `intensity` blend against the input so users can control how strongly it departs from the photograph.

## Performance and workers

- Decode with `createImageBitmap` when available and draw once into a correctly sized canvas.
- Default to a 2048-pixel maximum dimension, configurable by callers.
- Reuse typed buffers where practical and avoid per-pixel object allocation.
- Provide both synchronous `ImageData` transforms and an async worker-backed high-level render path.
- Transfer `ArrayBuffer`s between worker and main thread instead of cloning.
- Report coarse progress between pipeline stages and support `AbortSignal` in the main API.
- Fall back to main-thread processing when Worker/OffscreenCanvas capabilities are unavailable.
- Document that complex CPU filters on 4K originals are intentionally resized in v1; GPU acceleration is a later milestone.

## Playground experience

The demo is a functional validation surface, not a product backend. It includes drag/drop and file selection, a supplied sample image generated locally in the page, before/after comparison, preset gallery grouped by category, intensity control, output dimensions, seeded variation, processing progress, cancel, and PNG/JPEG/WebP download where supported. It remains responsive on narrow screens and clearly states that the image never leaves the device.

## Error handling

- Reject unsupported sources, zero-sized images, invalid palettes, unknown steps, and invalid dimensions with typed `ArtifyError` codes.
- Clamp user-facing numeric options to documented ranges.
- Preserve original alpha unless a style intentionally changes it.
- Abort promptly between pipeline stages; long pixel loops periodically check the cancellation hook.
- When browser export lacks a requested MIME type, surface an explicit error rather than silently mislabeling output.

## Testing and acceptance criteria

- Unit tests cover color conversion/distance, nearest palette matching, posterization, convolution boundaries, Sobel output, seeded RNG, fragment alpha behavior, pipeline registration, validation, and intensity blending.
- Each built-in style can render a small synthetic frame without throwing, preserves dimensions, returns valid RGBA data, and produces a nontrivial change.
- Same input/options/seed yields byte-identical output for seeded presets.
- Public browser API accepts `HTMLImageElement`, `HTMLCanvasElement`, `ImageBitmap`, `Blob`, URL string, and `ImageData` where the runtime supports them.
- Worker and fallback paths produce equivalent frame output.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and Prettier check pass.
- Package output includes ESM, type declarations, worker entry, source maps, and documented exports.
- README contains installation, quick start, advanced pipeline, preset catalog, browser support, performance guidance, privacy statement, and limitations versus AI redraw.
- The playground is manually exercised in a real browser for upload, at least six visually distinct presets, cancellation, before/after view, and download.

## Builder decisions

- The first release will implement sixteen strong presets rather than claim twenty weakly differentiated presets.
- A compact internal filter vocabulary will power presets; custom filters can be registered through a typed registry.
- Worker usage is available but not mandatory, preserving compatibility and easier debugging.
- WebGL/WebGPU and the optional paid AI engine remain future extensions with no v1 code or dependencies.
