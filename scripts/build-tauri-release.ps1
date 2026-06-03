param(
  [string]$TauriCommand = "build"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$unitSeparator = [char]0x1f

function Add-RemapPrefix {
  param(
    [System.Collections.Generic.List[string]]$Flags,
    [string]$Path,
    [string]$Replacement
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $resolved = Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue
  if ($null -eq $resolved) {
    return
  }

  $Flags.Add("--remap-path-prefix=$($resolved.Path)=$Replacement")
}

$rustflags = [System.Collections.Generic.List[string]]::new()
if (-not [string]::IsNullOrWhiteSpace($env:CARGO_ENCODED_RUSTFLAGS)) {
  foreach ($flag in ($env:CARGO_ENCODED_RUSTFLAGS -split $unitSeparator)) {
    if (-not [string]::IsNullOrWhiteSpace($flag)) {
      $rustflags.Add($flag)
    }
  }
}

Add-RemapPrefix $rustflags $repoRoot "/workspace"
Add-RemapPrefix $rustflags $env:USERPROFILE "/user-home"
Add-RemapPrefix $rustflags $env:CARGO_HOME "/cargo-home"
Add-RemapPrefix $rustflags (Join-Path $env:USERPROFILE ".cargo") "/cargo-home"
Add-RemapPrefix $rustflags $env:RUSTUP_HOME "/rustup-home"
Add-RemapPrefix $rustflags (Join-Path $env:USERPROFILE ".rustup") "/rustup-home"

$env:CARGO_ENCODED_RUSTFLAGS = $rustflags -join $unitSeparator

$tauriBin = Join-Path $repoRoot "node_modules\.bin\tauri.cmd"
if (Test-Path -LiteralPath $tauriBin) {
  & $tauriBin $TauriCommand
}
else {
  & npx tauri $TauriCommand
}

exit $LASTEXITCODE
