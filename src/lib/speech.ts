import { guessCategory, guessType } from './categories'
import { isNativeApp } from './native'
import type { TxType } from './types'

/* ------------------------------------------------------------------ */
/*  Speech recognition (Web Speech API)                                */
/* ------------------------------------------------------------------ */

interface SpeechResultAlternative {
  transcript: string
  confidence: number
}
interface SpeechResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechResultAlternative
}
interface SpeechResultEvent {
  resultIndex: number
  results: { length: number; [index: number]: SpeechResult }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type RecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechSupported = (): boolean => isNativeApp() || getRecognitionCtor() !== null

export interface VoiceHandlers {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onError: (message: string) => void
  onEnd: () => void
}

/**
 * Di APK Android, Web Speech API tidak tersedia di WebView. Kita pakai
 * SpeechRecognizer native lewat plugin Capacitor agar input suara tetap jalan.
 */
function startNativeListening(handlers: VoiceHandlers): () => void {
  let last = ''
  let closed = false
  let stopRequested = false
  let removeListeners: (() => void) | null = null

  const end = () => {
    if (closed) return
    closed = true
    removeListeners?.()
    if (last) handlers.onFinal(last)
    handlers.onEnd()
  }

  const fail = (message: string) => {
    if (closed) return
    closed = true
    removeListeners?.()
    handlers.onError(message)
    handlers.onEnd()
  }

  void (async () => {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      if (closed) return

      const partial = await SpeechRecognition.addListener('partialResults', ({ matches }) => {
        const text = matches?.[0]?.trim()
        if (!text) return
        last = text
        handlers.onInterim(text)
      })
      const state = await SpeechRecognition.addListener('listeningState', ({ status }) => {
        if (status === 'stopped') end()
      })
      removeListeners = () => {
        void partial.remove()
        void state.remove()
      }
      if (closed) {
        removeListeners()
        return
      }

      const permission = await SpeechRecognition.requestPermissions()
      if (permission.speechRecognition !== 'granted') {
        fail('Izin mikrofon ditolak. Buka Pengaturan Android → Aplikasi → Faiz.Money → Izin → Mikrofon.')
        return
      }

      try {
        const { available } = await SpeechRecognition.available()
        if (!available) {
          fail('Pengenalan suara tidak tersedia di perangkat ini. Pasang Google App / Speech Services.')
          return
        }
      } catch {
        /* lanjut saja, sebagian perangkat tidak mendukung pengecekan */
      }

      await SpeechRecognition.start({
        language: 'id-ID',
        maxResults: 1,
        partialResults: true,
        popup: false,
      })
      if (stopRequested) await SpeechRecognition.stop()
    } catch {
      fail('Gagal memulai mikrofon. Tutup aplikasi lain yang memakai mikrofon lalu coba lagi.')
    }
  })()

  return () => {
    stopRequested = true
    void import('@capacitor-community/speech-recognition')
      .then(({ SpeechRecognition }) => SpeechRecognition.stop())
      .catch(() => {})
  }
}

