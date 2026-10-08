param([switch]$FilesOnly)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')+'\'
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$count=0
foreach($entry in $manifest.files){
 $file=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot $entry.path))
 if(-not $file.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid manifest path'}
 if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw "Missing file: $($entry.path)"}
 if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ine $entry.sha256){throw "File changed: $($entry.path)"}
 $count++
}
Write-Host "Integrity verified: $count files."
if($FilesOnly){return}
$engine=Join-Path $PSScriptRoot 'assets\launcher'
. (Join-Path $engine 'scripts\common.ps1')
$node=(Get-CtlNodeRuntime).Path
& $node (Join-Path $engine 'scripts\injector.mjs') --self-test --theme-dir (Join-Path $engine 'assets')
if($LASTEXITCODE -ne 0){throw 'Runtime validation failed'}
& $node --test (Join-Path $engine 'scripts\wallpaper-library.test.mjs') (Join-Path $engine 'scripts\workshop-originals.test.mjs') (Join-Path $engine 'scripts\startup-watch.test.mjs')
if($LASTEXITCODE -ne 0){throw 'Runtime tests failed'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $engine 'scripts\startup-scenarios.test.ps1')
if($LASTEXITCODE -ne 0){throw 'Startup scenario tests failed'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'tools\shortcut-path.test.ps1')
if($LASTEXITCODE -ne 0){throw 'Shortcut path regression test failed'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'tools\install-upgrade.test.ps1')
if($LASTEXITCODE -ne 0){throw 'Installer upgrade regression test failed'}
