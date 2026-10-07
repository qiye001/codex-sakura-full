param([switch]$CheckOnly,[switch]$Launch)
& (Join-Path $PSScriptRoot '..\..\scripts\install.ps1') @PSBoundParameters
