import sharp from 'sharp'
import QRCode from 'qrcode'
import { mkdirSync } from 'node:fs'

mkdirSync('tmp-test', { recursive: true })

/* ---------------- QRIS ---------------- */
const tlv = (tag, value) => tag + String(value.length).padStart(2, '0') + value
const crc16 = (payload) => {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const merchant = tlv('00', 'ID.CO.QRIS.WWW') + tlv('01', 'ID1024567890123') + tlv('02', '936000123456789') + tlv('03', 'UMI')
let payload =
  tlv('00', '01') +
  tlv('01', '12') +
  tlv('26', merchant) +
  tlv('52', '5812') +
  tlv('53', '360') +
  tlv('54', '25000') +
  tlv('58', 'ID') +
  tlv('59', 'WARUNG BU TINI') +
  tlv('60', 'JAKARTA') +
  tlv('61', '12345') +
  '6304'
const qris = payload + crc16(payload)
console.log('QRIS:', qris)
console.log('CRC valid:', qris.slice(-4) === crc16(qris.slice(0, -4)))

await QRCode.toFile('tmp-test/qris.png', qris, { width: 720, margin: 3 })

/* ---------------- Nota ---------------- */
const lines = [
  ['INDOMARET', 34, 'normal'],
  ['SUPERMARKET & MINIMARKET', 20, 'normal'],
  ['Jl. Merdeka No. 10, Jakarta', 22, 'normal'],
  ['Telp: 021-555-1234', 22, 'normal'],
  ['', 12, 'normal'],
  ['Tanggal 02/11/2026  14:32', 22, 'normal'],
  ['Kasir: Rina', 22, 'normal'],
  ['--------------------------------', 22, 'normal'],
  ['SUSU UHT 1L        2 x 23.500', 24, 'normal'],
  ['ROTI TAWAR           18.000', 24, 'normal'],
  ['TELUR 1KG            32.000', 24, 'normal'],
  ['SABUN MANDI          12.000', 24, 'normal'],
  ['AIR MINERAL          16.000', 24, 'normal'],
  ['--------------------------------', 22, 'normal'],
  ['TOTAL              125.000', 30, 'bold'],
  ['TUNAI              150.000', 24, 'normal'],
  ['KEMBALI             25.000', 24, 'normal'],
  ['', 12, 'normal'],
  ['TERIMA KASIH', 24, 'normal'],
]

const escapeXml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let y = 70
const textNodes = lines
  .map(([text, size, weight]) => {
    const node = text
      ? `<text x="60" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="#111">${escapeXml(text)}</text>`
      : ''
    y += Number(size) + 18
    return node
  })
  .join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${y + 60}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${textNodes}
</svg>`

await sharp(Buffer.from(svg)).png().toFile('tmp-test/nota.png')
console.log('nota dibuat', 720, y + 60)
