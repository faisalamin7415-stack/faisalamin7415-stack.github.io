import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { cloudConfigured, friendlyAuthError, supabase } from '../lib/supabase'
import { getLastSync, syncNow } from '../lib/sync'
import type { AddTab, NewTransaction } from '../lib/types'
import { useToast } from './toast'

type SyncState = 'idle' | 'syncing' | 'error' | 'offline'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface AppContextValue {
  user: User | null
  cloud: boolean
  authReady: boolean
  syncState: SyncState
  syncError: string
  lastSyncAt: string | null
  runSync: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<string>
  signOut: () => Promise<void>
  profileName: string
  setProfileName: (name: string) => void
  addOpen: boolean
  addTab: AddTab
  prefill: Partial<NewTransaction> | null
  openAdd: (prefill?: Partial<NewTransaction>, tab?: AddTab) => void
  closeAdd: () => void
  canInstall: boolean
  installApp: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const NAME_KEY = 'faiz:name'

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!cloudConfigured)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab] = useState<AddTab>('manual')
  const [prefill, setPrefill] = useState<Partial<NewTransaction> | null>(null)
  const [profileName, setProfileNameState] = useState(
    () => localStorage.getItem(NAME_KEY) ?? 'Faiz',
  )
  const [canInstall, setCanInstall] = useState(false)
  const installEvent = useRef<InstallEvent | null>(null)
  const syncing = useRef(false)

  /* ---------------- auth ---------------- */
  useEffect(() => {
    if (!supabase) return
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  /* ---------------- sync ---------------- */
  const runSync = useCallback(async () => {
    if (!supabase || !user || syncing.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline')
      return
    }
    syncing.current = true
    setSyncState('syncing')
    try {
      await syncNow(user.id)
      setSyncState('idle')
      setSyncError('')
      setLastSyncAt(await getLastSync())
    } catch (err) {
      setSyncState('error')
      setSyncError(err instanceof Error ? err.message : 'Sinkronisasi gagal.')
    } finally {
      syncing.current = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    void runSync()
    const interval = window.setInterval(() => void runSync(), 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runSync()
    }
    const onOnline = () => void runSync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [user, runSync])

  useEffect(() => {
    if (!user) {
      setLastSyncAt(null)
      setSyncState('idle')
    }
  }, [user])

  /* ---------------- install prompt ---------------- */
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

  /* ---------------- auth actions ---------------- */
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Cloud belum dikonfigurasi.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(friendlyAuthError(error.message))
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Cloud belum dikonfigurasi.')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(friendlyAuthError(error.message))
    if (data.session) return 'Akun dibuat dan Anda sudah masuk.'
    return 'Akun dibuat. Cek email untuk konfirmasi, lalu masuk.'
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    toast('Anda keluar dari mode cloud. Data tetap tersimpan di perangkat.')
  }, [toast])

  const setProfileName = useCallback((name: string) => {
    const clean = name.trim().slice(0, 24) || 'Faiz'
    localStorage.setItem(NAME_KEY, clean)
    setProfileNameState(clean)
  }, [])

  const openAdd = useCallback((p?: Partial<NewTransaction>, tab: AddTab = 'manual') => {
    setPrefill(p ?? null)
    setAddTab(tab)
    setAddOpen(true)
  }, [])

  const closeAdd = useCallback(() => {
    setAddOpen(false)
    setPrefill(null)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      cloud: cloudConfigured,
      authReady,
      syncState,
      syncError,
      lastSyncAt,
      runSync,
      signIn,
      signUp,
      signOut,
      profileName,
      setProfileName,
      addOpen,
      addTab,
      prefill,
      openAdd,
      closeAdd,
      canInstall,
      installApp,
    }),
    [
      user, authReady, syncState, syncError, lastSyncAt, runSync, signIn, signUp, signOut,
      profileName, setProfileName, addOpen, addTab, prefill, openAdd, closeAdd, canInstall, installApp,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider')
  return ctx
}
