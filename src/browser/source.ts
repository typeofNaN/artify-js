import { ArtifyError } from '../core/errors'
import { assertFrame, createFrame, type Frame } from '../core/frame'

/** 浏览器高层 API 支持的图片输入类型。 */
export type ImageSource =
  Frame | ImageData | HTMLCanvasElement | HTMLImageElement | ImageBitmap | Blob | string

function isFrame(value: unknown): value is Frame {
  return (
    typeof value === 'object' &&
    value !== null &&
    'width' in value &&
    'height' in value &&
    'data' in value &&
    (value as Frame).data instanceof Uint8ClampedArray
  )
}

export async function decodeSource(source: ImageSource, maxDimension = 2048): Promise<Frame> {
  if (isFrame(source)) {
    assertFrame(source)
    return createFrame(source.width, source.height, new Uint8ClampedArray(source.data))
  }
  if (typeof ImageData !== 'undefined' && source instanceof ImageData)
    return createFrame(source.width, source.height, new Uint8ClampedArray(source.data))
  if (typeof document === 'undefined')
    throw new ArtifyError('DECODE_FAILED', 'This image source requires a browser')
  let drawable: CanvasImageSource
  let revoke: string | undefined
  try {
    if (typeof source === 'string' || source instanceof Blob) {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      const url = typeof source === 'string' ? source : (revoke = URL.createObjectURL(source))
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () =>
          reject(
            new ArtifyError(
              'DECODE_FAILED',
              `Could not decode ${typeof source === 'string' ? source : 'Blob'}`,
            ),
          )
        image.src = url
      })
      drawable = image
    } else drawable = source
    const sourceWidth = 'naturalWidth' in drawable ? drawable.naturalWidth : drawable.width
    const sourceHeight = 'naturalHeight' in drawable ? drawable.naturalHeight : drawable.height
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale)),
      height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new ArtifyError('DECODE_FAILED', 'Canvas 2D is not available')
    context.drawImage(drawable, 0, 0, width, height)
    return createFrame(
      width,
      height,
      new Uint8ClampedArray(context.getImageData(0, 0, width, height).data),
    )
  } catch (error) {
    if (error instanceof ArtifyError) throw error
    throw new ArtifyError('DECODE_FAILED', 'Could not decode image', { cause: error })
  } finally {
    if (revoke) URL.revokeObjectURL(revoke)
  }
}
