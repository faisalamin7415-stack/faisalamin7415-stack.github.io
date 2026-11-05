import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../site/site.css'
import { Download } from '../src/pages/Download'
import { ToastProvider } from '../src/store/toast'

const root = document.getElementById('root')
if (!root) throw new Error('Elemen #root tidak ditemukan')

// Situs publik hanya memuat halaman unduhan. Tidak ada store aplikasi
// keuangan, Dexie, Supabase, atau data transaksi di bundle ini.
createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <div className="relative z-10 min-h-dvh">
        <header className="border-b border-line bg-ink-900/50 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <a href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-900 text-[15px] font-semibold text-cream ring-1 ring-white/15">
                F
              </span>
              <span className="leading-tight">
                <span className="block font-display text-[17px] tracking-tight text-cream">
                  Faiz.Money
                </span>
                <span className="block text-[9.5px] uppercase tracking-[0.16em] text-cream/35">
                  Download center
                </span>
              </span>
            </a>
            <div className="flex items-center gap-2">
              <span className="chip hidden sm:inline-flex">Situs unduhan</span>
              <a
                href="https://github.com/faisalamin7415-stack/faisalamin7415-stack.github.io/releases/latest/download/Faiz.Money.apk"
                className="btn-primary px-3.5 py-2 text-[12px]"
              >
                Unduh APK
              </a>
            </div>
          </div>
        </header>

        <main>
          <div className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
            <Download variant="public" />
          </div>
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[10.5px] text-cream/30 sm:px-8">
            <span>Faiz.Money · pusat unduhan multi-platform</span>
            <span>APK Android · PWA untuk iPhone, Windows, macOS, Linux</span>
          </div>
        </footer>
      </div>
    </ToastProvider>
  </StrictMode>,
)
