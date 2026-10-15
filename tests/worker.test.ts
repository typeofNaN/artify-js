import { describe, expect, it } from 'vitest'
import { createFrame } from '../src/core/frame'
import { createWorkerRenderer } from '../src/worker'

class SilentWorker {
  addEventListener(): void {}
  removeEventListener(): void {}
  postMessage(): void {}
  terminate(): void {}
}

describe('WorkerRenderer lifecycle', () => {
  it('rejects concurrent renders and settles a pending render when terminated', async () => {
    const renderer = createWorkerRenderer(() => new SilentWorker() as unknown as Worker)
    const frame = createFrame(1, 1, new Uint8ClampedArray([20, 40, 80, 255]))
    const first = renderer.render(frame)
    const firstRejection = expect(first).rejects.toMatchObject({ code: 'ABORTED' })

    await expect(renderer.render(frame)).rejects.toMatchObject({ code: 'INVALID_OPTION' })
    renderer.terminate()
    await firstRejection
  })
})
