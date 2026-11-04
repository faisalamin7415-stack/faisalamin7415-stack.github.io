import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'assets')
mkdirSync(out, { recursive: true })

const BLUE = '#0E3661'
const NAVY = '#141B2D'
const WHITE = '#FFFFFF'

/** Logo tanpa latar: lingkaran navy + huruf F putih. */
const glyph = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <circle cx="256" cy="256" r="150" fill="${NAVY}"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="${WHITE}" stroke-width="12"/>
  <circle cx="256" cy="256" r="128" fill="none" stroke="${WHITE}" stroke-width="2" stroke-dasharray="3 10" opacity="0.55"/>
  <rect x="196" y="164" width="34" height="184" rx="9" fill="${WHITE}"/>
  <rect x="230" y="164" width="90" height="34" rx="9" fill="${WHITE}"/>
  <rect x="230" y="241" width="68" height="34" rx="9" fill="${WHITE}"/>
</svg>`

async function render(size, inner, background) {
  const logo = await sharp(Buffer.from(glyph(inner)), { density: 600 })
    .resize(inner, inner)
    .png()
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()
}

// Ikon legacy (full bleed biru)
await sharp(await render(1024, 660, BLUE)).toFile(join(out, 'icon-only.png'))

// Adaptive icon: foreground transparan + background biru
await sharp(await render(1024, 600, { r: 0, g: 0, b: 0, alpha: 0 })).toFile(
  join(out, 'icon-foreground.png'),
)
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BLUE } })
  .png()
  .toFile(join(out, 'icon-background.png'))

// Splash 2732 x 2732
const splash = await render(2732, 620, NAVY)
await sharp(splash).toFile(join(out, 'splash.png'))
await sharp(splash).toFile(join(out, 'splash-dark.png'))

console.log('Aset Android dibuat di assets/')
