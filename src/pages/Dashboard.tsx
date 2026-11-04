import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { eachDayOfInterval, format, isSameDay, isToday, startOfMonth, subDays } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  ChevronRight,
  Mic,
  Plus,
  QrCode,
  Receipt,
  Type,
  Wallet,
} from 'lucide-react'
import { db } from '../lib/db'
import { formatIDR } from '../lib/money'
import { categoryBreakdown, monthlyIncome, summarize, type Bucket } from '../lib/stats'
import { useApp } from '../store/app'
import { CashflowChart, CategoryBreakdown, Sparkline } from '../components/charts'
import { MonthlyIncomeMini } from '../components/MonthlyIncome'
import { TransactionRow } from '../components/TransactionList'
import { TransactionDetail } from '../components/TransactionDetail'
import { EmptyState, Segmented } from '../components/ui'
import type { AddTab, Transaction } from '../lib/types'

const QUICK: Array<{ tab: AddTab; label: string; hint: string; icon: typeof Type }> = [
  { tab: 'manual', label: 'Ketik', hint: 'Isi manual', icon: Type },
  { tab: 'voice', label: 'Suara', hint: 'Bicara saja', icon: Mic },
  { tab: 'receipt', label: 'Foto nota', hint: 'Scan struk', icon: Camera },
  { tab: 'qris', label: 'QRIS', hint: 'Scan bayar', icon: QrCode },
]

