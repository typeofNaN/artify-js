import { cloneFrame, type Frame } from '../core/frame'
import { clampByte } from '../core/math'
import { createRandom } from '../core/random'

export function grain(frame: Frame, amount: number, seed: number): Frame {
  const out = cloneFrame(frame),
    random = createRandom(seed)
  for (let i = 0; i < out.data.length; i += 4) {
    const n = (random() - 0.5) * amount * 100
    for (let c = 0; c < 3; c += 1) out.data[i + c] = clampByte(out.data[i + c]! + n)
  }
  return out
}
export function vignette(frame: Frame, amount: number): Frame {
  const out = cloneFrame(frame),
    cx = (frame.width - 1) / 2 || 1,
    cy = (frame.height - 1) / 2 || 1
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const d = Math.min(1, Math.hypot((x - cx) / cx, (y - cy) / cy) / 1.4),
        i = (y * frame.width + x) * 4,
        factor = 1 - d * d * amount
      for (let c = 0; c < 3; c += 1) out.data[i + c] = clampByte(out.data[i + c]! * factor)
    }
  return out
}
export function fragmented(frame: Frame, amount: number, seed: number): Frame {
  const out = cloneFrame(frame),
    random = createRandom(seed)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const edge = Math.min(
          x / (frame.width * 0.25),
          y / (frame.height * 0.25),
          (frame.width - 1 - x) / (frame.width * 0.25),
          (frame.height - 1 - y) / (frame.height * 0.25),
        ),
        mask = Math.max(0, Math.min(1, edge + (random() - 0.5) * amount))
      const i = (y * frame.width + x) * 4
      out.data[i + 3] = clampByte(out.data[i + 3]! * mask)
    }
  return out
}
export function channelShift(frame: Frame, amount: number): Frame {
  const out = cloneFrame(frame),
    shift = Math.max(1, Math.round(amount * 4))
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const i = (y * frame.width + x) * 4,
        left = (y * frame.width + Math.max(0, x - shift)) * 4,
        right = (y * frame.width + Math.min(frame.width - 1, x + shift)) * 4
      out.data[i] = frame.data[left]!
      out.data[i + 2] = frame.data[right + 2]!
    }
  return out
}
