import { describe, expect, it } from 'vitest'
import { ArtifyError } from '../../src/core/errors'
import { assertFrame, cloneFrame, createFrame } from '../../src/core/frame'
import { clampByte } from '../../src/core/math'

describe('frame', () => {
  it('creates and independently clones a 1x1 RGBA frame', () => {
    const source = createFrame(1, 1, new Uint8ClampedArray([10, 20, 30, 40]))
    const copy = cloneFrame(source)
    copy.data[0] = 99
    expect([...source.data]).toEqual([10, 20, 30, 40])
    expect([...copy.data]).toEqual([99, 20, 30, 40])
  })

  it.each([
    [0, 1],
    [1, 0],
    [-1, 1],
    [1.5, 1],
  ])('rejects invalid dimensions %s x %s', (width, height) => {
    expect(() => createFrame(width, height)).toThrowError(ArtifyError)
  })

  it('rejects buffers whose byte length does not match the dimensions', () => {
    expect(() => assertFrame({ width: 2, height: 2, data: new Uint8ClampedArray(4) })).toThrow(
      '16 RGBA bytes',
    )
  })

  it.each([
    [-10, 0],
    [42.4, 42],
    [300, 255],
    [Number.NaN, 0],
  ])('clamps %s to %s', (value, expected) => {
    expect(clampByte(value)).toBe(expected)
  })
})
