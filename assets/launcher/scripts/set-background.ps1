[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ImagePath,
  [ValidateSet('auto', 'light', 'dark')][string]$Variant = 'auto',
  [string]$Accent = '#339cff',
  [ValidateRange(0.35, 0.96)][double]$GlassOpacity = 0.72,
  [ValidateRange(0, 40)][int]$Blur = 22,
  [string]$ThemeId,
  [string]$ThemeName,
  [ValidateRange(0, 1)][Nullable[double]]$FocusX,
  [ValidateRange(0, 1)][Nullable[double]]$FocusY,
  [ValidateSet('left', 'center', 'right', 'none')][string]$SafeArea,
  [ValidateSet('ambient', 'banner', 'off')][string]$TaskMode
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

function Set-ThemeProperty {
  param(
    [Parameter(Mandatory = $true)][object]$Object,
    [Parameter(Mandatory = $true)][string]$Name,
    [AllowNull()][object]$Value
  )
  if ($Object.PSObject.Properties.Name -contains $Name) {
    $Object.$Name = $Value
  } else {
    $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
  }
}

$paths = Get-CtlPaths
Initialize-CtlThemeStore -Paths $paths

$source = [System.IO.Path]::GetFullPath($ImagePath)
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
  throw "Image was not found: $source"
}

$extension = [System.IO.Path]::GetExtension($source).ToLowerInvariant()
if ($extension -notin @('.svg', '.jpg', '.jpeg', '.png', '.webp', '.gif')) {
  throw "Unsupported image type: $extension"
}

$item = Get-Item -LiteralPath $source
if ($item.Length -le 0 -or $item.Length -gt 16MB) {
  throw 'Image must be non-empty and no larger than 16 MB.'
}

if ($Accent -notmatch '^#[0-9a-fA-F]{6}$') {
  throw 'Accent must be a #RRGGBB color.'
}

if ($ThemeId -and $ThemeId -notmatch '^[a-z0-9][a-z0-9-]{0,63}$') {
  throw 'ThemeId must use lowercase letters, digits, and hyphens only.'
}
if ($ThemeName -and (($ThemeName = $ThemeName.Trim()).Length -gt 80)) {
  throw 'ThemeName must be at most 80 characters.'
}

$targetName = "wallpaper$extension"
$target = Join-Path $paths.ActiveTheme $targetName
Copy-Item -LiteralPath $source -Destination $target -Force

$theme = Read-CtlJson -Path (Join-Path $paths.ActiveTheme 'theme.json')
if ($null -eq $theme) {
  $theme = Read-CtlJson -Path (Join-Path $paths.Assets 'theme.json')
}
$hasArt = $theme.PSObject.Properties.Name -contains 'art'
if (-not $hasArt -or $null -eq $theme.art) {
  Set-ThemeProperty -Object $theme -Name art -Value ([pscustomobject]@{})
}
Set-ThemeProperty -Object $theme -Name variant -Value $Variant
Set-ThemeProperty -Object $theme -Name appearance -Value $Variant
Set-ThemeProperty -Object $theme -Name accent -Value $Accent
if ($theme.PSObject.Properties.Name -contains 'palette') {
  if ($null -eq $theme.palette) {
    Set-ThemeProperty -Object $theme -Name palette -Value ([pscustomobject]@{})
  }
  Set-ThemeProperty -Object $theme.palette -Name accent -Value $Accent
} else {
  $theme | Add-Member -MemberType NoteProperty -Name palette -Value ([pscustomobject]@{ accent = $Accent })
}
Set-ThemeProperty -Object $theme -Name glassOpacity -Value $GlassOpacity
Set-ThemeProperty -Object $theme -Name blur -Value $Blur
Set-ThemeProperty -Object $theme -Name image -Value $targetName
Set-ThemeProperty -Object $theme.art -Name file -Value $targetName
if ($ThemeId) {
  Set-ThemeProperty -Object $theme -Name id -Value $ThemeId
}
if ($ThemeName) {
  Set-ThemeProperty -Object $theme -Name name -Value $ThemeName
  Set-ThemeProperty -Object $theme -Name promoSub -Value $ThemeName
}
if ($null -ne $FocusX) {
  Set-ThemeProperty -Object $theme.art -Name focusX -Value $FocusX
}
if ($null -ne $FocusY) {
  Set-ThemeProperty -Object $theme.art -Name focusY -Value $FocusY
}
if ($SafeArea) {
  Set-ThemeProperty -Object $theme.art -Name safeArea -Value $SafeArea
}
if ($TaskMode) {
  Set-ThemeProperty -Object $theme.art -Name taskMode -Value $TaskMode
}
Write-CtlUtf8Json -Path (Join-Path $paths.ActiveTheme 'theme.json') -Value $theme

$state = Read-CtlJson -Path $paths.StateFile
if ($null -ne $state -and $state.port) {
  $node = Get-CtlNodeRuntime
  $injector = Join-Path $paths.Scripts 'injector.mjs'
  & $node.Path $injector --once --port ([int]$state.port) --theme-dir $paths.ActiveTheme
}

Write-Host "Background updated: $target"
