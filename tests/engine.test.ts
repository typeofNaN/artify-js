import { describe, expect, it } from 'vitest'
import { createFrame } from '../src/core/frame'
import { mapPalette, parseHexColor } from '../src/color/palette'
import { boxBlur } from '../src/filters/blur'
import { posterize } from '../src/filters/posterize'
import { STYLE_CATALOG } from '../src/styles/catalog'
import { renderFrame } from '../src/pipeline/render'
import { registerFilter, unregisterFilter } from '../src/pipeline/registry'
import { bloom, halftone, pixelate } from '../src/effects/artistic'

const sample = () =>
  createFrame(
    3,
    3,
    new Uint8ClampedArray([
      20, 30, 40, 255, 100, 20, 40, 220, 240, 220, 30, 180, 10, 180, 80, 255, 130, 140, 150, 128,
      220, 60, 190, 255, 255, 250, 245, 255, 70, 80, 210, 200, 5, 5, 5, 0,
    ]),
  )

describe('palette and foundational filters', () => {
  it('parses short and long hexadecimal colors', () => {
    expect(parseHexColor('#abc')).toEqual([170, 187, 204])
    expect(parseHexColor('#123456')).toEqual([18, 52, 86])
    expect(() => parseHexColor('red')).toThrow('hexadecimal')
  })

  it('maps colors to the nearest palette entry while preserving alpha', () => {
    const frame = createFrame(1, 1, new Uint8ClampedArray([245, 240, 235, 77]))
    expect([...mapPalette(frame, ['#000', '#fff']).data]).toEqual([255, 255, 255, 77])
  })

  it('posterizes RGB channels without changing alpha', () => {
    const frame = createFrame(1, 1, new Uint8ClampedArray([64, 128, 240, 77]))
    expect([...posterize(frame, 3).data]).toEqual([128, 128, 255, 77])
  })

  it('blur safely handles a one-pixel image', () => {
    const frame = createFrame(1, 1, new Uint8ClampedArray([4, 5, 6, 7]))
    expect([...boxBlur(frame, 3).data]).toEqual([4, 5, 6, 7])
  })

  it('blur preserves each source pixel alpha', () => {
    const frame = createFrame(2, 1, new Uint8ClampedArray([0, 0, 0, 0, 255, 255, 255, 255]))
    expect([...boxBlur(frame, 1).data].filter((_, index) => index % 4 === 3)).toEqual([0, 255])
  })

  it('artistic effects preserve dimensions and alpha', () => {
    const input = sample()
    for (const output of [bloom(input, 0.8), halftone(input, 2, 0.7), pixelate(input, 2)]) {
      expect([output.width, output.height]).toEqual([3, 3])
      expect([...output.data].filter((_, index) => index % 4 === 3)).toEqual(
        [...input.data].filter((_, index) => index % 4 === 3),
      )
      expect(output.data).not.toEqual(input.data)
    }
  })
})

describe('style pipelines', () => {
  it('exposes all sixteen approved styles', () => {
    expect(STYLE_CATALOG.map((style) => style.name)).toEqual([
      'watercolor',
      'watercolor-journal',
      'oil-paint',
      'fragmented-oil',
      'impressionism',
      'ink-wash',
      'colored-pencil',
      'pencil-sketch',
      'anime',
      'comic',
      'film',
      'retro',
      'cyberpunk',
      'dreamy',
      'pixel-art',
      'poster',
    ])
  })

  it.each(STYLE_CATALOG.map(({ name }) => name))(
    '%s is deterministic and transforms pixels',
    (style) => {
      const first = renderFrame(sample(), { style, seed: 9 })
      const second = renderFrame(sample(), { style, seed: 9 })
      expect([...first.data]).toEqual([...second.data])
      expect(first.data).not.toEqual(sample().data)
      expect(first.width).toBe(3)
      expect(first.height).toBe(3)
    },
  )

  it('intensity zero returns the original bytes', () => {
    const input = sample()
    expect([...renderFrame(input, { style: 'comic', intensity: 0 }).data]).toEqual([...input.data])
  })

  it('runs a custom registered pipeline', () => {
    registerFilter('test-red', (frame) => {
      const result = createFrame(frame.width, frame.height, new Uint8ClampedArray(frame.data))
      result.data[0] = 255
      return result
    })
    const output = renderFrame(sample(), { pipeline: [{ name: 'test-red' }] })
    expect(output.data[0]).toBe(255)
    unregisterFilter('test-red')
  })
})
