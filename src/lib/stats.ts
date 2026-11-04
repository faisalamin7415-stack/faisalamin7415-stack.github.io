import {
  eachDayOfInterval,
  eachHourOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Transaction, TxType } from './types'

export type RangeMode = 'hour' | 'day' | 'month' | 'year'

export interface Bucket {
  key: string
  label: string
  fullLabel: string
  expense: number
  income: number
}

export interface Summary {
  expense: number
  income: number
  net: number
  count: number
}

export function summarize(txs: Transaction[]): Summary {
  let expense = 0
  let income = 0
  for (const t of txs) {
    if (t.deleted) continue
    if (t.type === 'expense') expense += t.amount
    else income += t.amount
  }
  return { expense, income, net: income - expense, count: txs.filter((t) => !t.deleted).length }
}

export function inRange(txs: Transaction[], mode: RangeMode, anchor: Date): Transaction[] {
  const { start, end } = rangeOf(mode, anchor)
  return txs.filter((t) => {
    if (t.deleted) return false
    const d = new Date(t.occurredAt)
    return d >= start && d <= end
  })
}

export function rangeOf(mode: RangeMode, anchor: Date): { start: Date; end: Date } {
  if (mode === 'hour') return { start: startOfDay(anchor), end: endOfDay(anchor) }
  if (mode === 'day') return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
  if (mode === 'month') return { start: startOfYear(anchor), end: endOfYear(anchor) }
  return { start: new Date(2000, 0, 1), end: new Date(2100, 11, 31) }
}

export function buildBuckets(txs: Transaction[], mode: RangeMode, anchor: Date): Bucket[] {
  const active = txs.filter((t) => !t.deleted)
  const buckets: Bucket[] = []
  const push = (key: string, label: string, fullLabel: string, d: Date) => {
    const items = active.filter((t) => sameBucket(new Date(t.occurredAt), d, mode))
    buckets.push({
      key,
      label,
      fullLabel,
      expense: items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      income: items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    })
  }

  if (mode === 'hour') {
    for (const h of eachHourOfInterval({ start: startOfDay(anchor), end: endOfDay(anchor) })) {
      push(format(h, 'HH'), format(h, 'HH'), `${format(h, 'HH:00')}–${format(h, 'HH:59')}`, h)
    }
  } else if (mode === 'day') {
    for (const d of eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })) {
      push(format(d, 'yyyy-MM-dd'), format(d, 'd'), format(d, 'd MMM yyyy', { locale: localeId }), d)
    }
  } else if (mode === 'month') {
    for (const d of eachMonthOfInterval({ start: startOfYear(anchor), end: endOfYear(anchor) })) {
      push(format(d, 'yyyy-MM'), format(d, 'MMM', { locale: localeId }), format(d, 'MMMM yyyy', { locale: localeId }), d)
    }
  } else {
    const years = [...new Set(active.map((t) => new Date(t.occurredAt).getFullYear()))].sort()
    const list = years.length ? years : [new Date().getFullYear()]
    for (const y of list) {
      push(String(y), String(y), String(y), new Date(y, 0, 1))
    }
  }

  return buckets
}

function sameBucket(date: Date, anchor: Date, mode: RangeMode): boolean {
  if (mode === 'hour') return isSameDay(date, anchor) && date.getHours() === anchor.getHours()
  if (mode === 'day') return isSameDay(date, anchor)
  if (mode === 'month') return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth()
  return date.getFullYear() === anchor.getFullYear()
}

export interface CategorySlice {
  id: string
  total: number
  share: number
}

export function categoryBreakdown(txs: Transaction[], type: TxType): CategorySlice[] {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.deleted || t.type !== type) continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1
  return [...map.entries()]
    .map(([id, value]) => ({ id, total: value, share: value / total }))
    .sort((a, b) => b.total - a.total)
}

/** Perbandingan dengan periode sebelumnya (untuk indikator naik/turun). */
export function previousRange(mode: RangeMode, anchor: Date): { start: Date; end: Date } {
  if (mode === 'hour') {
    const d = new Date(anchor)
    d.setDate(d.getDate() - 1)
    return { start: startOfDay(d), end: endOfDay(d) }
  }
  if (mode === 'day') {
    const d = new Date(anchor)
    d.setMonth(d.getMonth() - 1)
    return { start: startOfMonth(d), end: endOfMonth(d) }
  }
  if (mode === 'month') {
    return { start: startOfYear(new Date(anchor.getFullYear() - 1, 0, 1)), end: endOfYear(new Date(anchor.getFullYear() - 1, 0, 1)) }
  }
  return { start: new Date(2000, 0, 1), end: new Date(2100, 11, 31) }
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null
  return ((current - previous) / previous) * 100
}

export interface MonthlyIncomeRow {
  /** yyyy-MM */
  key: string
  /** Nama bulan singkat, mis. "Nov" */
  label: string
  /** Nama bulan lengkap, mis. "November 2026" */
  fullLabel: string
  total: number
  count: number
}

export interface MonthlyIncomeSummary {
  /** Urut dari bulan terlama ke bulan terbaru. */
  months: MonthlyIncomeRow[]
  current: MonthlyIncomeRow
  previous: MonthlyIncomeRow
  total: number
  average: number
  best: MonthlyIncomeRow | null
}

/**
 * Gabungkan seluruh pemasukan menjadi satu angka per bulan, sehingga pengguna
 * bisa langsung tahu berapa pemasukan mereka di setiap bulan.
 */
export function monthlyIncome(
  txs: Transaction[],
  monthsBack = 12,
  anchor: Date = new Date(),
): MonthlyIncomeSummary {
  const end = startOfMonth(anchor)
  const start = new Date(end.getFullYear(), end.getMonth() - (monthsBack - 1), 1)
  const incomes = txs.filter((t) => !t.deleted && t.type === 'income')

  const months: MonthlyIncomeRow[] = eachMonthOfInterval({ start, end }).map((d) => {
    const items = incomes.filter((t) => {
      const td = new Date(t.occurredAt)
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()
    })
    return {
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM', { locale: localeId }),
      fullLabel: format(d, 'MMMM yyyy', { locale: localeId }),
      total: items.reduce((s, t) => s + t.amount, 0),
      count: items.length,
    }
  })

  const total = months.reduce((s, m) => s + m.total, 0)
  const best = months.reduce<MonthlyIncomeRow | null>(
    (top, m) => (m.total > 0 && (!top || m.total > top.total) ? m : top),
    null,
  )

  return {
    months,
    current: months[months.length - 1],
    previous: months[months.length - 2] ?? {
      key: '',
      label: '',
      fullLabel: '',
      total: 0,
      count: 0,
    },
    total,
    average: months.length ? total / months.length : 0,
    best,
  }
}

export function groupByDay(txs: Transaction[]): Array<{ day: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (t.deleted) continue
    const key = format(new Date(t.occurredAt), 'yyyy-MM-dd')
    const arr = map.get(key) ?? []
    arr.push(t)
    map.set(key, arr)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({
      day,
      items: items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
    }))
}
