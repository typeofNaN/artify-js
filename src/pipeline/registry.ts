import { ArtifyError } from '../core/errors'
import type { Frame } from '../core/frame'

/** 自定义滤镜运行时上下文。 */
export interface FilterContext {
  seed: number
  signal?: AbortSignal
}
/** 传递给自定义滤镜的只读参数。 */
export type FilterOptions = Readonly<Record<string, unknown>>
/** 自定义滤镜函数签名。 */
export type FilterFunction = (frame: Frame, options: FilterOptions, context: FilterContext) => Frame

const filters = new Map<string, FilterFunction>()

/** 注册或替换一个可在自定义 pipeline 中使用的滤镜。 */
export function registerFilter(name: string, filter: FilterFunction): void {
  if (!name.trim()) throw new ArtifyError('INVALID_OPTION', 'Filter name cannot be empty')
  filters.set(name, filter)
}
/** 注销一个自定义滤镜。 */
export function unregisterFilter(name: string): boolean {
  return filters.delete(name)
}
export function getFilter(name: string): FilterFunction {
  const filter = filters.get(name)
  if (!filter) throw new ArtifyError('UNKNOWN_FILTER', `Unknown filter: ${name}`)
  return filter
}
