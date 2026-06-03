param(
  [string]$ArtifactDir = "src-tauri\target\release\bundle\release",
  [string]$OutputFile = "SHA256SUMS.txt"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$resolvedArtifactDir = Resolve-Path -LiteralPath (Join-Path $repoRoot $ArtifactDir)
$artifacts = Get-ChildItem -LiteralPath $resolvedArtifactDir -File |
  Where-Object { $_.Extension -in ".exe", ".msi", ".zip" } |
  Sort-Object Name

if ($artifacts.Count -lt 1) {
  throw "No Windows release artifacts found in $resolvedArtifactDir"
}

$lines = foreach ($artifact in $artifacts) {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($artifact.FullName)
  try {
    $hashBytes = $sha256.ComputeHash($stream)
    $hash = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
    "$hash  $($artifact.Name)"
  }
  finally {
    $stream.Dispose()
    $sha256.Dispose()
  }
}

$outputPath = Join-Path $resolvedArtifactDir $OutputFile
Set-Content -LiteralPath $outputPath -Value $lines -Encoding ASCII

Write-Output "Wrote $outputPath"
