import { mapPalette } from '../color/palette'
import { clampByte } from '../core/math'
import { bloom, halftone, pixelate } from '../effects/artistic'
import { analogArtifacts } from '../effects/analog'
import { channelShift, fragmented, grain, vignette } from '../effects/basic'
import { crossHatch, pencilSketch } from '../effects/drawing'
import { inkWatercolor, oilPaint, watercolor } from '../effects/painting'
import { preparePigment } from '../effects/pigment'
import { painterlyRender } from '../effects/painterly'
import { bilateralFilter } from '../filters/bilateral'
import { adjustColor } from '../filters/color'
import { posterize } from '../filters/posterize'
import { sobel } from '../filters/sobel'
import type { Frame } from '../core/frame'
import type { StyleDefinition } from '../types'

function multiplyOutline(base: Frame, amount = 0.3, source: Frame = base): Frame {
  const edges = sobel(source, 1, true)
  const output = { ...base, data: new Uint8ClampedArray(base.data) }
  for (let index = 0; index < output.data.length; index += 4)
    for (let channel = 0; channel < 3; channel += 1)
      output.data[index + channel] = clampByte(
        base.data[index + channel]! * (1 - amount) +
          ((base.data[index + channel]! * edges.data[index + channel]!) / 255) * amount,
      )
  return output
}

/**
 * 内置艺术风格目录。
 *
 * 可直接用于构建风格选择器；每个项目包含稳定的英文标识、中文名称、分类和中文说明。
 */
