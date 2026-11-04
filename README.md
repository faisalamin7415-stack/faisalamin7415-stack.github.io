# Faiz.Money

Aplikasi pencatat pengeluaran & pemasukan yang bisa dipasang di Android (APK), iPhone, Windows, dan Mac — langsung dari browser. Tiga cara mencatat tanpa ribet mengetik: **suara**, **foto nota**, dan **scan QRIS**.

> Uang rapi, hidup tenang.

## Fitur

- **Catat lewat suara** — ucapkan “makan siang di warung Bu Tini dua puluh lima ribu”, nominal, kategori, dan merchant terisi otomatis (parser bahasa Indonesia, termasuk angka kata).
- **Foto nota (OCR)** — Tesseract.js membaca struk di perangkat, menebak merchant, total, dan tanggal. Foto tidak pernah diunggah ke server.
- **Scan QRIS** — kamera atau gambar QRIS dibaca dengan parser EMVCo (nama merchant, kota, NMID, nominal QR dinamis, validasi CRC16).
- **Grafik** — arus kas per jam, per hari, per bulan, per tahun; komposisi kategori; merchant terbesar.
- **Rekap pemasukan bulanan** — semua pemasukan digabung jadi satu angka per bulan. Ringkasan bulan berjalan tampil di Beranda, dan rincian 12 bulan (total, rata-rata, bulan terbaik) ada di Laporan.
- **Cloud sync opsional** — Supabase (email + password) dengan strategi *last-write-wins*. Tanpa Supabase, aplikasi tetap berjalan penuh secara lokal.
- **PWA installable** — service worker, offline shell, dan manifest. Bisa dipasang ke layar utama di semua perangkat.
- **APK Android** — aplikasi asli (Capacitor) yang membundel seluruh aset, mesin OCR, dan model bahasa di dalam paket. Tidak butuh situs web dan tetap jalan offline.
- **Pusat unduhan** — halaman **Multi-Platform Download System with Download Mirror** yang berdiri sendiri: panduan pemasangan per platform (Android, iOS, Windows, macOS, Linux), APK Android, paket web offline, dan pilihan mirror unduhan. Halaman ini tidak menampilkan data keuangan.
- **Backup** — ekspor/impor JSON dan ekspor CSV untuk Excel.

## Palet & karakter visual

| Warna | Hex | Pemakaian |
| --- | --- | --- |
| Navy | `#141B2D` | Latar utama, kartu, gradien |
| Deep Blue | `#0E3661` | Tombol utama, aksen, ikon |
| White | `#FFFFFF` | Teks, tombol terang, garis halus |

Tipografi: *Instrument Serif* untuk angka & judul, *Inter* untuk antarmuka. Tanpa gradien neon, tanpa kartu berlebihan — garis tipis, ruang lega, angka tabular.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

> Input suara membutuhkan *secure context*. `localhost` sudah dianggap aman; untuk perangkat lain gunakan HTTPS (misalnya lewat `npm run build` + hosting, atau tunnel).

## Menyambungkan Supabase (opsional)

1. Buat project gratis di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan seluruh isi [`supabase/schema.sql`](supabase/schema.sql).
3. Salin `.env.example` menjadi `.env.local`, isi:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Jalankan ulang `npm run dev` (atau build ulang untuk produksi).

Setelah aktif, buka **Pengaturan → Sinkronisasi cloud** untuk daftar/masuk. Transaksi lokal yang sudah ada otomatis diunggah ke akun.

## Build & publikasi

```bash
npm run build     # menghasilkan folder dist/
npm run preview   # cek hasil build secara lokal
```

> **Status publikasi:** situs `https://faisalamin7415-stack.github.io/` sedang **tidak dipublikasikan** (GitHub Pages diarahkan ke branch `offline` yang kosong, sehingga URL mengembalikan 404). Kode dan release tetap tersimpan.

Deploy folder `dist/` ke hosting statis apa pun:

- **Vercel** — `vercel.json` sudah disertakan (rewrite SPA).
- **Netlify** — `public/_redirects` sudah disertakan.
- **Cloudflare Pages** — upload `dist/`, pastikan fallback ke `index.html`.

