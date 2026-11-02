import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const cloudConfigured = Boolean(url && anonKey && /^https?:\/\//.test(url))

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export interface TxRow {
  id: string
  user_id: string
  type: 'expense' | 'income'
  amount: number
  category: string
  note: string
  merchant: string
  occurred_at: string
  source: string
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted: boolean
}

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email atau kata sandi salah.'
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.'
  if (m.includes('user already registered')) return 'Email ini sudah terdaftar. Silakan masuk.'
  if (m.includes('password should be at least')) return 'Kata sandi minimal 6 karakter.'
  if (m.includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Tidak bisa menghubungi server. Periksa koneksi internet.'
  return message
}