export function Dashboard() {
  const { openAdd, profileName } = useApp()
  const [range, setRange] = useState<'7' | '30'>('7')
  const [selected, setSelected] = useState<Transaction | null>(null)

  const all = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const transactions = useMemo(() => all.filter((t) => !t.deleted), [all])

  const now = new Date()
  const monthTx = transactions.filter((t) => new Date(t.occurredAt) >= startOfMonth(now))
  const todayTx = transactions.filter((t) => isToday(new Date(t.occurredAt)))
  const month = summarize(monthTx)
  const today = summarize(todayTx)
  const allTime = summarize(transactions)

  const days = Number(range)
  const dayBuckets: Bucket[] = useMemo(() => {
    const list = eachDayOfInterval({ start: subDays(now, days - 1), end: now })
    return list.map((d) => {
      const items = transactions.filter((t) => isSameDay(new Date(t.occurredAt), d))
      const expense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const income = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      return {
        key: format(d, 'yyyy-MM-dd'),
        label: format(d, days > 7 ? 'd' : 'EEE', { locale: localeId }),
        fullLabel: format(d, 'd MMM yyyy', { locale: localeId }),
        expense,
        income,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, range])

  const weekExpense = dayBuckets.reduce((s, b) => s + b.expense, 0)
  const sparkValues = dayBuckets.map((b) => b.expense)
  const categories = categoryBreakdown(monthTx, 'expense')
  const incomeMonthly = useMemo(() => monthlyIncome(transactions), [transactions])
  const recent = [...transactions].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)).slice(0, 6)

  const hour = now.getHours()
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'

  return (
    <div className="animate-fade-up space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11.5px] text-cream/40">
            {format(now, 'EEEE, d MMMM yyyy', { locale: localeId })}
          </p>
          <h1 className="mt-1 font-display text-[27px] leading-tight text-cream sm:text-[32px]">
            {greeting}, {profileName}.
          </h1>
        </div>
        <button type="button" onClick={() => openAdd()} className="btn-ghost hidden sm:inline-flex">
          <Plus size={15} /> Catat cepat
        </button>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden rounded-[22px] border border-line bg-ink-850/70 p-5 backdrop-blur-sm sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-teal-900/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-maroon-900/25 blur-3xl" />

        <div className="relative grid gap-6 sm:grid-cols-[1fr_200px] sm:items-end">
          <div>
            <div className="label">Saldo bersih</div>
            <div className="tnum mt-1.5 font-display text-[42px] leading-none tracking-tight text-cream sm:text-[54px]">
              {formatIDR(allTime.net)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip border-teal-500/25 bg-teal-900/20 text-teal-200">
                <ArrowDownLeft size={12} />
                Masuk {formatIDR(month.income)}
              </span>
              <span className="chip border-maroon-500/25 bg-maroon-900/15 text-cream/70">
                <ArrowUpRight size={12} />
                Keluar {formatIDR(month.expense)}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-cream/30">Bulan ini · {month.count} transaksi</p>
          </div>

          <div className="rounded-xl border border-line bg-ink-900/40 px-3.5 pb-2 pt-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-cream/35">
              <span>{days} hari</span>
              <span className="tnum normal-case tracking-normal">{formatIDR(weekExpense)}</span>
            </div>
            <Sparkline values={sparkValues} />
          </div>
        </div>
      </section>

      {/* quick actions */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {QUICK.map((q) => {
          const Icon = q.icon
          return (
            <button
              key={q.tab}
              type="button"
              onClick={() => openAdd(undefined, q.tab)}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-ink-850/60 px-3.5 py-3 text-left transition-all duration-200 hover:border-line-strong hover:bg-cream/[0.04]"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  q.tab === 'manual'
                    ? 'bg-cream/[0.08] text-cream/80'
                    : q.tab === 'voice'
                      ? 'bg-maroon-900/60 text-cream'
                      : q.tab === 'receipt'
                        ? 'bg-teal-900/70 text-cream'
                        : 'bg-ink-700 text-cream/80'
                }`}
              >
                <Icon size={17} strokeWidth={1.6} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-cream/85">
                  {q.label}
                </span>
                <span className="block truncate text-[10.5px] text-cream/35">{q.hint}</span>
              </span>
            </button>
          )
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          {/* chart */}
          <section className="card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[13.5px] font-medium text-cream/85">Arus kas</h2>
                <p className="mt-0.5 text-[11px] text-cream/35">
                  Pengeluaran vs pemasukan harian
                </p>
              </div>
              <div className="w-[150px]">
                <Segmented
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: '7', label: '7 hari' },
                    { value: '30', label: '30 hari' },
                  ]}
                />
              </div>
            </div>
            <CashflowChart buckets={dayBuckets} />
            <div className="mt-3 flex items-center gap-4 text-[10.5px] text-cream/35">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-maroon-700" /> Pengeluaran
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-teal-500" /> Pemasukan
              </span>
            </div>
          </section>

          {/* recent */}
          <section className="card p-4 sm:p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[13.5px] font-medium text-cream/85">Transaksi terakhir</h2>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = 'transaksi'
                }}
                className="flex items-center gap-0.5 text-[11px] text-cream/40 transition-colors hover:text-cream"
              >
                Lihat semua <ChevronRight size={13} />
              </button>
            </div>

            {recent.length ? (
              <div className="divide-y divide-line/60">
                {recent.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
                ))}
              </div>
            ) : (
              <div className="pt-3">
                <EmptyState
                  icon={<Wallet size={18} />}
                  title="Belum ada transaksi"
                  description="Mulai dari yang paling gampang: tekan tombol catat, lalu pilih suara, foto nota, atau QRIS."
                  action={
                    <button type="button" onClick={() => openAdd()} className="btn-primary">
                      <Plus size={15} /> Catat sekarang
                    </button>
                  }
                />
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {/* monthly income */}
          <MonthlyIncomeMini data={incomeMonthly} />

          {/* today */}
          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13.5px] font-medium text-cream/85">Hari ini</h2>
              <Receipt size={15} className="text-cream/25" />
            </div>
            <div className="tnum mt-3 font-display text-[30px] leading-none text-cream">
              {formatIDR(today.expense)}
            </div>
            <p className="mt-1 text-[11px] text-cream/35">
              {today.count} transaksi tercatat
            </p>
            <div className="my-3.5 h-px w-full bg-line" />
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-cream/45">Pemasukan</span>
              <span className="tnum text-teal-300">+{formatIDR(today.income)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="text-cream/45">Selisih</span>
              <span className={`tnum ${today.net >= 0 ? 'text-cream/80' : 'text-maroon-300'}`}>
                {formatIDR(today.net)}
              </span>
            </div>
          </section>

          {/* categories */}
          <section className="card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[13.5px] font-medium text-cream/85">Ke mana uang pergi</h2>
              <span className="text-[10px] uppercase tracking-[0.12em] text-cream/30">Bulan ini</span>
            </div>
            <CategoryBreakdown
              slices={categories}
              total={month.expense}
              emptyLabel="Belum ada pengeluaran bulan ini."
            />
          </section>
        </div>
      </div>

      <TransactionDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
