import { ArtifyError } from '../core/errors'
import { cloneFrame, type Frame } from '../core/frame'

/** 一个 RGB 颜色三元组，通道范围为 0～255。 */
export type RGB = readonly [number, number, number]
/** 调色板颜色距离所使用的色彩空间。 */
export type ColorSpace = 'rgb' | 'hsl'

/** 将 `#rgb` 或 `#rrggbb` 颜色解析为 RGB。 */
export function parseHexColor(value: string): RGB {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value)
  if (!match) throw new ArtifyError('INVALID_PALETTE', 'Palette colors must be hexadecimal')
  const raw = match[1]!
  const full = raw.length === 3 ? [...raw].map((part) => part + part).join('') : raw
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ]
}

function rgbToHsl([red, green, blue]: RGB): RGB {
  const r = red / 255,
    g = green / 255,
    b = blue / 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    light = (max + min) / 2
  if (max === min) return [0, 0, light]
  const delta = max - min
  const saturation = light > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  const hue =
    max === r
      ? (g - b) / delta + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4
  return [hue / 6, saturation, light]
}

function distance(a: RGB, b: RGB, colorSpace: ColorSpace): number {
  const x = colorSpace === 'hsl' ? rgbToHsl(a) : a
  const y = colorSpace === 'hsl' ? rgbToHsl(b) : b
  let d0 = x[0] - y[0]
  if (colorSpace === 'hsl') d0 = Math.min(Math.abs(d0), 1 - Math.abs(d0)) * 2
  return d0 * d0 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2
}

/** 将每个像素映射到给定调色板中距离最近的颜色。 */
export function mapPalette(
  frame: Frame,
  palette: readonly string[],
  colorSpace: ColorSpace = 'rgb',
): Frame {
  if (palette.length === 0) throw new ArtifyError('INVALID_PALETTE', 'Palette cannot be empty')
  const colors = palette.map(parseHexColor)
  const output = cloneFrame(frame)
  for (let index = 0; index < output.data.length; index += 4) {
    const current: RGB = [output.data[index]!, output.data[index + 1]!, output.data[index + 2]!]
    let nearest = colors[0]!,
      nearestDistance = Infinity
    for (const color of colors) {
      const candidate = distance(current, color, colorSpace)
      if (candidate < nearestDistance) {
        nearestDistance = candidate
        nearest = color
      }
    }
    output.data[index] = nearest[0]
    output.data[index + 1] = nearest[1]
    output.data[index + 2] = nearest[2]
  }
  return output
}
