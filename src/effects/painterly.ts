import { createFrame, type Frame } from '../core/frame'
import { ArtifyError } from '../core/errors'
import { clamp, clampByte } from '../core/math'
import { createRandom } from '../core/random'

/** 多尺度绘画渲染参数。 */
export interface PainterlyOptions {
  /** 随机种子，相同输入与种子会得到相同结果。 */
  seed?: number
  /** 从粗到细的笔刷半径；省略时根据短边自动计算。 */
  brushSizes?: readonly number[]
  /** 笔触覆盖率，范围 0～1。 */
  opacity?: number
  /** 颜料明暗变化，推荐 0～12。 */
  roughness?: number
  /** 补画下一层笔触的颜色误差阈值。 */
  detailThreshold?: number
}

/**
 * 使用由粗到细的误差驱动笔触重新绘制图像。
 *
 * 算法先在独立画布上用大笔触建立色彩关系，再比较画布和原图，
 * 只在差异明显的位置补上中、小笔触。局部梯度控制笔触方向，
 * 因此天空和路面保持舒展，树梢、电线和人物仍能由细笔触找回。
 */
export function painterlyRender(frame: Frame, options: PainterlyOptions = {}): Frame {
  const random = createRandom(options.seed ?? 0)
  const automatic = Math.max(1.4, Math.min(frame.width, frame.height) / 90)
  const requestedBrushes = options.brushSizes ?? [automatic * 3.2, automatic * 1.65, automatic]
  if (
    requestedBrushes.length === 0 ||
    requestedBrushes.some((value) => !Number.isFinite(value) || value <= 0)
  )
    throw new ArtifyError(
      'INVALID_OPTION',
      'brushSizes must contain at least one positive finite number',
    )
  const brushSizes = [...requestedBrushes].map((value) => Math.max(1, value)).sort((a, b) => b - a)
  const opacity = clamp(options.opacity ?? 0.9)
  const roughness = Math.max(0, options.roughness ?? 5)
  const detailThreshold = Math.max(0, options.detailThreshold ?? 14)
  const output = createFrame(frame.width, frame.height)
  const average = averageColor(frame)

  for (let index = 0; index < output.data.length; index += 4) {
    output.data[index] = average[0]
    output.data[index + 1] = average[1]
    output.data[index + 2] = average[2]
    output.data[index + 3] = frame.data[index + 3]!
  }

  for (let layer = 0; layer < brushSizes.length; layer += 1) {
    const radius = brushSizes[layer]!
    // 最细一层直接读取原图，负责找回电线、眼睛和车辆边缘。
    const reference = fastBlur(
      frame,
      layer === brushSizes.length - 1 ? 0 : Math.max(1, Math.round(radius * 0.42)),
    )
    const step = Math.max(1, Math.round(radius * 0.82))
    const threshold = layer === 0 ? 0 : detailThreshold * (1 + radius / brushSizes.at(-1)!)

    for (let gridY = 0; gridY < frame.height; gridY += step)
      for (let gridX = 0; gridX < frame.width; gridX += step) {
        let bestX = gridX,
          bestY = gridY,
          bestError = -1
        const maxX = Math.min(frame.width, gridX + step)
        const maxY = Math.min(frame.height, gridY + step)
        const sampleStep = Math.max(1, Math.floor(step / 5))
        for (let y = gridY; y < maxY; y += sampleStep)
          for (let x = gridX; x < maxX; x += sampleStep) {
            const error = colorError(reference, output, x, y)
            if (error > bestError) {
              bestError = error
              bestX = x
              bestY = y
            }
          }
        if (bestError < threshold) continue
        const center = (bestY * frame.width + bestX) * 4
        if (frame.data[center + 3] === 0) continue
        const angle = tangentAngle(reference, bestX, bestY, random)
        const tone = (random() - 0.5) * roughness
        const color: [number, number, number] = [
          clampByte(reference.data[center]! + tone),
          clampByte(reference.data[center + 1]! + tone),
          clampByte(reference.data[center + 2]! + tone),
        ]
        paintStroke(output, bestX, bestY, radius, angle, color, opacity, random() * Math.PI * 2)
      }
  }

  return output
}

function averageColor(frame: Frame): [number, number, number] {
  const sum = [0, 0, 0]
  let weight = 0
  for (let index = 0; index < frame.data.length; index += 4) {
    const alpha = frame.data[index + 3]! / 255
    for (let channel = 0; channel < 3; channel += 1)
      sum[channel]! += frame.data[index + channel]! * alpha
    weight += alpha
  }
  return weight > 0 ? [sum[0]! / weight, sum[1]! / weight, sum[2]! / weight] : [0, 0, 0]
}

function colorError(reference: Frame, canvas: Frame, x: number, y: number): number {
  const index = (y * reference.width + x) * 4
  if (reference.data[index + 3] === 0) return -1
  let distance = 0
  for (let channel = 0; channel < 3; channel += 1)
    distance += (reference.data[index + channel]! - canvas.data[index + channel]!) ** 2
  return Math.sqrt(distance / 3)
}

