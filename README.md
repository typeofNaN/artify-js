# @typeofnan/artify-js

[在线演示](https://typeofnan.github.io/artify-js/) · 图片完全在浏览器本地处理

一个面向现代浏览器的纯 TypeScript 图片艺术化库。图片只在本地通过 Canvas 2D 和 Web Worker 处理，不上传服务器、不调用 AI，也没有按次生成费用。

它不是一组简单的 CSS 滤镜：油画、水彩、印象派和动漫风格使用多尺度绘画渲染器，在独立画布上从大笔触到小笔触重新绘制；水彩继续叠加颜料沉积和纸纹模拟，素描使用反相模糊与颜色减淡，并提供可组合的底层处理管线。

绘画渲染器先用大笔触概括天空、树木和道路，再比较画布与输入图像，只在误差明显的位置补充中、小笔触。局部梯度决定笔触方向，最细一层读取原始像素，用于找回电线、车辆和人物等高反差结构。水彩使用非周期纸纹及颜料浓度控制，避免整张图覆盖黑边或规则条纹；动漫预设取消逐 RGB 通道硬量化，保留天空渐变和自然色相。

建议先以 `oil-paint`、`watercolor` 或 `anime`、`intensity: 1` 查看完整效果，再降低强度混回原片。不同尺寸的照片会尽量维持相近的笔触比例，但输出并非严格的缩放等价。这些是局部图像处理算法，保留原片的构图和内容，不会重画原片中不存在的云彩、光线或物体。

## 特性

- 16 种内置艺术风格
- 浏览器本地处理，保护图片隐私
- 相同随机种子可得到完全一致的结果
- 支持 Web Worker，避免高分辨率图片阻塞界面
- 支持自定义滤镜和组合式 pipeline
- 支持 RGB/HSL 调色板映射
- 完整 TypeScript 类型和中文 TSDoc 智能提示
- 无运行时依赖

## 安装

```bash
pnpm add @typeofnan/artify-js
```

## 发布与 GitHub Pages

npm 包使用公开作用域名称 `@typeofnan/artify-js`。首次发布前请确认已登录 npm，随后执行：

```bash
pnpm publish --access public
```

`prepublishOnly` 会在发布前自动执行完整构建，`publishConfig` 也已固定使用 npm 官方仓库和公开访问权限。

推送到 `main` 后，[Pages 工作流](.github/workflows/pages.yml)会运行格式、Lint、类型和测试检查，随后构建并部署演示站。仓库的 Pages Source 需要设为 **GitHub Actions**。

推送以 `v` 开头的标签时，[Release 工作流](.github/workflows/release.yml)会执行完整检查和库构建，生成 npm tarball，并使用该标签创建带自动发行说明的 GitHub Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 快速开始

```ts
import { artify } from '@typeofnan/artify-js'

const result = await artify(imageElement, {
  style: 'fragmented-oil',
  intensity: 0.85,
  seed: 42,
  maxDimension: 2048,
})

document.body.append(result.canvas)
const png = await result.toBlob('image/png')
```

`imageElement` 可以替换为以下任意来源：

- `HTMLImageElement`
- `HTMLCanvasElement`
- `ImageBitmap`
- `ImageData`
- `Blob` 或 `File`
- 图片 URL 字符串
- `Frame`

使用 URL 图片时，远端服务器必须允许跨域 Canvas 访问。

## 推荐：在 Worker 中处理

高质量绘画算法需要较多 CPU 计算。处理手机照片或大图时，建议开启 Worker：

```ts
import { Artify } from '@typeofnan/artify-js'

const engine = new Artify({ maxDimension: 1600 })

const controller = new AbortController()

const result = await engine.render(file, {
  style: 'watercolor-journal',
  signal: controller.signal,
  onProgress(progress, stage) {
    console.log(`${Math.round(progress * 100)}%`, stage)
  },
})

// 如需取消：controller.abort()
```

如需长期复用并自行管理 Worker 生命周期：

```ts
import { createWorkerRenderer } from '@typeofnan/artify-js/worker'

const renderer = createWorkerRenderer()
const outputFrame = await renderer.render(frame, { style: 'oil-paint' })
renderer.terminate()
```

## 内置风格

| 标识                 | 中文名称 | 特点                         |
| -------------------- | -------- | ---------------------------- |
| `watercolor`         | 自然水彩 | 通透颜料、柔和晕染、纸张纹理 |
| `watercolor-journal` | 水彩手账 | 水彩配合自然钢笔轮廓         |
| `oil-paint`          | 经典油画 | 多尺度方向笔触和画布纹理     |
| `fragmented-oil`     | 碎边油画 | 油画基础上的干笔破碎边缘     |
| `impressionism`      | 印象派   | 明亮松散的色彩笔触           |
| `ink-wash`           | 水墨     | 柔和灰阶、留白和淡墨层次     |
| `colored-pencil`     | 彩色铅笔 | 保留原色的铅笔纹理           |
| `pencil-sketch`      | 铅笔素描 | 纸白、石墨明暗和清晰线条     |
| `anime`              | 动漫     | 干净色块与克制轮廓           |
| `comic`              | 漫画     | 墨线、网点和鲜明色彩         |
| `film`               | 电影胶片 | 温润高光、细颗粒和自然暗角   |
| `retro`              | 复古相纸 | 褪色黑位和暖色纸感           |
| `cyberpunk`          | 赛博霓虹 | 青紫色调、辉光和色差         |
| `dreamy`             | 柔光梦境 | 粉彩、柔焦和高光辉光         |
| `pixel-art`          | 像素艺术 | 复古像素块和游戏调色板       |
| `poster`             | 平面海报 | 高对比色块和平面视觉         |

可以读取 `STYLE_CATALOG` 构建风格选择器，不需要自己维护名称和说明。

## 调整风格参数

```ts
const result = await engine.render(file, {
  style: 'fragmented-oil',
  intensity: 0.9,
  seed: 2026,
  color: {
    saturation: 1.08,
    contrast: 1.04,
    temperature: 0.08,
  },
  edge: {
    fragment: 0.55,
  },
  texture: {
    strength: 0.08,
  },
})
```

## 自定义处理管线

内置 pipeline 步骤包括：`soften`、`posterize`、`color`、`grain`、`outline`、`fragment-edge` 和 `palette`。

```ts
import { renderFrame } from '@typeofnan/artify-js'

const output = renderFrame(frame, {
  seed: 42,
  pipeline: [
    { name: 'soften', radius: 1 },
    { name: 'posterize', levels: 10 },
    { name: 'grain', amount: 0.06 },
  ],
})
```

也可以注册自己的滤镜：

```ts
import { registerFilter } from '@typeofnan/artify-js'

registerFilter('lift-red', (frame) => {
  const output = { ...frame, data: new Uint8ClampedArray(frame.data) }
  for (let index = 0; index < output.data.length; index += 4) {
    output.data[index] = Math.min(255, output.data[index] + 24)
  }
  return output
})
```

## 调色板映射

```ts
import { mapPalette } from '@typeofnan/artify-js'

const output = mapPalette(frame, ['#f4ead5', '#c76d46', '#27313f'], 'hsl')
```

## 性能建议

- 默认最长边限制为 2048 像素。
- 油画、水彩和动漫会执行保边滤波，速度比胶片、复古等调色风格慢。
- 高层 API 在支持 Worker 的浏览器中会默认启用 Worker；传入 `worker: false` 可显式关闭。
- 列表预览图建议先缩小到 400～800 像素，再渲染完整结果。
- `renderFrame()` 是同步底层 API，不适合直接在主线程处理超大图片。

## 与 AI 图片生成的区别

`@typeofnan/artify-js` 处理的是原始像素，不理解“人、车、云、建筑”等语义。它的优势是免费、快速、可重复、保护隐私，并且不会改变照片内容；但它不会像生成式 AI 一样重新绘制或创造画面元素。

## 本地开发

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

项目借鉴了 [Ovilia/sunglass](https://github.com/Ovilia/sunglass) 展示的调色板映射思路，但所有源码均为独立实现，并扩展为完整的艺术化处理引擎。

MIT © 2026 typeofnan