export const STYLE_CATALOG: readonly StyleDefinition[] = [
  {
    name: 'watercolor',
    label: '自然水彩',
    category: 'paint',
    description: '通透颜料、柔和晕染与细腻纸纹',
    apply: (frame, seed) => watercolor(frame, seed),
  },
  {
    name: 'watercolor-journal',
    label: '水彩手账',
    category: 'paint',
    description: '暖色纸张上的水彩与自然钢笔线稿',
    apply: (frame, seed) =>
      adjustColor(inkWatercolor(frame, seed), { temperature: 0.1, brightness: 3 }),
  },
  {
    name: 'oil-paint',
    label: '经典油画',
    category: 'paint',
    description: '由粗到细重绘的厚重笔触与画布纹理',
    apply: (frame, seed) => oilPaint(frame, seed, 3),
  },
  {
    name: 'fragmented-oil',
    label: '碎边油画',
    category: 'paint',
    description: '油画色块配合干笔破碎边缘',
    apply: (frame, seed) => fragmented(oilPaint(frame, seed, 3), 0.56, seed + 1),
  },
  {
    name: 'impressionism',
    label: '印象派',
    category: 'paint',
    description: '用宽阔笔触重新组织光线与色彩',
    apply: (frame, seed) =>
      painterlyRender(preparePigment(frame, 0.16, 0.18), {
        seed: seed + 9,
        brushSizes: [
          Math.max(10, Math.min(frame.width, frame.height) / 24),
          Math.max(5, Math.min(frame.width, frame.height) / 50),
          Math.max(2, Math.min(frame.width, frame.height) / 130),
        ],
        opacity: 0.88,
        roughness: 12,
        detailThreshold: 18,
      }),
  },
  {
    name: 'ink-wash',
    label: '水墨',
    category: 'drawing',
    description: '柔和灰阶、留白与淡墨层次',
    apply: (frame, seed) =>
      grain(
        adjustColor(bilateralFilter(frame, 2, 34), {
          grayscale: 1,
          contrast: 1.12,
          brightness: 10,
        }),
        0.045,
        seed,
      ),
  },
  {
    name: 'colored-pencil',
    label: '彩色铅笔',
    category: 'drawing',
    description: '保留原色的细腻铅笔纹理和轮廓',
    apply: (frame, seed) =>
      crossHatch(
        multiplyOutline(
          grain(
            adjustColor(bilateralFilter(frame, 1, 26), { saturation: 1.06, brightness: 8 }),
            0.065,
            seed,
          ),
          0.18,
        ),
        seed + 5,
        0.25,
      ),
  },
  {
    name: 'pencil-sketch',
    label: '铅笔素描',
    category: 'drawing',
    description: '纸白背景、石墨层次和清晰线条',
    apply: (frame, seed) => grain(pencilSketch(frame, 4), 0.035, seed),
  },
  {
    name: 'anime',
    label: '动漫',
    category: 'graphic',
    description: '干净色块与克制的深色轮廓',
    apply: (frame, seed) =>
      multiplyOutline(
        painterlyRender(preparePigment(bilateralFilter(frame, 1, 30), 0.16, 0.2), {
          seed,
          brushSizes: [
            Math.max(7, Math.min(frame.width, frame.height) / 36),
            Math.max(3, Math.min(frame.width, frame.height) / 90),
            Math.max(2, Math.min(frame.width, frame.height) / 220),
          ],
          opacity: 0.98,
          roughness: 0,
          detailThreshold: 9,
        }),
        0.24,
        frame,
      ),
  },
  {
    name: 'comic',
    label: '漫画',
    category: 'graphic',
    description: '醒目墨线、印刷网点与鲜明色彩',
    apply: (frame, seed) =>
      grain(
        halftone(
          multiplyOutline(
            posterize(
              adjustColor(bilateralFilter(frame, 1, 30), { saturation: 1.3, contrast: 1.16 }),
              7,
            ),
            0.42,
          ),
          5,
          0.16,
        ),
        0.04,
        seed,
      ),
  },
  {
    name: 'film',
    label: '电影胶片',
    category: 'photo',
    description: '温润高光、细颗粒与自然暗角',
    apply: (frame, seed) =>
      vignette(
        grain(
          adjustColor(frame, { contrast: 1.035, temperature: 0.08, saturation: 0.96 }),
          0.055,
          seed,
        ),
        0.2,
      ),
  },
  {
    name: 'retro',
    label: '复古相纸',
    category: 'photo',
    description: '褪色黑位、暖调相纸与柔和颗粒',
    apply: (frame, seed) =>
      analogArtifacts(
        vignette(
          grain(
            adjustColor(frame, {
              contrast: 0.9,
              brightness: 9,
              temperature: 0.16,
              saturation: 0.86,
            }),
            0.055,
            seed,
          ),
          0.28,
        ),
        seed + 17,
        0.22,
      ),
  },
  {
    name: 'cyberpunk',
    label: '赛博霓虹',
    category: 'digital',
    description: '青紫色调、克制辉光与色差',
    apply: (frame) =>
      channelShift(
        bloom(adjustColor(frame, { contrast: 1.16, saturation: 1.3, temperature: -0.18 }), 0.34),
        0.48,
      ),
  },
  {
    name: 'dreamy',
    label: '柔光梦境',
    category: 'digital',
    description: '粉彩色调、柔焦和高光辉光',
    apply: (frame, seed) =>
      grain(
        bloom(
          adjustColor(bilateralFilter(frame, 1, 40), {
            brightness: 10,
            contrast: 0.92,
            saturation: 0.88,
          }),
          0.42,
        ),
        0.025,
        seed,
      ),
  },
  {
    name: 'pixel-art',
    label: '像素艺术',
    category: 'digital',
    description: '复古游戏像素块与紧凑调色板',
    apply: (frame) =>
      mapPalette(
        pixelate(frame, Math.max(2, Math.round(Math.min(frame.width, frame.height) / 48))),
        [
          '#1d2b53',
          '#7e2553',
          '#008751',
          '#ab5236',
          '#5f574f',
          '#c2c3c7',
          '#fff1e8',
          '#ff004d',
          '#ffa300',
          '#29adff',
        ],
      ),
  },
  {
    name: 'poster',
    label: '平面海报',
    category: 'graphic',
    description: '高对比色块与现代平面视觉',
    apply: (frame) =>
      posterize(
        adjustColor(bilateralFilter(frame, 1, 38), { contrast: 1.18, saturation: 1.12 }),
        6,
      ),
  },
]

/** 根据稳定的英文标识查找内置风格。 */
export function getStyle(name: string): StyleDefinition | undefined {
  return STYLE_CATALOG.find((style) => style.name === name)
}