### Deploy ulang ke GitHub Pages

Situs ini dilayani dari branch `gh-pages` (bukan branch `main`). Setelah mengubah kode:

```bash
npm run build
npm run pack:downloads   # membuat dist/downloads/Faiz.Money-web.zip + latest.json
# unggah isi dist/ ke branch gh-pages
gh release upload v1.1.1 dist/downloads/Faiz.Money-web.zip dist/downloads/Faiz.Money.apk --clobber
```

### Build APK Android

APK dibangun dengan Capacitor 7 dan membundel seluruh aset web + mesin OCR, jadi tidak butuh situs online.

```bash
npm run ocr:assets     # unduh model OCR ke public/ (sekali saja)
npm run android:build  # build web + sync + assembleRelease
```

Hasil build: `android/app/build/outputs/apk/release/app-release.apk`, lalu disalin ke `dist/downloads/Faiz.Money.apk`.

Prasyarat: JDK 21 (Capacitor 7 mengompilasi dengan Java 21), Android SDK 35, dan build-tools. Jika `JAVA_HOME` masih JDK 17, jalankan dengan JDK 21:

```powershell
$env:JAVA_HOME = "D:\dev\jdk\jdk-21.0.13.0.2+1"
npm run android:build
```

Kunci tanda tangan ada di `android/keystore/` (tidak di-commit). Simpan cadangannya: APK versi berikutnya harus ditandatangani kunci yang sama agar bisa memperbarui aplikasi yang sudah terpasang.

Branch `main` menyimpan kode sumber; branch `gh-pages` hanya berisi hasil build. Naikkan `version` di `package.json` dan buat tag rilis baru untuk versi berikutnya.

Untuk **menerbitkan lagi** situs setelah dinonaktifkan, kembalikan sumber Pages ke `gh-pages`:

```bash
gh api -X PUT repos/faisalamin7415-stack/faisalamin7415-stack.github.io/pages \
  -f "source[branch]=gh-pages" -f "source[path]=/"
```

Setelah online lewat HTTPS, aplikasi bisa dipasang:

- **Android** — unduh `Faiz.Money.apk` dari halaman unduhan atau GitHub Releases, lalu pasang (izinkan sumber tidak dikenal).
- **iPhone (Safari)** — Bagikan → *Tambahkan ke Layar Utama*.
- **Windows/Mac (Chrome/Edge)** — ikon instal di address bar.

## Struktur

```
src/
  lib/          db (Dexie), sync (Supabase), qris, ocr, speech, stats, money, categories
  store/        app (auth/sync/install), toast
  components/   AppShell, AddSheet, forms, charts, TransactionList/Detail
    add/        ManualTab, VoiceTab, ReceiptTab, QrisTab
  pages/        Dashboard, Transactions, Reports, Settings
supabase/       schema.sql
```

Data transaksi disimpan di IndexedDB (`faiz-money`), dengan flag `dirty` untuk antrean sinkronisasi dan soft-delete agar penghapusan ikut tersinkron.

## Batasan yang perlu diketahui

- **Riwayat DANA/GoPay/SeaBank tidak bisa ditarik otomatis.** Penyedia tersebut tidak menyediakan API publik untuk riwayat transaksi pribadi. Aplikasi mencatat pembayaran QRIS lewat scan (nama merchant + nominal) — bukan membaca mutasi dompet.
- **OCR bergantung kualitas foto.** Akurasi terbaik pada nota dengan cahaya cukup dan teks tidak terlipat. Semua hasil bisa diedit sebelum disimpan.
- **Pengenalan suara** memakai Web Speech API. Didukung baik di Chrome/Edge Android & desktop; Safari iOS terbatas. Tersedia fallback mengetik kalimat.
- **Mode lokal** menyimpan data hanya di perangkat. Gunakan backup JSON sebelum berpindah perangkat.

## Privasi

Foto nota diproses di perangkat. QRIS dibaca lokal. Data hanya dikirim ke Supabase bila Anda mengaktifkan cloud dan masuk ke akun. Tidak ada analytics pihak ketiga.

---

Dibuat untuk Faiz.
