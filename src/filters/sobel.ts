import { cloneFrame, type Frame } from '../core/frame'
import { clampByte } from '../core/math'

export function sobel(frame: Frame, strength = 1, invert = false): Frame {
  const output = cloneFrame(frame),
    lum = new Float32Array(frame.width * frame.height)
  for (let p = 0; p < lum.length; p += 1) {
    const i = p * 4
    lum[p] = frame.data[i]! * 0.299 + frame.data[i + 1]! * 0.587 + frame.data[i + 2]! * 0.114
  }
  const at = (x: number, y: number) =>
    lum[
      Math.min(frame.height - 1, Math.max(0, y)) * frame.width +
        Math.min(frame.width - 1, Math.max(0, x))
    ]!
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const gx =
        -at(x - 1, y - 1) +
        at(x + 1, y - 1) -
        2 * at(x - 1, y) +
        2 * at(x + 1, y) -
        at(x - 1, y + 1) +
        at(x + 1, y + 1)
      const gy =
        -at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1) +
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1)
      const edge = clampByte(Math.hypot(gx, gy) * strength),
        value = invert ? 255 - edge : edge,
        i = (y * frame.width + x) * 4
      output.data[i] = output.data[i + 1] = output.data[i + 2] = value
    }
  return output
}
