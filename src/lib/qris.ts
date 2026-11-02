/**
 * Parser QRIS (EMVCo Merchant Presented Mode).
 * Membaca TLV: nama merchant, kota, NMID, dan nominal (jika QR dinamis).
 */

export interface TlvMap {
  [tag: string]: string
}

export function parseTlv(payload: string): TlvMap {
  const out: TlvMap = {}
  let i = 0
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2)
    const len = Number(payload.slice(i + 2, i + 4))
    if (!Number.isFinite(len) || len < 0) break
    const value = payload.slice(i + 4, i + 4 + len)
    out[tag] = value
    i += 4 + len
  }
  return out
}

export function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface QrisData {
  merchantName: string
  city: string
  amount: number | null
  nmid: string
  merchantId: string
  criteria: string
  currency: string
  valid: boolean
  raw: string
}

export function parseQris(rawInput: string): QrisData | null {
  const raw = rawInput.trim()
  if (raw.length < 20 || !raw.startsWith('0002')) return null

  const root = parseTlv(raw)
  if (!root['00'] || !root['59']) return null

  // Merchant account information ada di tag 26–51.
  let nmid = ''
  let merchantId = ''
  let criteria = ''
  for (let tag = 26; tag <= 51; tag++) {
    const block = root[String(tag)]
    if (!block) continue
    const sub = parseTlv(block)
    if (sub['01']) nmid = sub['01']
    if (sub['02']) merchantId = sub['02']
    if (sub['03']) criteria = sub['03']
    if (nmid || merchantId) break
  }

  const crcIndex = raw.lastIndexOf('6304')
  const expected = crcIndex >= 0 ? raw.slice(crcIndex + 4, crcIndex + 8) : ''
  const actual = crcIndex >= 0 ? crc16(raw.slice(0, crcIndex + 4)) : ''

  const amountRaw = root['54']
  const amount = amountRaw ? Number(amountRaw.replace(',', '.')) : null

  return {
    merchantName: root['59'] ?? '',
    city: root['60'] ?? '',
    amount: Number.isFinite(amount as number) && (amount as number) > 0 ? (amount as number) : null,
    nmid,
    merchantId,
    criteria,
    currency: root['53'] ?? '360',
    valid: expected.length === 4 && expected.toUpperCase() === actual,
    raw,
  }
}

/** Membersihkan teks hasil scan dari karakter kontrol, tanpa merusak spasi di dalam nilai. */
export function normalizeQrText(text: string): string {
  return text.replace(/[\u0000-\u001f]+/g, '').trim()
}
