import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Apple,
  Check,
  CloudDownload,
  Code,
  Copy,
  Download as DownloadIcon,
  ExternalLink,
  Globe,
  Laptop,
  Monitor,
  Package,
  QrCode,
  RefreshCw,
  Server,
  Share2,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useApp } from '../store/app'
import { useToast } from '../store/toast'

type PlatformId = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'other'
type MirrorState = 'idle' | 'checking' | 'ok' | 'fail'

const SITE_URL = 'https://faisalamin7415-stack.github.io/'
const REPO_URL = 'https://github.com/faisalamin7415-stack/faisalamin7415-stack.github.io'
const WEB_ZIP = '/downloads/Faiz.Money-web.zip'
const RELEASE_ZIP = `${REPO_URL}/releases/latest/download/Faiz.Money-web.zip`
const SOURCE_ZIP = `${REPO_URL}/archive/refs/heads/main.zip`
const APK_SITE = '/downloads/Faiz.Money.apk'
const APK_RELEASE = `${REPO_URL}/releases/latest/download/Faiz.Money.apk`

const PLATFORMS: Array<{
  id: PlatformId
  name: string
  hint: string
  icon: typeof Smartphone
  steps: string[]
}> = [
  {
    id: 'android',
    name: 'Android',
    hint: 'APK · Android 6.0+',
    icon: Smartphone,
    steps: [
      'Unduh file Faiz.Money.apk.',
      'Buka file, lalu izinkan “Instal dari sumber tidak dikenal” bila diminta.',
      'Aplikasi terpasang dengan ikon Faiz.Money, tanpa browser.',
    ],
  },
  {
    id: 'ios',
    name: 'iPhone & iPad',
    hint: 'Safari · iOS 16.4+',
    icon: Apple,
    steps: [
      'Buka situs ini di Safari (bukan Chrome).',
      'Tap tombol Bagikan.',
      'Pilih “Tambahkan ke Layar Utama”.',
    ],
  },
  {
    id: 'windows',
    name: 'Windows',
    hint: 'Chrome · Edge',
    icon: Monitor,
    steps: [
      'Buka situs ini di Chrome atau Edge.',
      'Klik ikon instal di address bar.',
      'Pilih “Instal”.',
    ],
  },
  {
    id: 'macos',
    name: 'macOS',
    hint: 'Chrome · Edge · Safari 17+',
    icon: Laptop,
    steps: [
      'Buka di Chrome, Edge, atau Safari 17+.',
      'Chrome/Edge: klik ikon instal di address bar.',
      'Safari: menu File → “Tambahkan ke Dock”.',
    ],
  },
  {
    id: 'linux',
    name: 'Linux',
    hint: 'Chrome · Chromium',
    icon: Globe,
    steps: [
      'Buka situs ini di Chrome atau Chromium.',
      'Klik ikon instal di address bar.',
      'Pilih “Instal”.',
    ],
  },
  {
    id: 'other',
    name: 'Perangkat lain',
    hint: 'Browser modern apa pun',
    icon: Globe,
    steps: [
      'Buka di browser modern (Chrome, Edge, atau Safari).',
      'Cari menu “Instal aplikasi” atau “Tambahkan ke Layar Utama”.',
      'Konfirmasi untuk memasang.',
    ],
  },
]

const MIRRORS = [
  {
    id: 'site',
    name: 'Situs ini',
    detail: 'Unduh langsung dari GitHub Pages',
    url: WEB_ZIP,
    icon: Server,
    badge: 'Tercepat',
    cross: false,
  },
  {
    id: 'release',
    name: 'GitHub Releases',
    detail: 'Mirror cadangan resmi',
    url: RELEASE_ZIP,
    icon: CloudDownload,
    badge: 'Cadangan',
    cross: true,
  },
  {
    id: 'source',
    name: 'Kode sumber',
    detail: 'Arsip branch main (ZIP)',
    url: SOURCE_ZIP,
    icon: Code,
    badge: 'Sumber',
    cross: true,
  },
] as const