function tangentAngle(frame: Frame, x: number, y: number, random: () => number): number {
  const center = (y * frame.width + x) * 4
  const centerLuma =
    frame.data[center]! * 0.299 + frame.data[center + 1]! * 0.587 + frame.data[center + 2]! * 0.114
  const luma = (px: number, py: number) => {
    const sx = Math.max(0, Math.min(frame.width - 1, px))
    const sy = Math.max(0, Math.min(frame.height - 1, py))
    const index = (sy * frame.width + sx) * 4
    if (frame.data[index + 3] === 0) return centerLuma
    return (
      frame.data[index]! * 0.299 + frame.data[index + 1]! * 0.587 + frame.data[index + 2]! * 0.114
    )
  }
  const gx = luma(x + 1, y) - luma(x - 1, y)
  const gy = luma(x, y + 1) - luma(x, y - 1)
  return Math.hypot(gx, gy) > 2 ? Math.atan2(gy, gx) + Math.PI / 2 : -0.22 + (random() - 0.5) * 0.3
}

function paintStroke(
  output: Frame,
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
  color: readonly [number, number, number],
  opacity: number,
  phase: number,
): void {
  const halfLength = radius * 1.75
  const halfWidth = Math.max(0.75, radius * 0.62)
  const cos = Math.cos(angle),
    sin = Math.sin(angle)
  const boundX = Math.ceil(Math.abs(cos) * halfLength + Math.abs(sin) * halfWidth)
  const boundY = Math.ceil(Math.abs(sin) * halfLength + Math.abs(cos) * halfWidth)
  for (
    let y = Math.max(0, centerY - boundY);
    y <= Math.min(output.height - 1, centerY + boundY);
    y += 1
  )
    for (
      let x = Math.max(0, centerX - boundX);
      x <= Math.min(output.width - 1, centerX + boundX);
      x += 1
    ) {
      const dx = x - centerX,
        dy = y - centerY
      const along = (dx * cos + dy * sin) / halfLength
      const across = (-dx * sin + dy * cos) / halfWidth
      const distance = along * along + across * across
      if (distance >= 1) continue
      const index = (y * output.width + x) * 4
      if (output.data[index + 3] === 0) continue
      const bristle = 0.94 + Math.sin(across * 17 + phase) * 0.06
      const amount = opacity * Math.min(1, (1 - distance) * 3.5) * bristle
      for (let channel = 0; channel < 3; channel += 1)
        output.data[index + channel] = clampByte(
          output.data[index + channel]! * (1 - amount) + color[channel]! * amount,
        )
    }
}

/** 透明度加权的线性时间方框模糊，仅用于构建每层绘画参考。 */
function fastBlur(frame: Frame, radius: number): Frame {
  if (radius <= 0) return createFrame(frame.width, frame.height, new Uint8ClampedArray(frame.data))
  // 存储预乘颜色与覆盖率；Float32 将 2048² 中间缓冲控制在约 64 MiB。
  const horizontal = new Float32Array(frame.data.length)
  const output = createFrame(frame.width, frame.height)
  for (let y = 0; y < frame.height; y += 1) {
    const prefix = Array.from({ length: 4 }, () => new Float64Array(frame.width + 1))
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4
      const alpha = frame.data[index + 3]! / 255
      for (let channel = 0; channel < 3; channel += 1)
        prefix[channel]![x + 1] = prefix[channel]![x]! + frame.data[index + channel]! * alpha
      prefix[3]![x + 1] = prefix[3]![x]! + alpha
    }
    for (let x = 0; x < frame.width; x += 1) {
      const start = Math.max(0, x - radius),
        end = Math.min(frame.width, x + radius + 1)
      const index = (y * frame.width + x) * 4
      const count = end - start
      for (let channel = 0; channel < 3; channel += 1)
        horizontal[index + channel] = (prefix[channel]![end]! - prefix[channel]![start]!) / count
      horizontal[index + 3] = (prefix[3]![end]! - prefix[3]![start]!) / count
    }
  }
  for (let x = 0; x < frame.width; x += 1) {
    const prefix = Array.from({ length: 4 }, () => new Float64Array(frame.height + 1))
    for (let y = 0; y < frame.height; y += 1) {
      const index = (y * frame.width + x) * 4
      for (let channel = 0; channel < 4; channel += 1)
        prefix[channel]![y + 1] = prefix[channel]![y]! + horizontal[index + channel]!
    }
    for (let y = 0; y < frame.height; y += 1) {
      const start = Math.max(0, y - radius),
        end = Math.min(frame.height, y + radius + 1),
        weight = prefix[3]![end]! - prefix[3]![start]!
      const index = (y * frame.width + x) * 4
      for (let channel = 0; channel < 3; channel += 1)
        output.data[index + channel] =
          weight > 0
            ? (prefix[channel]![end]! - prefix[channel]![start]!) / weight
            : frame.data[index + channel]!
      output.data[index + 3] = frame.data[index + 3]!
    }
  }
  return output
}
