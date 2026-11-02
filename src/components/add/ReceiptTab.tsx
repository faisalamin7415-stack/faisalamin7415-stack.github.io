import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, Receipt, ScanLine } from 'lucide-react'
import { categoriesFor, guessCategory } from '../../lib/categories'
import { readReceipt, type OcrProgress } from '../../lib/ocr'
import {
  AmountInput,
  CategoryPicker,
  DateTimeRow,
  NoteFields,
  TypeToggle,
  draftFrom,
  validateDraft,
  type Draft,
} from '../forms'
import { SaveAction, DetectedCard } from './shared'

type Phase = 'idle' | 'reading' | 'done' | 'error'

export function ReceiptTab({
  onSave,
}: {
  onSave: (draft: Draft) => Promise<void>
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<OcrProgress>({ status: 'Menyiapkan', progress: 0 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [rawText, setRawText] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setPhase('reading')
    setError('')
    setDraft(null)
    setProgress({ status: 'Menyiapkan mesin OCR', progress: 0.02 })

    try {
      const result = await readReceipt(file, (p) => setProgress(p))
      setRawText(result.rawText)
      setConfidence(result.confidence)

      const context = `${result.merchant} ${result.rawText.slice(0, 400)}`
      const category = guessCategory(context, 'expense')
      setDraft(
        draftFrom({
          type: 'expense',
          amount: result.amount ?? 0,
          category,
          note: result.merchant || 'Belanja',
          merchant: result.merchant,
          occurredAt: result.date ?? new Date().toISOString(),
          source: 'receipt',
          meta: { confidence: result.confidence },
        }),
      )
      setPhase('done')
    } catch (err) {
      setError(
        err instanceof Error
          ? `Gagal membaca nota: ${err.message}`
          : 'Gagal membaca nota. Coba foto ulang dengan cahaya lebih terang.',
      )
      setPhase('error')
    }
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

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setDraft(null)
    setRawText('')
    setError('')
    setPhase('idle')
    setConfidence(0)
  }

  return (
    <div className="space-y-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {phase === 'idle' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-line bg-ink-900/50 p-4 text-left transition-colors hover:border-line-strong hover:bg-cream/[0.03]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-maroon-900/70 text-cream">
                <Camera size={18} strokeWidth={1.6} />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-cream">Ambil foto nota</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-cream/40">
                  Buka kamera langsung
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-line bg-ink-900/50 p-4 text-left transition-colors hover:border-line-strong hover:bg-cream/[0.03]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-900/80 text-cream">
                <ImageIcon size={18} strokeWidth={1.6} />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-cream">Pilih dari galeri</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-cream/40">
                  Foto yang sudah ada
                </span>
              </span>
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-line px-4 py-3.5">
            <div className="flex items-center gap-2 text-[11.5px] text-cream/45">
              <ScanLine size={14} />
              Tips: letakkan nota di permukaan rata, pastikan seluruh bagian masuk frame.
            </div>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-cream/30">
            Foto diproses di perangkat Anda. Tidak diunggah ke server mana pun.
          </p>
        </>
      )}

      {phase === 'reading' && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900">
            {preview && (
              <img src={preview} alt="Pratinjau nota" className="max-h-[38vh] w-full object-contain opacity-70" />
            )}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="h-24 w-full bg-gradient-to-b from-transparent via-cream/15 to-transparent"
                style={{ animation: 'sweep 1.8s linear infinite' }}
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-[11.5px]">
              <span className="text-cream/60">{progress.status}</span>
              <span className="tnum text-cream/40">{Math.round(progress.progress * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream/[0.07]">
              <div
                className="h-full rounded-full bg-teal-300 transition-[width] duration-300"
                style={{ width: `${Math.max(3, progress.progress * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-cream/35">
              Model OCR diunduh sekali saat pertama kali dipakai. Setelah itu bisa jalan offline.
            </p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-maroon-500/30 bg-maroon-900/20 p-4 text-[12.5px] leading-relaxed text-maroon-300">
            {error}
          </div>
          <button type="button" onClick={reset} className="btn-ghost w-full">
            Coba lagi
          </button>
        </div>
      )}

      {phase === 'done' && draft && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {preview && (
              <img
                src={preview}
                alt="Nota"
                className="h-20 w-20 shrink-0 rounded-xl border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <DetectedCard
                eyebrow="Nota terbaca"
                title={draft.merchant || 'Merchant tidak terdeteksi'}
                detail={`Akurasi OCR ${confidence}% · ${draft.amount > 0 ? 'nominal terisi otomatis' : 'nominal belum terbaca'}`}
                tone={confidence >= 60 && draft.amount > 0 ? 'teal' : 'maroon'}
              />
            </div>
          </div>

          {confidence < 60 && (
            <p className="text-[11.5px] leading-relaxed text-maroon-300">
              Hasil pembacaan kurang yakin. Periksa nominal dan merchant sebelum menyimpan.
            </p>
          )}

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

          <details className="rounded-xl border border-line bg-ink-900/40 px-3.5 py-3">
            <summary className="cursor-pointer text-[11.5px] text-cream/45 hover:text-cream/70">
              Lihat teks mentah hasil OCR
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-cream/40">
              {rawText || 'Tidak ada teks terbaca.'}
            </pre>
          </details>

          <div className="flex items-center justify-between text-[11.5px]">
            <button type="button" onClick={reset} className="text-cream/45 hover:text-cream">
              Foto ulang
            </button>
            <span className="flex items-center gap-1.5 text-cream/25">
              <Receipt size={12} /> OCR lokal
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
