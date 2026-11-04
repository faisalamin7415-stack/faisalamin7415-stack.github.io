import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const MARKER = 'PROBE-GAJI-9X'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } })
const page = await ctx.newPage()
page.setDefaultTimeout(15000)

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`EXCEPTION ${e.message}`))

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

const now = new Date()
const iso = (m, d) => new Date(now.getFullYear(), now.getMonth() - m, d, 10).toISOString()
const rows = [
  {
    type: 'income',
    amount: 5_000_000,
    category: 'gaji',
    note: MARKER,
    merchant: MARKER,
    occurredAt: iso(0, 1),
  },
  {
    type: 'expense',
    amount: 1_200_000,
    category: 'tagihan',
    note: 'Sewa probe',
    merchant: '',
    occurredAt: iso(0, 2),
  },
].map((s, i) => ({
  id: `unduh-probe-${i}`,
  userId: null,
  source: 'manual',
  meta: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deleted: 0,
  dirty: 1,
  ...s,
}))

// Buka Beranda dulu agar Dexie membuat object store, lalu isi data uji.
await page.goto(`${BASE}/#beranda`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.evaluate(
  (seed) =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open('faiz-money')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('transactions', 'readwrite')
        const store = tx.objectStore('transactions')
        for (const row of seed) store.put(row)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    }),
  rows,
)

await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)

await page.goto(`${BASE}/#unduh`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)

const text = await page.locator('main').innerText()

check('Judul Multi-Platform Download System', /multi-platform/i.test(text) && /download system/i.test(text))
check('Subjudul with Download Mirror', /with download mirror/i.test(text))
check('Seksi Download Mirror', /download mirror/i.test(text))
check('Pernyataan tanpa data keuangan', /tidak ada transaksi, saldo, atau laporan\s+keuangan/i.test(text))
check('Tanpa nominal rupiah', !/Rp\s?[\d.,]+/i.test(text))
check('Tanpa kata Pemasukan/Pengeluaran', !/pemasukan|pengeluaran/i.test(text))
check('Tanpa Saldo bersih', !/saldo bersih/i.test(text))
check('Tanpa catatan transaksi pengguna', !text.includes(MARKER))
check('Bukan shell aplikasi keuangan', !/catat transaksi|mode lokal|data di perangkat ini/i.test(text))
check('6 kartu platform', (await page.locator('article[id^="platform-"]').count()) === 6)
check('3 mirror unduhan', (await page.locator('input[name="mirror"]').count()) === 3)
check(
  'Tombol APK mengarah ke rilis',
  (await page.getByRole('link', { name: 'Unduh APK', exact: true }).first().getAttribute('href'))?.includes(
    'releases/latest/download/Faiz.Money.apk',
  ),
)

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)
check('Desktop: tanpa overflow horizontal', !overflow)
check('Desktop: tanpa console error', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.screenshot({ path: 'shots/unduh-desktop.png', fullPage: true })

// Mobile
const mobile = await browser.newContext({
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
})
const mp = await mobile.newPage()
mp.setDefaultTimeout(15000)
const mErrors = []
mp.on('console', (m) => {
  if (m.type() === 'error') mErrors.push(m.text())
})
mp.on('pageerror', (e) => mErrors.push(`EXCEPTION ${e.message}`))
await mp.goto(`${BASE}/#unduh`, { waitUntil: 'domcontentloaded' })
await mp.waitForTimeout(1200)
const mText = await mp.locator('main').innerText()
check('Mobile: judul tampil', /multi-platform/i.test(mText))
check('Mobile: tanpa nominal rupiah', !/Rp\s?[\d.,]+/i.test(mText))
check('Mobile: tanpa bottom nav aplikasi', !/beranda\s*\n?\s*transaksi/i.test(mText))
const mOverflow = await mp.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)
check('Mobile: tanpa overflow horizontal', !mOverflow)
check('Mobile: tanpa console error', mErrors.length === 0, mErrors.slice(0, 2).join(' | '))
await mp.screenshot({ path: 'shots/unduh-mobile.png', fullPage: true })

await browser.close()
