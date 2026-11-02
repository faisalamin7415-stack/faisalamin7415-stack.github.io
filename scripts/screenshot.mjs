import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5173'
const OUT = 'shots'
mkdirSync(OUT, { recursive: true })

const d = (offset) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.log('PAGE ERROR:', m.text())
})
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)

// bersihkan data lama agar screenshot tidak menumpuk
const cdp = await ctx.newCDPSession(page)
await cdp.send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'indexeddb' })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)

async function openAdd() {
  await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
  await page.waitForTimeout(250)
}

async function addExpense({ amount, note, merchant, category, date }) {
  await openAdd()
  await page.getByLabel('Nominal').fill(String(amount))
  await page.getByPlaceholder('Misal: makan siang nasi padang').fill(note)
  if (merchant) await page.getByPlaceholder('Misal: Indomaret').fill(merchant)
  if (category) await page.getByRole('button', { name: category, exact: true }).click()
  if (date) await page.locator('input[type=date]').fill(date)
  await page.getByRole('button', { name: /Simpan pengeluaran/ }).click()
  await page.waitForTimeout(300)
}

async function addIncome({ amount, note, category, date }) {
  await openAdd()
  await page.getByRole('button', { name: 'Pemasukan', exact: true }).click()
  await page.getByLabel('Nominal').fill(String(amount))
  await page.getByPlaceholder('Misal: makan siang nasi padang').fill(note)
  if (category) await page.getByRole('button', { name: category, exact: true }).click()
  if (date) await page.locator('input[type=date]').fill(date)
  await page.getByRole('button', { name: /Simpan pemasukan/ }).click()
  await page.waitForTimeout(300)
}

await addExpense({ amount: 45000, note: 'Makan siang nasi padang', merchant: 'Warung Bu Tini', category: 'Makan & Minum', date: d(0) })
await addExpense({ amount: 18000, note: 'Kopi susu', merchant: 'Kopi Kenangan', category: 'Makan & Minum', date: d(0) })
await addExpense({ amount: 120000, note: 'Belanja mingguan', merchant: 'Indomaret', category: 'Belanja', date: d(0) })
await addExpense({ amount: 50000, note: 'Isi bensin', merchant: 'Pertamina', category: 'Transportasi', date: d(-1) })
await addExpense({ amount: 250000, note: 'Makan keluarga', merchant: 'Sate Senayan', category: 'Makan & Minum', date: d(-1) })
await addExpense({ amount: 89000, note: 'Tagihan internet', merchant: 'IndiHome', category: 'Tagihan', date: d(-3) })
await addExpense({ amount: 350000, note: 'Belanja bulanan', merchant: 'Superindo', category: 'Belanja', date: d(-5) })
await addExpense({ amount: 75000, note: 'Vitamin dan obat', merchant: 'Apotek K24', category: 'Kesehatan', date: d(-8) })
await addExpense({ amount: 150000, note: 'Nonton bioskop', merchant: 'CGV', category: 'Hiburan', date: d(-12) })
await addExpense({ amount: 22000, note: 'Parkir dan tol', category: 'Transportasi', date: d(-14) })
await addIncome({ amount: 5000000, note: 'Gaji bulan November', category: 'Gaji', date: d(0) })
await addIncome({ amount: 750000, note: 'Bonus proyek', category: 'Bonus', date: d(-2) })

console.log('seed selesai')

await page.goto(`${BASE}/#beranda`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/desktop-beranda.png`, fullPage: true })

await page.goto(`${BASE}/#transaksi`)
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/desktop-transaksi.png`, fullPage: true })

await page.goto(`${BASE}/#laporan`)
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/desktop-laporan.png`, fullPage: true })

await page.goto(`${BASE}/#pengaturan`)
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/desktop-pengaturan.png`, fullPage: true })

await page.goto(`${BASE}/#beranda`)
await page.waitForTimeout(600)
await openAdd()
await page.screenshot({ path: `${OUT}/desktop-tambah-ketik.png` })
await page.getByRole('button', { name: 'Suara', exact: true }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/desktop-tambah-suara.png` })
await page.getByRole('button', { name: 'Nota', exact: true }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/desktop-tambah-nota.png` })
await page.getByRole('button', { name: 'QRIS', exact: true }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/desktop-tambah-qris.png` })
await page.keyboard.press('Escape')

// ---------- mobile ----------
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const mpage = await mctx.newPage()
mpage.on('pageerror', (e) => console.log('MOBILE EXCEPTION:', e.message))
await mpage.goto(`${BASE}/#beranda`, { waitUntil: 'networkidle' })
await mpage.waitForTimeout(900)
await mpage.screenshot({ path: `${OUT}/mobile-beranda.png`, fullPage: true })

await mpage.getByRole('button', { name: 'Catat transaksi baru' }).click()
await mpage.waitForTimeout(400)
await mpage.screenshot({ path: `${OUT}/mobile-tambah.png` })
await mpage.getByRole('button', { name: 'Suara', exact: true }).click()
await mpage.waitForTimeout(300)
await mpage.screenshot({ path: `${OUT}/mobile-suara.png` })

await mpage.goto(`${BASE}/#laporan`)
await mpage.waitForTimeout(900)
await mpage.screenshot({ path: `${OUT}/mobile-laporan.png`, fullPage: true })

await mpage.goto(`${BASE}/#transaksi`)
await mpage.waitForTimeout(700)
await mpage.screenshot({ path: `${OUT}/mobile-transaksi.png`, fullPage: true })

await browser.close()
console.log('screenshots selesai')
