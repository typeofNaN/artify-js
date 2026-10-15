import { describe, expect, it, vi } from 'vitest'
import {
  artify,
  Artify,
  ArtifyError,
  registerFilter,
  STYLE_CATALOG,
  unregisterFilter,
} from '../src/index'
import { createFrame } from '../src/core/frame'

describe('public API', () => {
  it('renders Frame input with functional and class APIs', async () => {
    const input = createFrame(1, 1, new Uint8ClampedArray([30, 90, 160, 255]))
    const direct = await artify(input, { style: 'retro', seed: 2 })
    const instance = await new Artify().render(input, { style: 'retro', seed: 2 })
    expect([...direct.frame.data]).toEqual([...instance.frame.data])
    expect(direct.width).toBe(1)
    expect(direct.height).toBe(1)
  })

  it('supports the high-level worker mode with a non-Worker fallback', async () => {
    const input = createFrame(1, 1, new Uint8ClampedArray([30, 90, 160, 255]))
    const output = await new Artify({ worker: true }).render(input, { style: 'film', seed: 4 })
    expect(output.frame.data).not.toEqual(input.data)
  })

  it('keeps custom pipelines on the main thread where registered filters exist', async () => {
    const input = createFrame(1, 1, new Uint8ClampedArray([30, 90, 160, 255]))
    registerFilter('test-highlight', (frame) => {
      frame.data[0] = 247
      return frame
    })
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('custom pipelines must not create a Worker')
        }
      },
    )
    try {
      const output = await new Artify({ worker: true }).render(input, {
        pipeline: [{ name: 'test-highlight' }],
      })
      expect(output.frame.data[0]).toBe(247)
    } finally {
      unregisterFilter('test-highlight')
      vi.unstubAllGlobals()
    }
  })

  it('reports progress and rejects an already aborted render', async () => {
    const progress: number[] = []
    const input = createFrame(1, 1, new Uint8ClampedArray([30, 90, 160, 255]))
    await artify(input, { onProgress: (value) => progress.push(value) })
    expect(progress).toEqual([0, 1])

    const controller = new AbortController()
    controller.abort()
    await expect(artify(input, { signal: controller.signal })).rejects.toMatchObject({
      code: 'ABORTED',
    })
  })

  it('exports its catalog and typed errors', () => {
    expect(STYLE_CATALOG).toHaveLength(16)
    expect(new ArtifyError('DECODE_FAILED', 'bad').code).toBe('DECODE_FAILED')
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid maxDimension %s',
    async (maxDimension) => {
      const input = createFrame(1, 1, new Uint8ClampedArray([30, 90, 160, 255]))
      await expect(artify(input, { maxDimension })).rejects.toMatchObject({
        code: 'INVALID_OPTION',
      })
    },
  )
})
