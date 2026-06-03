param(
  [string]$SourceExe = "src-tauri\target\release\cutmark-pdf.exe",
  [string]$NsisDir = "src-tauri\target\release\bundle\nsis",
  [string]$ArtifactDir = "src-tauri\target\release\bundle\release",
  [string]$PortableZipName = "CutMark-PDF-Windows-Portable-x64.zip",
  [string]$SetupExeName = "CutMark-PDF-Windows-Setup-x64.exe",
  [string]$PortableExeName = "CutMark PDF.exe"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$resolvedSourceExe = Resolve-Path -LiteralPath (Join-Path $repoRoot $SourceExe)
$resolvedNsisDir = Resolve-Path -LiteralPath (Join-Path $repoRoot $NsisDir)
$resolvedArtifactDir = Join-Path $repoRoot $ArtifactDir
$stagingDir = Join-Path $resolvedArtifactDir "_portable-staging"

$setupCandidates = Get-ChildItem -LiteralPath $resolvedNsisDir -File |
  Where-Object { $_.Extension -eq ".exe" -and $_.Name -like "*setup.exe" } |
  Sort-Object LastWriteTime -Descending

if ($setupCandidates.Count -lt 1) {
  throw "No NSIS setup executable found in $resolvedNsisDir"
}

New-Item -ItemType Directory -Force -Path $resolvedArtifactDir | Out-Null
$artifactRoot = (Resolve-Path -LiteralPath $resolvedArtifactDir).Path

if (-not $artifactRoot.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Artifact directory resolved outside repository: $artifactRoot"
}

if (Test-Path -LiteralPath $stagingDir) {
  $resolvedStagingDir = (Resolve-Path -LiteralPath $stagingDir).Path
  if (-not $resolvedStagingDir.StartsWith($artifactRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Staging directory resolved outside artifact directory: $resolvedStagingDir"
  }
  Remove-Item -LiteralPath $resolvedStagingDir -Recurse -Force
}

Get-ChildItem -LiteralPath $artifactRoot -File |
  Where-Object { $_.Extension -in ".exe", ".msi", ".zip", ".txt" } |
  Remove-Item -Force

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
Copy-Item -LiteralPath $resolvedSourceExe.Path -Destination (Join-Path $stagingDir $PortableExeName)

$portableZipPath = Join-Path $artifactRoot $PortableZipName
Compress-Archive -LiteralPath (Join-Path $stagingDir $PortableExeName) -DestinationPath $portableZipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $stagingDir -Recurse -Force

$setupExePath = Join-Path $artifactRoot $SetupExeName
Copy-Item -LiteralPath $setupCandidates[0].FullName -Destination $setupExePath

Write-Output "Wrote $portableZipPath"
Write-Output "Wrote $setupExePath"
