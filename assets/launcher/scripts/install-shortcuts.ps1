[CmdletBinding()]
param([string]$StateRoot,[string]$RequestId,[switch]$Remove)
$ErrorActionPreference='Stop'
if($StateRoot){$env:SAKURA_STATE_ROOT=$StateRoot}
. (Join-Path $PSScriptRoot 'common.ps1')
$paths=Get-CtlPaths
$report=if($RequestId){Join-Path $paths.StateRoot ('shortcut-report-'+$RequestId+'.json')}else{$null}
try{
 Initialize-CtlUnicodeShortcut
 $desktop=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Codex.lnk'
 $menu=Join-Path ([Environment]::GetFolderPath('Programs')) 'Codex Sakura\Codex.lnk'
 if($Remove){
  foreach($link in @($desktop,$menu)){
   if((Test-Path -LiteralPath $link) -and [CodexThemeLauncher.UnicodeShortcut]::Arguments($link) -like "*$($paths.EngineRoot)*"){Remove-Item -LiteralPath $link}
  }
 }else{
  if(Test-Path -LiteralPath $desktop){
   $old=[CodexThemeLauncher.UnicodeShortcut]::Arguments($desktop)
   if($old -notlike '*SakuraUser*' -and $old -notlike '*\.codex\sakura\*'){
    Copy-Item -LiteralPath $desktop -Destination ($desktop+'.before-sakura-'+(Get-Date -Format yyyyMMdd-HHmmss))
   }
  }
  foreach($link in @($desktop,$menu)){
   New-CtlShortcut -ShortcutPath $link -ScriptPath (Join-Path $paths.Scripts 'start-codex-skin.ps1') -IconPath (Join-Path $paths.Assets 'falling-sakura.ico')
   $expected='"'+(Join-Path $paths.Bin 'run-hidden.vbs')+'" "scripts\start-codex-skin.ps1"'
   if([CodexThemeLauncher.UnicodeShortcut]::Arguments($link) -ne $expected){throw 'Saved shortcut arguments differ from the installed engine'}
  }
  if(-not(Test-Path -LiteralPath (Join-Path $paths.Bin 'run-hidden.vbs'))){throw 'Shortcut runner is not visible in the desktop context'}
 }
 if($report){Write-CtlUtf8Json -Path $report -Value @{Success=$true;Desktop=$desktop;Menu=$menu}}
}catch{
 if($report){Write-CtlUtf8Json -Path $report -Value @{Success=$false;Error=$_.Exception.Message}}
 throw
}
