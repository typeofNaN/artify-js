import { defineConfig } from 'vite'

/** GitHub Pages 演示站构建配置。相对路径可兼容项目站点的仓库子目录。 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'site',
    emptyOutDir: true,
    sourcemap: true,
  },
})
