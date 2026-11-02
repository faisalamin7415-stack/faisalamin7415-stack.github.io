import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`EXCEPTION ${e.message}`))

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

check('Judul halaman', (await page.title()).includes('Faiz.Money'), await page.title())

const manifestHref = await page.locator('link[rel=manifest]').getAttribute('href')
check('Manifest terpasang', Boolean(manifestHref), String(manifestHref))

const manifest = await page.evaluate(async (href) => {
  const res = await fetch(href)
  return res.ok ? res.json() : null
}, manifestHref)
check('Manifest valid', Boolean(manifest), manifest ? `${manifest.name} / ${manifest.display}` : 'null')
check('Mode standalone', manifest?.display === 'standalone', String(manifest?.display))
check('Ikon 192 & 512', Boolean(manifest?.icons?.some((i) => i.sizes === '192x192') && manifest?.icons?.some((i) => i.sizes === '512x512')))
check('Ikon maskable', Boolean(manifest?.icons?.some((i) => i.purpose === 'maskable')))

const sw = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return { supported: false }
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 15000)),
  ])
  return { supported: true, active: Boolean(reg?.active), scope: reg?.scope }
})
check('Service worker aktif', sw.active === true, sw.scope || 'tidak aktif')

const cached = await page.evaluate(async () => {
  const keys = await caches.keys()
  const shell = keys.find((k) => k.includes('precache') || k.includes('workbox'))
  if (!shell) return 0
  const cache = await caches.open(shell)
  return (await cache.keys()).length
})
check('Offline shell ter-cache', cached > 0, `${cached} entri`)

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
check('Muat ulang tanpa error', errors.length === 0, errors.slice(0, 2).join(' | '))

if (errors.length) {
  console.log('\nConsole errors:')
  console.log([...new Set(errors)].slice(0, 8).join('\n'))
}

await browser.close()
