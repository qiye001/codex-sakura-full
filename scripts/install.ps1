[CmdletBinding()]
param([switch]$CheckOnly,[switch]$Launch,[switch]$SkipSkillInstall,[switch]$NoShortcuts)
$ErrorActionPreference='Stop'
$packageRoot=Split-Path -Parent $PSScriptRoot
$sourceEngine=Join-Path $packageRoot 'assets\launcher'
$runtimeFiles=@(foreach($part in @('assets','scripts','bin')){Get-ChildItem -LiteralPath (Join-Path $sourceEngine $part) -File -Recurse -Force})
function Assert-SakuraRuntimeCopy([string]$Destination){
 foreach($file in $runtimeFiles){
  $relative=$file.FullName.Substring($sourceEngine.Length+1)
  $copied=Join-Path $Destination $relative
  if(-not(Test-Path -LiteralPath $copied -PathType Leaf)){throw "Runtime copy is incomplete: $relative"}
  if((Get-FileHash -LiteralPath $copied -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash){throw "Runtime copy differs from the package: $relative"}
 }
}
function Move-SakuraDirectory([string]$From,[string]$To){
 for($attempt=0;$attempt -lt 8;$attempt++){
  if(Test-Path -LiteralPath $To){throw "Refusing to nest an engine directory into an existing destination: $To"}
  try{[IO.Directory]::Move($From,$To);return}
  catch [UnauthorizedAccessException]{if($attempt -eq 7){throw};Start-Sleep -Milliseconds 300}
  catch [IO.IOException]{if($attempt -eq 7){throw};Start-Sleep -Milliseconds 300}
 }
}
. (Join-Path $sourceEngine 'scripts\common.ps1')
$codex=Get-CtlCodexInstall
$node=Get-CtlNodeRuntime
if($CheckOnly){Write-Host "Ready: $($codex.PackageFullName), Node $($node.Version), Windows $([Environment]::OSVersion.Version). No changes made.";return}
& (Join-Path $packageRoot 'Verify.ps1') -FilesOnly
if($LASTEXITCODE -and $LASTEXITCODE -ne 0){throw 'Package integrity check failed'}
$stateRoot=Get-CtlStateRoot
$engineRoot=Join-Path $stateRoot 'engine'
$stage=Join-Path $stateRoot ('engine-stage-'+[guid]::NewGuid().ToString('N'))
$backup=Join-Path $stateRoot ('engine-backup-'+(Get-Date -Format yyyyMMdd-HHmmss)+'-'+[guid]::NewGuid().ToString('N').Substring(0,6))
foreach($target in @($engineRoot,$stage,$backup)){
 if(-not [IO.Path]::GetFullPath($target).StartsWith([IO.Path]::GetFullPath($stateRoot).TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unexpected installation target'}
}
$mutex=[Threading.Mutex]::new($false,'Local\SakuraCodexLaunch-'+$env:USERNAME)
$owned=$false
try{
 try{$owned=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$owned=$true}
 if(-not $owned){throw 'Codex wallpaper is starting. Wait a moment, then install again.'}
 New-Item -ItemType Directory -Force -Path $stateRoot,$stage | Out-Null
 # A runtime launched in a packaged app cannot read EFS files from another identity.
 & cipher.exe /d $stateRoot $stage | Out-Null
 foreach($name in @('assets','scripts','bin')){Copy-Item -LiteralPath (Join-Path $sourceEngine $name) -Destination $stage -Recurse -Force}
 Assert-SakuraRuntimeCopy -Destination $stage
 Get-ChildItem -LiteralPath $stage -File -Recurse | Unblock-File
 & cipher.exe /d "/s:$stage" /a | Out-Null
 $stagedNode=Join-Path $stage 'bin\node\node.exe'
 if(-not(Test-Path -LiteralPath $stagedNode)){$stagedNode=$node.Path}
 & $stagedNode (Join-Path $stage 'scripts\injector.mjs') --self-test --theme-dir (Join-Path $stage 'assets')
 if($LASTEXITCODE -ne 0){throw 'Staged runtime validation failed; existing installation is untouched'}
 $oldScript=Join-Path $engineRoot 'scripts\injector.mjs'
 $oldIcon=Join-Path $engineRoot 'scripts\sync-window-icon.ps1'
 Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -eq 'node.exe' -and $_.CommandLine -like "*$oldScript*") -or
  ($_.Name -eq 'powershell.exe' -and $_.CommandLine -like "*$oldIcon*")
 } | ForEach-Object {Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}
 $movedOld=$false
 if(Test-Path -LiteralPath $engineRoot){Move-SakuraDirectory -From $engineRoot -To $backup;$movedOld=$true}
 # Directory.Move refuses an existing destination instead of nesting the stage
 # inside a recreated/leftover engine directory.
 try{
  Move-SakuraDirectory -From $stage -To $engineRoot
  Assert-SakuraRuntimeCopy -Destination $engineRoot
 }catch{
  if($movedOld -and -not(Test-Path -LiteralPath $engineRoot)){Move-SakuraDirectory -From $backup -To $engineRoot}
  throw
 }
 . (Join-Path $engineRoot 'scripts\common.ps1')
 $paths=Get-CtlPaths
 # Preserve preferences/cache from the old real or MSIX-virtualized AppData root.
 # Never migrate stale process state, logs, account profiles or browser storage.
 if(-not $env:SAKURA_STATE_ROOT -and -not(Test-Path -LiteralPath (Join-Path $stateRoot 'active-theme\theme.json'))){
  $legacyRoots=@((Join-Path $env:LOCALAPPDATA 'SakuraUser'))
  $familyProperty=$codex.PSObject.Properties['PackageFamilyName']
  if($familyProperty -and $familyProperty.Value){$legacyRoots+=Join-Path $env:LOCALAPPDATA ('Packages\'+$familyProperty.Value+'\LocalCache\Local\SakuraUser')}
  foreach($legacy in $legacyRoots){
   if(Test-Path -LiteralPath (Join-Path $legacy 'active-theme\theme.json')){
    foreach($name in @('active-theme','workshop-originals')){
     $from=Join-Path $legacy $name
     $to=Join-Path $stateRoot $name
     if((Test-Path -LiteralPath $from)-and -not(Test-Path -LiteralPath $to)){Copy-Item -LiteralPath $from -Destination $to -Recurse}
    }
    Write-Host 'Existing wallpaper resources and cache copied to the shared user directory; original data was kept.'
    break
   }
  }
 }
 Initialize-CtlThemeStore -Paths $paths
 $icon=Join-Path $paths.Assets 'falling-sakura.ico'
 $desktop=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Codex.lnk'
 if(-not $NoShortcuts){
 Invoke-CtlShortcutSetup
 }
 if(-not $SkipSkillInstall){
  $skillRoot=if($env:CODEX_HOME){Join-Path $env:CODEX_HOME 'skills'}else{Join-Path $env:USERPROFILE '.codex\skills'}
  $skillDestination=Join-Path $skillRoot 'codex-sakura-full'
  if(-not(Test-CtlPathEqual $packageRoot $skillDestination)){
   New-Item -ItemType Directory -Force -Path $skillDestination | Out-Null
   Get-ChildItem -LiteralPath $packageRoot -Force | Where-Object Name -NotIn @('.git','dist','output') | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination $skillDestination -Recurse -Force}
  }
 }
 Write-Host "Installed: $engineRoot"
 if(-not $NoShortcuts){Write-Host "Desktop shortcut: $desktop"}
 Write-Host 'Your account profile, chat data and saved wallpaper preferences were not changed.'
}finally{
 if($owned){$mutex.ReleaseMutex()};$mutex.Dispose()
 if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force}
}
if($Launch){
 $running=@(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" | Where-Object { $_.ExecutablePath -like '*OpenAI.Codex_*' -and $_.CommandLine -notmatch '--type=' })
 if($running.Count -gt 0 -and $running[0].CommandLine -notmatch '--remote-debugging-port'){
  Write-Host 'Installed successfully. Exit Codex normally once, then use the new desktop Codex shortcut. The current session has been left running.'
 }else{& (Join-Path $engineRoot 'scripts\start-codex-skin.ps1')}
}
