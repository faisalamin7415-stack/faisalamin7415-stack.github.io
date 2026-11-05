import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:4181'
const browser = await chromium.launch({ channel: 'chrome', headless: true })

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const errors = []
const failed = []
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } })
const page = await ctx.newPage()
page.setDefaultTimeout(20000)
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`EXCEPTION ${e.message}`))
page.on('requestfailed', (r) => {
  // Cek mirror memakai HEAD lintas-origin; GitHub membatalkan redirect-nya
  // dan itu bukan kegagalan halaman.
  if (r.url().startsWith(BASE)) failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`)
})

const res = await page.goto(BASE, { waitUntil: 'domcontentloaded' })
check('Situs publik HTTP 200', res?.status() === 200, String(res?.status()))
await page.waitForTimeout(1600)

const text = await page.locator('main').innerText()
const body = await page.locator('body').innerText()
const title = await page.title()

check('Judul halaman lengkap', /Multi-Platform Download System with Download Mirror/i.test(title), title)
check('H1 Multi-Platform Download System', /multi-platform/i.test(text) && /download system/i.test(text))
check('Subjudul with Download Mirror', /with download mirror/i.test(text))
check('Seksi Download Mirror', /download mirror/i.test(text))
check('FAQ data keuangan publik', /apakah data keuangan saya tampil di situs ini\?/i.test(text))
check(
  'Pernyataan tanpa data keuangan',
  /tidak ada transaksi, saldo, atau laporan\s+keuangan/i.test(text),
)
check('Tanpa nominal rupiah', !/Rp\s?[\d.,]+/i.test(body))
check('Tanpa kata Pemasukan/Pengeluaran', !/pemasukan|pengeluaran/i.test(body))
check('Tanpa Saldo bersih', !/saldo bersih/i.test(body))
check('Tanpa nav aplikasi keuangan', !/catat transaksi|mode lokal|data di perangkat ini/i.test(body))
check('Header situs unduhan', /situs unduhan/i.test(body))
check('6 kartu platform', (await page.locator('article[id^="platform-"]').count()) === 6)
check('3 mirror publik', (await page.locator('input[name="mirror"]').count()) === 3)

const apkHref = await page.getByRole('link', { name: 'Unduh APK', exact: true }).first().getAttribute('href')
check(
  'Tombol APK ke GitHub Releases',
  !!apkHref?.includes('/releases/latest/download/Faiz.Money.apk'),
  apkHref ?? '',
)
const localApk = await page.locator('a[href*="/downloads/Faiz.Money.apk"]').count()
check('Situs tidak menghosting APK lokal', localApk === 0, `${localApk} tautan lokal`)

const labels = await page.locator('input[name="mirror"]').evaluateAll((els) =>
  els.map((el) => el.closest('label')?.innerText.replace(/\s+/g, ' ').trim() ?? ''),
)
check(
  'Label mirror publik benar',
  labels.some((l) => l.includes('GitHub Releases')) &&
    labels.some((l) => l.includes('Kode sumber')) &&
    labels.some((l) => l.includes('Semua rilis')),
  labels.join(' | '),
)

const latestRes = await page.request.get(`${BASE}/downloads/latest.json`)
const latest = latestRes.ok() ? await latestRes.json() : null
check('Metadata latest.json tersedia', latestRes.ok() && !!latest?.version, latest?.version ?? '')
check('Metadata memuat APK', !!latest?.apk?.version, latest?.apk?.version ?? '')

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)
check('Desktop: tanpa overflow horizontal', !overflow)
check('Desktop: tanpa console error', errors.length === 0, errors.slice(0, 2).join(' | '))
check('Desktop: tanpa request gagal', failed.length === 0, failed.slice(0, 2).join(' | '))
await page.screenshot({ path: 'shots/site-desktop.png', fullPage: true })

// Pastikan bundle publik tidak memuat modul keuangan.
const jsUrls = await page.evaluate(() =>
  Array.from(document.querySelectorAll('script[src]')).map((s) => s.getAttribute('src')),
)
let jsText = ''
for (const src of jsUrls) {
  if (!src) continue
  const r = await page.request.get(new URL(src, BASE).href)
  if (r.ok()) jsText += await r.text()
}
check('Bundle tanpa Supabase', !/supabase/i.test(jsText))
check('Bundle tanpa Dexie', !/dexie/i.test(jsText))
check('Bundle tanpa grafik keuangan', !/recharts/i.test(jsText))
check('Bundle tanpa teks laporan keuangan', !/pemasukan bulan ini|saldo bersih/i.test(jsText))

// Mobile
const mobile = await browser.newContext({
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
})
const mp = await mobile.newPage()
mp.setDefaultTimeout(20000)
const mErrors = []
mp.on('console', (m) => {
  if (m.type() === 'error') mErrors.push(m.text())
})
mp.on('pageerror', (e) => mErrors.push(`EXCEPTION ${e.message}`))
await mp.goto(BASE, { waitUntil: 'domcontentloaded' })
await mp.waitForTimeout(1400)
const mText = await mp.locator('main').innerText()
check('Mobile: judul tampil', /multi-platform/i.test(mText) && /download mirror/i.test(mText))
check('Mobile: tanpa nominal rupiah', !/Rp\s?[\d.,]+/i.test(mText))
check('Mobile: FAQ keuangan tampil', /apakah data keuangan saya tampil/i.test(mText))
const mOverflow = await mp.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)
check('Mobile: tanpa overflow horizontal', !mOverflow)
check('Mobile: tanpa console error', mErrors.length === 0, mErrors.slice(0, 2).join(' | '))
await mp.screenshot({ path: 'shots/site-mobile.png', fullPage: true })

await browser.close()

const failedCount = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failedCount}/${results.length} cek lolos`)
if (failedCount) process.exitCode = 1
