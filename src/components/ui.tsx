import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-teal-900 ring-1 ring-cream/20">
        <svg viewBox="0 0 512 512" className="h-[26px] w-[26px]" aria-hidden>
          <circle cx="256" cy="256" r="150" fill="#141B2D" />
          <circle cx="256" cy="256" r="150" fill="none" stroke="#FFFFFF" strokeWidth="14" />
          <rect x="196" y="164" width="34" height="184" rx="9" fill="#FFFFFF" />
          <rect x="230" y="164" width="90" height="34" rx="9" fill="#FFFFFF" />
          <rect x="230" y="241" width="68" height="34" rx="9" fill="#FFFFFF" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[22px] leading-none tracking-tight text-cream">
          Faiz<span className="text-cream/45">.</span>Money
        </span>
      )}
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-sheet-in relative flex max-h-[93dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-ink-850 shadow-lift sm:rounded-[24px] ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-6">
          <div>
            <h2 className="font-display text-[24px] leading-tight text-cream">{title}</h2>
            {subtitle && <p className="mt-1 text-[12.5px] leading-snug text-cream/45">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-cream/55 transition-colors hover:border-line-strong hover:text-cream"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="border-t border-line bg-ink-850/95 px-5 py-4 sm:px-6">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex w-full rounded-xl border border-line bg-ink-900/60 p-1">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 ${
              size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-3 py-2 text-[13px]'
            } ${
              active
                ? 'bg-cream text-ink-900 shadow-soft'
                : 'text-cream/50 hover:bg-cream/[0.04] hover:text-cream/80'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-line text-cream/40">
        {icon}
      </span>
      <p className="mt-3 text-sm font-medium text-cream/80">{title}</p>
      <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-cream/40">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function CategoryBadge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border"
      style={{
        backgroundColor: `${color}1F`,
        borderColor: `${color}33`,
        color,
      }}
    >
      {children}
    </span>
  )
}

export function ProgressBar({ value, color = '#FFFFFF' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream/[0.07]">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(2, Math.min(100, value * 100))}%`, background: color }}
      />
    </div>
  )
}

export function Dot({ tone = 'cream' }: { tone?: 'cream' | 'teal' | 'maroon' | 'muted' }) {
  const colors = {
    cream: '#FFFFFF',
    teal: '#8FB8E8',
    maroon: '#C9D2E3',
    muted: 'rgba(255,255,255,0.3)',
  }
  return <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[tone] }} />
}
