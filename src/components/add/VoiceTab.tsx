import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Sparkles } from 'lucide-react'
import { categoriesFor } from '../../lib/categories'
import { draftFrom, AmountInput, CategoryPicker, DateTimeRow, NoteFields, TypeToggle, validateDraft, type Draft } from '../forms'
import { parseVoiceText, speechSupported, startListening, VOICE_EXAMPLES } from '../../lib/speech'
import { SaveAction, DetectedCard } from './shared'

export function VoiceTab({
  initial,
  onSave,
}: {
  initial: Draft
  onSave: (draft: Draft) => Promise<void>
}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [manualText, setManualText] = useState('')
  const [saving, setSaving] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const supported = speechSupported()

  useEffect(() => {
    return () => {
      stopRef.current?.()
    }
  }, [])

  const apply = (text: string) => {
    const parsed = parseVoiceText(text)
    setDraft(
      draftFrom({
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        note: parsed.note,
        merchant: parsed.merchant,
        occurredAt: parsed.occurredAt,
        source: 'voice',
        meta: { transcript: text },
      }),
    )
  }

  const start = () => {
    setError('')
    setTranscript('')
    setInterim('')
    setDraft(null)
    setListening(true)
    stopRef.current = startListening({
      onInterim: (t) => setInterim(t),
      onFinal: (t) => {
        setTranscript(t)
        setInterim('')
        apply(t)
      },
      onError: (msg) => {
        setError(msg)
        setListening(false)
      },
      onEnd: () => setListening(false),
    })
  }

  const stop = () => {
    stopRef.current?.()
    stopRef.current = null
    setListening(false)
  }

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => {
      if (!d) return d
      const next = { ...d, ...p }
      if (p.type && p.type !== d.type) next.category = categoriesFor(p.type)[0].id
      return next
    })
  }

  const handleSave = async () => {
    if (!draft) return
    const problem = validateDraft(draft)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center pt-1">
        <button
          type="button"
          onClick={listening ? stop : start}
          aria-label={listening ? 'Berhenti merekam' : 'Mulai merekam suara'}
          className="relative grid h-[86px] w-[86px] place-items-center rounded-full border border-cream/15 bg-maroon-900 text-cream transition-transform duration-200 active:scale-95"
          style={listening ? { animation: 'breathe 1.9s ease-in-out infinite' } : undefined}
        >
          {listening ? <Square size={22} fill="currentColor" /> : <Mic size={28} strokeWidth={1.5} />}
        </button>
        <p className="mt-3 text-[12.5px] text-cream/50">
          {listening ? 'Mendengarkan… bicara dengan wajar' : 'Tekan untuk mulai bicara'}
        </p>
        {!supported && (
          <p className="mt-2 max-w-xs text-center text-[11.5px] leading-relaxed text-maroon-300">
            Browser ini belum mendukung input suara. Gunakan Chrome/Edge, atau tulis kalimatnya di
            bawah.
          </p>
        )}
      </div>

      {(transcript || interim) && (
        <div className="rounded-xl border border-line bg-ink-900/50 px-4 py-3">
          <div className="label mb-1">Yang terdengar</div>
          <p className="font-display text-[19px] leading-snug text-cream/90">
            “{transcript || interim}”
            {interim && !transcript && <span className="text-cream/30"> …</span>}
          </p>
        </div>
      )}

      {!draft && (
        <div>
          <div className="label mb-2">Contoh kalimat</div>
          <div className="flex flex-wrap gap-2">
            {VOICE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setTranscript(ex)
                  apply(ex)
                }}
                className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-cream/55 transition-colors hover:border-line-strong hover:text-cream"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {!draft && (
        <div className="rounded-xl border border-line bg-ink-900/40 p-3.5">
          <div className="label mb-2">Atau ketik kalimatnya</div>
          <div className="flex gap-2">
            <input
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualText.trim()) {
                  setTranscript(manualText.trim())
                  apply(manualText.trim())
                }
              }}
              placeholder="makan siang di warung 25 ribu"
              className="field"
            />
            <button
              type="button"
              disabled={!manualText.trim()}
              onClick={() => {
                setTranscript(manualText.trim())
                apply(manualText.trim())
              }}
              className="btn-ghost shrink-0 px-3"
            >
              <Sparkles size={15} />
            </button>
          </div>
        </div>
      )}

      {draft && (
        <>
          <DetectedCard
            eyebrow="Hasil dengar"
            title={draft.amount > 0 ? 'Transaksi terbaca' : 'Nominal belum terbaca'}
            detail={
              draft.amount > 0
                ? 'Periksa sebentar, lalu simpan. Semua kolom masih bisa diubah.'
                : 'Isi nominalnya manual di bawah, sisanya sudah terisi otomatis.'
            }
            tone={draft.amount > 0 ? 'teal' : 'maroon'}
          />

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
          <SaveAction draft={draft} onSave={handleSave} saving={saving} />
          <button
            type="button"
            onClick={() => {
              setDraft(null)
              setTranscript('')
              setManualText('')
            }}
            className="w-full py-2 text-center text-[12px] text-cream/40 hover:text-cream/70"
          >
            Mulai ulang
          </button>
        </>
      )}

      {!draft && initial.amount > 0 && (
        <p className="text-center text-[11.5px] text-cream/35">
          Ada data awal yang bisa dipakai — pilih tab Ketik untuk mengeditnya.
        </p>
      )}
    </div>
  )
}
