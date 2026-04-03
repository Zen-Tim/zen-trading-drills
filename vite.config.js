import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function stampServiceWorker() {
  return {
    name: 'stamp-sw',
    writeBundle() {
      const swPath = resolve('dist', 'sw.js')
      try {
        const content = readFileSync(swPath, 'utf-8')
        writeFileSync(swPath, content.replace('__BUILD_TIME__', Date.now().toString()))
      } catch {}
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
})
