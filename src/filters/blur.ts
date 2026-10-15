import { createFrame, type Frame } from '../core/frame'

export function boxBlur(frame: Frame, radius = 1): Frame {
  const r = Math.max(0, Math.floor(radius))
  if (r === 0) return createFrame(frame.width, frame.height, new Uint8ClampedArray(frame.data))
  const output = createFrame(frame.width, frame.height)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const sums = [0, 0, 0, 0]
      let count = 0
      for (let oy = -r; oy <= r; oy += 1)
        for (let ox = -r; ox <= r; ox += 1) {
          const sx = Math.min(frame.width - 1, Math.max(0, x + ox)),
            sy = Math.min(frame.height - 1, Math.max(0, y + oy))
          const i = (sy * frame.width + sx) * 4
          const alpha = frame.data[i + 3]! / 255
          for (let c = 0; c < 3; c += 1) sums[c]! += frame.data[i + c]! * alpha
          count += alpha
        }
      const target = (y * frame.width + x) * 4
      for (let c = 0; c < 3; c += 1)
        output.data[target + c] = count > 0 ? sums[c]! / count : frame.data[target + c]!
      output.data[target + 3] = frame.data[target + 3]!
    }
  return output
}