interface Latest {
  file?: string
  version?: string
  size?: number
  sha256?: string
  builtAt?: string
  apk?: {
    file?: string
    version?: string
    size?: number
    sha256?: string
  }
}

function detectPlatform(): PlatformId {
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) return 'android'
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    return 'ios'
  if (/win/.test(ua)) return 'windows'
  if (/mac/.test(ua)) return 'macos'
  if (/linux/.test(ua)) return 'linux'
  return 'other'
}

function formatBytes(value?: number) {
  if (!value) return '±0,8 MB'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

export function Download() {
  const { canInstall, installApp } = useApp()
  const { toast } = useToast()
  const detected = useMemo(detectPlatform, [])
  const [mirrorId, setMirrorId] = useState<string>('site')
  const [status, setStatus] = useState<Record<string, MirrorState>>({})
  const [latest, setLatest] = useState<Latest | null>(null)
  const [copied, setCopied] = useState(false)

  const platform = PLATFORMS.find((p) => p.id === detected) ?? PLATFORMS[PLATFORMS.length - 1]
  const selected = MIRRORS.find((m) => m.id === mirrorId) ?? MIRRORS[0]

  const checkMirrors = useCallback(async () => {
    setStatus(Object.fromEntries(MIRRORS.map((m) => [m.id, 'checking'])) as Record<string, MirrorState>)
    await Promise.all(
      MIRRORS.map(async (mirror) => {
        try {
          const res = await fetch(
            mirror.url,
            mirror.cross
              ? { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }
              : { method: 'HEAD', cache: 'no-store' },
          )
          if (!mirror.cross && !res.ok) throw new Error('unreachable')
          setStatus((prev) => ({ ...prev, [mirror.id]: 'ok' }))
        } catch {
          setStatus((prev) => ({ ...prev, [mirror.id]: 'fail' }))
        }
      }),
    )
  }, [])

  useEffect(() => {
    void checkMirrors()
  }, [checkMirrors])

  useEffect(() => {
    let alive = true
    fetch('/downloads/latest.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Latest | null) => {
        if (alive && data) setLatest(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const share = async () => {
    const payload = {
      title: 'Faiz.Money',
      text: 'Catat pengeluaran & pemasukan lewat suara, foto nota, dan QRIS.',
      url: SITE_URL,
    }
    if (navigator.share) {
      try {
        await navigator.share(payload)
        return
      } catch {
        /* dibatalkan pengguna */
      }
    }
    try {
      await navigator.clipboard.writeText(SITE_URL)
      toast('Tautan disalin ke clipboard.', 'success')
    } catch {
      toast('Salin manual: ' + SITE_URL)
    }
  }

  const copySite = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL)
      toast('Tautan disalin ke clipboard.', 'success')
    } catch {
      toast('Salin manual: ' + SITE_URL)
    }
  }

  const copyHash = async () => {
    if (!latest?.sha256) return
    try {
      await navigator.clipboard.writeText(latest.sha256)
      setCopied(true)
      toast('SHA-256 disalin.', 'success')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast('Gagal menyalin checksum.', 'error')
    }
  }

  const install = () => {
    if (canInstall) {
      void installApp()
      return
    }
    document.getElementById(`platform-${platform.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    toast(`Ikuti langkah pemasangan untuk ${platform.name}.`)
  }

  return (
    <div className="animate-fade-up">
      <p className="label">Pusat unduhan</p>
      <h1 className="mt-2 font-display text-[32px] leading-[1.05] tracking-tight text-cream sm:text-[42px]">
        Satu aplikasi,
        <br />
        <span className="text-teal-300">semua perangkat.</span>
      </h1>
      <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-cream/45">
        Di Android, unduh file APK dan pasang seperti aplikasi biasa — bukan sekadar bookmark
        browser. Di iPhone, Windows, macOS, dan Linux, Faiz.Money dipasang sebagai PWA.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {detected === 'android' ? (
          <a href={APK_RELEASE} className="btn-primary px-5 py-3">
            <DownloadIcon size={16} /> Unduh APK Android
          </a>
        ) : (
          <button type="button" onClick={install} className="btn-primary px-5 py-3">
            <DownloadIcon size={16} />
            {canInstall ? 'Pasang sekarang' : `Cara pasang di ${platform.name}`}
          </button>
        )}
        <button type="button" onClick={() => void share()} className="btn-ghost">
          <Share2 size={15} /> Bagikan
        </button>
        <a href="#beranda" className="btn-ghost">
          <ExternalLink size={15} /> Buka aplikasi
        </a>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="chip border-teal-500/30 text-teal-200">
          <ShieldCheck size={12} /> 100% lokal
        </span>
        <span className="chip">
          <Wifi size={12} /> Bisa offline
        </span>
        <span className="chip">
          <Globe size={12} /> Tanpa toko aplikasi
        </span>
      </div>

      <div className="card mt-6 flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-900 text-cream">
          <platform.icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-cream/35">Terdeteksi</div>
          <div className="truncate text-[13.5px] font-medium text-cream">{platform.name}</div>
          <div className="text-[11.5px] text-cream/40">
            {detected === 'android'
              ? 'APK siap diunduh dan dipasang langsung.'
              : canInstall
                ? 'Siap dipasang sekarang.'
                : 'Ikuti panduan di bawah.'}
          </div>
        </div>
        <span className={`chip ${canInstall || detected === 'android' ? 'border-teal-500/30 text-teal-200' : ''}`}>
          {detected === 'android' ? 'APK' : canInstall ? 'Siap' : 'PWA'}
        </span>
      </div>

      {/* ---------------- platform guide ---------------- */}
      <section id="panduan" className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[24px] leading-tight text-cream">Pilih perangkat</h2>
            <p className="text-[11.5px] text-cream/40">Panduan pemasangan per platform.</p>
          </div>
          <span className="chip">{PLATFORMS.length} platform</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PLATFORMS.map((item) => {
            const Icon = item.icon
            const active = item.id === detected
            return (
              <article
                key={item.id}
                id={`platform-${item.id}`}
                className={`card p-4 transition-colors ${
                  active ? 'border-teal-500/40 bg-teal-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-ink-900/60 text-cream/80">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13.5px] font-medium text-cream">{item.name}</h3>
                      {active && (
                        <span className="chip border-teal-500/30 px-1.5 py-0 text-[9.5px] text-teal-200">
                          Anda
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-cream/40">{item.hint}</p>
                  </div>
                </div>

                <ol className="mt-3 space-y-1.5">
                  {item.steps.map((step, index) => (
                    <li key={step} className="flex gap-2 text-[11.5px] leading-relaxed text-cream/50">
                      <span className="tnum shrink-0 text-cream/25">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                {active && item.id === 'android' && (
                  <a href={APK_RELEASE} className="btn-primary mt-3 w-full py-2.5 text-[12.5px]">
                    <DownloadIcon size={14} /> Unduh APK Android
                  </a>
                )}

                {active && item.id !== 'android' && canInstall && (
                  <button
                    type="button"
                    onClick={() => void installApp()}
                    className="btn-primary mt-3 w-full py-2.5 text-[12.5px]"
                  >
                    <DownloadIcon size={14} /> Pasang di perangkat ini
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {/* ---------------- Android APK ---------------- */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Smartphone size={15} className="text-teal-300" />
            <h2 className="text-[13.5px] font-medium text-cream">Aplikasi Android (APK)</h2>
            <span className="chip border-teal-500/30 px-1.5 py-0 text-[9.5px] text-teal-200">
              {latest?.apk?.version ? `v${latest.apk.version}` : 'Terbaru'}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-cream/40">
            File aplikasi asli untuk Android. Seluruh aset sudah dibundel di dalam APK, jadi
            aplikasi tetap jalan tanpa situs web dan tanpa koneksi.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-900/40 px-3.5 py-3">
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-medium text-cream">Faiz.Money.apk</div>
              <div className="text-[10.5px] text-cream/35">
                {formatBytes(latest?.apk?.size ?? latest?.size)}
                {latest?.apk?.version ? ` · v${latest.apk.version}` : ' · build terbaru'}
              </div>
            </div>
            <span className="chip shrink-0 border-teal-500/30 text-teal-200">
              <ShieldCheck size={11} /> APK
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href={APK_RELEASE} className="btn-primary justify-center py-3">
              <DownloadIcon size={15} /> Unduh APK
            </a>
            <a href={APK_SITE} className="btn-ghost justify-center py-3">
              <Server size={15} /> Mirror situs
            </a>
          </div>

          <div className="mt-3 min-w-0 rounded-xl border border-line bg-ink-900/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-cream/35">SHA-256 APK</span>
              <button
                type="button"
                onClick={() => {
                  const hash = latest?.apk?.sha256
                  if (!hash) return
                  void navigator.clipboard
                    .writeText(hash)
                    .then(() => toast('SHA-256 APK disalin.', 'success'))
                    .catch(() => toast('Gagal menyalin checksum.', 'error'))
                }}
                disabled={!latest?.apk?.sha256}
                aria-label="Salin checksum SHA-256 APK"
                className="text-cream/40 transition-colors hover:text-cream disabled:opacity-40"
              >
                <Copy size={13} />
              </button>
            </div>
            <code className="mt-1 block truncate font-mono text-[10px] text-cream/55">
              {latest?.apk?.sha256 ?? 'Tersedia setelah build berikutnya'}
            </code>
          </div>
        </div>

        <div className="card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-[13.5px] font-medium text-cream">Cara memasang APK</h2>
          <ol className="mt-3 space-y-2.5">
            {[
              'Unduh Faiz.Money.apk lewat tombol di samping.',
              'Buka file dari notifikasi atau folder Unduhan.',
              'Jika diminta, aktifkan “Instal dari sumber tidak dikenal” untuk aplikasi file manager/browser.',
              'Tap Instal, lalu buka Faiz.Money dari layar utama.',
            ].map((step, index) => (
              <li key={step} className="flex gap-2 text-[11.5px] leading-relaxed text-cream/50">
                <span className="tnum shrink-0 text-cream/25">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex gap-2 text-[10.5px] leading-relaxed text-cream/30">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            APK ini ditandatangani sendiri (bukan dari Play Store). Android akan menampilkan
            peringatan standar saat pemasangan dari luar toko aplikasi.
          </p>
        </div>
      </section>

      {/* ---------------- download mirrors ---------------- */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-cream/50" />
            <h2 className="text-[13.5px] font-medium text-cream">Paket web offline</h2>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-cream/40">
            Untuk iPhone, Windows, macOS, dan Linux: arsip build siap pasang di hosting sendiri.
            Pilih mirror, lalu unduh.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-ink-900/40 px-3.5 py-3">
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-medium text-cream">Faiz.Money-web.zip</div>
              <div className="text-[10.5px] text-cream/35">
                {formatBytes(latest?.size)}
                {latest?.version ? ` · v${latest.version}` : ' · build terbaru'}
              </div>
            </div>
            <span className="chip shrink-0 border-teal-500/30 text-teal-200">
              <ShieldCheck size={11} /> ZIP
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {MIRRORS.map((mirror) => {
              const Icon = mirror.icon
              const active = mirror.id === mirrorId
              return (
                <label
                  key={mirror.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                    active
                      ? 'border-teal-500/40 bg-teal-900/15'
                      : 'border-line hover:border-line-strong hover:bg-cream/[0.03]'
                  }`}
                >
                  <input
                    type="radio"
                    name="mirror"
                    value={mirror.id}
                    checked={active}
                    onChange={() => setMirrorId(mirror.id)}
                    className="sr-only"
                  />
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      active ? 'bg-teal-900 text-cream' : 'bg-ink-800 text-cream/60'
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-cream">
                      {mirror.name}
                      <span className="chip px-1.5 py-0 text-[9px]">{mirror.badge}</span>
                    </span>
                    <span className="block truncate text-[10.5px] text-cream/35">{mirror.detail}</span>
                  </span>
                  <MirrorStatus state={status[mirror.id]} />
                </label>
              )
            })}
          </div>

          <a
            href={selected.url}
            download={selected.cross ? undefined : 'Faiz.Money-web.zip'}
            className="btn-primary mt-4 w-full py-3"
          >
            <DownloadIcon size={16} />
            {selected.id === 'source' ? 'Unduh kode sumber' : 'Unduh paket web'}
          </a>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void checkMirrors()}
              className="text-[11px] text-cream/40 transition-colors hover:text-cream"
            >
              <RefreshCw size={12} className="mr-1 inline" /> Cek mirror
            </button>
            <a
              href={`${REPO_URL}/releases`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-cream/40 transition-colors hover:text-cream"
            >
              Semua rilis <ExternalLink size={11} className="ml-0.5 inline" />
            </a>
          </div>
        </div>

        <div className="card min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img
              src="/qr-download.png"
              alt="QR untuk membuka Faiz.Money di perangkat lain"
              className="h-24 w-24 rounded-xl bg-white p-1.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-cream">
                <QrCode size={14} /> Buka di HP
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-cream/40">
                Scan untuk membuka situs di perangkat lain.
              </p>
              <button
                type="button"
                onClick={() => void copySite()}
                className="mt-2 text-[10.5px] text-teal-300 hover:underline"
              >
                Salin tautan
              </button>
            </div>
          </div>

          <div className="mt-4 min-w-0 rounded-xl border border-line bg-ink-900/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-cream/35">SHA-256</span>
              <button
                type="button"
                onClick={() => void copyHash()}
                disabled={!latest?.sha256}
                aria-label="Salin checksum SHA-256"
                className="text-cream/40 transition-colors hover:text-cream disabled:opacity-40"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <code className="mt-1 block truncate font-mono text-[10px] text-cream/55">
              {latest?.sha256 ?? 'Tersedia setelah build berikutnya'}
            </code>
          </div>

          <p className="mt-4 flex gap-2 text-[10.5px] leading-relaxed text-cream/30">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            APK hanya untuk Android. iPhone, Windows, macOS, dan Linux memakai paket web/PWA
            karena sistemnya tidak mengizinkan pemasangan file aplikasi di luar toko resmi.
          </p>
        </div>
      </section>

      {/* ---------------- faq ---------------- */}
      <section className="card mt-8 p-4 sm:p-5">
        <h2 className="font-display text-[22px] leading-tight text-cream">Pertanyaan singkat</h2>
        <div className="mt-3 divide-y divide-line/70">
          {[
            [
              'Apakah ada file APK?',
              'Ya, khusus Android. Unduh Faiz.Money.apk, buka filenya, lalu izinkan pemasangan dari sumber tidak dikenal. Di iPhone dan komputer, Faiz.Money dipasang sebagai PWA.',
            ],
            [
              'Apakah APK-nya dari Play Store?',
              'Bukan. APK ini ditandatangani sendiri dan dipasang langsung (sideload). Android akan menampilkan peringatan standar sebelum pemasangan.',
            ],
            [
              'Apakah data saya ikut terunduh?',
              'Tidak. Data transaksi tersimpan di perangkat. File APK/ZIP hanya berisi aplikasi, bukan data pengguna.',
            ],
            [
              'Bisa dipakai tanpa internet?',
              'Bisa. Di APK, seluruh tampilan, mesin OCR, dan model bahasa sudah dibundel. Di versi web, service worker menyimpan tampilan setelah dibuka sekali.',
            ],
          ].map(([question, answer]) => (
            <details key={question} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12.5px] font-medium text-cream/80">
                {question}
                <span className="text-cream/30 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-[11.5px] leading-relaxed text-cream/45">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function MirrorStatus({ state }: { state?: MirrorState }) {
  if (state === 'checking') {
    return <RefreshCw size={13} className="shrink-0 animate-spin text-cream/40" />
  }
  if (state === 'ok') {
    return (
      <span className="flex shrink-0 items-center gap-1 text-[9.5px] text-teal-300">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Online
      </span>
    )
  }
  if (state === 'fail') {
    return (
      <span className="flex shrink-0 items-center gap-1 text-[9.5px] text-cream/35">
        <WifiOff size={11} /> Gagal
      </span>
    )
  }
  return null
}
