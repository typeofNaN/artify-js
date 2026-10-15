import { describe, expect, it } from 'vitest'
import { createFrame } from '../../src/core/frame'
import { bilateralFilter } from '../../src/filters/bilateral'
import { kuwahara } from '../../src/filters/kuwahara'
import { crossHatch, pencilSketch } from '../../src/effects/drawing'
import { oilPaint, watercolor } from '../../src/effects/painting'
import { directionalStrokes } from '../../src/effects/strokes'
import { analogArtifacts } from '../../src/effects/analog'
import { preparePigment } from '../../src/effects/pigment'

function edgeFixture() {
  const data = new Uint8ClampedArray(7 * 7 * 4)
  for (let y = 0; y < 7; y += 1)
    for (let x = 0; x < 7; x += 1) {
      const index = (y * 7 + x) * 4
      const value = x < 3 ? 24 + ((x + y) % 3) * 4 : 224 - ((x + y) % 3) * 4
      data[index] = data[index + 1] = data[index + 2] = value
      data[index + 3] = 80 + x * 20
    }
  return createFrame(7, 7, data)
}

describe('高质量艺术滤镜', () => {
  it('色块归纳保留天空中的单像素深色电线', () => {
    const data = new Uint8ClampedArray(25 * 25 * 4)
    for (let y = 0; y < 25; y += 1)
      for (let x = 0; x < 25; x += 1) {
        const i = (y * 25 + x) * 4
        data[i] = data[i + 1] = data[i + 2] = x === 12 ? 20 : 200
        data[i + 3] = 255
      }
    const output = kuwahara(createFrame(25, 25, data), 6)
    expect(output.data[(12 * 25 + 12) * 4]).toBeLessThan(50)
    expect(output.data[(12 * 25 + 10) * 4]).toBeGreaterThan(180)
  })

  it('大笔刷不会把相邻的红蓝色块抹成紫色', () => {
    const data = new Uint8ClampedArray(32 * 16 * 4)
    for (let y = 0; y < 16; y += 1)
      for (let x = 0; x < 32; x += 1) {
        const i = (y * 32 + x) * 4
        data[i] = x < 16 ? 230 : 15
        data[i + 2] = x < 16 ? 15 : 230
        data[i + 3] = 255
      }
    const output = directionalStrokes(createFrame(32, 16, data), {
      spacing: 3,
      length: 24,
      width: 12,
      opacity: 1,
      variation: 0,
    })
    for (let i = 0; i < data.length; i += 4) {
      expect(Math.abs(output.data[i]! - data[i]!)).toBeLessThanOrEqual(1)
      expect(Math.abs(output.data[i + 2]! - data[i + 2]!)).toBeLessThanOrEqual(1)
    }
  })

  it('柔和色块归纳不会把平滑灰阶坡度变成台阶', () => {
    const data = new Uint8ClampedArray(64 * 9 * 4)
    for (let y = 0; y < 9; y += 1)
      for (let x = 0; x < 64; x += 1) {
        const i = (y * 64 + x) * 4
        data[i] = data[i + 1] = data[i + 2] = 20 + x * 3
        data[i + 3] = 255
      }
    const output = kuwahara(createFrame(64, 9, data), 6)
    for (let x = 7; x < 57; x += 1)
      expect(Math.abs(output.data[(4 * 64 + x) * 4]! - (20 + x * 3))).toBeLessThanOrEqual(1)
  })

  it('颜料曲线打开中暗部并保留黑白锚点与透明度', () => {
    const input = createFrame(
      4,
      1,
      new Uint8ClampedArray([
        0, 0, 0, 255, 50, 50, 50, 128, 140, 140, 140, 255, 255, 255, 255, 255,
      ]),
    )
    const output = preparePigment(input)
    expect(output.data[0]).toBe(0)
    expect(output.data[4]).toBeGreaterThan(50)
    expect(output.data[8]).toBeGreaterThan(140)
    expect(output.data[12]).toBe(255)
    expect(output.data[7]).toBe(128)
  })

  it('双边滤波在平滑区域降噪，同时保留明暗边界', () => {
    const input = edgeFixture()
    const output = bilateralFilter(input, 2, 28)
    expect(output.data[(3 * 7 + 2) * 4]).toBeLessThan(80)
    expect(output.data[(3 * 7 + 3) * 4]).toBeGreaterThan(180)
  })

  it('Kuwahara 滤镜保留透明度并形成平滑色块', () => {
    const input = edgeFixture()
    const output = kuwahara(input, 2)
    expect([...output.data].filter((_, index) => index % 4 === 3)).toEqual(
      [...input.data].filter((_, index) => index % 4 === 3),
    )
    expect(output.data).not.toEqual(input.data)
  })

  it('铅笔素描生成纸白背景和深色边线', () => {
    const input = edgeFixture()
    const output = pencilSketch(input, 2)
    const gray = [...output.data].filter((_, index) => index % 4 !== 3)
    expect(Math.max(...gray)).toBeGreaterThan(230)
    expect(Math.min(...gray)).toBeLessThan(180)
  })

  it('水彩与油画处理具有确定性并保留原始透明度', () => {
    const input = edgeFixture()
    for (const render of [watercolor, oilPaint]) {
      const first = render(input, 7)
      const second = render(input, 7)
      expect(first.data).toEqual(second.data)
      expect([...first.data].filter((_, index) => index % 4 === 3)).toEqual(
        [...input.data].filter((_, index) => index % 4 === 3),
      )
      expect(first.data).not.toEqual(input.data)
    }
  })

  it('透明像素中隐藏的 RGB 不会污染相邻可见像素', () => {
    const make = (hidden: number) =>
      createFrame(
        3,
        1,
        new Uint8ClampedArray([
          hidden,
          hidden,
          hidden,
          0,
          100,
          100,
          100,
          255,
          hidden,
          hidden,
          hidden,
          0,
        ]),
      )
    const darkHidden = bilateralFilter(make(0), 1, 255)
    const lightHidden = bilateralFilter(make(255), 1, 255)
    expect([...darkHidden.data.slice(4, 7)]).toEqual([...lightHidden.data.slice(4, 7)])
    expect([...kuwahara(make(0), 1).data.slice(4, 7)]).toEqual([
      ...kuwahara(make(255), 1).data.slice(4, 7),
    ])
  })

  it('方向笔触依据局部结构重绘色块，并保持随机种子可复现', () => {
    const input = edgeFixture()
    const first = directionalStrokes(input, { seed: 18, spacing: 2, length: 4, opacity: 0.65 })
    const second = directionalStrokes(input, { seed: 18, spacing: 2, length: 4, opacity: 0.65 })
    expect(first.data).toEqual(second.data)
    expect(first.data).not.toEqual(input.data)
    expect([...first.data].filter((_, index) => index % 4 === 3)).toEqual(
      [...input.data].filter((_, index) => index % 4 === 3),
    )
  })

  it('排线和模拟胶片瑕疵可复现且不破坏透明度', () => {
    const input = edgeFixture()
    for (const render of [
      () => crossHatch(input, 11, 0.35),
      () => analogArtifacts(input, 11, 0.35),
    ]) {
      const first = render()
      const second = render()
      expect(first.data).toEqual(second.data)
      expect(first.data).not.toEqual(input.data)
      expect([...first.data].filter((_, index) => index % 4 === 3)).toEqual(
        [...input.data].filter((_, index) => index % 4 === 3),
      )
    }
  })
})
