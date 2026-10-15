import { createFrame, type Frame } from '../core/frame'

/**
 * 对图像执行保边双边滤波。
 *
 * 与普通模糊不同，它同时考虑像素距离和颜色差异，因此可以平滑噪声，
 * 但不会让物体轮廓和明暗边界互相渗透。
 *
 * @param frame 输入图像帧。
 * @param radius 采样半径，建议使用 1～4。
 * @param colorSigma 允许参与平滑的颜色差异，越小越保边。
 */
export function bilateralFilter(frame: Frame, radius = 2, colorSigma = 36): Frame {
  const output = createFrame(frame.width, frame.height)
  const r = Math.max(1, Math.min(6, Math.round(radius)))
  const spatialSigma = Math.max(1, r * 0.75)
  const spatialFactor = -1 / (2 * spatialSigma * spatialSigma)
  const colorFactor = -1 / (2 * colorSigma * colorSigma)

  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const center = (y * frame.width + x) * 4
      const sums = [0, 0, 0]
      let weights = 0
      for (let oy = -r; oy <= r; oy += 1)
        for (let ox = -r; ox <= r; ox += 1) {
          const sx = Math.min(frame.width - 1, Math.max(0, x + ox))
          const sy = Math.min(frame.height - 1, Math.max(0, y + oy))
          const sample = (sy * frame.width + sx) * 4
          const dr = frame.data[sample]! - frame.data[center]!
          const dg = frame.data[sample + 1]! - frame.data[center + 1]!
          const db = frame.data[sample + 2]! - frame.data[center + 2]!
          const alpha = frame.data[sample + 3]! / 255
          const weight =
            Math.exp(
              (ox * ox + oy * oy) * spatialFactor + (dr * dr + dg * dg + db * db) * colorFactor,
            ) * alpha
          for (let channel = 0; channel < 3; channel += 1)
            sums[channel]! += frame.data[sample + channel]! * weight
          weights += weight
        }
      for (let channel = 0; channel < 3; channel += 1)
        output.data[center + channel] =
          weights > 0 ? sums[channel]! / weights : frame.data[center + channel]!
      output.data[center + 3] = frame.data[center + 3]!
    }
  return output
}
