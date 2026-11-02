import { chromium } from 'playwright-core'

const BASE = 'http://localhost:5173'
const routes = ['beranda', 'transaksi', 'laporan', 'pengaturan']

const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function audit(label, viewport, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(`EXCEPTION ${e.message}`))

  for (const route of routes) {
    await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const issues = []
      if (document.documentElement.scrollWidth > vw + 1) {
        issues.push(`overflow-x halaman: ${document.documentElement.scrollWidth}px > ${vw}px`)
      }
      const clipped = []
      for (const el of document.querySelectorAll('h1,h2,h3,p,span,button,div')) {
        const cs = getComputedStyle(el)
        if (cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
          const text = (el.textContent || '').trim()
          if (text && text.length > 2 && !el.closest('.recharts-wrapper')) {
            clipped.push(`${el.tagName.toLowerCase()} "${text.slice(0, 32)}" (${el.clientWidth}/${el.scrollWidth})`)
          }
        }
      }
      return {
        vw,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        serif: document.fonts.check('16px "Instrument Serif"'),
        sans: document.fonts.check('16px "Inter Variable"'),
        clipped: [...new Set(clipped)].slice(0, 6),
        issues,
      }
    })
    console.log(`\n[${label}] #${route}`)
    console.log('  viewport', report.vw, '| body', report.bodyBg, '| font serif', report.serif, '| sans', report.sans)
    if (report.issues.length) console.log('  ISSUES:', report.issues)
    if (report.clipped.length) console.log('  teks terpotong:', report.clipped)
    if (!report.issues.length && !report.clipped.length) console.log('  OK')
  }

  if (errors.length) {
    console.log(`\n[${label}] console errors:`)
    console.log([...new Set(errors)].slice(0, 8).join('\n'))
  }
  await ctx.close()
}

await audit('desktop', { width: 1440, height: 1000 })
await audit('tablet', { width: 834, height: 1112 }, true)
await audit('mobile', { width: 390, height: 844 }, true)
await audit('small', { width: 320, height: 640 }, true)

await browser.close()
