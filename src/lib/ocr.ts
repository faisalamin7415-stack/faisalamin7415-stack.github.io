import type { ReceiptResult } from './types'

/**
 * OCR nota belanja — berjalan di perangkat (Tesseract.js), tanpa upload foto.
 * Model bahasa diunduh sekali lalu di-cache oleh service worker.
 */

export interface OcrProgress {
  status: string
  progress: number
}

const TOTAL_KEYWORDS = [
  'GRAND TOTAL',
  'TOTAL BAYAR',
  'TOTAL BELANJA',
  'TOTAL',
  'JUMLAH BAYAR',
  'JUMLAH',
  'TOTAL HARGA',
  'AMOUNT',
  'NET TOTAL',
]

const SKIP_KEYWORDS = ['KEMBALI', 'KEMBALIAN', 'CHANGE', 'TUNAI', 'CASH', 'DPP', 'DISKON', 'DISC', 'HEMAT']

/** Perbesar + tingkatkan kontras supaya teks struk lebih mudah dibaca. */
export async function preprocessImage(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  const bitmap = await createImageBitmap(file)
  const maxSide = 1800
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return file

  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const image = ctx.getImageData(0, 0, w, h)
  const d = image.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const boosted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128))
    d[i] = boosted
    d[i + 1] = boosted
    d[i + 2] = boosted
  }
  ctx.putImageData(image, 0, 0)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.92))
}

export async function readReceipt(
  file: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<ReceiptResult> {
  const { createWorker } = await import('tesseract.js')

  onProgress?.({ status: 'Menyiapkan mesin OCR', progress: 0.02 })
  const worker = await createWorker('ind+eng', 1, {
    // Semua aset OCR dibundel di aplikasi supaya tetap jalan tanpa internet.
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core',
    langPath: '/tessdata',
    gzip: false,
    logger: (m: { status: string; progress: number }) => {
      onProgress?.({ status: humanStatus(m.status), progress: m.progress })
    },
  })

  try {
    onProgress?.({ status: 'Membaca teks nota', progress: 0.1 })
    const prepared = await preprocessImage(file)
    const { data } = await worker.recognize(prepared)
    const rawText = data.text ?? ''
    const parsed = parseReceiptText(rawText)
    return {
      ...parsed,
      rawText,
      confidence: Math.round(data.confidence ?? 0),
    }
  } finally {
    await worker.terminate()
  }
}

function humanStatus(status: string): string {
  const map: Record<string, string> = {
    'loading tesseract core': 'Memuat mesin OCR',
    'initializing tesseract': 'Menyalakan mesin OCR',
    'loading language traineddata': 'Mengunduh model bahasa',
    'initializing api': 'Menyiapkan bahasa',
    'recognizing text': 'Membaca teks nota',
  }
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
}

/* ------------------------------------------------------------------ */
/*  Heuristik pembacaan struk                                          */
/* ------------------------------------------------------------------ */

export function parseReceiptText(rawText: string): Omit<ReceiptResult, 'rawText' | 'confidence'> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/[|_]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return {
    merchant: guessMerchant(lines),
    amount: guessTotal(lines),
    date: guessDate(rawText),
  }
}

function guessMerchant(lines: string[]): string {
  const noise =
    /(struk|nota|invoice|receipt|kasir|cashier|npwp|telp|telpon|phone|www\.|http|jl\.|jalan|terima kasih|thank|tanggal|date|waktu|jam|no\.)/i

  for (const line of lines.slice(0, 8)) {
    const clean = line.replace(/[^\w\s.&'-]/g, ' ').replace(/\s+/g, ' ').trim()
    if (clean.length < 3) continue
    if (noise.test(clean)) continue
    if (/^[\d\s.,:/+-]+$/.test(clean)) continue
    // Lewati baris tanggal, jam, atau nominal — tapi tetap izinkan nama seperti "TOKO 88".
    if (/(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}:\d{2}|rp\.?\s*\d|\d{3}[.,]\d{3})/i.test(clean)) continue
    if (/^[A-Z\s]{1,2}$/.test(clean)) continue
    return clean
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .slice(0, 48)
  }

  return ''
}

function parseMoney(token: string): number | null {
  const cleaned = token.replace(/[^\d.,]/g, '')
  if (!cleaned) return null

  // Format Indonesia: 1.250.000 / 1.250.000,00
  if (/^\d{1,3}(\.\d{3})+([,.]\d{1,2})?$/.test(cleaned)) {
    const n = Number(cleaned.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? Math.round(n) : null
  }
  // Format Inggris: 1,250,000.00
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
    const n = Number(cleaned.replace(/,/g, ''))
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const n = Number(cleaned.replace(/[.,]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : null
}

function guessTotal(lines: string[]): number | null {
  const scored: Array<{ value: number; score: number }> = []

  lines.forEach((line, index) => {
    const upper = line.toUpperCase()
    if (SKIP_KEYWORDS.some((k) => upper.includes(k))) return

    const keywordRank = TOTAL_KEYWORDS.findIndex((k) => upper.includes(k))
    const tokens = line.match(/\d[\d.,]{2,}/g) ?? []

    for (const token of tokens) {
      const value = parseMoney(token)
      if (value === null || value < 100) continue
      let score = 0
      if (keywordRank >= 0) score += 100 - keywordRank * 6
      score += Math.min(20, Math.log10(value) * 4)
      score += index / Math.max(lines.length, 1) * 6
      if (value > 100_000_000) score -= 40
      scored.push({ value, score })
    }
  })

  if (!scored.length) return null
  scored.sort((a, b) => b.score - a.score)
  return scored[0].value
}

const MONTHS: Record<string, number> = {
  jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2, apr: 3, april: 3,
  mei: 4, may: 4, jun: 5, juni: 5, jul: 6, juli: 6, agu: 7, agt: 7, agustus: 7,
  sep: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10, des: 11, desember: 11,
}

export function guessDate(text: string): string | null {
  const numeric = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    let year = Number(numeric[3])
    if (year < 100) year += 2000

    // Indonesia memakai DD/MM/YYYY. Kalau angka kedua > 12, anggap MM/DD/YYYY.
    const day = second > 12 ? second : first
    const month = second > 12 ? first - 1 : second - 1

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2100) {
      const d = new Date(year, month, day, 12, 0, 0)
      if (!Number.isNaN(d.getTime())) return d.toISOString()
    }
  }

  const named = text.match(/\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\b/)
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    if (month !== undefined) {
      const d = new Date(Number(named[3]), month, Number(named[1]), 12, 0, 0)
      if (!Number.isNaN(d.getTime())) return d.toISOString()
    }
  }

  return null
}
