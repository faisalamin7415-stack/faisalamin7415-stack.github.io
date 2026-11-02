import { useMemo, useState } from 'react'
import { Mic, QrCode, Receipt, Type } from 'lucide-react'
import { createTransaction } from '../lib/db'
import { formatIDR } from '../lib/money'
import type { AddTab } from '../lib/types'
import { useApp } from '../store/app'
import { useToast } from '../store/toast'
import { draftFrom, type Draft } from './forms'
import { Sheet } from './ui'
import { ManualTab } from './add/ManualTab'
import { VoiceTab } from './add/VoiceTab'
import { ReceiptTab } from './add/ReceiptTab'
import { QrisTab } from './add/QrisTab'

const TABS: Array<{ id: AddTab; label: string; hint: string; icon: typeof Type }> = [
  { id: 'manual', label: 'Ketik', hint: 'Isi manual', icon: Type },
  { id: 'voice', label: 'Suara', hint: 'Bicara saja', icon: Mic },
  { id: 'receipt', label: 'Nota', hint: 'Foto struk', icon: Receipt },
  { id: 'qris', label: 'QRIS', hint: 'Scan bayar', icon: QrCode },
]

const SUBTITLE: Record<AddTab, string> = {
  manual: 'Cara klasik yang tetap cepat. Semua kolom bisa diubah.',
  voice: 'Ucapkan transaksinya, nominal dan kategori terisi otomatis.',
  receipt: 'Foto nota belanja, teks dan total dibaca langsung di perangkat.',
  qris: 'Scan QRIS merchant, nama dan nominal langsung tercatat.',
}

/** Wrapper: konten dipasang ulang setiap kali sheet dibuka agar state selalu segar. */
export function AddSheet() {
  const { addOpen } = useApp()
  if (!addOpen) return null
  return <AddSheetContent />
}

function AddSheetContent() {
  const { addTab, prefill, closeAdd, user, runSync } = useApp()
  const { toast } = useToast()
  const [tab, setTab] = useState<AddTab>(addTab)
  const initial = useMemo(() => draftFrom(prefill ?? {}), [prefill])

  const handleSave = async (draft: Draft) => {
    await createTransaction({
      ...draft,
      userId: user?.id ?? null,
    })
    toast(
      `${draft.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} ${formatIDR(draft.amount)} tersimpan.`,
      'success',
    )
    closeAdd()
    if (user) void runSync()
  }

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <Sheet open onClose={closeAdd} title="Catat transaksi" subtitle={SUBTITLE[tab]} wide>
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-ink-900/50 p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-200 ${
                active
                  ? 'bg-cream/[0.09] text-cream'
                  : 'text-cream/40 hover:bg-cream/[0.04] hover:text-cream/70'
              }`}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <p className="mb-4 flex items-center gap-2 text-[11px] text-cream/35">
          <span className="h-1 w-1 rounded-full bg-cream/30" />
          {activeTab.hint}
        </p>

        {tab === 'manual' && <ManualTab initial={initial} onSave={handleSave} />}
        {tab === 'voice' && <VoiceTab initial={initial} onSave={handleSave} />}
        {tab === 'receipt' && <ReceiptTab onSave={handleSave} />}
        {tab === 'qris' && <QrisTab onSave={handleSave} />}
      </div>
    </Sheet>
  )
}
