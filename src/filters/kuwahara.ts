import { createFrame, type Frame } from '../core/frame'

/**
 * 使用 Kuwahara 保边滤镜将照片归纳成绘画色块。
 *
 * 用方差权重连续融合四个邻域，避免硬切换造成棋盘接缝。
 * 积分图让大笔刷的计算量不随半径平方增长；透明像素按覆盖率加权。
 *
 * @param frame 输入图像帧。
 * @param radius 色块半径，数值越大，笔触越概括。
 */
export function kuwahara(frame: Frame, radius = 3): Frame {
  const output = createFrame(frame.width, frame.height)
  const r = Math.max(1, Math.min(24, Math.round(radius)))
  const stride = frame.width + 1
  const size = stride * (frame.height + 1)
  // 覆盖率、三个颜色和、RGB 平方和；色彩方差保护等亮度色块边界。
  const tables = Array.from({ length: 5 }, () => new Float64Array(size))
  for (let y = 1; y <= frame.height; y += 1) {
    const row = new Float64Array(5)
    for (let x = 1; x <= frame.width; x += 1) {
      const i = ((y - 1) * frame.width + x - 1) * 4
      const a = frame.data[i + 3]! / 255
      row[0]! += a
      for (let c = 0; c < 3; c += 1) {
        row[c + 1]! += frame.data[i + c]! * a
        row[4]! += frame.data[i + c]! ** 2 * a
      }
      for (let c = 0; c < 5; c += 1)
        tables[c]![y * stride + x] = tables[c]![(y - 1) * stride + x]! + row[c]!
    }
  }
  const regions = [
    [-r, 0, -r, 0],
    [0, r, -r, 0],
    [-r, 0, 0, r],
    [0, r, 0, r],
  ] as const

  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const best = [0, 0, 0]
      let totalWeight = 0
      for (const [minX, maxX, minY, maxY] of regions) {
        const x0 = Math.max(0, x + minX),
          x1 = Math.min(frame.width, x + maxX + 1)
        const y0 = Math.max(0, y + minY),
          y1 = Math.min(frame.height, y + maxY + 1)
        const sum = (c: number) =>
          tables[c]![y1 * stride + x1]! -
          tables[c]![y0 * stride + x1]! -
          tables[c]![y1 * stride + x0]! +
          tables[c]![y0 * stride + x0]!
        const count = sum(0)
        if (count <= 0) continue
        const means = [sum(1) / count, sum(2) / count, sum(3) / count]
        const variance = Math.max(
          0,
          (sum(4) / count - means.reduce((value, mean) => value + mean * mean, 0)) / 3,
        )
        const weight = 1 / (1 + (variance / 100) ** 2)
        totalWeight += weight
        for (let c = 0; c < 3; c += 1) best[c]! += means[c]! * weight
      }
      const index = (y * frame.width + x) * 4
      const means = best.map((value, c) =>
        totalWeight > 0 ? value / totalWeight : frame.data[index + c]!,
      )
      const residual = Math.sqrt(
        means.reduce((sum, value, c) => sum + (value - frame.data[index + c]!) ** 2, 0) / 3,
      )
      // 四个象限都包含细线时，没有低方差区域可选；恢复大残差处的结构。
      const detail = Math.min(0.92, Math.max(0, (residual - 10) / 28))
      for (let c = 0; c < 3; c += 1)
        output.data[index + c] = means[c]! * (1 - detail) + frame.data[index + c]! * detail
      output.data[index + 3] = frame.data[index + 3]!
    }
  return output
}
