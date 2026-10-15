import { ArtifyError } from './errors'

/** 与 DOM 无关的 RGBA 图像帧，是所有底层滤镜的输入输出格式。 */
export interface Frame {
  width: number
  height: number
  data: Uint8ClampedArray
}

/** 校验图像帧的尺寸与像素缓冲区。 */
export function assertFrame(frame: Frame): void {
  if (
    !Number.isInteger(frame.width) ||
    !Number.isInteger(frame.height) ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    throw new ArtifyError('INVALID_DIMENSIONS', 'Frame dimensions must be positive integers')
  }
  const expected = frame.width * frame.height * 4
  if (frame.data.length !== expected) {
    throw new ArtifyError('INVALID_FRAME', `Frame requires ${expected} RGBA bytes`)
  }
}

/** 创建一个新的 RGBA 图像帧。 */
export function createFrame(width: number, height: number, data?: Uint8ClampedArray): Frame {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new ArtifyError('INVALID_DIMENSIONS', 'Frame dimensions must be positive integers')
  }
  const frame = { width, height, data: data ?? new Uint8ClampedArray(width * height * 4) }
  assertFrame(frame)
  return frame
}

/** 深拷贝图像帧，修改结果不会影响原始帧。 */
export function cloneFrame(frame: Frame): Frame {
  assertFrame(frame)
  return createFrame(frame.width, frame.height, new Uint8ClampedArray(frame.data))
}
