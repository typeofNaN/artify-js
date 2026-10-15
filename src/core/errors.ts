/** Artify JS 公开错误码。 */
export type ArtifyErrorCode =
  | 'INVALID_DIMENSIONS'
  | 'INVALID_FRAME'
  | 'INVALID_OPTION'
  | 'INVALID_PALETTE'
  | 'UNKNOWN_STYLE'
  | 'UNKNOWN_FILTER'
  | 'DECODE_FAILED'
  | 'EXPORT_FAILED'
  | 'ABORTED'

/** 带稳定错误码的库异常，可用于显示有针对性的错误提示。 */
export class ArtifyError extends Error {
  readonly code: ArtifyErrorCode

  constructor(code: ArtifyErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ArtifyError'
    this.code = code
  }
}
