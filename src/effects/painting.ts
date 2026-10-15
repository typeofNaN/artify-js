import { cloneFrame, type Frame } from '../core/frame'
import { clampByte } from '../core/math'
import { bilateralFilter } from '../filters/bilateral'
import { sobel } from '../filters/sobel'
import { paperNoise, preparePigment } from './pigment'
import { painterlyRender } from './painterly'

/**
 * 生成柔和、通透且带纸张颗粒的水彩效果。
 *
 * 处理过程包含保边平滑、颜料颗粒、轻微轮廓沉积与纸张明暗纹理，
 * 不使用会产生明显色阶断裂的强制色彩量化。
 */
export function watercolor(frame: Frame, seed = 0): Frame {
  const scale = Math.max(1, Math.min(frame.width, frame.height) / 420)
  const prepared = preparePigment(bilateralFilter(frame, 1, 32), 0.2, 0.1)
  const colored = painterlyRender(prepared, {
    seed,
    brushSizes: [scale * 12, scale * 6, scale * 2.2],
    opacity: 0.62,
    roughness: 3,
    detailThreshold: 10,
  })
  const edges = sobel(prepared, 0.52, false)
  const output = cloneFrame(colored)
  const coarse = paperNoise(frame.width, frame.height, seed, 23 * scale)
  const fine = paperNoise(frame.width, frame.height, seed + 17, 2)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4
      const pixel = y * frame.width + x
      const paper = coarse[pixel]! * 4 + fine[pixel]! * 1.5
      const edge = edges.data[index]! / 255
      for (let channel = 0; channel < 3; channel += 1) {
        const pigment = colored.data[index + channel]!
        // 纸白透过薄颜料层，边缘沉积仅作用于已有颜料，不生成黑色描边。
        const density = (255 - pigment) / 255
        output.data[index + channel] = clampByte(
          pigment + (255 - pigment) * 0.055 + paper * (0.25 + density) - edge * density * 7,
        )
      }
      output.data[index + 3] = frame.data[index + 3]!
    }
  return output
}

/**
 * 使用多尺度误差驱动笔触和细腻画布纹理生成油画效果。
 *
 * @param frame 输入图像帧。
 * @param seed 控制画布纹理的随机种子。
 * @param radius 笔触半径，建议使用 2～5。
 */
export function oilPaint(frame: Frame, seed = 0, radius = 3): Frame {
  const scale = Math.max(1, Math.min(frame.width, frame.height) / 420)
  const brushRadius = Math.min(18, Math.max(1.2, radius * scale))
  const prepared = bilateralFilter(preparePigment(frame), 1, 32)
  const brushed = painterlyRender(prepared, {
    seed: seed + 41,
    brushSizes: [brushRadius * 3.4, brushRadius * 1.75, Math.max(1.2, brushRadius * 0.58)],
    opacity: 0.92,
    roughness: 7,
    detailThreshold: 13,
  })
  const output = cloneFrame(brushed)
  const canvas = paperNoise(frame.width, frame.height, seed, 2)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4
      const texture = canvas[y * frame.width + x]! * 1.5
      for (let channel = 0; channel < 3; channel += 1)
        output.data[index + channel] = clampByte(brushed.data[index + channel]! + texture)
      output.data[index + 3] = frame.data[index + 3]!
    }
  return output
}

/** 为水彩结果叠加自然的钢笔线稿，适合旅行手账风格。 */
export function inkWatercolor(frame: Frame, seed = 0): Frame {
  const painted = watercolor(frame, seed)
  const edges = sobel(bilateralFilter(frame, 1, 30), 0.76, false)
  const output = cloneFrame(painted)
  for (let index = 0; index < output.data.length; index += 4) {
    const edge = edges.data[index]! / 255
    for (let channel = 0; channel < 3; channel += 1)
      output.data[index + channel] = clampByte(output.data[index + channel]! * (1 - edge * 0.38))
  }
  return output
}
