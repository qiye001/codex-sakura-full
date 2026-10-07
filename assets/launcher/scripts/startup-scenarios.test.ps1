$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'start-codex-skin.ps1'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('sakura-startup-tests-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
Copy-Item -LiteralPath $source -Destination (Join-Path $fixture 'start-codex-skin.ps1')
$mockCommon = @'
Set-StrictMode -Version Latest
function Assert-CtlPort { param($Port) }
function Get-CtlPaths { return $global:sakuraTestPaths }
function Read-CtlJson { param($Path) if($Path -eq $global:sakuraTestPaths.StateFile){return $global:sakuraTestScenario.state}; return $global:sakuraTestScenario.status }
function Write-CtlUtf8Json { param($Path,$Value) $global:sakuraTestScenario.writes++; if($Path -eq $global:sakuraTestPaths.StateFile){$global:sakuraTestScenario.state=$Value} }
function Get-CtlCodexInstall { return [pscustomobject]@{Executable='C:\Program Files\WindowsApps\OpenAI.Codex_fixture\app\ChatGPT.exe';PackageRoot='fixture';PackageFullName='fixture';PackageFamilyName='fixture'} }
function Test-CtlPortAvailable { param($Port) return -not $global:sakuraTestScenario.portBusy }
function Select-CtlPort { param($PreferredPort) return $PreferredPort+1 }
function Start-CtlCodex { param($Codex,$Arguments) $global:sakuraTestScenario.activations++; $global:sakuraTestScenario.activationArgs=$Arguments; $global:sakuraTestScenario.browserLive=$true; return 999 }
function Get-CtlBrowserId { param($Port) $global:sakuraTestScenario.browserChecks++; if($global:sakuraTestScenario.browserLive -and $global:sakuraTestScenario.browserChecks -gt $global:sakuraTestScenario.delay){return 'fixture-browser'}; return $null }
function Initialize-CtlThemeStore { param($Paths) $global:sakuraTestScenario.themeReads++ }
function Get-CtlNodeRuntime { return [pscustomobject]@{Path='fixture-node.exe';Version='24.0.0'} }
function ConvertTo-CtlArgumentLine { param($Arguments) return $Arguments -join ' ' }
function Get-Process { param($Name) return @() }
function Get-CimInstance { param($ClassName,$Filter)
 if($Filter -eq "Name='ChatGPT.exe'" -and $global:sakuraTestScenario.running){return [pscustomobject]@{ExecutablePath='C:\Program Files\WindowsApps\OpenAI.Codex_fixture\app\ChatGPT.exe';CommandLine=$global:sakuraTestScenario.browserArgs;ProcessId=999}}
 if($Filter -eq "Name='node.exe'" -and $global:sakuraTestScenario.helper){return [pscustomobject]@{CommandLine=(Join-Path $global:sakuraTestPaths.Scripts 'injector.mjs')+' --watch --port 9335';ProcessId=301}}
 return @()
}
function Stop-Process { param($Id,[switch]$Force,$ErrorAction) $global:sakuraTestScenario.stopped+=@($Id) }
function Start-Sleep { param($Milliseconds) }
function Start-Process { param($FilePath,$ArgumentList,$WindowStyle,[switch]$PassThru,$RedirectStandardOutput,$RedirectStandardError)
 $global:sakuraTestScenario.spawns++;$global:sakuraTestScenario.spawnArgs=$ArgumentList
 $process=[pscustomobject]@{Id=301;HasExited=$false;ExitCode=0}
 $process|Add-Member ScriptMethod Refresh {
  $global:sakuraTestScenario.refreshes++
  $phase=if($global:sakuraTestScenario.refreshes -ge $global:sakuraTestScenario.readyAfter){'ready'}else{'restoring'}
  $global:sakuraTestScenario.status=[pscustomobject]@{pid=301;browserId='fixture-browser';phase=$phase;updatedAt=[DateTime]::UtcNow.ToString('o');readyTargets=1}
 }
 return $process
}
'@
[IO.File]::WriteAllText((Join-Path $fixture 'common.ps1'),$mockCommon)
$global:sakuraTestPaths=[pscustomobject]@{StateRoot=$fixture;Scripts=$fixture;Assets=$fixture;StateFile=(Join-Path $fixture 'state.json');InjectorStatus=(Join-Path $fixture 'status.json');LaunchLog=(Join-Path $fixture 'launch.log');ActiveTheme=$fixture;InjectorLog=(Join-Path $fixture 'node.log');InjectorErrorLog=(Join-Path $fixture 'node-error.log')}
function Assert-Scenario([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
function Invoke-Scenario([string]$Name,[hashtable]$Overrides){
 $global:sakuraTestScenario=@{state=$null;status=$null;running=$false;helper=$false;browserLive=$false;browserArgs='ChatGPT.exe --remote-debugging-port=9335';delay=0;browserChecks=0;activations=0;activationArgs=@();spawns=0;spawnArgs='';stopped=@();writes=0;portBusy=$false;themeReads=0;refreshes=0;readyAfter=1}
 foreach($key in $Overrides.Keys){$global:sakuraTestScenario[$key]=$Overrides[$key]}
 $failure=$null
 try{& (Join-Path $fixture 'start-codex-skin.ps1') -RestartExisting}catch{$failure=$_.Exception.Message}
 Assert-Scenario ($global:sakuraTestScenario.stopped -notcontains 999) "$Name stopped Codex"
 if($Name -eq 'ordinary existing app'){
  Assert-Scenario ([bool]$failure) 'Missing connection should report a normal exit requirement'
  Assert-Scenario ($global:sakuraTestScenario.activations -eq 0 -and $global:sakuraTestScenario.spawns -eq 0) 'Existing app must remain untouched'
 }else{
  Assert-Scenario (-not $failure) "$Name failed: $failure"
  if($Name -eq 'healthy repeated click'){
   Assert-Scenario ($global:sakuraTestScenario.activations -eq 0 -and $global:sakuraTestScenario.spawns -eq 0 -and $global:sakuraTestScenario.themeReads -eq 0) 'Healthy click must reuse the helper without theme parsing'
  }else{
   Assert-Scenario ($global:sakuraTestScenario.spawns -eq 1) "$Name must start one helper"
  }
  if($Name -like 'cold*'){
   Assert-Scenario ($global:sakuraTestScenario.activations -eq 1) 'Cold start must activate once'
   Assert-Scenario (($global:sakuraTestScenario.activationArgs -join ' ') -notmatch 'user-data|profile|incognito') 'Account profile must not be overridden'
  }elseif($Name -ne 'healthy repeated click'){
   Assert-Scenario ($global:sakuraTestScenario.activations -eq 0 -and $global:sakuraTestScenario.spawnArgs -match '--no-startup') 'Attach must not relaunch the app or replay the animation'
  }
 }
 Write-Host "PASS $Name"
}
try{
 Invoke-Scenario 'cold launch' @{}
 Invoke-Scenario 'cold port conflict' @{portBusy=$true}
 Invoke-Scenario 'slow existing browser' @{running=$true;browserLive=$true;delay=4;readyAfter=8}
 Invoke-Scenario 'missing helper and stale state' @{running=$true;browserLive=$true;state=[pscustomobject]@{port=9335;injectorPid=999}}
 Invoke-Scenario 'healthy repeated click' @{running=$true;browserLive=$true;helper=$true;status=[pscustomobject]@{pid=301;browserId='fixture-browser';phase='ready';updatedAt=[DateTime]::UtcNow.ToString('o');readyTargets=1}}
 Invoke-Scenario 'ordinary existing app' @{running=$true;browserArgs='ChatGPT.exe'}
 Invoke-Scenario 'corrupt status' @{running=$true;browserLive=$true;status=[pscustomobject]@{unexpected='field'}}
 # Validate the fixture path before recursive cleanup.
}finally{
 $resolved=[IO.Path]::GetFullPath($fixture)
 $allowed=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
 if($resolved.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)-and (Split-Path $resolved -Leaf) -like 'sakura-startup-tests-*'){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
