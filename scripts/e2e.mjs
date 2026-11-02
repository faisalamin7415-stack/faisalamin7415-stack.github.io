import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
mkdirSync('shots', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
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

async function openAdd(tab) {
  await page.goto(`${BASE}/#beranda`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
  await page.waitForTimeout(300)
  if (tab) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await page.waitForTimeout(300)
  }
}

/* ---------------- 1. Suara ---------------- */
await openAdd('Suara')
await page
  .getByRole('button', { name: 'Makan siang di warung Bu Tini dua puluh lima ribu' })
  .click()
await page.waitForTimeout(500)
let amount = await page.getByLabel('Nominal').inputValue()
let note = await page.getByPlaceholder('Misal: makan siang nasi padang').inputValue()
let merchant = await page.getByPlaceholder('Misal: Indomaret').inputValue()
check('Voice: nominal "dua puluh lima ribu"', amount === '25.000', amount)
check('Voice: catatan', note === 'Makan Siang', note)
check('Voice: merchant', merchant.toLowerCase().includes('warung bu tini'), merchant)
await page.screenshot({ path: 'shots/test-suara-hasil.png' })
await page.getByRole('button', { name: /Simpan pengeluaran/ }).click()
await page.waitForTimeout(600)

/* ---------------- 2. QRIS ---------------- */
await openAdd('QRIS')
await page.locator('input[type=file]').setInputFiles('tmp-test/qris.png')
await page.getByText('QRIS terdeteksi').waitFor({ timeout: 15000 })
amount = await page.getByLabel('Nominal').inputValue()
const merchantVisible = await page.getByText('WARUNG BU TINI', { exact: true }).count()
check('QRIS: merchant terbaca', merchantVisible > 0, `count=${merchantVisible}`)
check('QRIS: nominal dinamis', amount === '25.000', amount)
check('QRIS: CRC valid', (await page.getByText('Valid', { exact: true }).count()) > 0)
await page.screenshot({ path: 'shots/test-qris-hasil.png' })
await page.getByRole('button', { name: /Simpan pengeluaran/ }).click()
await page.waitForTimeout(600)

/* ---------------- 3. OCR nota ---------------- */
await openAdd('Nota')
await page.locator('input[type=file]').nth(1).setInputFiles('tmp-test/nota.png')
await page.getByText('Nota terbaca').waitFor({ timeout: 240000 })
amount = await page.getByLabel('Nominal').inputValue()
const merchantOcr = await page.getByPlaceholder('Misal: Indomaret').inputValue()
const dateOcr = await page.locator('input[type=date]').inputValue()
check('OCR: nominal total', amount === '125.000', amount)
check('OCR: merchant', merchantOcr.toUpperCase().includes('INDOMARET'), merchantOcr)
check('OCR: tanggal nota', dateOcr === '2026-11-02', dateOcr)
await page.screenshot({ path: 'shots/test-nota-hasil.png', fullPage: true })
await page.getByRole('button', { name: /Simpan pengeluaran/ }).click()
await page.waitForTimeout(700)

/* ---------------- 4. Tersimpan di beranda ---------------- */
await page.goto(`${BASE}/#beranda`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const body = await page.locator('body').innerText()
check('Tersimpan: QRIS muncul di riwayat', body.includes('WARUNG BU TINI') || body.includes('Warung Bu Tini'))
check('Tersimpan: nota muncul di riwayat', body.toUpperCase().includes('INDOMARET'))

/* ---------------- 5. Pencarian & filter ---------------- */
await page.goto(`${BASE}/#transaksi`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.getByPlaceholder('Cari catatan, merchant, atau kategori…').fill('indomaret')
await page.waitForTimeout(400)
const searchText = await page.locator('body').innerText()
check('Pencarian transaksi', searchText.toUpperCase().includes('INDOMARET'))
await page.getByRole('button', { name: 'Keluar', exact: true }).click()
await page.waitForTimeout(300)
check('Filter pengeluaran', (await page.getByText('+Rp').count()) === 0)

if (errors.length) {
  console.log('\nConsole errors:')
  console.log([...new Set(errors)].slice(0, 10).join('\n'))
} else {
  console.log('\nTidak ada console error.')
}

await browser.close()
