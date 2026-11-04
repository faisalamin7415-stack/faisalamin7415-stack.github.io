import { Capacitor } from '@capacitor/core'

/** True saat aplikasi berjalan di dalam APK Android/iOS (Capacitor). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function nativePlatform(): string {
  return Capacitor.getPlatform()
}

/**
 * Android WebView butuh izin CAMERA di level OS sebelum getUserMedia bisa jalan.
 * Di browser biasa fungsi ini langsung mengembalikan true.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!isNativeApp()) return true
  try {
    const { Camera } = await import('@capacitor/camera')
    const current = await Camera.checkPermissions()
    if (current.camera === 'granted') return true
    const asked = await Camera.requestPermissions({ permissions: ['camera'] })
    return asked.camera === 'granted'
  } catch {
    // Biarkan getUserMedia yang menentukan (mis. izin sudah diberikan sebelumnya).
    return true
  }
}
