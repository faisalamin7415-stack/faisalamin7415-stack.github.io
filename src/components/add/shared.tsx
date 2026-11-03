import type { ReactNode } from 'react'
import { getCategory } from '../../lib/categories'
import { formatIDR } from '../../lib/money'
import { CategoryIcon } from '../icons'
import type { Draft } from '../forms'

export function SaveAction({
  draft,
  onSave,
  saving = false,
}: {
  draft: Draft
  onSave: () => void
  saving?: boolean
}) {
  const cat = getCategory(draft.category)
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving || draft.amount <= 0}
      className="btn-primary mt-1 w-full py-3.5"
    >
      {saving ? (
        'Menyimpan…'
      ) : (
        <>
          <CategoryIcon name={cat.icon} size={16} />
          <span>
            Simpan {draft.type === 'expense' ? 'pengeluaran' : 'pemasukan'}
            {draft.amount > 0 ? ` · ${formatIDR(draft.amount)}` : ''}
          </span>
        </>
      )}
    </button>
  )
}

export function FieldShell({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>
}

export function DetectedCard({
  eyebrow,
  title,
  detail,
  tone = 'teal',
  trailing,
}: {
  eyebrow: string
  title: string
  detail?: string
  tone?: 'teal' | 'maroon' | 'neutral'
  trailing?: ReactNode
}) {
  const accent =
    tone === 'maroon' ? '#FFFFFF' : tone === 'teal' ? '#8FB8E8' : 'rgba(255,255,255,0.4)'
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-ink-900/60 p-3.5">
      <span
        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-cream/35">{eyebrow}</div>
        <div className="mt-0.5 truncate text-[13.5px] font-medium text-cream">{title}</div>
        {detail && <div className="mt-0.5 text-[11.5px] leading-snug text-cream/45">{detail}</div>}
      </div>
      {trailing}
    </div>
  )
}
