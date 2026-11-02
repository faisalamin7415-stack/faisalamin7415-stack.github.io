import { useEffect, useState } from 'react'
import { AppProvider } from './store/app'
import { ToastProvider } from './store/toast'
import { AppShell, type RouteId } from './components/AppShell'
import { AddSheet } from './components/AddSheet'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'

const ROUTES: RouteId[] = ['beranda', 'transaksi', 'laporan', 'pengaturan']

function readRoute(): RouteId {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(hash) ? (hash as RouteId) : 'beranda'
}

export default function App() {
  const [route, setRoute] = useState<RouteId>(readRoute)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (next: RouteId) => {
    window.location.hash = next
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <ToastProvider>
      <AppProvider>
        <AppShell route={route} onNavigate={navigate}>
          {route === 'beranda' && <Dashboard />}
          {route === 'transaksi' && <Transactions />}
          {route === 'laporan' && <Reports />}
          {route === 'pengaturan' && <Settings />}
        </AppShell>
        <AddSheet />
      </AppProvider>
    </ToastProvider>
  )
}
