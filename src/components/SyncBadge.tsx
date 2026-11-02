import { Cloud, CloudOff, LoaderCircle, WifiOff } from 'lucide-react'
import { useApp } from '../store/app'

export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { cloud, user, syncState, syncError } = useApp()

  let label = 'Mode lokal'
  let color = 'rgba(245,218,191,0.35)'
  let icon = <CloudOff size={13} />

  if (!cloud) {
    label = 'Mode lokal'
  } else if (!user) {
    label = 'Belum masuk'
    color = 'rgba(245,218,191,0.45)'
    icon = <CloudOff size={13} />
  } else if (syncState === 'syncing') {
    label = 'Menyinkronkan'
    color = '#74B6AB'
    icon = <LoaderCircle size={13} className="animate-spin" />
  } else if (syncState === 'error') {
    label = 'Gagal sinkron'
    color = '#D98A8A'
    icon = <CloudOff size={13} />
  } else if (syncState === 'offline') {
    label = 'Offline'
    color = 'rgba(245,218,191,0.45)'
    icon = <WifiOff size={13} />
  } else {
    label = 'Tersinkron'
    color = '#74B6AB'
    icon = <Cloud size={13} />
  }

  if (compact) {
    return (
      <span
        title={syncError || label}
        className="grid h-8 w-8 place-items-center rounded-full border border-line"
        style={{ color }}
      >
        {icon}
      </span>
    )
  }

  return (
    <div
      title={syncError || label}
      className="flex items-center gap-2 rounded-xl border border-line bg-ink-900/40 px-3 py-2 text-[11.5px]"
      style={{ color }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}
