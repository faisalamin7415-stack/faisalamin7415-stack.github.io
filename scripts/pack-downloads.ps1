param([string]$Dist = "dist")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$distPath = (Resolve-Path (Join-Path $root $Dist)).Path
$outDir = Join-Path $distPath "downloads"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$zipPath = Join-Path $outDir "Faiz.Money-web.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  Get-ChildItem $distPath -Recurse -File |
    Where-Object { $_.FullName -notlike "$outDir\*" } |
    ForEach-Object {
      $relative = $_.FullName.Substring($distPath.Length + 1).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative) | Out-Null
    }
}
finally {
  $zip.Dispose()
}

$hash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item $zipPath).Length
$version = (Get-Content (Join-Path $root "package.json") | ConvertFrom-Json).version
$builtAt = (Get-Date).ToUniversalTime().ToString("o")

$latest = [ordered]@{
  file    = "Faiz.Money-web.zip"
  version = $version
  size    = $size
  sha256  = $hash
  builtAt = $builtAt
}

$json = $latest | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path $outDir "latest.json"), $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Output "zip    : $zipPath"
Write-Output "size   : $size bytes"
Write-Output "sha256 : $hash"