export function startListening(handlers: VoiceHandlers): () => void {
  if (isNativeApp()) return startNativeListening(handlers)

  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    handlers.onError('Browser ini belum mendukung pengenalan suara. Coba Chrome atau Edge.')
    return () => {}
  }

  const rec = new Ctor()
  rec.lang = 'id-ID'
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 1

  rec.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i]
      const text = res[0]?.transcript ?? ''
      if (res.isFinal) handlers.onFinal(text.trim())
      else interim += text
    }
    if (interim) handlers.onInterim(interim.trim())
  }

  rec.onerror = (e) => {
    const map: Record<string, string> = {
      'not-allowed': 'Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.',
      'service-not-allowed': 'Layanan suara diblokir. Coba gunakan HTTPS atau browser lain.',
      'no-speech': 'Tidak ada suara terdeteksi. Coba lagi lebih dekat ke mikrofon.',
      'audio-capture': 'Mikrofon tidak ditemukan.',
      network: 'Koneksi terputus saat mengenali suara.',
    }
    handlers.onError(map[e.error] ?? `Gagal mendengar suara (${e.error}).`)
  }

  rec.onend = handlers.onEnd

  try {
    rec.start()
  } catch {
    handlers.onError('Mikrofon sedang dipakai. Tutup aplikasi lain lalu coba lagi.')
  }

  return () => {
    try {
      rec.abort()
    } catch {
      /* noop */
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Parser bahasa Indonesia                                            */
/* ------------------------------------------------------------------ */

const UNITS: Record<string, number> = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
}

const SCALES: Record<string, number> = {
  ribu: 1_000,
  rb: 1_000,
  k: 1_000,
  juta: 1_000_000,
  jt: 1_000_000,
  miliar: 1_000_000_000,
  milyar: 1_000_000_000,
}

const NUMBER_WORDS = new Set([
  ...Object.keys(UNITS),
  'sepuluh',
  'sebelas',
  'belas',
  'puluh',
  'ratus',
  'seratus',
  'seribu',
  'sejuta',
  ...Object.keys(SCALES),
])

export function wordsToNumber(text: string): number | null {
  const tokens = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (!tokens.length) return null
  if (!tokens.every((t) => NUMBER_WORDS.has(t))) return null

  let total = 0
  let section = 0
  let number = 0
  let seen = false

  for (const token of tokens) {
    if (token in UNITS) {
      number = UNITS[token]
      seen = true
    } else if (token === 'sepuluh') {
      section += 10
      seen = true
    } else if (token === 'sebelas') {
      section += 11
      seen = true
    } else if (token === 'belas') {
      section += 10 + number
      number = 0
      seen = true
    } else if (token === 'puluh') {
      section += (number || 1) * 10
      number = 0
      seen = true
    } else if (token === 'ratus') {
      section += (number || 1) * 100
      number = 0
      seen = true
    } else if (token === 'seratus') {
      section += 100
      seen = true
    } else if (token === 'seribu') {
      total += (section + number || 1) * 1_000
      section = 0
      number = 0
      seen = true
    } else if (token === 'sejuta') {
      total += (section + number || 1) * 1_000_000
      section = 0
      number = 0
      seen = true
    } else if (token in SCALES) {
      total += (section + number || 1) * SCALES[token]
      section = 0
      number = 0
      seen = true
    }
  }

  if (!seen) return null
  return total + section + number
}

function extractAmount(text: string): { amount: number; matched: string } | null {
  const lower = text.toLowerCase().replace(/rp\.?\s*/g, '')

  // 1. Angka + satuan: "25 ribu", "1,5jt", "50k"
  const withUnit = lower.match(/(\d+(?:[.,]\d+)?)\s*(miliar|milyar|juta|jt|ribu|rb|k)\b/)
  if (withUnit) {
    const base = Number(withUnit[1].replace(',', '.'))
    const factor =
      withUnit[2] === 'miliar' || withUnit[2] === 'milyar'
        ? 1_000_000_000
        : withUnit[2] === 'juta' || withUnit[2] === 'jt'
          ? 1_000_000
          : 1_000
    return { amount: Math.round(base * factor), matched: withUnit[0] }
  }

  // 2. Angka polos >= 100 (hindari menangkap "2 porsi")
  const plain = [...lower.matchAll(/\d[\d.]{2,}/g)]
    .map((m) => Number(m[0].replace(/\./g, '')))
    .filter((n) => Number.isFinite(n) && n >= 100)
  if (plain.length) {
    const amount = Math.max(...plain)
    return { amount, matched: String(amount) }
  }

  // 3. Kata bilangan: "lima puluh ribu", "seratus dua puluh lima ribu"
  const wordRuns = lower.match(
    /(?:(?:nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|seratus|seribu|sejuta|ribu|juta|miliar|milyar)\s*)+/g,
  )
  if (wordRuns) {
    for (const run of wordRuns) {
      const n = wordsToNumber(run)
      if (n && n >= 100) return { amount: n, matched: run.trim() }
    }
  }

  return null
}

export interface ParsedVoice {
  type: TxType
  amount: number
  category: string
  note: string
  merchant: string
  occurredAt: string
  transcript: string
}

const FILLER = /\b(beli|bayar|buat|untuk|habis|keluar|uang|seharga|sebesar|total|saya|aku|tadi|hari ini|kemarin|semalam)\b/gi

export function parseVoiceText(transcript: string): ParsedVoice {
  const text = transcript.trim()
  const lower = text.toLowerCase()
  const type = guessType(lower)
  const found = extractAmount(text)
  const amount = found?.amount ?? 0

  let rest = found ? text.replace(new RegExp(escapeRegex(found.matched), 'i'), ' ') : text
  rest = rest.replace(/\brp\.?\s*/gi, ' ').replace(/\s+/g, ' ').trim()

  let merchant = ''
  const merchantMatch = rest.match(/\b(?:di|ke)\s+([a-zA-Z0-9'.& ]{2,40})$/i)
  if (merchantMatch) {
    merchant = titleCase(merchantMatch[1].trim())
    rest = rest.replace(merchantMatch[0], ' ').trim()
  }

  let note = rest.replace(FILLER, ' ').replace(/\s+/g, ' ').trim()
  note = note.replace(/^[-,.\s]+|[-,.\s]+$/g, '')
  if (note) note = titleCase(note)
  if (!note && merchant) note = merchant
  if (!note) note = type === 'income' ? 'Pemasukan' : 'Pengeluaran'

  const category = guessCategory(`${lower} ${note}`, type)

  const occurred = new Date()
  if (/\b(kemarin|semalam)\b/.test(lower)) occurred.setDate(occurred.getDate() - 1)

  return {
    type,
    amount,
    category,
    note,
    merchant,
    occurredAt: occurred.toISOString(),
    transcript: text,
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

/** Contoh perintah untuk ditampilkan di UI. */
export const VOICE_EXAMPLES = [
  'Makan siang di warung Bu Tini dua puluh lima ribu',
  'Belanja di Indomaret seratus dua puluh ribu',
  'Bensin lima puluh ribu',
  'Terima gaji lima juta',
]
