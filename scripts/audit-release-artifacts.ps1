param(
  [string]$DistDir = "dist",
  [string[]]$ArtifactFiles = @(),
  [switch]$SkipArtifactCheck
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$latin1 = [System.Text.Encoding]::GetEncoding(28591)
$utf16 = [System.Text.Encoding]::Unicode
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Add-Pattern {
  param(
    [System.Collections.Generic.List[object]]$Patterns,
    [string]$Label,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return
  }

  $Patterns.Add([pscustomobject]@{
    Label = $Label
    Value = $Value
  })
}

function Add-PathPattern {
  param(
    [System.Collections.Generic.List[object]]$Patterns,
    [string]$Label,
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $resolved = Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue
  $value = if ($resolved) { $resolved.Path } else { $Path }
  Add-Pattern $Patterns $Label $value
  Add-Pattern $Patterns "$Label (slash)" ($value -replace "\\", "/")
}

function Test-BytesContainText {
  param(
    [byte[]]$Bytes,
    [string]$Text
  )

  if ([string]::IsNullOrEmpty($Text)) {
    return $false
  }

  $latinText = $latin1.GetString($Bytes)
  if ($latinText.Contains($Text)) {
    return $true
  }

  $utf16Text = $utf16.GetString($Bytes)
  return $utf16Text.Contains($Text)
}

function Test-FileForPatterns {
  param(
    [string]$File,
    [System.Collections.Generic.List[object]]$Patterns,
    [string]$Context
  )

  if (-not (Test-Path -LiteralPath $File)) {
    $failures.Add("Missing $Context file: $File")
    return
  }

  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $File).Path)
  foreach ($pattern in $Patterns) {
    if (Test-BytesContainText $bytes $pattern.Value) {
      $failures.Add("$Context contains $($pattern.Label): $File")
    }
  }
}

function Test-ZipFileForPatterns {
  param(
    [string]$File,
    [System.Collections.Generic.List[object]]$Patterns,
    [string]$Context
  )

  if (-not (Test-Path -LiteralPath $File)) {
    $failures.Add("Missing $Context file: $File")
    return
  }

  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $File).Path)
  try {
    foreach ($entry in $zip.Entries) {
      if ([string]::IsNullOrEmpty($entry.Name)) {
        continue
      }

      $extension = [System.IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
      if ($extension -in ".pdb", ".map", ".pem", ".key", ".pfx", ".p12", ".d") {
        $failures.Add("$Context zip contains forbidden file type: $File -> $($entry.FullName)")
      }

      $stream = $entry.Open()
      try {
        $memory = [System.IO.MemoryStream]::new()
        try {
          $stream.CopyTo($memory)
          $bytes = $memory.ToArray()
        }
        finally {
          $memory.Dispose()
        }
      }
      finally {
        $stream.Dispose()
      }

      foreach ($pattern in $Patterns) {
        if (Test-BytesContainText $bytes $pattern.Value) {
          $failures.Add("$Context zip entry contains $($pattern.Label): $File -> $($entry.FullName)")
        }
      }
    }
  }
  finally {
    $zip.Dispose()
  }
}

function Test-ArtifactForPatterns {
  param(
    [string]$File,
    [System.Collections.Generic.List[object]]$Patterns,
    [string]$Context
  )

  if ([System.IO.Path]::GetExtension($File).ToLowerInvariant() -eq ".zip") {
    Test-ZipFileForPatterns $File $Patterns $Context
    return
  }

  Test-FileForPatterns $File $Patterns $Context
}

$sensitivePatterns = [System.Collections.Generic.List[object]]::new()
Add-PathPattern $sensitivePatterns "repo root" $repoRoot
Add-PathPattern $sensitivePatterns "repo parent" (Split-Path -Parent $repoRoot)
Add-PathPattern $sensitivePatterns "user profile" $env:USERPROFILE
Add-PathPattern $sensitivePatterns "local app data" $env:LOCALAPPDATA
Add-PathPattern $sensitivePatterns "app data" $env:APPDATA
Add-PathPattern $sensitivePatterns "cargo home" $env:CARGO_HOME
Add-PathPattern $sensitivePatterns "default cargo home" (Join-Path $env:USERPROFILE ".cargo")
Add-PathPattern $sensitivePatterns "rustup home" $env:RUSTUP_HOME
Add-PathPattern $sensitivePatterns "default rustup home" (Join-Path $env:USERPROFILE ".rustup")
Add-Pattern $sensitivePatterns "Windows user path" "C:\Users"
Add-Pattern $sensitivePatterns "Windows user path (slash)" "C:/Users"
Add-Pattern $sensitivePatterns "source map marker" "sourceMappingURL"
Add-Pattern $sensitivePatterns "private key marker" "BEGIN PRIVATE KEY"
Add-Pattern $sensitivePatterns "RSA private key marker" "BEGIN RSA PRIVATE KEY"

