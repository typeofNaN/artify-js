import { cloneFrame, type Frame } from '../core/frame'
import { clamp, clampByte } from '../core/math'
import { createRandom } from '../core/random'
import { bilateralFilter } from '../filters/bilateral'

/** 方向笔触的可调参数。 */
export interface StrokeOptions {
  /** 随机种子。 */
  seed?: number
  /** 笔触中心之间的像素间距。 */
  spacing?: number
  /** 笔触长度。 */
  length?: number
  /** 笔触宽度。 */
  width?: number
  /** 笔触不透明度，范围 0～1。 */
  opacity?: number
  /** 单个笔触的颜色明暗扰动。 */
  variation?: number
}

/**
 * 沿局部图像梯度的切线方向绘制程序化笔触。
 *
 * 平坦区域会形成较长色笔，轮廓附近的笔触会顺着边缘转向，
 * 从而减少规则马赛克感，让油画与印象派预设更接近真正的手绘表面。
 */
export function directionalStrokes(frame: Frame, options: StrokeOptions = {}): Frame {
  const output = cloneFrame(frame)
  const random = createRandom(options.seed ?? 0)
  const spacing = Math.max(1, Math.round(options.spacing ?? 4))
  const length = Math.max(2, options.length ?? spacing * 2.2)
  const brushWidth = Math.max(1, options.width ?? spacing * 0.72)
  const opacity = clamp(options.opacity ?? 0.42)
  const variation = Math.max(0, options.variation ?? 7)
  const luminance = new Float32Array(frame.width * frame.height)

  // 用去噪后的梯度引导方向，避免照片颗粒令相邻笔触随机转向。
  const guide = bilateralFilter(frame, 1, 28)
  for (let pixel = 0; pixel < luminance.length; pixel += 1) {
    const index = pixel * 4
    luminance[pixel] =
      guide.data[index]! * 0.299 + guide.data[index + 1]! * 0.587 + guide.data[index + 2]! * 0.114
  }
  const at = (x: number, y: number) =>
    luminance[
      Math.min(frame.height - 1, Math.max(0, y)) * frame.width +
        Math.min(frame.width - 1, Math.max(0, x))
    ]!

  for (let gridY = 0; gridY < frame.height; gridY += spacing)
    for (let gridX = 0; gridX < frame.width; gridX += spacing) {
      const x = Math.min(
        frame.width - 1,
        Math.max(0, Math.round(gridX + (random() - 0.5) * spacing)),
      )
      const y = Math.min(
        frame.height - 1,
        Math.max(0, Math.round(gridY + (random() - 0.5) * spacing)),
      )
      const source = (y * frame.width + x) * 4
      if (frame.data[source + 3] === 0) continue
      const gx = at(x + 2, y) - at(x - 2, y)
      const gy = at(x, y + 2) - at(x, y - 2)
      const magnitude = Math.hypot(gx, gy)
      const angle =
        magnitude > 3
          ? Math.atan2(gy, gx) + Math.PI / 2
          : -0.3 + Math.sin(x * 0.013 + y * 0.017) * 0.22
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const localLength = length * (0.72 + random() * 0.56)
      const tone = (random() - 0.5) * variation

      const halfLength = localLength / 2
      const halfWidth = brushWidth / 2
      const boundX = Math.ceil(Math.abs(cos) * halfLength + Math.abs(sin) * halfWidth)
      const boundY = Math.ceil(Math.abs(sin) * halfLength + Math.abs(cos) * halfWidth)
      // 逐像素扫描椭圆笔刷，每个像素仅覆盖一次，不再反复舍入叠加颜料。
      for (
        let py = Math.max(0, y - boundY);
        py <= Math.min(frame.height - 1, y + boundY);
        py += 1
      ) {
        for (
          let px = Math.max(0, x - boundX);
          px <= Math.min(frame.width - 1, x + boundX);
          px += 1
        ) {
          const along = ((px - x) * cos + (py - y) * sin) / halfLength
          const across = (-(px - x) * sin + (py - y) * cos) / halfWidth
          const distance = along * along + across * across
          if (distance >= 1) continue
          const target = (py * frame.width + px) * 4
          if (frame.data[target + 3] === 0) continue
          let colorDistance = 0
          for (let c = 0; c < 3; c += 1)
            colorDistance += (frame.data[target + c]! - frame.data[source + c]!) ** 2
          // 大色差处阻止笔刷越界，保护电线、树梢、眼睛等细小结构。
          const edgeGuard = Math.exp(-colorDistance / (3 * 28 * 28))
          const mixAmount = opacity * Math.min(1, (1 - distance) * 3) * edgeGuard
          for (let channel = 0; channel < 3; channel += 1) {
            const paint = clampByte(frame.data[source + channel]! + tone)
            output.data[target + channel] = clampByte(
              output.data[target + channel]! * (1 - mixAmount) + paint * mixAmount,
            )
          }
        }
      }
    }
  return output
}
