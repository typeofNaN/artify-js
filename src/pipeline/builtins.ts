import { mapPalette } from '../color/palette'
import { fragmented, grain } from '../effects/basic'
import { boxBlur } from '../filters/blur'
import { adjustColor } from '../filters/color'
import { posterize } from '../filters/posterize'
import { sobel } from '../filters/sobel'
import { registerFilter } from './registry'
import { ArtifyError } from '../core/errors'

function numberOption(value: unknown, fallback: number, name: string): number {
  const number = value === undefined ? fallback : Number(value)
  if (!Number.isFinite(number)) throw new ArtifyError('INVALID_OPTION', `${name} must be finite`)
  return number
}

registerFilter('soften', (frame, options) =>
  boxBlur(frame, numberOption(options.radius, 1, 'radius')),
)
registerFilter('posterize', (frame, options) =>
  posterize(frame, numberOption(options.levels, 6, 'levels')),
)
registerFilter('color', (frame, options) => adjustColor(frame, options))
registerFilter('grain', (frame, options, context) =>
  grain(frame, numberOption(options.amount, 0.2, 'amount'), context.seed),
)
registerFilter('outline', (frame, options) =>
  sobel(frame, numberOption(options.strength, 1, 'strength'), Boolean(options.invert ?? true)),
)
registerFilter('fragment-edge', (frame, options, context) =>
  fragmented(frame, numberOption(options.amount, 0.7, 'amount'), context.seed),
)
registerFilter('palette', (frame, options) =>
  mapPalette(
    frame,
    (options.colors as readonly string[]) ?? ['#fff', '#999', '#555', '#222'],
    options.colorSpace === 'hsl' ? 'hsl' : 'rgb',
  ),
)
