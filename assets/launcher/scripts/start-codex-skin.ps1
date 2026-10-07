[CmdletBinding()]
param(
  [int]$Port = 9335,
  # Accepted for old shortcuts; normal launches never close an existing Codex.
  [switch]$RestartExisting,
  [switch]$ForegroundInjector,
  [switch]$NoStartupAnimation
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-CtlPort -Port $Port
$paths = Get-CtlPaths
$codex = $null
$portMatch = [regex]::Match('', '--remote-debugging-port[= ](\d+)')
New-Item -ItemType Directory -Force -Path $paths.StateRoot | Out-Null
$clock = [Diagnostics.Stopwatch]::StartNew()
function Write-LaunchLog([string]$Message) {
  $line = '{0} pid={1} elapsedMs={2} {3}' -f (Get-Date).ToUniversalTime().ToString('o'), $PID, $clock.ElapsedMilliseconds, $Message
  [IO.File]::AppendAllText($paths.LaunchLog, $line + "`r`n", [Text.UTF8Encoding]::new($false))
}
function Show-ExistingCodex {
  try {
    $shell = New-Object -ComObject WScript.Shell
    foreach ($running in @(Get-Process -Name ChatGPT -ErrorAction SilentlyContinue)) {
      if ($running.MainWindowHandle -ne 0) { [void]$shell.AppActivate($running.Id); break }
    }
  } catch {}
}
function Read-InjectorStatus {
  $value = Read-CtlJson -Path $paths.InjectorStatus
  if (-not $value) { return $null }
  foreach($field in @('pid','browserId','phase','updatedAt','readyTargets')) {
    if (-not $value.PSObject.Properties[$field]) { return $null }
  }
  try { [void][DateTime]::Parse($value.updatedAt) } catch { return $null }
  return $value
}

$launchMutex = [Threading.Mutex]::new($false, 'Local\SakuraCodexLaunch-' + $env:USERNAME)
$ownsMutex = $false
try {
  try { $ownsMutex = $launchMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
  if (-not $ownsMutex) {
    Write-LaunchLog 'Another launch is in progress; duplicate click ignored.'
    Show-ExistingCodex
    return
  }
  Write-LaunchLog 'Begin; preserve official package activation and existing account profile.'
  $previousState = Read-CtlJson -Path $paths.StateFile
  if($previousState -and -not $previousState.PSObject.Properties['port']) { $previousState=$null }
  $injector = Join-Path $paths.Scripts 'injector.mjs'
  $iconSyncScript = Join-Path $paths.Scripts 'sync-window-icon.ps1'
  $iconPath = Join-Path $paths.Assets 'falling-sakura.ico'
  $codexProcesses = @(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" | Where-Object {
    $_.ExecutablePath -like '*\WindowsApps\OpenAI.Codex_*\app\ChatGPT.exe' -and $_.CommandLine -notmatch '--type='
  })
  # Read the running browser's port, including after a port conflict or update.
  if ($codexProcesses.Count -gt 0) {
    $portMatch = [regex]::Match("$($codexProcesses[0].CommandLine)", '--remote-debugging-port[= ](\d+)')
    if ($portMatch.Success) { $Port = [int]$portMatch.Groups[1].Value }
  } elseif ($previousState -and $previousState.port) {
    $Port = [int]$previousState.port
  }
  Assert-CtlPort -Port $Port
  $browserId = Get-CtlBrowserId -Port $Port
  $coldStart = $codexProcesses.Count -eq 0 -and -not $browserId
  if ($coldStart) {
    $codex = Get-CtlCodexInstall
    if (-not (Test-CtlPortAvailable -Port $Port)) { $Port = Select-CtlPort -PreferredPort $Port }
    [void](Start-CtlCodex -Codex $codex -Arguments @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$Port"))
    Write-LaunchLog "Official package activated once; port=$Port."
  } else {
    Show-ExistingCodex
    if (-not $browserId -and -not $portMatch.Success) {
      Write-LaunchLog 'Existing Codex has no wallpaper connection. Left running; manual normal exit is required once.'
      throw 'Codex was opened without the wallpaper shortcut. Exit Codex normally, then use the Codex desktop shortcut. The launcher has left your current session untouched.'
    }
  }
  # A browser may be alive before its renderer exists. Never kill it for that delay.
  $deadline = (Get-Date).AddSeconds(60)
  while (-not $browserId) {
    if ((Get-Date) -ge $deadline) { throw "Codex did not expose its local wallpaper connection within 60 seconds (port $Port). No application process was stopped." }
    Start-Sleep -Milliseconds 250
    $browserId = Get-CtlBrowserId -Port $Port
  }
  Write-LaunchLog "Browser ready; port=$Port."
  $status = Read-InjectorStatus
  $helpers = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
    $_.CommandLine -like "*$injector*" -and $_.CommandLine -match "--port[= ]+$Port(?:\s|$)" -and $_.CommandLine -match '--watch'
  })
  if ($helpers.Count -gt 0 -and $status -and @($helpers | Where-Object ProcessId -eq $status.pid).Count -eq 1 -and $status.browserId -eq $browserId -and $status.phase -notin @('stopped','error') -and
      ((Get-Date).ToUniversalTime() - [DateTime]::Parse($status.updatedAt).ToUniversalTime()).TotalSeconds -lt 20) {
    foreach($extra in @($helpers | Where-Object ProcessId -ne $status.pid)){Stop-Process -Id $extra.ProcessId -Force -ErrorAction SilentlyContinue}
    Write-LaunchLog "Healthy wallpaper helper reused; pid=$($status.pid)."
    Write-Host 'Codex and its wallpaper are already running.'
    return
  }
  # Restart only positively identified helpers, never Codex or an unrelated reused PID.
  foreach ($helper in $helpers) { Stop-Process -Id $helper.ProcessId -Force -ErrorAction SilentlyContinue }
  Initialize-CtlThemeStore -Paths $paths
  $node = Get-CtlNodeRuntime
  if (-not $codex) { $codex = Get-CtlCodexInstall }
  $arguments = @($injector, '--watch', '--port', "$Port", '--theme-dir', $paths.ActiveTheme, '--status-file', $paths.InjectorStatus)
  if (-not $coldStart -or $NoStartupAnimation) { $arguments += '--no-startup' }
  if ($ForegroundInjector) { & $node.Path @arguments; return }
  $daemon = Start-Process -FilePath $node.Path -ArgumentList (ConvertTo-CtlArgumentLine $arguments) -WindowStyle Hidden -PassThru -RedirectStandardOutput $paths.InjectorLog -RedirectStandardError $paths.InjectorErrorLog
  $state = [pscustomobject]@{
    schemaVersion=3; platform='windows'; port=$Port; injectorPid=$daemon.Id; iconSyncPid=$null
    browserId=$browserId; nodePath=$node.Path; nodeVersion=$node.Version
    codexExe=$codex.Executable; codexPackageRoot=$codex.PackageRoot
    codexPackageFullName=$codex.PackageFullName; codexPackageFamilyName=$codex.PackageFamilyName
    themeDir=$paths.ActiveTheme; createdAt=(Get-Date).ToUniversalTime().ToString('o')
  }
  Write-CtlUtf8Json -Path $paths.StateFile -Value $state
  Write-LaunchLog "Wallpaper helper started; pid=$($daemon.Id); coldStart=$coldStart."
  $deadline = (Get-Date).AddSeconds(40)
  do {
    Start-Sleep -Milliseconds 200
    $daemon.Refresh()
    if ($daemon.HasExited) { throw "Wallpaper helper exited with code $($daemon.ExitCode). See $($paths.InjectorErrorLog)" }
    $status = Read-InjectorStatus
    if ($status -and $status.pid -eq $daemon.Id -and $status.browserId -eq $browserId -and $status.phase -eq 'ready') { break }
  } while ((Get-Date) -lt $deadline)
  if (-not $status -or $status.pid -ne $daemon.Id -or $status.phase -ne 'ready') {
    Write-LaunchLog 'Renderer is taking longer; helper remains active and will retry. See injector status/logs.'
    Write-Warning 'Wallpaper is still recovering. Codex and its helper have been left running.'
    return
  }
  Write-LaunchLog "Wallpaper ready; helper reported $($status.readyTargets) main window(s)."
  # Icon cosmetics are optional and cannot make wallpaper startup fail.
  if ((Test-Path -LiteralPath $iconSyncScript) -and (Test-Path -LiteralPath $iconPath)) {
    $iconHelpers = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like "*$iconSyncScript*" })
    if ($iconHelpers.Count -eq 0) {
      try {
        $iconArguments = ConvertTo-CtlArgumentLine @('-NoProfile','-ExecutionPolicy','RemoteSigned','-File',$iconSyncScript,'-CodexExecutable',$codex.Executable,'-IconPath',$iconPath)
        $iconSync = Start-Process powershell.exe -ArgumentList $iconArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $paths.IconSyncLog -RedirectStandardError $paths.IconSyncErrorLog
        $state.iconSyncPid = $iconSync.Id
        Write-CtlUtf8Json -Path $paths.StateFile -Value $state
      } catch { Write-LaunchLog "Optional icon synchronization failed: $($_.Exception.Message)" }
    }
  }
  Write-Host "Codex wallpaper is active on local port $Port."
} catch {
  Write-LaunchLog "FAILED: $($_.Exception.Message)"
  throw
} finally {
  if ($ownsMutex) { $launchMutex.ReleaseMutex() }
  $launchMutex.Dispose()
}
