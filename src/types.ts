import type { Frame } from './core/frame'

/** 内置艺术风格的稳定英文标识。 */
export type StyleName =
  | 'watercolor'
  | 'watercolor-journal'
  | 'oil-paint'
  | 'fragmented-oil'
  | 'impressionism'
  | 'ink-wash'
  | 'colored-pencil'
  | 'pencil-sketch'
  | 'anime'
  | 'comic'
  | 'film'
  | 'retro'
  | 'cyberpunk'
  | 'dreamy'
  | 'pixel-art'
  | 'poster'
/** 自定义处理管线中的单个步骤。除 `name` 外的字段会作为滤镜参数传入。 */
export interface PipelineStep {
  name: string
  [option: string]: unknown
}
/** 通用色彩调整参数。 */
export interface ColorControls {
  /** 饱和度倍率，`1` 表示不变。 */
  saturation?: number
  /** 对比度倍率，`1` 表示不变。 */
  contrast?: number
  /** 亮度偏移量，常用范围为 `-40`～`40`。 */
  brightness?: number
  /** 色温，正值偏暖、负值偏冷。 */
  temperature?: number
  /** 灰度混合比例，`0` 为彩色，`1` 为完全灰度。 */
  grayscale?: number
}
/** 油画后处理参数。 */
export interface OilControls {
  /** 保边色块归纳半径，建议 2～8，最大 24；不会使用普通均值模糊。 */
  radius?: number
  /** 最终色阶数量。 */
  levels?: number
}
/** 画面边缘处理参数。 */
export interface EdgeControls {
  /** 碎边强度，推荐 `0`～`1`。 */
  fragment?: number
}
/** 表面纹理参数。 */
export interface TextureControls {
  /** 纹理强度，推荐 `0`～`1`。 */
  strength?: number
}
/** 单次图像渲染的配置。 */
export interface RenderOptions {
  /** 选择一个内置风格；提供 `pipeline` 时忽略该字段。 */
  style?: StyleName
  /** 自定义滤镜处理管线。 */
  pipeline?: readonly PipelineStep[]
  /** 风格混合强度，`0` 保留原图，`1` 使用完整效果。 */
  intensity?: number
  /** 随机种子；相同输入和种子会得到相同结果。 */
  seed?: number
  /** 可选的最终输出调色板。 */
  palette?: readonly string[]
  color?: ColorControls
  oil?: OilControls
  edge?: EdgeControls
  texture?: TextureControls
  /** 用于取消处理的标准 AbortSignal。 */
  signal?: AbortSignal
  /** 接收 0～1 的进度和当前阶段名称。 */
  onProgress?: (progress: number, stage: string) => void
}
/** 内置风格的元数据与实现。 */
export interface StyleDefinition {
  name: StyleName
  label: string
  category: 'paint' | 'drawing' | 'graphic' | 'photo' | 'digital'
  description: string
  apply: (frame: Frame, seed: number) => Frame
}
