import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { QrCode, ScanLine, ShieldCheck, Upload } from 'lucide-react'
import { categoriesFor, guessCategory } from '../../lib/categories'
import { normalizeQrText, parseQris, type QrisData } from '../../lib/qris'
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

type Phase = 'idle' | 'scanning' | 'found' | 'error'

export function QrisTab({ onSave }: { onSave: (draft: Draft) => Promise<void> }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [qr, setQr] = useState<QrisData | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const handleDetected = useCallback(
    (text: string) => {
      const data = parseQris(normalizeQrText(text))
      if (!data) {
        setError('QR terbaca, tapi bukan QRIS yang valid. Coba arahkan ke kode QRIS merchant.')
        return
      }
      stopCamera()
      setQr(data)
      setError('')
      setDraft(
        draftFrom({
          type: 'expense',
          amount: data.amount ?? 0,
          category: guessCategory(data.merchantName, 'expense'),
          note: data.merchantName || 'Pembayaran QRIS',
          merchant: data.merchantName,
          source: 'qris',
          meta: { nmid: data.nmid, city: data.city, crcValid: data.valid },
        }),
      )
      setPhase('found')
    },
    [stopCamera],
  )

  const startCamera = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Kamera tidak tersedia di perangkat ini. Unggah gambar QRIS sebagai gantinya.')
      setPhase('error')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      setPhase('scanning')
    } catch {
      setError('Izin kamera ditolak. Aktifkan kamera di pengaturan browser, atau unggah gambar QRIS.')
      setPhase('error')
    }
  }

  useEffect(() => {
    if (phase !== 'scanning') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    void video.play().catch(() => {})

    let last = 0
    const tick = (now: number) => {
      if (now - last > 120) {
        last = now
        const canvas = canvasRef.current
        const v = videoRef.current
        if (canvas && v && v.readyState === 4 && v.videoWidth) {
          const w = v.videoWidth
          const h = v.videoHeight
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(v, 0, 0, w, h)
            const frame = ctx.getImageData(0, 0, w, h)
            const code = jsQR(frame.data, w, h, { inversionAttempts: 'attemptBoth' })
            if (code?.data) {
              handleDetected(code.data)
              return
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, handleDetected])

  const handleImage = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas tidak tersedia')
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(frame.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })
      if (!code?.data) {
        setError('Tidak ada QR yang terbaca dari gambar itu. Coba foto yang lebih jelas.')
        setPhase('error')
        return
      }
      handleDetected(code.data)
    } catch {
      setError('Gagal membaca gambar. Coba file lain.')
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
    stopCamera()
    setPhase('idle')
    setQr(null)
    setDraft(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void handleImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {phase === 'idle' && (
        <>
          <div className="rounded-2xl border border-line bg-ink-900/40 p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cream/15 bg-maroon-900/60 text-cream">
              <QrCode size={26} strokeWidth={1.4} />
            </span>
            <p className="mt-3 font-display text-[21px] text-cream">Scan QRIS merchant</p>
            <p className="mx-auto mt-1 max-w-[19rem] text-[12px] leading-relaxed text-cream/45">
              Arahkan kamera ke kode QRIS. Nama merchant dan nominal langsung terisi otomatis.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => void startCamera()} className="btn-primary w-full py-3">
                <ScanLine size={16} /> Buka kamera
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost w-full">
                <Upload size={15} /> Unggah gambar QRIS
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-ink-900/30 p-3.5 text-[11px] leading-relaxed text-cream/40">
            <span className="font-medium text-cream/60">Catatan jujur:</span> DANA, GoPay, dan SeaBank
            tidak menyediakan API publik untuk menarik riwayat transaksi pribadi. Jadi aplikasi ini
            mencatat pengeluaran QRIS lewat scan — cepat, tanpa ketik, dan tetap rapi di satu tempat.
          </div>
        </>
      )}

      {phase === 'scanning' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-square w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative h-[62%] w-[62%] rounded-2xl border border-cream/50">
                <span className="absolute -left-px -top-px h-6 w-6 rounded-tl-2xl border-l-2 border-t-2 border-cream" />
                <span className="absolute -right-px -top-px h-6 w-6 rounded-tr-2xl border-r-2 border-t-2 border-cream" />
                <span className="absolute -bottom-px -left-px h-6 w-6 rounded-bl-2xl border-b-2 border-l-2 border-cream" />
                <span className="absolute -bottom-px -right-px h-6 w-6 rounded-br-2xl border-b-2 border-r-2 border-cream" />
                <div
                  className="absolute inset-x-2 top-1/2 h-0.5 bg-cream/70 shadow-[0_0_12px_rgba(245,218,191,0.7)]"
                  style={{ animation: 'sweep 2s ease-in-out infinite alternate' }}
                />
              </div>
            </div>
          </div>
          <p className="text-center text-[12px] text-cream/45">Mencari kode QRIS…</p>
          {error && (
            <p className="rounded-lg border border-maroon-500/25 bg-maroon-900/20 px-3 py-2 text-center text-[11.5px] leading-relaxed text-maroon-300">
              {error}
            </p>
          )}
          <button type="button" onClick={reset} className="btn-ghost w-full">
            Batal
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-maroon-500/30 bg-maroon-900/20 p-4 text-[12.5px] leading-relaxed text-maroon-300">
            {error}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void startCamera()} className="btn-ghost">
              Coba kamera
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost">
              Unggah gambar
            </button>
          </div>
          <button type="button" onClick={reset} className="w-full py-2 text-[12px] text-cream/40">
            Kembali
          </button>
        </div>
      )}

      {phase === 'found' && qr && draft && (
        <div className="space-y-4">
          <DetectedCard
            eyebrow="QRIS terdeteksi"
            title={qr.merchantName || 'Merchant tanpa nama'}
            detail={[qr.city, qr.nmid ? `NMID ${qr.nmid}` : ''].filter(Boolean).join(' · ')}
            tone="teal"
            trailing={
              qr.valid ? (
                <span className="chip shrink-0 border-teal-500/30 text-teal-300">
                  <ShieldCheck size={12} /> Valid
                </span>
              ) : (
                <span className="chip shrink-0 border-maroon-500/30 text-maroon-300">CRC?</span>
              )
            }
          />

          {qr.amount === null && (
            <div className="rounded-xl border border-cream/15 bg-cream/[0.04] px-3.5 py-3 text-[11.5px] leading-relaxed text-cream/55">
              Ini QRIS statis (tanpa nominal). Masukkan jumlah yang kamu bayar di kolom nominal.
            </div>
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
          <button
            type="button"
            onClick={reset}
            className="w-full py-2 text-center text-[12px] text-cream/40 hover:text-cream/70"
          >
            Scan ulang
          </button>
        </div>
      )}
    </div>
  )
}
