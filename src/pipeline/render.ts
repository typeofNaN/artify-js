import { ArtifyError } from '../core/errors'
import { cloneFrame, type Frame } from '../core/frame'
import { clamp, mix } from '../core/math'
import { getStyle } from '../styles/catalog'
import type { RenderOptions } from '../types'
import { getFilter } from './registry'
import './builtins'
import { adjustColor } from '../filters/color'
import { mapPalette } from '../color/palette'
import { fragmented, grain } from '../effects/basic'
import { kuwahara } from '../filters/kuwahara'
import { posterize } from '../filters/posterize'

/**
 * 同步处理一个 RGBA 图像帧。
 * 大尺寸图片建议使用 `new Artify({ worker: true })`，避免阻塞界面。
 */
export function renderFrame(input: Frame, options: RenderOptions = {}): Frame {
  if (options.signal?.aborted) throw new ArtifyError('ABORTED', 'Rendering was aborted')
  const style = options.pipeline ? undefined : getStyle(options.style ?? 'oil-paint')
  if (!style && !options.pipeline)
    throw new ArtifyError('UNKNOWN_STYLE', `Unknown style: ${options.style}`)
  const intensity = options.intensity ?? 1
  if (!Number.isFinite(intensity))
    throw new ArtifyError('INVALID_OPTION', 'Intensity must be finite')
  options.onProgress?.(0, 'start')
  let styled = options.color ? adjustColor(input, options.color) : cloneFrame(input)
  if (options.pipeline) {
    for (let index = 0; index < options.pipeline.length; index += 1) {
      if (options.signal?.aborted) throw new ArtifyError('ABORTED', 'Rendering was aborted')
      const step = options.pipeline[index]!
      const { name, ...stepOptions } = step
      styled = getFilter(name)(styled, stepOptions, {
        seed: (options.seed ?? 0) + index,
        ...(options.signal ? { signal: options.signal } : {}),
      })
      options.onProgress?.((index + 1) / (options.pipeline.length + 1), name)
    }
  } else {
    styled = style!.apply(styled, options.seed ?? 0)
  }
  if (options.oil?.radius) styled = kuwahara(styled, finiteOption(options.oil.radius, 'oil.radius'))
  if (options.oil?.levels)
    styled = posterize(styled, finiteOption(options.oil.levels, 'oil.levels'))
  if (options.palette) styled = mapPalette(styled, options.palette)
  if (options.texture?.strength)
    styled = grain(
      styled,
      finiteOption(options.texture.strength, 'texture.strength'),
      options.seed ?? 0,
    )
  if (options.edge?.fragment)
    styled = fragmented(
      styled,
      finiteOption(options.edge.fragment, 'edge.fragment'),
      (options.seed ?? 0) + 97,
    )
  const amount = clamp(intensity)
  const output = cloneFrame(input)
  for (let i = 0; i < output.data.length; i += 1)
    output.data[i] = mix(input.data[i]!, styled.data[i]!, amount)
  options.onProgress?.(1, 'complete')
  return output
}

function finiteOption(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new ArtifyError('INVALID_OPTION', `${name} must be finite`)
  return value
}
