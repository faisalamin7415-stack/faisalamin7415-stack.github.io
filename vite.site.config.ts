import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(rootDir, 'site-dist')

/**
 * Situs publik hanya membutuhkan beberapa aset dari `public/`. Menyalin
 * seluruh folder akan ikut membawa mesin OCR (puluhan MB) yang tidak dipakai
 * halaman unduhan, jadi salin yang perlu saja.
 */
function copySiteAssets(): Plugin {
  const assets = [
    'favicon.svg',
    'qr-download.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',
  ]

  return {
    name: 'faiz-site-assets',
    apply: 'build',
    closeBundle() {
      for (const file of assets) {
        const source = resolve(rootDir, 'public', file)
        if (!existsSync(source)) continue
        const target = resolve(outDir, file)
        mkdirSync(dirname(target), { recursive: true })
        copyFileSync(source, target)
      }

      // Metadata versi untuk halaman unduhan (dibuat oleh pack:downloads).
      const latest = resolve(rootDir, 'dist/downloads/latest.json')
      if (existsSync(latest)) {
        mkdirSync(resolve(outDir, 'downloads'), { recursive: true })
        copyFileSync(latest, resolve(outDir, 'downloads/latest.json'))
      }
    },
  }
}

export default defineConfig({
  root: resolve(rootDir, 'site'),
  publicDir: false,
  plugins: [react(), tailwindcss(), copySiteAssets()],
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
  },
})
