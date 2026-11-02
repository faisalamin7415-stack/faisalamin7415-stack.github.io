import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { startOfMonth } from 'date-fns'
import { ArrowLeftRight, Search, X } from 'lucide-react'
import { db } from '../lib/db'
import { formatIDR } from '../lib/money'
import { groupByDay, summarize } from '../lib/stats'
import type { Transaction, TxType } from '../lib/types'
import { DayLabel, TransactionRow } from '../components/TransactionList'
import { TransactionDetail } from '../components/TransactionDetail'
import { EmptyState, Segmented } from '../components/ui'
import { useApp } from '../store/app'

type Filter = 'all' | TxType
type Period = 'month' | 'all'

export function Transactions() {
  const { openAdd } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [period, setPeriod] = useState<Period>('month')
  const [selected, setSelected] = useState<Transaction | null>(null)

  const all = useLiveQuery(() => db.transactions.toArray(), []) ?? []

  const filtered = useMemo(() => {
    const monthStart = startOfMonth(new Date())
    const q = query.trim().toLowerCase()
    return all
      .filter((t) => !t.deleted)
      .filter((t) => (filter === 'all' ? true : t.type === filter))
      .filter((t) => (period === 'month' ? new Date(t.occurredAt) >= monthStart : true))
      .filter((t) => {
        if (!q) return true
        return `${t.note} ${t.merchant} ${t.category}`.toLowerCase().includes(q)
      })
  }, [all, filter, period, query])

  const groups = groupByDay(filtered)
  const summary = summarize(filtered)

  return (
    <div className="animate-fade-up space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-cream sm:text-[32px]">
            Transaksi
          </h1>
          <p className="mt-1 text-[11.5px] text-cream/40">
            {summary.count} transaksi · keluar {formatIDR(summary.expense)} · masuk{' '}
            {formatIDR(summary.income)}
          </p>
        </div>
        <div className="w-[190px]">
          <Segmented
            size="sm"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'month', label: 'Bulan ini' },
              { value: 'all', label: 'Semua' },
            ]}
          />
        </div>
      </header>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari catatan, merchant, atau kategori…"
            className="field pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/35 hover:text-cream"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="sm:w-[250px]">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'expense', label: 'Keluar' },
              { value: 'income', label: 'Masuk' },
            ]}
          />
        </div>
      </div>

      {groups.length ? (
        <div className="card px-4 py-2 sm:px-5 sm:py-3">
          {groups.map((group, index) => {
            const dayExpense = group.items
              .filter((t) => t.type === 'expense')
              .reduce((s, t) => s + t.amount, 0)
            return (
              <div key={group.day}>
                <DayLabel
                  day={group.day}
                  count={group.items.length}
                  total={dayExpense}
                  first={index === 0}
                />
                <div className="divide-y divide-line/50">
                  {group.items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
                  ))}
                </div>
              </div>
            )
          })}
          <div className="h-2" />
        </div>
      ) : (
        <EmptyState
          icon={<ArrowLeftRight size={18} />}
          title={query ? 'Tidak ada yang cocok' : 'Belum ada transaksi di periode ini'}
          description={
            query
              ? 'Coba kata kunci lain, atau ganti filter menjadi “Semua”.'
              : 'Setiap catatan kecil tetap berarti. Mulai dari transaksi hari ini.'
          }
          action={
            <button type="button" onClick={() => openAdd()} className="btn-primary">
              Catat transaksi
            </button>
          }
        />
      )}

      <TransactionDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
