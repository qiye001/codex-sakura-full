$ErrorActionPreference='Stop'
$root=Join-Path $env:LOCALAPPDATA 'SakuraUser'
$engine=Join-Path $root 'engine'
if(-not(Test-Path -LiteralPath (Join-Path $engine 'scripts\common.ps1'))){throw 'Install the package first'}
. (Join-Path $engine 'scripts\common.ps1')
$state=Read-CtlJson -Path (Join-Path $root 'state.json')
$status=Read-CtlJson -Path (Join-Path $root 'injector-status.json')
$official=@(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" | Where-Object {$_.ExecutablePath -like '*OpenAI.Codex_*' -and $_.CommandLine -notmatch '--type='})
[pscustomobject]@{State=$state;WallpaperStatus=$status;OfficialBrowsers=$official.Count;ProfileOverrideDetected=[bool](@($official | Where-Object CommandLine -Match '--user-data-dir|--profile-directory|--incognito').Count);LaunchLog=(Join-Path $root 'launch.log')} | ConvertTo-Json -Depth 5
if($state){$node=Get-CtlNodeRuntime;& $node.Path (Join-Path $engine 'scripts\injector.mjs') --verify --port $state.port --theme-dir (Join-Path $root 'active-theme') --timeout-ms 10000;if($LASTEXITCODE -ne 0){throw 'Wallpaper is not ready. Check launch.log and injector-error.log.'}}
