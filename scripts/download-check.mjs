import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

async function audit(label, viewport, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(`EXCEPTION ${e.message}`))

  await page.goto(`${BASE}/#unduh`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const text = await page.locator('body').innerText()
  check(`[${label}] Halaman unduhan tampil`, text.includes('Satu aplikasi') && text.toLowerCase().includes('pusat unduhan'))
  check(`[${label}] 6 kartu platform`, (await page.locator('article[id^="platform-"]').count()) === 6)
  check(`[${label}] 3 mirror`, (await page.locator('input[name="mirror"]').count()) === 3)
  check(`[${label}] QR termuat`, await page.locator('img[alt*="QR"]').evaluate((img) => img.naturalWidth > 0))
  check(`[${label}] Ukuran paket terbaca`, /MB|KB/.test(text), text.match(/[\d.,]+ (MB|KB)/)?.[0] || '')

  if (label === 'desktop') {
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    check('Warna dasar navy #141B2D', bodyBg === 'rgb(20, 27, 45)', bodyBg)
    const primaryBg = await page.locator('a.btn-primary').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    check('Tombol utama putih', primaryBg === 'rgb(255, 255, 255)', primaryBg)

    const zip = await page.evaluate(async () => {
      const res = await fetch('/downloads/Faiz.Money-web.zip', { method: 'HEAD' })
      const latest = await fetch('/downloads/latest.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
      return { status: res.status, size: res.headers.get('content-length'), latest }
    })
    check('Paket web tersedia', zip.status === 200, `HTTP ${zip.status}`)
    check('latest.json valid', Boolean(zip.latest?.sha256), zip.latest?.sha256?.slice(0, 12))

    await page.locator('label', { hasText: 'GitHub Releases' }).click()
    await page.waitForTimeout(200)
    const href = await page.getByRole('link', { name: 'Unduh paket web' }).getAttribute('href')
    check('Mirror GitHub Releases terpilih', href?.includes('releases/latest/download/Faiz.Money-web.zip'), String(href))

    const apkHref = await page.getByRole('link', { name: 'Unduh APK', exact: true }).getAttribute('href')
    check('Tombol APK mengarah ke release', apkHref?.includes('releases/latest/download/Faiz.Money.apk'), String(apkHref))

    const apkHead = await page.evaluate(async () => {
      const res = await fetch('/downloads/Faiz.Money.apk', { method: 'HEAD' })
      return { status: res.status, size: res.headers.get('content-length'), type: res.headers.get('content-type') }
    })
    check('APK tersedia di situs', apkHead.status === 200, `HTTP ${apkHead.status} · ${apkHead.size} bytes · ${apkHead.type}`)
    check('latest.json memuat metadata APK', Boolean(zip.latest?.apk?.sha256), zip.latest?.apk?.sha256?.slice(0, 12))

    const manifest = await page.evaluate(async () => {
      const href = document.querySelector('link[rel=manifest]')?.getAttribute('href')
      return href ? fetch(href).then((r) => r.json()) : null
    })
    check('Manifest warna baru', manifest?.background_color === '#141B2D' && manifest?.theme_color === '#0E3661', JSON.stringify(manifest && { bg: manifest.background_color, theme: manifest.theme_color }))
  }

  if (label === 'mobile') {
    await page.goto(`${BASE}/#beranda`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Pusat unduhan' }).click()
    await page.waitForTimeout(500)
    const bodyAfter = await page.locator('body').innerText()
    check('Navigasi header ke unduhan', page.url().includes('#unduh') && bodyAfter.includes('Satu aplikasi'))
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  check(`[${label}] Tidak ada overflow horizontal`, !overflow)
  check(`[${label}] Tanpa console error`, errors.length === 0, errors.slice(0, 2).join(' | '))

  await ctx.close()
}

await audit('desktop', { width: 1280, height: 1000 })
await audit('mobile', { width: 390, height: 844 }, true)
await audit('small', { width: 320, height: 640 }, true)

await browser.close()
