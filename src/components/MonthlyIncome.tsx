import { ArrowDownLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCompact, formatIDR } from '../lib/money'
import { percentChange, type MonthlyIncomeSummary } from '../lib/stats'
import { ProgressBar } from './ui'

function IncomeDelta({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const up = delta >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] ${
        up ? 'bg-teal-900/30 text-teal-300' : 'bg-maroon-900/30 text-maroon-300'
      }`}
      title="Dibanding bulan sebelumnya"
    >
      <Icon size={10} />
      {Math.abs(Math.round(delta))}%
    </span>
  )
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink-900/40 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-[0.1em] text-cream/30">{label}</div>
      <div className="tnum mt-0.5 truncate text-[12.5px] text-cream/85">{value}</div>
      {hint && <div className="tnum truncate text-[10px] text-cream/30">{hint}</div>}
    </div>
  )
}

/**
 * Rekap lengkap 12 bulan: satu angka pemasukan per bulan.
 * Dipakai di halaman Laporan.
 */
export function MonthlyIncomeCard({ data }: { data: MonthlyIncomeSummary }) {
  const { months, current, previous, total, average, best } = data
  const delta = percentChange(current.total, previous.total)
  const max = Math.max(...months.map((m) => m.total), 1)

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowDownLeft size={15} className="text-teal-300" />
            <h2 className="text-[13.5px] font-medium text-cream/85">Pemasukan per bulan</h2>
          </div>
          <p className="mt-1 text-[11px] text-cream/35">
            Semua pemasukan digabung jadi satu angka tiap bulan.
          </p>
        </div>
        <span className="chip border-teal-500/25 bg-teal-900/20 text-teal-200">
          {formatIDR(total)} · {months.length} bulan
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[238px_1fr]">
        <div className="rounded-xl border border-teal-500/20 bg-teal-900/10 p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-cream/35">
            {current.fullLabel}
          </div>
          <div className="tnum mt-1.5 font-display text-[28px] leading-none text-teal-200">
            {formatIDR(current.total)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-cream/35">
            <span>{current.count} catatan pemasukan</span>
            <IncomeDelta delta={delta} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat label="Rata-rata / bulan" value={formatCompact(average)} />
            <MiniStat
              label="Bulan terbaik"
              value={best ? best.label : '—'}
              hint={best ? formatCompact(best.total) : undefined}
            />
          </div>
        </div>

        <ul className="space-y-2" aria-label="Rekap pemasukan per bulan">
          {months.map((m) => {
            const isCurrent = m.key === current.key
            return (
              <li key={m.key} className="flex items-center gap-2.5">
                <span
                  className={`w-9 shrink-0 text-[11px] ${
                    isCurrent ? 'font-medium text-cream' : 'text-cream/40'
                  }`}
                >
                  {m.label}
                </span>
                <div className="min-w-0 flex-1">
                  <ProgressBar
                    value={m.total / max}
                    color={isCurrent ? '#C7DCF5' : '#4D8FD6'}
                  />
                </div>
                <span
                  className={`tnum w-[86px] shrink-0 text-right text-[11.5px] ${
                    m.total ? 'text-cream/70' : 'text-cream/25'
                  }`}
                >
                  {m.total ? formatCompact(m.total) : '—'}
                </span>
                <span className="tnum w-6 shrink-0 text-right text-[10px] text-cream/25">
                  {m.count || ''}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/**
 * Ringkasan pemasukan bulan ini + 6 bulan terakhir.
 * Dipakai di Beranda agar langsung terlihat tanpa membuka Laporan.
 */
export function MonthlyIncomeMini({ data }: { data: MonthlyIncomeSummary }) {
  const { months, current, previous } = data
  const delta = percentChange(current.total, previous.total)
  const max = Math.max(...months.map((m) => m.total), 1)
  const recent = months.slice(-6)

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13.5px] font-medium text-cream/85">Pemasukan bulan ini</h2>
        <ArrowDownLeft size={15} className="text-teal-300" />
      </div>

      <div className="tnum mt-3 font-display text-[30px] leading-none text-teal-200">
        {formatIDR(current.total)}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-cream/35">
        <span>{current.count} catatan pemasukan</span>
        <IncomeDelta delta={delta} />
      </div>

      <div className="my-3.5 h-px w-full bg-line" />

      <div className="space-y-1.5" aria-label="Pemasukan 6 bulan terakhir">
        {recent.map((m) => (
          <div key={m.key} className="flex items-center gap-2">
            <span
              className={`w-8 shrink-0 text-[10.5px] ${
                m.key === current.key ? 'text-cream' : 'text-cream/35'
              }`}
            >
              {m.label}
            </span>
            <div className="min-w-0 flex-1">
              <ProgressBar value={m.total / max} color={m.key === current.key ? '#C7DCF5' : '#4D8FD6'} />
            </div>
            <span
              className={`tnum w-[66px] shrink-0 text-right text-[11px] ${
                m.total ? 'text-cream/70' : 'text-cream/25'
              }`}
            >
              {m.total ? formatCompact(m.total) : '—'}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          window.location.hash = 'laporan'
        }}
        className="mt-3.5 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-[11.5px] text-cream/45 transition-colors hover:border-line-strong hover:text-cream"
      >
        Lihat rekap 12 bulan
        <ChevronRight size={13} />
      </button>
    </section>
  )
}
