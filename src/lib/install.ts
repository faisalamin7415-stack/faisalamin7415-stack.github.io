import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../store/toast'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Menangani prompt pemasangan PWA (beforeinstallprompt) tanpa bergantung pada
 * store aplikasi keuangan. Dipakai bersama oleh app shell dan situs unduhan.
 */
export function useInstallPrompt() {
  const { toast } = useToast()
  const [canInstall, setCanInstall] = useState(false)
  const installEvent = useRef<InstallEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      installEvent.current = e as InstallEvent
      setCanInstall(true)
    }
    const onInstalled = () => {
      setCanInstall(false)
      installEvent.current = null
      toast('Faiz.Money berhasil dipasang di perangkat.', 'success')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [toast])

  const installApp = useCallback(async () => {
    const ev = installEvent.current
    if (!ev) {
      toast('Gunakan menu browser → “Instal aplikasi” / “Tambahkan ke Layar Utama”.')
      return
    }
    await ev.prompt()
    const choice = await ev.userChoice
    if (choice.outcome === 'accepted') {
      setCanInstall(false)
      installEvent.current = null
    }
  }, [toast])

  return { canInstall, installApp }
}
