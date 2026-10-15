import { cloneFrame, type Frame } from '../core/frame'
import { clamp, clampByte } from '../core/math'
import { createRandom } from '../core/random'

/**
 * 添加可复现的胶片漏光、灰尘和轻微化学显影不均。
 * 效果保持克制，适合作为复古相纸风格的最后一步。
 */
export function analogArtifacts(frame: Frame, seed = 0, amount = 0.3): Frame {
  const output = cloneFrame(frame)
  const random = createRandom(seed)
  const strength = clamp(amount)
  const leakX = random() < 0.5 ? -frame.width * 0.08 : frame.width * 1.08
  const leakY = frame.height * (0.2 + random() * 0.6)
  const radius = Math.max(frame.width, frame.height) * 0.72
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4
      if (frame.data[index + 3] === 0) continue
      const distance = Math.hypot(x - leakX, y - leakY) / radius
      const leak = Math.max(0, 1 - distance) ** 2 * strength
      const dust = random() < 0.0015 * strength ? (random() < 0.55 ? -34 : 24) : 0
      output.data[index] = clampByte(frame.data[index]! + leak * 34 + dust)
      output.data[index + 1] = clampByte(frame.data[index + 1]! + leak * 12 + dust)
      output.data[index + 2] = clampByte(frame.data[index + 2]! - leak * 10 + dust)
    }
  return output
}
