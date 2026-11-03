import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const jobs = [
  { name: 'icon-192.png', size: 192, pad: 0 },
  { name: 'icon-512.png', size: 512, pad: 0 },
  { name: 'icon-maskable-512.png', size: 512, pad: 0.16 },
]

for (const job of jobs) {
  const inner = Math.round(job.size * (1 - job.pad * 2))
  const logo = await sharp(svg, { density: 600 }).resize(inner, inner).png().toBuffer()
  await sharp({
    create: {
      width: job.size,
      height: job.size,
      channels: 4,
      background: job.pad > 0 ? '#0E3661' : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(outDir, job.name))
  console.log('✓', job.name)
}
