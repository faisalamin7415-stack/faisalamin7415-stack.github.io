import type { ReactNode } from 'react'
import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  Download,
  Home,
  Plus,
  Settings,
} from 'lucide-react'
import { useApp } from '../store/app'
import { Logo } from './ui'
import { SyncBadge } from './SyncBadge'

export type RouteId = 'beranda' | 'transaksi' | 'laporan' | 'pengaturan'

const NAV: Array<{ id: RouteId; label: string; icon: typeof Home }> = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'laporan', label: 'Laporan', icon: ChartNoAxesColumn },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
]

export function AppShell({
  route,
  onNavigate,
  children,
}: {
  route: RouteId
  onNavigate: (r: RouteId) => void
  children: ReactNode
}) {
  const { openAdd, profileName, user, canInstall, installApp } = useApp()
  const initial = profileName.charAt(0).toUpperCase() || 'F'

  return (
    <div className="relative z-10 min-h-dvh">
      {/* ---------------- desktop sidebar ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-ink-900/50 backdrop-blur-xl lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Logo />
        </div>

        <div className="px-5">
          <button type="button" onClick={() => openAdd()} className="btn-primary w-full py-2.5">
            <Plus size={16} strokeWidth={2} />
            Catat transaksi
          </button>
        </div>

        <nav className="mt-6 space-y-0.5 px-3" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = route === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-cream/[0.07] text-cream'
                    : 'text-cream/45 hover:bg-cream/[0.04] hover:text-cream/80'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-cream" />
                )}
                <Icon size={17} strokeWidth={1.7} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 p-4">
          {canInstall && (
            <button
              type="button"
              onClick={() => void installApp()}
              className="flex w-full items-center gap-2.5 rounded-xl border border-teal-500/25 bg-teal-900/30 px-3 py-2.5 text-left text-[12px] text-teal-200 transition-colors hover:bg-teal-900/50"
            >
              <Download size={15} />
              <span>
                <span className="block font-medium">Pasang aplikasi</span>
                <span className="block text-[10.5px] text-teal-200/60">Akses langsung dari layar</span>
              </span>
            </button>
          )}

          <SyncBadge />

          <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-900/40 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-maroon-900/70 font-display text-[15px] text-cream">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-medium text-cream/85">{profileName}</div>
              <div className="truncate text-[10.5px] text-cream/35">
                {user?.email ?? 'Data di perangkat ini'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------------- mobile header ---------------- */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink-900/70 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={() => void installApp()}
                aria-label="Pasang aplikasi"
                className="grid h-8 w-8 place-items-center rounded-full border border-line text-cream/60"
              >
                <Download size={15} />
              </button>
            )}
            <SyncBadge compact />
          </div>
        </div>
      </header>

      {/* ---------------- main ---------------- */}
      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1080px] px-4 pb-28 pt-5 sm:px-8 sm:pt-8 lg:pb-12">
          {children}
        </div>
      </main>

      {/* ---------------- mobile bottom nav ---------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-900/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navigasi utama"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-center px-2">
          {NAV.slice(0, 2).map((item) => (
            <NavButton key={item.id} item={item} active={route === item.id} onClick={onNavigate} />
          ))}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => openAdd()}
              aria-label="Catat transaksi baru"
              className="-mt-5 grid h-[54px] w-[54px] place-items-center rounded-full border border-cream/20 bg-maroon-900 text-cream shadow-lift transition-transform active:scale-95"
            >
              <Plus size={24} strokeWidth={1.8} />
            </button>
          </div>

          {NAV.slice(2).map((item) => (
            <NavButton key={item.id} item={item} active={route === item.id} onClick={onNavigate} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: RouteId; label: string; icon: typeof Home }
  active: boolean
  onClick: (r: RouteId) => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
        active ? 'text-cream' : 'text-cream/35 hover:text-cream/65'
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2 : 1.6} />
      <span className="text-[10px] font-medium">{item.label}</span>
    </button>
  )
}
