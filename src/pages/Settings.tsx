import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  Check,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  User,
  WifiOff,
} from 'lucide-react'
import { buildBackup, clearAllData, db, restoreBackup, setSetting, type BackupFile } from '../lib/db'
import { formatIDR } from '../lib/money'
import { useApp } from '../store/app'
import { useToast } from '../store/toast'
import { Spinner } from '../components/ui'

export function Settings() {
  const {
    cloud,
    user,
    signIn,
    signUp,
    signOut,
    runSync,
    syncState,
    syncError,
    lastSyncAt,
    profileName,
    setProfileName,
    canInstall,
    installApp,
  } = useApp()
  const { toast } = useToast()

  const [name, setName] = useState(profileName)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const all = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const active = all.filter((t) => !t.deleted)
  const income = active.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = active.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setAuthError('')
    try {
      if (authMode === 'login') {
        await signIn(email.trim(), password)
        toast('Berhasil masuk. Data mulai disinkronkan.', 'success')
      } else {
        const message = await signUp(email.trim(), password)
        toast(message, 'success')
        setAuthMode('login')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  const exportJson = async () => {
    const backup = await buildBackup()
    download(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      `faiz-money-${format(new Date(), 'yyyy-MM-dd')}.json`,
    )
    toast('Backup JSON diunduh.', 'success')
  }

  const exportCsv = () => {
    const header = ['Tanggal', 'Jam', 'Jenis', 'Kategori', 'Catatan', 'Merchant', 'Nominal', 'Sumber']
    const rows = active.map((t) => {
      const d = new Date(t.occurredAt)
      return [
        format(d, 'yyyy-MM-dd'),
        format(d, 'HH:mm'),
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.category,
        t.note,
        t.merchant,
        String(t.amount),
        t.source,
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    download(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }),
      `faiz-money-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    )
    toast('CSV diunduh, siap dibuka di Excel.', 'success')
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as BackupFile
      const count = await restoreBackup(parsed, 'merge')
      await setSetting('lastImportAt', new Date().toISOString())
      toast(`${count} transaksi diimpor.`, 'success')
      if (user) void runSync()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'File backup tidak valid.', 'error')
    }
  }

  const handleClear = async () => {
    await clearAllData()
    setConfirmClear(false)
    toast('Semua data di perangkat ini dihapus.')
  }

  const saveName = () => {
    setProfileName(name)
    toast('Nama profil disimpan.', 'success')
  }

  return (
    <div className="animate-fade-up space-y-5">
      <header>
        <h1 className="font-display text-[28px] leading-tight text-cream sm:text-[32px]">
          Pengaturan
        </h1>
        <p className="mt-1 text-[11.5px] text-cream/40">
          Kelola profil, sinkronisasi, dan data Anda.
        </p>
      </header>

      {/* profile */}
      <section className="card p-4 sm:p-5">
        <SectionHead
          icon={<User size={15} />}
          title="Profil"
          description="Nama ini hanya tampil di perangkat Anda."
        />
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-maroon-900/70 font-display text-[20px] text-cream">
            {(name || 'F').charAt(0).toUpperCase()}
          </span>
          <div className="flex flex-1 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Nama panggilan"
              className="field"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={!name.trim() || name === profileName}
              className="btn-primary shrink-0 px-4"
            >
              Simpan
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Transaksi" value={String(active.length)} />
          <MiniStat label="Masuk" value={formatIDR(income)} />
          <MiniStat label="Keluar" value={formatIDR(expense)} />
        </div>
      </section>

      {/* cloud */}
      <section className="card p-4 sm:p-5">
        <SectionHead
          icon={<Cloud size={15} />}
          title="Sinkronisasi cloud"
          description="Pakai satu akun di HP, laptop, dan tablet."
          trailing={
            user ? (
              <span className="chip border-teal-500/30 text-teal-300">
                <Check size={11} /> Terhubung
              </span>
            ) : (
              <span className="chip">{cloud ? 'Belum masuk' : 'Belum aktif'}</span>
            )
          }
        />

        {!cloud && (
          <div className="mt-4 space-y-3">
            <p className="text-[12.5px] leading-relaxed text-cream/50">
              Aplikasi berjalan penuh secara lokal. Untuk sinkronisasi antar perangkat, sambungkan
              Supabase (gratis) dengan tiga langkah:
            </p>
            <ol className="space-y-2 text-[12px] leading-relaxed text-cream/45">
              <li className="flex gap-2">
                <span className="tnum text-cream/25">01</span>
                Buat project di supabase.com, lalu buka SQL Editor.
              </li>
              <li className="flex gap-2">
                <span className="tnum text-cream/25">02</span>
                Jalankan isi file <code className="rounded bg-ink-900 px-1 py-0.5 text-[11px] text-cream/70">supabase/schema.sql</code>.
              </li>
              <li className="flex gap-2">
                <span className="tnum text-cream/25">03</span>
                Isi <code className="rounded bg-ink-900 px-1 py-0.5 text-[11px] text-cream/70">.env.local</code> lalu build ulang.
              </li>
            </ol>
            <pre className="overflow-x-auto rounded-xl border border-line bg-ink-950/70 p-3 font-mono text-[10.5px] leading-relaxed text-cream/55">
              {`VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
            </pre>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-cream/30">
              <WifiOff size={13} className="mt-0.5 shrink-0" />
              Tanpa cloud, semua data tetap aman di perangkat dan bisa dipindahkan lewat backup
              JSON.
            </p>
          </div>
        )}

        {cloud && !user && (
          <form onSubmit={submitAuth} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors ${
                  authMode === 'login'
                    ? 'border-cream/30 bg-cream/[0.07] text-cream'
                    : 'border-line text-cream/45'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors ${
                  authMode === 'register'
                    ? 'border-cream/30 bg-cream/[0.07] text-cream'
                    : 'border-line text-cream/45'
                }`}
              >
                Daftar
              </button>
            </div>

            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                autoComplete="email"
                className="field pl-10"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi (min. 6 karakter)"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                className="field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/35 hover:text-cream"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {authError && (
              <p className="rounded-lg border border-maroon-500/25 bg-maroon-900/20 px-3 py-2 text-[11.5px] text-maroon-300">
                {authError}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? <Spinner /> : <Cloud size={15} />}
              {authMode === 'login' ? 'Masuk ke akun' : 'Buat akun baru'}
            </button>

            <p className="text-[10.5px] leading-relaxed text-cream/30">
              Transaksi yang sudah ada di perangkat ini akan otomatis diunggah ke akun setelah
              masuk.
            </p>
          </form>
        )}

        {cloud && user && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-line bg-ink-900/40 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] text-cream/80">{user.email}</div>
                  <div className="mt-0.5 text-[10.5px] text-cream/35">
                    {lastSyncAt
                      ? `Terakhir sinkron ${format(new Date(lastSyncAt), 'd MMM yyyy, HH:mm', { locale: localeId })}`
                      : 'Belum pernah sinkron'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void runSync()}
                  disabled={syncState === 'syncing'}
                  className="btn-ghost shrink-0 px-3 py-2 text-[11.5px]"
                >
                  {syncState === 'syncing' ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Sinkron
                </button>
              </div>
              {syncError && (
                <p className="mt-2 text-[11px] leading-relaxed text-maroon-300">{syncError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-ghost w-full justify-center text-[12px]"
            >
              <LogOut size={14} /> Keluar dari akun
            </button>
            <p className="text-[10.5px] leading-relaxed text-cream/30">
              Setelah keluar, data tetap tersimpan di perangkat dan bisa dipakai offline.
            </p>
          </div>
        )}
      </section>

      {/* install */}
      <section className="card p-4 sm:p-5">
        <SectionHead
          icon={<Smartphone size={15} />}
          title="Pasang di perangkat"
          description="Satu aplikasi untuk Android, iPhone, Windows, dan Mac."
        />
        <div className="mt-4 space-y-2.5">
          {canInstall && (
            <button type="button" onClick={() => void installApp()} className="btn-primary w-full py-3">
              <Download size={16} /> Pasang Faiz.Money sekarang
            </button>
          )}
          <a href="#unduh" className="btn-ghost w-full justify-center py-2.5 text-[12px]">
            <Download size={14} /> Buka pusat unduhan
          </a>
          <ul className="space-y-2 text-[11.5px] leading-relaxed text-cream/45">
            <li className="flex gap-2">
              <span className="text-cream/25">iPhone</span>
              Safari → tombol Bagikan → “Tambahkan ke Layar Utama”.
            </li>
            <li className="flex gap-2">
              <span className="text-cream/25">Android</span>
              Chrome → menu ⋮ → “Instal aplikasi” / “Tambahkan ke layar utama”.
            </li>
            <li className="flex gap-2">
              <span className="text-cream/25">Desktop</span>
              Chrome/Edge → ikon instal di kanan address bar.
            </li>
          </ul>
        </div>
      </section>

      {/* data */}
      <section className="card p-4 sm:p-5">
        <SectionHead
          icon={<Database size={15} />}
          title="Data & cadangan"
          description="Data milik Anda. Bawa ke mana saja."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => void exportJson()} className="btn-ghost justify-start">
            <Download size={15} /> Backup JSON
          </button>
          <button type="button" onClick={exportCsv} className="btn-ghost justify-start">
            <FileText size={15} /> Ekspor CSV (Excel)
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="btn-ghost justify-start"
          >
            <Upload size={15} /> Impor backup
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="btn justify-start border border-maroon-500/25 text-maroon-300 hover:bg-maroon-900/20"
          >
            <Trash2 size={15} /> Hapus data lokal
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void handleImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {confirmClear && (
          <div className="mt-3 rounded-xl border border-maroon-500/30 bg-maroon-900/20 p-3.5">
            <p className="text-[12px] leading-relaxed text-maroon-300">
              Hapus seluruh transaksi di perangkat ini? Data di cloud (jika ada) tidak terhapus dan
              akan kembali saat sinkron berikutnya.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void handleClear()}
                className="btn bg-maroon-700 px-3 py-2 text-[12px] text-cream hover:bg-maroon-500"
              >
                Ya, hapus
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="btn-ghost px-3 py-2 text-[12px]"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </section>

      {/* about */}
      <section className="card p-4 sm:p-5">
        <SectionHead
          icon={<ShieldCheck size={15} />}
          title="Tentang & privasi"
          description="Faiz.Money versi 1.0.0"
        />
        <div className="mt-4 space-y-2.5 text-[11.5px] leading-relaxed text-cream/40">
          <p>
            OCR nota diproses sepenuhnya di perangkat. Foto tidak dikirim ke server. QRIS dibaca
            secara lokal dari kamera atau gambar.
          </p>
          <p>
            Riwayat DANA, GoPay, dan SeaBank tidak dapat ditarik otomatis karena penyedia tersebut
            tidak membuka API publik untuk transaksi pribadi. Gunakan scan QRIS atau foto nota agar
            tetap tercatat tanpa mengetik.
          </p>
          <p className="text-cream/25">
            Dibuat untuk Faiz. Uang rapi, hidup tenang.
          </p>
        </div>
      </section>
    </div>
  )
}

function SectionHead({
  icon,
  title,
  description,
  trailing,
}: {
  icon: ReactNode
  title: string
  description: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-cream/55">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[13.5px] font-medium text-cream/85">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-cream/35">{description}</p>
      </div>
      {trailing}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/40 px-3 py-2.5">
      <div className="truncate text-[9.5px] uppercase tracking-[0.12em] text-cream/30">{label}</div>
      <div className="tnum mt-1 truncate text-[12.5px] text-cream/80">{value}</div>
    </div>
  )
}
