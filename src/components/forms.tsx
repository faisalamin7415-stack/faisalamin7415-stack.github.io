import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { categoriesFor } from '../lib/categories'
import { formatNumber, parseAmount, toDateInput, toTimeInput } from '../lib/money'
import type { TxSource, TxType } from '../lib/types'
import { CategoryIcon } from './icons'

export interface Draft {
  type: TxType
  amount: number
  category: string
  note: string
  merchant: string
  occurredAt: string
  source: TxSource
  meta?: Record<string, unknown>
}

export function TypeToggle({
  value,
  onChange,
}: {
  value: TxType
  onChange: (v: TxType) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-ink-900/50 p-1.5">
      {(
        [
          { id: 'expense' as TxType, label: 'Pengeluaran', icon: <ArrowUpRight size={15} /> },
          { id: 'income' as TxType, label: 'Pemasukan', icon: <ArrowDownLeft size={15} /> },
        ] as const
      ).map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-all duration-200 ${
              active
                ? opt.id === 'expense'
                  ? 'bg-maroon-900 text-cream shadow-soft'
                  : 'bg-teal-700 text-cream shadow-soft'
                : 'text-cream/45 hover:bg-cream/[0.04] hover:text-cream/75'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function AmountInput({
  value,
  onChange,
  autoFocus,
}: {
  value: number
  onChange: (n: number) => void
  autoFocus?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink-900/60 px-4 py-4">
      <div className="label mb-1">Nominal</div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[22px] text-cream/40">Rp</span>
        <input
          value={value ? formatNumber(value) : ''}
          onChange={(e) => onChange(parseAmount(e.target.value))}
          inputMode="numeric"
          autoFocus={autoFocus}
          placeholder="0"
          aria-label="Nominal"
          className="tnum w-full bg-transparent font-display text-[38px] leading-none tracking-tight text-cream placeholder:text-cream/20 focus:outline-none"
        />
      </div>
    </div>
  )
}

export function CategoryPicker({
  type,
  value,
  onChange,
}: {
  type: TxType
  value: string
  onChange: (id: string) => void
}) {
  const list = useMemo(() => categoriesFor(type), [type])
  return (
    <div>
      <div className="label mb-2">Kategori</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((cat) => {
          const active = cat.id === value
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              aria-pressed={active}
              className={`flex flex-col items-start gap-1.5 rounded-xl border px-2.5 py-2.5 text-left transition-all duration-200 ${
                active
                  ? 'border-cream/40 bg-cream/[0.07]'
                  : 'border-line bg-ink-900/40 hover:border-line-strong hover:bg-cream/[0.03]'
              }`}
            >
              <span style={{ color: active ? cat.color : `${cat.color}CC` }}>
                <CategoryIcon name={cat.icon} size={17} />
              </span>
              <span
                className={`text-[11px] leading-tight ${active ? 'text-cream' : 'text-cream/55'}`}
              >
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateTimeRow({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const date = new Date(value)
  const update = (nextDate: string, nextTime: string) => {
    const [y, m, d] = nextDate.split('-').map(Number)
    const [hh, mm] = nextTime.split(':').map(Number)
    if (!y || !m || !d) return
    onChange(new Date(y, m - 1, d, hh || 0, mm || 0).toISOString())
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <div className="label mb-1.5">Tanggal</div>
        <input
          type="date"
          value={toDateInput(date)}
          onChange={(e) => update(e.target.value, toTimeInput(date))}
          className="field tnum"
        />
      </div>
      <div>
        <div className="label mb-1.5">Jam</div>
        <input
          type="time"
          value={toTimeInput(date)}
          onChange={(e) => update(toDateInput(date), e.target.value)}
          className="field tnum"
        />
      </div>
    </div>
  )
}

export function NoteFields({
  note,
  merchant,
  onNote,
  onMerchant,
}: {
  note: string
  merchant: string
  onNote: (v: string) => void
  onMerchant: (v: string) => void
}) {
  return (
    <div className="grid gap-3">
      <div>
        <div className="label mb-1.5">Catatan</div>
        <input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Misal: makan siang nasi padang"
          maxLength={80}
          className="field"
        />
      </div>
      <div>
        <div className="label mb-1.5">Merchant / Toko (opsional)</div>
        <input
          value={merchant}
          onChange={(e) => onMerchant(e.target.value)}
          placeholder="Misal: Indomaret"
          maxLength={60}
          className="field"
        />
      </div>
    </div>
  )
}

export function draftFrom(partial: Partial<Draft> = {}): Draft {
  const type = partial.type ?? 'expense'
  return {
    type,
    amount: partial.amount ?? 0,
    category: partial.category ?? categoriesFor(type)[0].id,
    note: partial.note ?? '',
    merchant: partial.merchant ?? '',
    occurredAt: partial.occurredAt ?? new Date().toISOString(),
    source: partial.source ?? 'manual',
    meta: partial.meta,
  }
}

export function validateDraft(draft: Draft): string | null {
  if (!draft.amount || draft.amount <= 0) return 'Nominal harus lebih dari nol.'
  if (draft.amount > 1_000_000_000_000) return 'Nominal terlalu besar.'
  if (!draft.category) return 'Pilih kategori dulu.'
  return null
}
