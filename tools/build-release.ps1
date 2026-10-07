[CmdletBinding()]
param([string]$RuntimePath,[string]$OutputDirectory,[switch]$AllowPendingAuthorization)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if(-not $OutputDirectory){$OutputDirectory=Join-Path $root 'dist'}
if(-not $RuntimePath){$RuntimePath=Join-Path $root 'assets\launcher\bin\node\node.exe'}
$auth=Get-Content -LiteralPath (Join-Path $root 'docs\ANIMATION_AUTHORIZATION.md') -Raw -Encoding UTF8
if(-not $AllowPendingAuthorization -and $auth -match 'RELEASE_GATE:'){throw 'Animation authorization scope is pending. Complete it before publishing.'}
if(-not(Test-Path -LiteralPath $RuntimePath -PathType Leaf)){throw 'Supply the licensed Node 24.16.0 executable with -RuntimePath'}
$runtimeVersion=(& $RuntimePath -p 'process.versions.node').Trim()
if($runtimeVersion -ne '24.16.0'){throw "Expected Node 24.16.0; found $runtimeVersion"}
& (Join-Path $root 'Verify.ps1') -FilesOnly
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$temporary=Join-Path $OutputDirectory ('package-'+[guid]::NewGuid().ToString('N'))
$package=Join-Path $temporary 'codex-sakura-full'
New-Item -ItemType Directory -Force -Path $package | Out-Null
try{
 $manifest=Get-Content -LiteralPath (Join-Path $root 'MANIFEST.json') -Raw -Encoding UTF8|ConvertFrom-Json
 foreach($entry in $manifest.files){
  $source=Join-Path $root $entry.path
  $target=Join-Path $package $entry.path
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target)|Out-Null
  Copy-Item -LiteralPath $source -Destination $target
 }
 Copy-Item -LiteralPath $RuntimePath -Destination (Join-Path $package 'assets\launcher\bin\node\node.exe')
 & (Join-Path $package 'tools\update-manifest.ps1') -Root $package -IncludeRuntime
 & (Join-Path $package 'Verify.ps1') -FilesOnly
 $zip=Join-Path $OutputDirectory 'codex-sakura-full-v1.0.0-windows-x64.zip'
 if(Test-Path -LiteralPath $zip){throw 'Release archive already exists; preserve it or choose a fresh output directory'}
 Compress-Archive -LiteralPath $package -DestinationPath $zip -CompressionLevel Optimal
 $checksum=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+(Split-Path -Leaf $zip)+"`n"
 [IO.File]::WriteAllText((Join-Path $OutputDirectory 'SHA256SUMS.txt'),$checksum,[Text.Encoding]::ASCII)
 Write-Output "Release archive: $zip"
}finally{
 $absolute=[IO.Path]::GetFullPath($temporary)
 $allowed=[IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')+'\'
 if($absolute.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $absolute -Leaf) -match '^package-[a-f0-9]{32}$'){
  if(Test-Path -LiteralPath $absolute){Remove-Item -LiteralPath $absolute -Recurse -Force}
 }
}
