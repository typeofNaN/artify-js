import { cloneFrame, type Frame } from '../core/frame'
import { clampByte } from '../core/math'
import { boxBlur } from '../filters/blur'
import { sobel } from '../filters/sobel'

/**
 * 将照片转换为带纸白和石墨边线的铅笔素描。
 *
 * 算法先执行灰度反相与颜色减淡，再叠加 Sobel 轮廓，
 * 相比单纯边缘检测能保留柔和的明暗层次。
 */
export function pencilSketch(frame: Frame, radius = 4): Frame {
  const gray = cloneFrame(frame)
  for (let index = 0; index < gray.data.length; index += 4) {
    const value =
      frame.data[index]! * 0.299 + frame.data[index + 1]! * 0.587 + frame.data[index + 2]! * 0.114
    gray.data[index] = gray.data[index + 1] = gray.data[index + 2] = value
  }
  const inverted = cloneFrame(gray)
  for (let index = 0; index < inverted.data.length; index += 4)
    inverted.data[index] =
      inverted.data[index + 1] =
      inverted.data[index + 2] =
        255 - gray.data[index]!
  const softened = boxBlur(inverted, radius)
  const edges = sobel(gray, 0.72, true)
  const output = cloneFrame(gray)
  for (let index = 0; index < output.data.length; index += 4) {
    const dodge = Math.min(
      255,
      (gray.data[index]! * 255) / Math.max(1, 255 - softened.data[index]!),
    )
    const value = clampByte(dodge * 0.78 + edges.data[index]! * 0.22)
    output.data[index] = output.data[index + 1] = output.data[index + 2] = value
  }
  return output
}

/**
 * 根据像素明度叠加两组交叉铅笔排线。
 * 暗部排线更密，亮部保留更多纸张质感。
 */
export function crossHatch(frame: Frame, seed = 0, amount = 0.3): Frame {
  const output = cloneFrame(frame)
  const phase = Math.abs(Math.round(seed)) % 7
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4
      const luminance =
        (frame.data[index]! * 0.299 +
          frame.data[index + 1]! * 0.587 +
          frame.data[index + 2]! * 0.114) /
        255
      const first = (x + y + phase) % 5 === 0
      const second = (x - y + phase + 70) % 7 === 0
      const ink = first || (second && luminance < 0.58) ? (1 - luminance) * amount : 0
      for (let channel = 0; channel < 3; channel += 1)
        output.data[index + channel] = clampByte(frame.data[index + channel]! * (1 - ink))
    }
  return output
}
