[CmdletBinding()]
param(
  [string]$BackupName
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$paths = Get-CtlPaths
$backupRoot = Join-Path $paths.StateRoot 'backups'
if (-not (Test-Path -LiteralPath $backupRoot -PathType Container)) {
  throw "No theme CSS backups were found: $backupRoot"
}

if (-not $BackupName) {
  $latest = Get-ChildItem -LiteralPath $backupRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $latest) { throw "No theme CSS backups were found: $backupRoot" }
  $BackupName = $latest.Name
}

$backupPath = [System.IO.Path]::GetFullPath((Join-Path $backupRoot $BackupName))
$backupPrefix = [System.IO.Path]::GetFullPath($backupRoot).TrimEnd('\') + '\'
if (-not $backupPath.StartsWith($backupPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backup path must stay inside the CodexThemeLauncher backups directory.'
}

$backupCss = Join-Path $backupPath 'runtime-dream-skin.css'
if (-not (Test-Path -LiteralPath $backupCss -PathType Leaf)) {
  throw "Backup CSS was not found: $backupCss"
}

$targetCss = Join-Path $paths.Assets 'dream-skin.css'
Copy-Item -LiteralPath $backupCss -Destination $targetCss -Force

$state = Read-CtlJson -Path $paths.StateFile
if ($null -ne $state -and $state.port) {
  $node = Get-CtlNodeRuntime
  $injector = Join-Path $paths.Scripts 'injector.mjs'
  & $node.Path $injector --once --port ([int]$state.port) --theme-dir $paths.ActiveTheme
  if ($LASTEXITCODE -ne 0) { throw 'The restored CSS could not be injected into the active Codex window.' }
}

Write-Host "Restored theme CSS backup: $BackupName"
