import { ArtifyError, type ArtifyErrorCode } from './core/errors'
import { createFrame, type Frame } from './core/frame'
import { renderFrame } from './pipeline/render'
import type { RenderOptions } from './types'
import type { WorkerRenderMessage, WorkerResultMessage } from './worker/protocol'

/** 创建 Worker 的工厂函数，便于接入自定义构建环境。 */
export type WorkerFactory = () => Worker

/** 可复用的 Worker 渲染器；不用时应调用 `terminate()` 释放资源。 */
export class WorkerRenderer {
  readonly #factory: WorkerFactory | undefined
  #worker: Worker | undefined
  #cancelPending: ((error: ArtifyError) => void) | undefined
  #counter = 0

  constructor(factory?: WorkerFactory) {
    this.#factory = factory
  }
  /** 在 Worker 中处理图像帧；不支持 Worker 时自动回退到同步处理。 */
  async render(frame: Frame, options: RenderOptions = {}): Promise<Frame> {
    if (options.signal?.aborted) throw new ArtifyError('ABORTED', 'Rendering was aborted')
    if (this.#cancelPending)
      throw new ArtifyError('INVALID_OPTION', 'WorkerRenderer does not support concurrent renders')
    if (typeof Worker === 'undefined' && !this.#factory) return renderFrame(frame, options)
    this.#worker ??=
      this.#factory?.() ??
      new Worker(new URL('./worker/artify.worker.ts', import.meta.url), { type: 'module' })
    const worker = this.#worker,
      id = `artify-${++this.#counter}`,
      copy = new Uint8ClampedArray(frame.data)
    const { signal: _signal, onProgress: _progress, ...serializable } = options
    void _signal
    void _progress
    return new Promise<Frame>((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener('message', receive)
        worker.removeEventListener('error', fail)
        worker.removeEventListener('messageerror', fail)
        options.signal?.removeEventListener('abort', abort)
        if (this.#cancelPending === cancel) this.#cancelPending = undefined
      }
      const cancel = (error: ArtifyError) => {
        cleanup()
        reject(error)
      }
      const abort = () => this.terminate()
      const fail = (event: ErrorEvent | MessageEvent) =>
        this.#stop(
          new ArtifyError(
            'DECODE_FAILED',
            event instanceof ErrorEvent && event.message
              ? `Worker failed: ${event.message}`
              : 'Worker communication failed',
          ),
        )
      const receive = (event: MessageEvent<WorkerResultMessage>) => {
        if (event.data.id !== id) return
        cleanup()
        if (event.data.error)
          reject(
            new ArtifyError(
              (event.data.error.code as ArtifyErrorCode | undefined) ?? 'INVALID_OPTION',
              event.data.error.message,
            ),
          )
        else {
          options.onProgress?.(1, 'complete')
          resolve(
            createFrame(
              event.data.width!,
              event.data.height!,
              new Uint8ClampedArray(event.data.data!),
            ),
          )
        }
      }
      this.#cancelPending = cancel
      worker.addEventListener('message', receive)
      worker.addEventListener('error', fail)
      worker.addEventListener('messageerror', fail)
      options.signal?.addEventListener('abort', abort, { once: true })
      options.onProgress?.(0, 'start')
      const message: WorkerRenderMessage = {
        id,
        width: frame.width,
        height: frame.height,
        data: copy.buffer as ArrayBuffer,
        options: serializable,
      }
      worker.postMessage(message, [message.data])
    })
  }
  /** 终止当前 Worker 并释放资源。 */
  terminate(): void {
    this.#stop(new ArtifyError('ABORTED', 'Rendering was aborted'))
  }

  #stop(error: ArtifyError): void {
    this.#cancelPending?.(error)
    this.#worker?.terminate()
    this.#worker = undefined
  }
}

/** 创建一个可复用的 Worker 渲染器。 */
export function createWorkerRenderer(factory?: WorkerFactory): WorkerRenderer {
  return new WorkerRenderer(factory)
}
export type { WorkerRenderMessage, WorkerResultMessage } from './worker/protocol'
