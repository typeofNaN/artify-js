import { describe, expect, it } from 'vitest'
import { createFrame } from '../src/core/frame'
import { painterlyRender } from '../src/effects/painterly'

describe('多尺度绘画渲染器', () => {
  it('由粗到细重绘画面，同时保留透明度和高反差细线', () => {
    const width = 48,
      height = 32,
      data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        const ground = y >= 22
        const pole = x === 24 && y > 3 && y < 25
        data[index] = pole ? 18 : ground ? 24 : 115 + y * 3
        data[index + 1] = pole ? 18 : ground ? 34 : 145 + y * 2
        data[index + 2] = pole ? 20 : ground ? 28 : 205 - y
        data[index + 3] = 80 + ((x + y) % 5) * 35
      }
    const input = createFrame(width, height, data)
    const first = painterlyRender(input, { seed: 19 })
    const second = painterlyRender(input, { seed: 19 })

    expect(first.data).toEqual(second.data)
    expect(first.data).not.toEqual(input.data)
    expect([...first.data].filter((_, index) => index % 4 === 3)).toEqual(
      [...input.data].filter((_, index) => index % 4 === 3),
    )
    expect(first.data[(12 * width + 24) * 4]).toBeLessThan(80)
    expect(first.data[(12 * width + 21) * 4]).toBeGreaterThan(120)
  })

  it('平坦色面形成克制的颜料纹理，而不是逐像素噪声', () => {
    const width = 40,
      height = 24
    const input = createFrame(
      width,
      height,
      Uint8ClampedArray.from({ length: width * height * 4 }, (_, index) =>
        index % 4 === 3 ? 255 : 150,
      ),
    )
    const output = painterlyRender(input, { seed: 3 })
    const reds = [...output.data].filter((_, index) => index % 4 === 0)
    const range = Math.max(...reds) - Math.min(...reds)
    expect(range).toBeGreaterThanOrEqual(2)
    expect(range).toBeLessThanOrEqual(18)
  })

  it('透明像素里隐藏的颜色不会污染相邻的绘画笔触', () => {
    const make = (hidden: number) => {
      const data = new Uint8ClampedArray(9 * 9 * 4)
      for (let index = 0; index < data.length; index += 4) {
        data[index] = data[index + 1] = data[index + 2] = hidden
        data[index + 3] = 0
      }
      for (let y = 3; y <= 5; y += 1)
        for (let x = 2; x <= 6; x += 1) {
          const index = (y * 9 + x) * 4
          data[index] = 180
          data[index + 1] = 120
          data[index + 2] = 70
          data[index + 3] = 255
        }
      return createFrame(9, 9, data)
    }
    const dark = painterlyRender(make(0), { seed: 8, brushSizes: [4, 2, 1] })
    const bright = painterlyRender(make(255), { seed: 8, brushSizes: [4, 2, 1] })
    for (let index = 0; index < dark.data.length; index += 4)
      if (dark.data[index + 3] !== 0)
        expect([...dark.data.slice(index, index + 3)]).toEqual([
          ...bright.data.slice(index, index + 3),
        ])
  })

  it('拒绝空笔刷列表和非有限笔刷尺寸', () => {
    const input = createFrame(1, 1, new Uint8ClampedArray([20, 30, 40, 255]))
    expect(() => painterlyRender(input, { brushSizes: [] })).toThrow()
    expect(() => painterlyRender(input, { brushSizes: [Number.NaN] })).toThrow()
  })
})
