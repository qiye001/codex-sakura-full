param([switch]$RestoreOnly)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'assets\launcher\scripts\common.ps1')
$stateRoot=Get-CtlStateRoot
$engine=Join-Path $stateRoot 'engine'
if(-not(Test-Path -LiteralPath (Join-Path $engine 'scripts\common.ps1'))){Write-Host 'No installed runtime found';return}
. (Join-Path $engine 'scripts\common.ps1')
$state=Read-CtlJson -Path (Join-Path $stateRoot 'state.json')
$node=Get-CtlNodeRuntime
if($state){& $node.Path (Join-Path $engine 'scripts\injector.mjs') --remove --port $state.port --theme-dir (Join-Path $stateRoot 'active-theme')}
Stop-CtlRecordedInjector -State $state
Stop-CtlRecordedIconSync -State $state
if($RestoreOnly){Write-Host 'Official appearance restored. Existing Codex is still running; saved preferences remain.';return}
Invoke-CtlShortcutSetup -Remove
$resolved=[IO.Path]::GetFullPath($engine)
if($resolved.StartsWith([IO.Path]::GetFullPath($stateRoot).TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)-and (Split-Path $resolved -Leaf) -eq 'engine'){Remove-Item -LiteralPath $resolved -Recurse -Force}
Write-Host 'Wallpaper runtime removed. Accounts, chats, imported files and skill documentation were kept.'
