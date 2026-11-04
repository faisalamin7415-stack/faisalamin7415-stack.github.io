param(
  [string]$Jdk = "D:\dev\jdk\jdk-21.0.13.0.2+1",
  [switch]$SkipWeb
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (Test-Path $Jdk) {
  $env:JAVA_HOME = $Jdk
  Write-Output "JDK    : $Jdk"
} else {
  Write-Output "JDK    : memakai JAVA_HOME saat ini ($env:JAVA_HOME)"
}

Push-Location $root
try {
  if (-not $SkipWeb) {
    node scripts/fetch-ocr-assets.mjs
    cmd /c "npm run build"
  }

  cmd /c "npx cap sync android"

  Push-Location (Join-Path $root "android")
  try {
    cmd /c "gradlew.bat assembleRelease --no-daemon"
  }
  finally {
    Pop-Location
  }

  $apk = Join-Path $root "android\app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $apk)) { throw "APK tidak ditemukan: $apk" }

  $outDir = Join-Path $root "dist\downloads"
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  Copy-Item $apk (Join-Path $outDir "Faiz.Money.apk") -Force

  Write-Output "APK    : $(Join-Path $outDir 'Faiz.Money.apk')"
  Write-Output "Ukuran : $((Get-Item (Join-Path $outDir 'Faiz.Money.apk')).Length) bytes"
}
finally {
  Pop-Location
}
