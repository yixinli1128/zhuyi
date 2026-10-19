import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 是專案子路徑（/zhuyi/），建置後的資源必須帶上此前綴；
  // 本機開發（npm run dev）維持 /，網址才是 localhost:5183/
  base: command === 'build' ? '/zhuyi/' : '/',
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
}))
