import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreOut = join(root, 'public', 'tesseract', 'core')
const workerOut = join(root, 'public', 'tesseract')
const langOut = join(root, 'public', 'tessdata')
mkdirSync(coreOut, { recursive: true })
mkdirSync(langOut, { recursive: true })

const cores = [
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-lstm.wasm.js',
]

for (const file of cores) {
  copyFileSync(join(root, 'node_modules', 'tesseract.js-core', file), join(coreOut, file))
  console.log('✓', file)
}

copyFileSync(join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(workerOut, 'worker.min.js'))
console.log('✓ worker.min.js')

// Simpan tanpa gzip: Gradle otomatis mengekstrak aset .gz saat membangun APK,
// sehingga nama file tidak lagi cocok dengan yang diminta Tesseract.
const base = 'https://tessdata.projectnaptha.com/4.0.0'
for (const lang of ['ind', 'eng']) {
  const target = join(langOut, `${lang}.traineddata`)
  if (existsSync(target) && statSync(target).size > 100_000) {
    console.log('•', `${lang}.traineddata sudah ada`)
    continue
  }
  const res = await fetch(`${base}/${lang}.traineddata.gz`)
  if (!res.ok) throw new Error(`Gagal mengunduh ${lang}: HTTP ${res.status}`)
  const gz = Buffer.from(await res.arrayBuffer())
  const buf = gunzipSync(gz)
  await writeFile(target, buf)
  console.log('✓', `${lang}.traineddata`, `${(buf.length / 1024 / 1024).toFixed(2)} MB`)
}

console.log('Aset OCR siap di public/tesseract dan public/tessdata')
