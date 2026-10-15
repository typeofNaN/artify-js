import { clampByte } from '../core/math'
import { cloneFrame, type Frame } from '../core/frame'

export interface ColorOptions {
  saturation?: number
  contrast?: number
  brightness?: number
  temperature?: number
  grayscale?: number
}

export function adjustColor(frame: Frame, options: ColorOptions = {}): Frame {
  const output = cloneFrame(frame),
    saturation = options.saturation ?? 1,
    contrast = options.contrast ?? 1,
    brightness = options.brightness ?? 0,
    gray = options.grayscale ?? 0,
    temp = options.temperature ?? 0
  for (let i = 0; i < output.data.length; i += 4) {
    let r = output.data[i]!,
      g = output.data[i + 1]!,
      b = output.data[i + 2]!
    const luma = r * 0.299 + g * 0.587 + b * 0.114
    r = luma + (r - luma) * saturation
    g = luma + (g - luma) * saturation
    b = luma + (b - luma) * saturation
    r = (r - 128) * contrast + 128 + brightness + temp * 36
    g = (g - 128) * contrast + 128 + brightness
    b = (b - 128) * contrast + 128 + brightness - temp * 36
    output.data[i] = clampByte(r + (luma - r) * gray)
    output.data[i + 1] = clampByte(g + (luma - g) * gray)
    output.data[i + 2] = clampByte(b + (luma - b) * gray)
  }
  return output
}
