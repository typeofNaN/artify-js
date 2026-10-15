import { cloneFrame, type Frame } from '../core/frame'

export function posterize(frame: Frame, levels = 5): Frame {
  const output = cloneFrame(frame),
    steps = Math.max(2, Math.round(levels)) - 1
  for (let i = 0; i < output.data.length; i += 4)
    for (let c = 0; c < 3; c += 1)
      output.data[i + c] = Math.round((output.data[i + c]! / 255) * steps) * (255 / steps)
  return output
}
