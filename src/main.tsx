import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { isNativeApp } from './lib/native'

const root = document.getElementById('root')
if (!root) throw new Error('Elemen #root tidak ditemukan')

// Service worker hanya untuk versi web/PWA. Di APK aset sudah lokal, dan SW
// bisa membuat aset lama tertahan setelah aplikasi diperbarui.
if (!isNativeApp()) {
  void import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {})
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
