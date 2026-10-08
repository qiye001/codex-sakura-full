[CmdletBinding()]
param([string]$Root=(Split-Path -Parent $PSScriptRoot),[switch]$IncludeRuntime)
$ErrorActionPreference='Stop'
$resolved=[IO.Path]::GetFullPath($Root).TrimEnd('\')
if(-not(Test-Path -LiteralPath (Join-Path $resolved 'SKILL.md'))){throw 'Expected a complete package root'}
$files=@(Get-ChildItem -LiteralPath $resolved -Recurse -File -Force | ForEach-Object {
 $relative=$_.FullName.Substring($resolved.Length+1).Replace('\','/')
 if($relative -eq 'MANIFEST.json' -or $relative -match '^(\.git|dist|output)/'){return}
 if(-not $IncludeRuntime -and $relative -eq 'assets/launcher/bin/node/node.exe'){return}
 [pscustomobject]@{path=$relative;size=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
} | Sort-Object path)
$manifest=[ordered]@{name='codex-sakura-full';version='1.0.3';platform='windows-x64';runtimeIncluded=[bool]$IncludeRuntime;files=$files}
[IO.File]::WriteAllText((Join-Path $resolved 'MANIFEST.json'),($manifest|ConvertTo-Json -Depth 6)+"`r`n",[Text.UTF8Encoding]::new($false))
Write-Output "Manifest generated: $($files.Count) files; runtime included=$([bool]$IncludeRuntime)"
