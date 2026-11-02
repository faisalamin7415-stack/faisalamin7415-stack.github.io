export const IDR = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

export function formatIDR(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0)
  const sign = n < 0 ? '−' : ''
  return `${sign}Rp${IDR.format(Math.abs(n))}`
}

export function formatNumber(value: number): string {
  return IDR.format(Math.round(Number.isFinite(value) ? value : 0))
}

export function formatCompact(value: number): string {
  const n = Math.abs(value)
  if (n >= 1_000_000_000) return `${trim(value / 1_000_000_000)} M`
  if (n >= 1_000_000) return `${trim(value / 1_000_000)} jt`
  if (n >= 1_000) return `${trim(value / 1_000)} rb`
  return String(Math.round(value))
}

function trim(n: number): string {
  return n.toFixed(1).replace('.0', '').replace('.', ',')
}

/** "1.250.000" | "1250000" | "25 ribu" | "1,5jt" -> number */
export function parseAmount(input: string): number {
  const text = input.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!text) return 0

  const unitMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(miliar|milyar|juta|jt|ribu|rb|k)\b/)
  if (unitMatch) {
    const base = Number(unitMatch[1].replace(',', '.'))
    const unit = unitMatch[2]
    const factor =
      unit === 'miliar' || unit === 'milyar'
        ? 1_000_000_000
        : unit === 'juta' || unit === 'jt'
          ? 1_000_000
          : 1_000
    return Math.round(base * factor)
  }

  const digits = text.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
