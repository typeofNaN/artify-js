import { cloneFrame, type Frame } from '../core/frame'
import { clamp, clampByte } from '../core/math'
import { boxBlur } from '../filters/blur'

export function bloom(frame: Frame, amount = 0.5): Frame {
  const blurred = boxBlur(frame, 2),
    output = cloneFrame(frame),
    strength = clamp(amount)
  for (let index = 0; index < output.data.length; index += 4) {
    const light = Math.max(frame.data[index]!, frame.data[index + 1]!, frame.data[index + 2]!) / 255
    for (let channel = 0; channel < 3; channel += 1)
      output.data[index + channel] = clampByte(
        frame.data[index + channel]! + blurred.data[index + channel]! * light * strength * 0.45,
      )
  }
  return output
}

export function halftone(frame: Frame, size = 4, amount = 0.65): Frame {
  const output = cloneFrame(frame),
    cell = Math.max(2, Math.round(size)),
    strength = clamp(amount)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4
      const luminance =
        (frame.data[index]! * 0.299 +
          frame.data[index + 1]! * 0.587 +
          frame.data[index + 2]! * 0.114) /
        255
      const dx = (x % cell) - (cell - 1) / 2,
        dy = (y % cell) - (cell - 1) / 2
      const dot = Math.hypot(dx, dy) < (1 - luminance) * cell * 0.6 ? 0 : 255
      for (let channel = 0; channel < 3; channel += 1)
        output.data[index + channel] = clampByte(
          frame.data[index + channel]! * (1 - strength) + dot * strength,
        )
    }
  return output
}

export function pixelate(frame: Frame, size = 8): Frame {
  const output = cloneFrame(frame),
    cell = Math.max(1, Math.round(size))
  for (let y = 0; y < frame.height; y += cell)
    for (let x = 0; x < frame.width; x += cell) {
      const sample = (y * frame.width + x) * 4
      for (let py = y; py < Math.min(frame.height, y + cell); py += 1)
        for (let px = x; px < Math.min(frame.width, x + cell); px += 1) {
          const index = (py * frame.width + px) * 4
          for (let channel = 0; channel < 3; channel += 1)
            output.data[index + channel] = frame.data[sample + channel]!
        }
    }
  return output
}
