import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:4173'

const now = new Date()
const iso = (year, month, day) => new Date(year, month, day, 10, 0, 0).toISOString()
const y = now.getFullYear()
const m = now.getMonth()

const seeds = [
  // bulan ini
  { type: 'income', amount: 5_000_000, category: 'gaji', note: 'Gaji bulan ini', merchant: 'PT Maju', occurredAt: iso(y, m, 1) },
  { type: 'income', amount: 750_000, category: 'usaha', note: 'Penjualan online', merchant: 'Toko', occurredAt: iso(y, m, 3) },
  { type: 'expense', amount: 1_200_000, category: 'tagihan', note: 'Sewa', merchant: '', occurredAt: iso(y, m, 2) },
  // bulan lalu
  { type: 'income', amount: 4_500_000, category: 'gaji', note: 'Gaji', merchant: 'PT Maju', occurredAt: iso(y, m - 1, 1) },
  { type: 'income', amount: 6_000_000, category: 'bonus', note: 'Bonus proyek', merchant: 'Klien', occurredAt: iso(y, m - 2, 5) },
  { type: 'income', amount: 3_000_000, category: 'usaha', note: 'Usaha', merchant: 'Toko', occurredAt: iso(y, m - 3, 5) },
  { type: 'income', amount: 2_000_000, category: 'investasi', note: 'Dividen', merchant: '', occurredAt: iso(y, m - 5, 5) },
  { type: 'income', amount: 1_250_000, category: 'hadiah', note: 'Hadiah', merchant: '', occurredAt: iso(y, m - 6, 5) },
  { type: 'income', amount: 2_500_000, category: 'usaha', note: 'Usaha', merchant: 'Toko', occurredAt: iso(y, m - 9, 5) },
  { type: 'income', amount: 1_000_000, category: 'lainnya-masuk', note: 'Lain-lain', merchant: '', occurredAt: iso(y, m - 10, 5) },
  { type: 'income', amount: 3_000_000, category: 'gaji', note: 'Gaji lama', merchant: 'PT Maju', occurredAt: iso(y, m - 11, 5) },
]

const rows = seeds.map((s, i) => ({
  id: `seed-${i}`,
  userId: null,
  source: 'manual',
  meta: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deleted: 0,
  dirty: 1,
  ...s,
}))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (e) => errors.push(`EXCEPTION ${e.message}`))

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

await page.goto(`${BASE}/#beranda`, { waitUntil: 'networkidle' })
await page.evaluate(
  (seedRows) =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open('faiz-money')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('transactions', 'readwrite')
        const store = tx.objectStore('transactions')
        for (const row of seedRows) store.put(row)
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

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)

const body = await page.locator('body').innerText()
check('Beranda: kartu pemasukan bulan ini', body.includes('Pemasukan bulan ini'))
check('Beranda: total pemasukan bulan ini', body.includes('Rp5.750.000'), body.match(/Rp5\.750\.000/)?.[0] || '')
check('Beranda: jumlah catatan pemasukan', body.includes('2 catatan pemasukan'))
check('Beranda: kenaikan vs bulan lalu', body.includes('28%'))
check('Beranda: mini 6 bulan', body.includes('Jun') && body.includes('Jul'))
await page.screenshot({ path: 'shots/income-beranda.png', fullPage: true })

await page.goto(`${BASE}/#laporan`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const reports = await page.locator('body').innerText()
check('Laporan: judul rekap', reports.includes('Pemasukan per bulan'))
check('Laporan: bulan berjalan', reports.includes('November 2026'))
check('Laporan: total 12 bulan', reports.includes('Rp29.000.000'), reports.match(/Rp29\.000\.000/)?.[0] || '')
check('Laporan: rata-rata per bulan', reports.includes('2,4 jt'))
check('Laporan: bulan terbaik', /bulan terbaik/i.test(reports) && reports.includes('Sep'))
check('Laporan: 12 baris bulan', (await page.locator('ul[aria-label="Rekap pemasukan per bulan"] > li').count()) === 12)
await page.screenshot({ path: 'shots/income-laporan.png', fullPage: true })

// mobile overflow
const mobile = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true })
const mp = await mobile.newPage()
await mp.goto(`${BASE}/#laporan`, { waitUntil: 'networkidle' })
await mp.waitForTimeout(500)
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
check('Mobile: tanpa overflow horizontal', !overflow)
await mp.screenshot({ path: 'shots/income-mobile.png', fullPage: true })

check('Tanpa console error', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()
