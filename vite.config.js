import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 的網址在 /zhuyi/ 底下，部署流程會設定 VITE_BASE；本機開發維持 /
  base: process.env.VITE_BASE || '/',
  // 本機資料存於瀏覽器的 origin；固定連接埠可避免不同 Vite 埠號被視為不同網站、
  // 造成同一帳號看起來像遺失資料。host 開放同一 Wi-Fi 的手機測試。
  server: {
    host: '0.0.0.0',
    port: 5183,
    strictPort: true,
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
