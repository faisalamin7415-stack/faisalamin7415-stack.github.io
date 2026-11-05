# Publikasikan situs unduhan Faiz.Money ke branch `gh-pages`.
#
# Hanya berisi halaman unduhan (tanpa aplikasi keuangan, tanpa APK/ZIP, tanpa
# data pengguna). File biner tetap dilayani dari GitHub Releases.
#
# Pemakaian: npm run site:publish

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Step($label, [scriptblock]$action) {
  Write-Host ""
  Write-Host "==> $label" -ForegroundColor Cyan
  & $action
  if ($LASTEXITCODE -ne 0) { throw "Gagal: $label (exit $LASTEXITCODE)" }
}

# 1. Metadata unduhan (dibuat oleh pack:downloads). Peringatkan bila belum ada.
if (-not (Test-Path 'dist/downloads/latest.json')) {
  Write-Host "Peringatan: dist/downloads/latest.json belum ada." -ForegroundColor Yellow
  Write-Host "Jalankan 'npm run pack:downloads' lebih dulu agar versi & checksum tampil." -ForegroundColor Yellow
}

# 2. Build situs publik ke site-dist/
Invoke-Step 'Build situs unduhan' { cmd /c "npm run site:build" }

if (-not (Test-Path 'site-dist/index.html')) {
  throw 'site-dist/index.html tidak ditemukan setelah build.'
}

# 3. Pastikan GitHub Pages tidak memproses Jekyll.
New-Item -ItemType File -Force 'site-dist/.nojekyll' | Out-Null

# 4. Publikasikan sebagai satu commit (orphan) agar riwayat repo tidak membengkak.
$repo = (gh repo view --json nameWithOwner -q .nameWithOwner).Trim()
if (-not $repo) { throw 'Tidak bisa membaca repositori GitHub. Pastikan gh sudah login.' }
$remote = (git remote get-url origin).Trim()
if (-not $remote) { throw 'Remote origin tidak ditemukan.' }

$staging = Join-Path $env:TEMP ("faiz-site-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null

try {
  Copy-Item -Path (Join-Path $root 'site-dist\*') -Destination $staging -Recurse -Force

  Push-Location $staging
  try {
    Invoke-Step 'Siapkan commit gh-pages' {
      git init -q
      git checkout -q -b gh-pages
      git config user.name 'Faiz.Money Publisher'
      git config user.email 'faisalamin7415-stack@users.noreply.github.com'
      git add -A
      git commit -q -m 'Publish situs unduhan Faiz.Money'
    }

    Invoke-Step 'Push ke branch gh-pages' {
      git remote add origin $remote
      git push --force origin gh-pages
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  Remove-Item -Path $staging -Recurse -Force -ErrorAction SilentlyContinue
}

# 5. Arahkan GitHub Pages ke gh-pages /.
$body = @{ source = @{ branch = 'gh-pages'; path = '/' } } | ConvertTo-Json -Compress
Write-Host ""
Write-Host "==> Atur sumber GitHub Pages" -ForegroundColor Cyan
$body | gh api --method PUT "repos/$repo/pages" --input - | Out-Null
if ($LASTEXITCODE -ne 0) {
  # Pages mungkin belum pernah diaktifkan.
  $body | gh api --method POST "repos/$repo/pages" --input - | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Gagal mengatur sumber GitHub Pages.' }
}

# 6. Verifikasi.
$url = "https://$($repo.Split('/')[0]).github.io/"
Write-Host ""
Write-Host "Situs dipublikasikan: $url" -ForegroundColor Green
Write-Host "Halaman unduhan     : ${url}#unduh" -ForegroundColor Green
Write-Host "APK (GitHub)        : https://github.com/$repo/releases/latest/download/Faiz.Money.apk" -ForegroundColor Green
Write-Host ""
Write-Host "Catatan: GitHub Pages butuh beberapa saat untuk menerapkan perubahan." -ForegroundColor DarkGray
