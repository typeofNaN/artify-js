import { cloneFrame, type Frame } from '../core/frame'
import { clampByte } from '../core/math'
import { createRandom } from '../core/random'

/**
 * 绘画用的柔和明度曲线：打开中暗部，压住高光，并保留纯黑锚点。
 * 饱和度提升随原有色彩强度衰减，避免天空和肤色溢出。
 */
export function preparePigment(frame: Frame, lift = 0.13, vibrance = 0.12): Frame {
  const output = cloneFrame(frame)
  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i]!,
      g = frame.data[i + 1]!,
      b = frame.data[i + 2]!
    const l = r * 0.299 + g * 0.587 + b * 0.114
    const t = l / 255
    const mapped = l + 255 * lift * Math.sin(Math.PI * t) * (1 - t)
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
    const saturation = 1 + vibrance * (1 - chroma) ** 2
    // 统一收缩色度，防止单通道裁剪引起色相改变。
    let gamut = saturation
    for (let c = 0; c < 3; c += 1) {
      const delta = frame.data[i + c]! - l
      if (delta > 0) gamut = Math.min(gamut, (255 - mapped) / delta)
      if (delta < 0) gamut = Math.min(gamut, -mapped / delta)
    }
    for (let c = 0; c < 3; c += 1)
      output.data[i + c] = clampByte(mapped + (frame.data[i + c]! - l) * gamut)
  }
  return output
}

/** 可复现的连续纸纹噪声；插值随机网格，避免周期条纹和逐像素白噪点。 */
export function paperNoise(width: number, height: number, seed: number, cell = 18): Float32Array {
  const random = createRandom(seed)
  const columns = Math.ceil(width / cell) + 1
  const rows = Math.ceil(height / cell) + 1
  const grid = Float32Array.from({ length: columns * rows }, () => random() - 0.5)
  const output = new Float32Array(width * height)
  const smooth = (v: number) => v * v * (3 - 2 * v)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const gx = Math.floor(x / cell),
        gy = Math.floor(y / cell)
      const u = smooth(x / cell - gx),
        v = smooth(y / cell - gy)
      const top = grid[gy * columns + gx]! * (1 - u) + grid[gy * columns + gx + 1]! * u
      const bottom =
        grid[(gy + 1) * columns + gx]! * (1 - u) + grid[(gy + 1) * columns + gx + 1]! * u
      output[y * width + x] = top * (1 - v) + bottom * v
    }
  return output
}
