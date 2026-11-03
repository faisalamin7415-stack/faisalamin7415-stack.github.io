import type { TxType } from './types'

export interface Category {
  id: string
  label: string
  type: TxType
  color: string
  icon: string
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'makanan', label: 'Makan & Minum', type: 'expense', color: '#4D8FD6', icon: 'utensils' },
  { id: 'belanja', label: 'Belanja', type: 'expense', color: '#8FB8E8', icon: 'shopping-bag' },
  { id: 'transportasi', label: 'Transportasi', type: 'expense', color: '#2E6DB4', icon: 'car' },
  { id: 'tagihan', label: 'Tagihan', type: 'expense', color: '#C7DCF5', icon: 'receipt' },
  { id: 'kesehatan', label: 'Kesehatan', type: 'expense', color: '#6FA3DE', icon: 'heart-pulse' },
  { id: 'hiburan', label: 'Hiburan', type: 'expense', color: '#A9C8EC', icon: 'clapperboard' },
  { id: 'tempat-tinggal', label: 'Tempat Tinggal', type: 'expense', color: '#17497F', icon: 'home' },
  { id: 'pendidikan', label: 'Pendidikan', type: 'expense', color: '#5B9BD5', icon: 'graduation-cap' },
  { id: 'donasi', label: 'Donasi', type: 'expense', color: '#9CC2EA', icon: 'hand-heart' },
  { id: 'keluarga', label: 'Keluarga', type: 'expense', color: '#3A78BE', icon: 'users' },
  { id: 'lainnya', label: 'Lainnya', type: 'expense', color: '#7C93B3', icon: 'circle-ellipsis' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'gaji', label: 'Gaji', type: 'income', color: '#4D8FD6', icon: 'wallet' },
  { id: 'bonus', label: 'Bonus', type: 'income', color: '#8FB8E8', icon: 'sparkles' },
  { id: 'usaha', label: 'Usaha', type: 'income', color: '#2E6DB4', icon: 'store' },
  { id: 'investasi', label: 'Investasi', type: 'income', color: '#C7DCF5', icon: 'trending-up' },
  { id: 'hadiah', label: 'Hadiah', type: 'income', color: '#6FA3DE', icon: 'gift' },
  { id: 'lainnya-masuk', label: 'Lainnya', type: 'income', color: '#7C93B3', icon: 'circle-ellipsis' },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function categoriesFor(type: TxType): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export function getCategory(id: string): Category {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}

export function defaultCategory(type: TxType): string {
  return categoriesFor(type)[0].id
}

/** Kata kunci bahasa Indonesia untuk menebak kategori otomatis. */
const KEYWORDS: Record<string, string[]> = {
  makanan: [
    'makan', 'minum', 'kopi', 'nasi', 'ayam', 'bakso', 'mie', 'sate', 'warung', 'resto',
    'restoran', 'cafe', 'kafe', 'kantin', 'jajan', 'snack', 'gofood', 'grabfood', 'starbucks',
    'kfc', 'mcd', 'mcdonald', 'pizza', 'roti', 'kue', 'es', 'teh', 'boba', 'martabak', 'soto',
  ],
  belanja: [
    'belanja', 'indomaret', 'alfamart', 'supermarket', 'superindo', 'hypermart', 'transmart',
    'ranch market', 'sayur', 'buah', 'beras', 'minyak', 'sabun', 'shampo', 'deterjen', 'tokopedia',
    'shopee', 'lazada', 'uniqlo', 'baju', 'celana', 'sepatu',
  ],
  transportasi: [
    'bensin', 'pertalite', 'pertamax', 'solar', 'parkir', 'tol', 'grab', 'gojek', 'ojek', 'taksi',
    'taxi', 'kereta', 'krl', 'mrt', 'bus', 'angkot', 'tiket', 'pesawat', 'servis motor', 'servis mobil',
  ],
  tagihan: [
    'listrik', 'token', 'pln', 'air', 'pdam', 'internet', 'wifi', 'indihome', 'pulsa', 'kuota',
    'paket data', 'telkomsel', 'xl', 'indosat', 'tri', 'bpjs', 'iuran', 'cicilan', 'kartu kredit',
  ],
  kesehatan: [
    'obat', 'dokter', 'rumah sakit', 'klinik', 'apotek', 'apotik', 'vitamin', 'masker', 'periksa',
    'gigi', 'lab', 'vaksin',
  ],
  hiburan: [
    'nonton', 'bioskop', 'film', 'game', 'steam', 'netflix', 'spotify', 'youtube', 'langganan',
    'konser', 'wisata', 'liburan', 'hotel', 'karaoke',
  ],
  'tempat-tinggal': ['kos', 'kost', 'sewa', 'kontrakan', 'rumah', 'apartemen', 'perbaikan', 'furnitur', 'kasur'],
  pendidikan: ['buku', 'kursus', 'sekolah', 'kuliah', 'spp', 'uang pangkal', 'les', 'seminar', 'pelatihan', 'alat tulis'],
  donasi: ['sedekah', 'zakat', 'infaq', 'donasi', 'sumbangan', 'amal', 'masjid', 'gereja', 'panti'],
  keluarga: ['orang tua', 'ibu', 'bapak', 'anak', 'istri', 'suami', 'keluarga', 'adik', 'kakak'],
  gaji: ['gaji', 'salary', 'upah', 'honor', 'thr'],
  bonus: ['bonus', 'insentif', 'komisi', 'cashback', 'reward'],
  usaha: ['usaha', 'jualan', 'omzet', 'penjualan', 'toko', 'klien', 'proyek', 'freelance'],
  investasi: ['investasi', 'dividen', 'bunga', 'reksadana', 'saham', 'deposito', 'profit'],
  hadiah: ['hadiah', 'kado', 'angpao', 'doorprize', 'undian'],
}

const INCOME_HINTS = [
  'gaji', 'bonus', 'terima', 'diterima', 'masuk', 'pemasukan', 'pendapatan', 'jual', 'penjualan',
  'honor', 'dividen', 'cashback', 'refund', 'kembali', 'transfer masuk', 'top up', 'topup',
]

export function guessType(text: string): TxType {
  const t = text.toLowerCase()
  if (INCOME_HINTS.some((k) => t.includes(k))) return 'income'
  return 'expense'
}

export function guessCategory(text: string, type: TxType): string {
  const t = ` ${text.toLowerCase()} `
  let best = ''
  let bestScore = 0
  for (const [category, words] of Object.entries(KEYWORDS)) {
    const cat = ALL_CATEGORIES.find((c) => c.id === category)
    if (!cat || cat.type !== type) continue
    let score = 0
    for (const w of words) if (t.includes(w)) score += w.length
    if (score > bestScore) {
      bestScore = score
      best = category
    }
  }
  return best || defaultCategory(type)
}