if (-not [string]::IsNullOrWhiteSpace($env:USERNAME) -and $env:USERNAME.Length -ge 4) {
  Add-Pattern $sensitivePatterns "current username" $env:USERNAME
}

$distPatterns = [System.Collections.Generic.List[object]]::new()
foreach ($pattern in $sensitivePatterns) {
  $distPatterns.Add($pattern)
}
Add-Pattern $distPatterns "localhost URL" "http://localhost"
Add-Pattern $distPatterns "127.0.0.1 URL" "http://127.0.0.1"
Add-Pattern $distPatterns "0.0.0.0 URL" "http://0.0.0.0"
Add-Pattern $distPatterns "AI Studio CDN" "aistudiocdn.com"
Add-Pattern $distPatterns "analytics marker" "google-analytics"
Add-Pattern $distPatterns "analytics marker" "googletagmanager"
Add-Pattern $distPatterns "analytics marker" "posthog"
Add-Pattern $distPatterns "analytics marker" "sentry.io"

if (-not $SkipArtifactCheck) {
  $resolvedArtifactFiles = [System.Collections.Generic.List[string]]::new()
  if ($ArtifactFiles.Count -gt 0) {
    foreach ($artifact in $ArtifactFiles) {
      $resolvedArtifactFiles.Add((Join-Path $repoRoot $artifact))
    }
  }
  else {
    $directExe = Join-Path $repoRoot "src-tauri\target\release\cutmark-pdf.exe"
    if (Test-Path -LiteralPath $directExe) {
      $resolvedArtifactFiles.Add($directExe)
    }

    foreach ($bundleDir in @(
      "src-tauri\target\release\bundle\nsis",
      "src-tauri\target\release\bundle\release"
    )) {
      $resolvedBundleDir = Join-Path $repoRoot $bundleDir
      if (-not (Test-Path -LiteralPath $resolvedBundleDir)) {
        continue
      }

      Get-ChildItem -LiteralPath $resolvedBundleDir -File |
        Where-Object { $_.Extension -in ".exe", ".msi", ".zip" } |
        ForEach-Object { $resolvedArtifactFiles.Add($_.FullName) }
    }
  }

  foreach ($artifact in $resolvedArtifactFiles) {
    Test-ArtifactForPatterns $artifact $sensitivePatterns "release artifact"
  }
}

$distPath = Join-Path $repoRoot $DistDir
if (-not (Test-Path -LiteralPath $distPath)) {
  $failures.Add("Missing dist directory: $distPath")
}
else {
  $mapFiles = Get-ChildItem -LiteralPath $distPath -Recurse -File -Filter "*.map"
  foreach ($mapFile in $mapFiles) {
    $failures.Add("Source map file exists in dist: $($mapFile.FullName)")
  }

  Get-ChildItem -LiteralPath $distPath -Recurse -File | ForEach-Object {
    Test-FileForPatterns $_.FullName $distPatterns "dist asset"
  }
}

$tracked = & git -C $repoRoot ls-files
$trackedLeakPatterns = @(
  '(^|/)dist(/|$)',
  '(^|/)src-tauri/target(/|$)',
  '\.pdb$',
  '\.map$',
  '\.(pem|key|pfx|p12)$',
  '(^|/)\.env($|[^a-zA-Z])'
)

foreach ($file in $tracked) {
  foreach ($pattern in $trackedLeakPatterns) {
    if ($file -match $pattern -and $file -notmatch '(^|/)\.env\.example$') {
      $failures.Add("Tracked file should not be in repo: $file")
    }
  }
}

if (-not $SkipArtifactCheck) {
  $releaseRoot = Join-Path $repoRoot "src-tauri\target\release"
  if (Test-Path -LiteralPath $releaseRoot) {
    $debugFiles = Get-ChildItem -LiteralPath $releaseRoot -File |
      Where-Object { $_.Extension -in ".pdb", ".d" }
    foreach ($debugFile in $debugFiles) {
      $warnings.Add("Do not distribute target/release as a directory; it contains build/debug file: $($debugFile.Name)")
    }
  }

  $directExe = Join-Path $repoRoot "src-tauri\target\release\cutmark-pdf.exe"
  if (Test-Path -LiteralPath $directExe) {
    $exeBytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $directExe).Path)
    if (Test-BytesContainText $exeBytes "localhost") {
      $warnings.Add("Tauri executable contains localhost metadata used by tauri://localhost/devUrl; dist assets are checked separately.")
    }
  }
}

foreach ($warning in $warnings) {
  Write-Warning $warning
}

if ($failures.Count -gt 0) {
  Write-Error ("Release artifact audit failed:`n" + ($failures -join "`n"))
  exit 1
}

Write-Output "Release artifact audit passed."
