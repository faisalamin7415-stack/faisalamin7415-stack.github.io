import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Pencil, Trash2 } from 'lucide-react'
import { categoriesFor, getCategory } from '../lib/categories'
import { deleteTransaction, updateTransaction } from '../lib/db'
import { formatIDR } from '../lib/money'
import type { Transaction } from '../lib/types'
import { useApp } from '../store/app'
import { useToast } from '../store/toast'
import {
  AmountInput,
  CategoryPicker,
  DateTimeRow,
  NoteFields,
  TypeToggle,
  draftFrom,
  validateDraft,
  type Draft,
} from './forms'
import { CategoryIcon } from './icons'
import { SOURCE_LABEL } from './TransactionList'
import { Sheet } from './ui'

export function TransactionDetail({
  tx,
  onClose,
}: {
  tx: Transaction | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const { runSync, user } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tx) return
    setEditing(false)
    setConfirmDelete(false)
    setError('')
    setDraft(
      draftFrom({
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        note: tx.note,
        merchant: tx.merchant,
        occurredAt: tx.occurredAt,
        source: tx.source,
        meta: tx.meta,
      }),
    )
  }, [tx])

  if (!tx) return null

  const cat = getCategory(draft.category)

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...p }
      if (p.type && p.type !== d.type) next.category = categoriesFor(p.type)[0].id
      return next
    })

  const handleUpdate = async () => {
    const problem = validateDraft(draft)
    if (problem) {
      setError(problem)
      return
    }
    await updateTransaction(tx.id, {
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      note: draft.note,
      merchant: draft.merchant,
      occurredAt: draft.occurredAt,
      meta: draft.meta ?? tx.meta,
    })
    toast('Transaksi diperbarui.', 'success')
    onClose()
    if (user) void runSync()
  }

  const handleDelete = async () => {
    await deleteTransaction(tx.id)
    toast('Transaksi dihapus.')
    onClose()
    if (user) void runSync()
  }

  return (
    <Sheet
      open={Boolean(tx)}
      onClose={onClose}
      title={editing ? 'Ubah transaksi' : 'Detail transaksi'}
      subtitle={editing ? 'Perbaiki bagian yang keliru, lalu simpan.' : undefined}
    >
      {!editing ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-ink-900/50 px-5 py-5 text-center">
            <div className="mx-auto flex items-center justify-center gap-2">
              <span style={{ color: cat.color }}>
                <CategoryIcon name={cat.icon} size={16} />
              </span>
              <span className="text-[11.5px] text-cream/45">{cat.label}</span>
            </div>
            <div
              className={`tnum mt-2 font-display text-[40px] leading-none tracking-tight ${
                tx.type === 'income' ? 'text-teal-300' : 'text-cream'
              }`}
            >
              {tx.type === 'income' ? '+' : '−'}
              {formatIDR(draft.amount)}
            </div>
            <div className="mt-2 text-[12.5px] text-cream/55">{draft.note || cat.label}</div>
            {draft.merchant && (
              <div className="mt-0.5 text-[11px] text-cream/35">{draft.merchant}</div>
            )}
          </div>

          <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            <Row label="Jenis" value={tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} />
            <Row
              label="Waktu"
              value={format(new Date(tx.occurredAt), "EEEE, d MMMM yyyy · HH:mm", {
                locale: localeId,
              })}
            />
            <Row label="Sumber" value={SOURCE_LABEL[tx.source]} />
            <Row label="Kategori" value={cat.label} />
            {draft.merchant && <Row label="Merchant" value={draft.merchant} />}
          </dl>

          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost flex-1">
              <Pencil size={15} /> Ubah
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn inline-flex items-center justify-center gap-2 rounded-xl border border-maroon-500/25 px-4 py-2.5 text-[13px] text-maroon-300 transition-colors hover:bg-maroon-900/25"
            >
              <Trash2 size={15} /> Hapus
            </button>
          </div>

          {confirmDelete && (
            <div className="rounded-xl border border-maroon-500/30 bg-maroon-900/20 p-3.5">
              <p className="text-[12.5px] text-maroon-300">
                Hapus transaksi ini? Tindakan ini akan ikut tersinkron ke perangkat lain.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn bg-cream px-3 py-2 text-[12px] text-ink-900 hover:bg-cream-dim"
                >
                  Ya, hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-ghost px-3 py-2 text-[12px]"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <TypeToggle value={draft.type} onChange={(type) => patch({ type })} />
          <AmountInput value={draft.amount} onChange={(amount) => patch({ amount })} />
          <CategoryPicker
            type={draft.type}
            value={draft.category}
            onChange={(category) => patch({ category })}
          />
          <NoteFields
            note={draft.note}
            merchant={draft.merchant}
            onNote={(note) => patch({ note })}
            onMerchant={(merchant) => patch({ merchant })}
          />
          <DateTimeRow value={draft.occurredAt} onChange={(occurredAt) => patch({ occurredAt })} />
          {error && <p className="text-[12px] text-maroon-300">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost flex-1">
              Batal
            </button>
            <button type="button" onClick={handleUpdate} className="btn-primary flex-1">
              Simpan perubahan
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-[11.5px] text-cream/40">{label}</dt>
      <dd className="text-right text-[12px] text-cream/80">{value}</dd>
    </div>
  )
}
