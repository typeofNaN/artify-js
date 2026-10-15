import { createFrame } from '../core/frame'
import { renderFrame } from '../pipeline/render'
import type { RenderOptions } from '../types'
import { ArtifyError } from '../core/errors'
import type { WorkerRenderMessage } from './protocol'

self.onmessage = (event: MessageEvent<WorkerRenderMessage>) => {
  const { id, width, height, data, options } = event.data
  try {
    const result = renderFrame(
      createFrame(width, height, new Uint8ClampedArray(data)),
      options as RenderOptions,
    )
    self.postMessage({ id, width, height, data: result.data.buffer }, [result.data.buffer])
  } catch (error) {
    self.postMessage({
      id,
      error: {
        code: error instanceof ArtifyError ? error.code : undefined,
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
