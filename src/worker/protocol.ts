import type { RenderOptions } from '../types'

export interface WorkerRenderMessage {
  id: string
  width: number
  height: number
  data: ArrayBuffer
  options?: Omit<RenderOptions, 'signal' | 'onProgress'>
}
export interface WorkerResultMessage {
  id: string
  width?: number
  height?: number
  data?: ArrayBuffer
  error?: { code?: string; message: string }
}
