import { useState } from 'react'
import { categoriesFor } from '../../lib/categories'
import type { Draft } from '../forms'
import {
  AmountInput,
  CategoryPicker,
  DateTimeRow,
  NoteFields,
  TypeToggle,
  validateDraft,
} from '../forms'
import { SaveAction } from './shared'

export function ManualTab({
  initial,
  onSave,
}: {
  initial: Draft
  onSave: (draft: Draft) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...p }
      if (p.type && p.type !== d.type) next.category = categoriesFor(p.type)[0].id
      return next
    })

  const handleSave = async () => {
    const problem = validateDraft(draft)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <TypeToggle value={draft.type} onChange={(type) => patch({ type })} />
      <AmountInput value={draft.amount} onChange={(amount) => patch({ amount })} autoFocus />
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
      <SaveAction draft={draft} onSave={handleSave} saving={saving} />
    </div>
  )
}
