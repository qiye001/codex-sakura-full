param([switch]$NoRestart)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$paths=Get-CtlPaths;$state=Read-CtlJson -Path $paths.StateFile;$node=Get-CtlNodeRuntime
if($state){& $node.Path (Join-Path $paths.Scripts 'injector.mjs') --remove --port $state.port --theme-dir $paths.ActiveTheme}
Stop-CtlRecordedInjector -State $state
Stop-CtlRecordedIconSync -State $state
Write-Host 'Official appearance restored; current Codex session and saved preferences were kept.'
