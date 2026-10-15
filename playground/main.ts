import { artify, STYLE_CATALOG, type StyleName } from '../src'
import './style.css'

const app = document.querySelector<HTMLElement>('#app')!
app.innerHTML = `
  <header><span class="eyebrow">LOCAL IMAGE LAB</span><h1>把照片，变成一幅作品。</h1><p>16 种本地艺术风格。图片不上传，没有 AI 费用。</p></header>
  <section class="workspace">
    <div class="toolbar">
      <label class="upload"><input id="file" type="file" accept="image/*"><span>选择图片</span></label>
      <label>强度 <input id="intensity" type="range" min="0" max="1" value="1" step="0.05"><output id="amount">100%</output></label>
      <button id="download" disabled>下载 PNG</button>
    </div>
    <div class="canvas-wrap"><canvas id="source"></canvas><canvas id="result"></canvas><div id="empty"><b>拖入一张图片</b><span>或点击“选择图片”开始</span></div></div>
    <p id="status">所有处理都在你的浏览器中完成</p>
  </section>
  <section><div class="section-head"><h2>艺术风格</h2><span>${STYLE_CATALOG.length} presets</span></div><div id="styles" class="styles"></div></section>
  <footer>ARTIFY JS · CANVAS 2D · PRIVATE BY DESIGN</footer>`

const sourceCanvas = document.querySelector<HTMLCanvasElement>('#source')!,
  resultCanvas = document.querySelector<HTMLCanvasElement>('#result')!
const file = document.querySelector<HTMLInputElement>('#file')!,
  intensity = document.querySelector<HTMLInputElement>('#intensity')!,
  amount = document.querySelector<HTMLOutputElement>('#amount')!,
  status = document.querySelector<HTMLElement>('#status')!,
  download = document.querySelector<HTMLButtonElement>('#download')!,
  styles = document.querySelector<HTMLElement>('#styles')!
let current: HTMLImageElement | undefined,
  selected: StyleName = 'oil-paint',
  rendered: HTMLCanvasElement | undefined

for (const style of STYLE_CATALOG) {
  const button = document.createElement('button')
  button.className = 'style' + (style.name === selected ? ' active' : '')
  button.innerHTML = `<span>${style.category}</span><b>${style.label}</b><small>${style.description}</small>`
  button.onclick = () => {
    selected = style.name
    styles.querySelector('.active')?.classList.remove('active')
    button.classList.add('active')
    void render()
  }
  styles.append(button)
}

async function load(blob: Blob) {
  const url = URL.createObjectURL(blob),
    image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    current = image
    draw(sourceCanvas, image)
    document.querySelector('#empty')?.remove()
    void render()
  }
  image.src = url
}
function draw(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const width = image.naturalWidth,
    height = image.naturalHeight
  const scale = Math.min(1, 1200 / Math.max(width, height))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
}
async function render() {
  if (!current) return
  status.textContent = `正在渲染 ${STYLE_CATALOG.find((s) => s.name === selected)?.label}…`
  const started = performance.now()
  const output = await artify(current, {
    style: selected,
    intensity: Number(intensity.value),
    seed: 42,
    maxDimension: 1200,
  })
  resultCanvas.width = output.width
  resultCanvas.height = output.height
  const pixels = new Uint8ClampedArray(output.frame.data)
  resultCanvas
    .getContext('2d')!
    .putImageData(new ImageData(pixels, output.width, output.height), 0, 0)
  rendered = resultCanvas
  download.disabled = false
  status.textContent = `完成 · ${Math.round(performance.now() - started)} ms · ${output.width} × ${output.height}`
}
file.onchange = () => {
  const selectedFile = file.files?.[0]
  if (selectedFile) void load(selectedFile)
}
intensity.oninput = () => {
  amount.value = `${Math.round(Number(intensity.value) * 100)}%`
}
intensity.onchange = () => void render()
download.onclick = () =>
  rendered?.toBlob((blob) => {
    if (!blob) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `artify-${selected}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })
document.addEventListener('dragover', (event) => event.preventDefault())
document.addEventListener('drop', (event) => {
  event.preventDefault()
  const dropped = event.dataTransfer?.files[0]
  if (dropped?.type.startsWith('image/')) void load(dropped)
})
