import { format, isToday, isYesterday } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Mic, QrCode, Receipt } from 'lucide-react'
import { getCategory } from '../lib/categories'
import { formatIDR } from '../lib/money'
import type { Transaction } from '../lib/types'
import { CategoryIcon } from './icons'
import { CategoryBadge } from './ui'

export const SOURCE_LABEL: Record<Transaction['source'], string> = {
  manual: 'Ketik manual',
  voice: 'Input suara',
  receipt: 'Foto nota',
  qris: 'QRIS',
}

export function SourceIcon({ source, size = 11 }: { source: Transaction['source']; size?: number }) {
  if (source === 'voice') return <Mic size={size} />
  if (source === 'receipt') return <Receipt size={size} />
  if (source === 'qris') return <QrCode size={size} />
  return null
}

export function TransactionRow({
  tx,
  onClick,
  showDate = false,
}: {
  tx: Transaction
  onClick?: () => void
  showDate?: boolean
}) {
  const cat = getCategory(tx.category)
  const date = new Date(tx.occurredAt)
  const time = showDate
    ? format(date, 'd MMM · HH:mm', { locale: localeId })
    : format(date, 'HH:mm')

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-cream/[0.035]"
    >
      <CategoryBadge color={cat.color}>
        <CategoryIcon name={cat.icon} size={17} />
      </CategoryBadge>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] leading-snug text-cream/90">
          {tx.note || cat.label}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-cream/35">
          <span className="truncate">{cat.label}</span>
          <span className="text-cream/20">·</span>
          <span className="tnum shrink-0">{time}</span>
          {tx.source !== 'manual' && (
            <>
              <span className="text-cream/20">·</span>
              <span className="shrink-0" title={SOURCE_LABEL[tx.source]}>
                <SourceIcon source={tx.source} />
              </span>
            </>
          )}
        </div>
      </div>

      <div
        className={`tnum shrink-0 text-right text-[13px] font-medium ${
          tx.type === 'income' ? 'text-teal-300' : 'text-cream/85'
        }`}
      >
        {tx.type === 'income' ? '+' : '−'}
        {formatIDR(tx.amount).replace('Rp', 'Rp ')}
      </div>
    </button>
  )
}

export function DayLabel({
  day,
  count,
  total,
  first = false,
}: {
  day: string
  count: number
  total: number
  first?: boolean
}) {
  const date = new Date(`${day}T12:00:00`)
  const label = isToday(date)
    ? 'Hari ini'
    : isYesterday(date)
      ? 'Kemarin'
      : format(date, 'EEEE, d MMM', { locale: localeId })

  return (
    <div className={`flex items-baseline justify-between pb-1 ${first ? 'pt-1' : 'pt-5'}`}>
      <h3 className="text-[12px] font-medium text-cream/60">{label}</h3>
      <span className="tnum text-[10.5px] text-cream/30">
        {count} transaksi · {formatIDR(total)}
      </span>
    </div>
  )
}
