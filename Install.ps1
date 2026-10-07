param([switch]$CheckOnly,[switch]$Launch,[switch]$SkipSkillInstall,[switch]$NoShortcuts)
$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'scripts\install.ps1') @PSBoundParameters
