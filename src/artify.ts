import { decodeSource, type ImageSource } from './browser/source'
import { ArtifyResult } from './browser/result'
import { renderFrame } from './pipeline/render'
import type { RenderOptions } from './types'
import { ArtifyError } from './core/errors'

/** 高级渲染选项。 */
export interface ArtifyOptions extends RenderOptions {
  /** 解码后允许的最长边像素数，默认 2048。 */
  maxDimension?: number
}
/** Artify 实例的默认配置。 */
export interface ArtifyConfig {
  /** 默认最长边像素数。 */
  maxDimension?: number
  /** 是否在 Web Worker 中执行耗时的像素处理。 */
  worker?: boolean
}

/** 可复用的本地图像艺术化引擎。 */
export class Artify {
  /** 默认最长边像素数。 */
  readonly maxDimension: number
  /** 是否优先使用 Web Worker。 */
  readonly worker: boolean
  /** 创建一个可复用的艺术化引擎。 */
  constructor(config: ArtifyConfig = {}) {
    this.maxDimension = config.maxDimension ?? 2048
    this.worker = config.worker ?? typeof Worker !== 'undefined'
  }
  /** 将图片源转换为艺术化结果。 */
  async render(source: ImageSource, options: ArtifyOptions = {}): Promise<ArtifyResult> {
    const maxDimension = options.maxDimension ?? this.maxDimension
    if (!Number.isFinite(maxDimension) || maxDimension <= 0)
      throw new ArtifyError('INVALID_OPTION', 'maxDimension must be a positive finite number')
    const frame = await decodeSource(source, maxDimension)
    // 自定义流水线依赖当前线程中的滤镜注册表，不能安全地跨 Worker 复制。
    if (this.worker && !options.pipeline) {
      const { createWorkerRenderer } = await import('./worker')
      const renderer = createWorkerRenderer()
      try {
        return new ArtifyResult(await renderer.render(frame, options))
      } finally {
        renderer.terminate()
      }
    }
    return new ArtifyResult(renderFrame(frame, options))
  }
}

/** 使用默认引擎快速转换一张图片。 */
export async function artify(
  source: ImageSource,
  options: ArtifyOptions = {},
): Promise<ArtifyResult> {
  return new Artify().render(source, options)
}
