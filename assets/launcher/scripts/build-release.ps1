[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^v?[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$')]
  [string]$Version,
  [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'dist')
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$versionNumber = $Version -replace '^v', ''
$packageName = "CodexThemeLauncher-v$versionNumber"
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
$stageRoot = Join-Path $outputRoot $packageName
$archivePath = Join-Path $outputRoot "$packageName.zip"
$checksumPath = "$archivePath.sha256"
$outputPrefix = $outputRoot.TrimEnd('\') + '\'

foreach ($path in @($stageRoot, $archivePath, $checksumPath)) {
  $fullPath = [System.IO.Path]::GetFullPath($path)
  if (-not $fullPath.StartsWith($outputPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to create release output outside the output directory: $fullPath"
  }
  if (Test-Path -LiteralPath $fullPath) {
    throw "Release output already exists: $fullPath"
  }
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Path $stageRoot | Out-Null

try {
  foreach ($directory in @('assets', 'bin', 'docs', 'scripts')) {
    Copy-Item -LiteralPath (Join-Path $repositoryRoot $directory) -Destination $stageRoot -Recurse -Force
  }
  foreach ($file in @('.gitignore', 'CHANGELOG.md', 'install.ps1', 'LICENSE', 'NOTICE.md', 'README.md')) {
    Copy-Item -LiteralPath (Join-Path $repositoryRoot $file) -Destination $stageRoot -Force
  }

  Compress-Archive -LiteralPath $stageRoot -DestinationPath $archivePath -CompressionLevel Optimal
  $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  [System.IO.File]::WriteAllText($checksumPath, "$hash  $packageName.zip`n", [System.Text.ASCIIEncoding]::new())
} finally {
  if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
}

[pscustomobject]@{
  Archive = $archivePath
  Checksum = $checksumPath
  Sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
}
