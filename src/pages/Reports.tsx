import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ArrowDownLeft, ArrowUpRight, Store, TrendingDown, TrendingUp } from 'lucide-react'
import { getCategory } from '../lib/categories'
import { db } from '../lib/db'
import { formatCompact, formatIDR } from '../lib/money'
import {
  buildBuckets,
  categoryBreakdown,
  inRange,
  percentChange,
  previousRange,
  summarize,
  type RangeMode,
} from '../lib/stats'
import { CashflowChart, CategoryBreakdown } from '../components/charts'
import { Segmented } from '../components/ui'

const MODES: Array<{ value: RangeMode; label: string }> = [
  { value: 'hour', label: 'Hari ini' },
  { value: 'day', label: 'Bulan' },
  { value: 'month', label: 'Tahun' },
  { value: 'year', label: 'Semua' },
]

const CHART_TITLE: Record<RangeMode, string> = {
  hour: 'Arus kas per jam',
  day: 'Arus kas per hari',
  month: 'Arus kas per bulan',
  year: 'Arus kas per tahun',
}

export function Reports() {
  const [mode, setMode] = useState<RangeMode>('day')
  const [catType, setCatType] = useState<'expense' | 'income'>('expense')

  const all = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const transactions = useMemo(() => all.filter((t) => !t.deleted), [all])
  const now = new Date()

  const rangeTx = useMemo(() => inRange(transactions, mode, now), [transactions, mode])
  const buckets = useMemo(() => buildBuckets(transactions, mode, now), [transactions, mode])
  const summary = summarize(rangeTx)

  const prev = useMemo(() => {
    const { start, end } = previousRange(mode, now)
    return summarize(
      transactions.filter((t) => {
        const d = new Date(t.occurredAt)
        return d >= start && d <= end
      }),
    )
  }, [transactions, mode])

  const expenseDelta = percentChange(summary.expense, prev.expense)
  const categories = categoryBreakdown(rangeTx, catType)

  const merchants = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of rangeTx) {
      if (t.type !== 'expense') continue
      const key = (t.merchant || '').trim()
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [rangeTx])

  const rangeLabel =
    mode === 'hour'
      ? format(now, 'd MMMM yyyy', { locale: localeId })
      : mode === 'day'
        ? format(now, 'MMMM yyyy', { locale: localeId })
        : mode === 'month'
          ? format(now, 'yyyy')
          : 'Semua waktu'

  const top = categories[0]
  const average = summary.count ? summary.expense / summary.count : 0

  return (
    <div className="animate-fade-up space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-cream sm:text-[32px]">
            Laporan
          </h1>
          <p className="mt-1 text-[11.5px] text-cream/40">{rangeLabel}</p>
        </div>
      </header>

      <Segmented value={mode} onChange={setMode} options={MODES} />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatCard
          label="Pengeluaran"
          value={summary.expense}
          tone="expense"
          delta={expenseDelta}
          hint="dibanding periode sebelumnya"
        />
        <StatCard label="Pemasukan" value={summary.income} tone="income" />
        <StatCard
          label="Selisih"
          value={summary.net}
          tone={summary.net >= 0 ? 'income' : 'expense'}
          hint={`${summary.count} transaksi`}
        />
      </div>

      <section className="card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13.5px] font-medium text-cream/85">{CHART_TITLE[mode]}</h2>
          <div className="flex items-center gap-4 text-[10.5px] text-cream/35">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-maroon-700" /> Keluar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-teal-500" /> Masuk
            </span>
          </div>
        </div>
        <CashflowChart buckets={buckets} height={260} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-cream/85">Komposisi kategori</h2>
            <div className="w-[168px]">
              <Segmented
                size="sm"
                value={catType}
                onChange={setCatType}
                options={[
                  { value: 'expense', label: 'Keluar' },
                  { value: 'income', label: 'Masuk' },
                ]}
              />
            </div>
          </div>
          <CategoryBreakdown
            slices={categories}
            total={catType === 'expense' ? summary.expense : summary.income}
            emptyLabel={
              catType === 'expense'
                ? 'Belum ada pengeluaran di periode ini.'
                : 'Belum ada pemasukan di periode ini.'
            }
          />
        </section>

        <section className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13.5px] font-medium text-cream/85">Merchant paling sering</h2>
            <Store size={15} className="text-cream/25" />
          </div>

          {merchants.length ? (
            <ul className="space-y-3">
              {merchants.map((m, i) => (
                <li key={m.name} className="flex items-center gap-3">
                  <span className="tnum w-4 text-[10.5px] text-cream/25">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-cream/75">
                    {m.name}
                  </span>
                  <span className="tnum text-[12px] text-cream/50">{formatIDR(m.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-[12px] text-cream/35">
              Belum ada merchant tercatat. Isi kolom merchant saat mencatat agar muncul di sini.
            </p>
          )}

          <div className="my-4 h-px w-full bg-line" />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-ink-900/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-cream/35">
                Rata-rata transaksi
              </div>
              <div className="tnum mt-1 font-display text-[19px] text-cream">
                {formatCompact(average)}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-ink-900/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-cream/35">
                Kategori terbesar
              </div>
              <div className="mt-1 truncate text-[12.5px] text-cream">
                {top ? `${Math.round(top.share * 100)}%` : '—'}
              </div>
            </div>
          </div>

          {top && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-cream/40">
              {catType === 'expense' ? 'Pengeluaran' : 'Pemasukan'} terbesar ada di kategori{' '}
              <span className="text-cream/70">{top ? getCategory(top.id).label : '—'}</span> sebesar{' '}
              <span className="tnum text-cream/70">{formatIDR(top.total)}</span>.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  delta,
  hint,
}: {
  label: string
  value: number
  tone: 'expense' | 'income'
  delta?: number | null
  hint?: string
}) {
  const positive = delta !== undefined && delta !== null && delta > 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span
          className={tone === 'income' ? 'text-teal-300' : 'text-maroon-300'}
          aria-hidden
        >
          {tone === 'income' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
        </span>
      </div>
      <div
        className={`tnum mt-2 font-display text-[26px] leading-none sm:text-[30px] ${
          tone === 'income' ? 'text-teal-200' : 'text-cream'
        }`}
      >
        {formatIDR(value)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-cream/30">
        {delta !== undefined && delta !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${
              positive ? 'bg-maroon-900/30 text-maroon-300' : 'bg-teal-900/30 text-teal-300'
            }`}
          >
            <Icon size={10} />
            {Math.abs(Math.round(delta))}%
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  )
}
