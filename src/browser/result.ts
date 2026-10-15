import { ArtifyError } from '../core/errors'
import type { Frame } from '../core/frame'

/** 一次艺术化渲染的结果，提供 Canvas 和常用图片格式导出。 */
export class ArtifyResult {
  /** 处理完成后的底层 RGBA 图像帧。 */
  readonly frame: Frame
  /** 创建渲染结果。 */
  constructor(frame: Frame) {
    this.frame = frame
  }
  /** 输出宽度，单位为像素。 */
  get width(): number {
    return this.frame.width
  }
  /** 输出高度，单位为像素。 */
  get height(): number {
    return this.frame.height
  }
  /** 在浏览器中创建包含结果像素的新 Canvas。 */
  get canvas(): HTMLCanvasElement {
    if (typeof document === 'undefined')
      throw new ArtifyError('EXPORT_FAILED', 'Canvas export requires a browser')
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const context = canvas.getContext('2d')
    if (!context) throw new ArtifyError('EXPORT_FAILED', 'Canvas 2D is not available')
    const pixels = new Uint8ClampedArray(this.frame.data)
    context.putImageData(new ImageData(pixels, this.width, this.height), 0, 0)
    return canvas
  }
  /** 异步导出图片 Blob；浏览器不支持指定格式时抛出错误。 */
  async toBlob(
    type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality?: number,
  ): Promise<Blob> {
    const blob = await new Promise<Blob | null>((resolve) =>
      this.canvas.toBlob(resolve, type, quality),
    )
    if (!blob || blob.type !== type)
      throw new ArtifyError('EXPORT_FAILED', `Browser cannot export ${type}`)
    return blob
  }
  /** 导出 Data URL；浏览器不支持指定格式时抛出错误。 */
  toDataURL(
    type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality?: number,
  ): string {
    const url = this.canvas.toDataURL(type, quality)
    if (!url.startsWith(`data:${type};`))
      throw new ArtifyError('EXPORT_FAILED', `Browser cannot export ${type}`)
    return url
  }
}
