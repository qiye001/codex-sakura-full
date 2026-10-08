$ErrorActionPreference='Stop'
$repository=Split-Path -Parent $PSScriptRoot
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('sakura-upgrade-test-'+[guid]::NewGuid().ToString('N'))
$package=Join-Path $fixture 'package'
$testLocal=Join-Path $fixture '用户 空格\Local'
New-Item -ItemType Directory -Force -Path $package,$testLocal|Out-Null
$priorLocal=$env:LOCALAPPDATA
try{
 $manifest=Get-Content -LiteralPath (Join-Path $repository 'MANIFEST.json') -Raw -Encoding UTF8|ConvertFrom-Json
 foreach($entry in $manifest.files){
  if($entry.path -eq 'assets/launcher/bin/node/node.exe'){continue}
  $target=Join-Path $package $entry.path
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target)|Out-Null
  Copy-Item -LiteralPath (Join-Path $repository $entry.path) -Destination $target
 }
 $common=Join-Path $package 'assets\launcher\scripts\common.ps1'
 # Only the official package lookup is mocked; real copy/swap/validation runs.
 $mock=@'

function Get-CtlCodexInstall {
 return [pscustomobject]@{PackageFullName='OpenAI.Codex_fixture';Executable='C:\fixture\ChatGPT.exe';PackageRoot='C:\fixture';PackageFamilyName='fixture';AppUserModelId='fixture!App'}
}
'@
 $text=[IO.File]::ReadAllText($common)+$mock
 [IO.File]::WriteAllText($common,$text,[Text.UTF8Encoding]::new($true))
 & (Join-Path $package 'tools\update-manifest.ps1') -Root $package
 $env:LOCALAPPDATA=$testLocal
 & (Join-Path $package 'Install.ps1') -NoShortcuts -SkipSkillInstall
 $engine=Join-Path $testLocal 'SakuraUser\engine'
 $sourceEngine=Join-Path $package 'assets\launcher'
 $themeFile=Join-Path $testLocal 'SakuraUser\active-theme\theme.json'
 $theme=Get-Content -LiteralPath $themeFile -Raw -Encoding UTF8|ConvertFrom-Json
 $theme.art.focusX=0.321
 [IO.File]::WriteAllText($themeFile,($theme|ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
 # A distinct previous version must be replaced, not silently kept above a stage.
 [IO.File]::AppendAllText((Join-Path $engine 'scripts\common.ps1'),"`n# previous-version fixture`n",[Text.UTF8Encoding]::new($false))
 & (Join-Path $package 'Install.ps1') -NoShortcuts -SkipSkillInstall
 foreach($part in @('assets','scripts','bin')){
  foreach($file in Get-ChildItem -LiteralPath (Join-Path $sourceEngine $part) -File -Recurse -Force){
   $relative=$file.FullName.Substring($sourceEngine.Length+1)
   if((Get-FileHash -LiteralPath (Join-Path $engine $relative)).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash){throw "Installed file differs after upgrade: $relative"}
  }
 }
 if(@(Get-ChildItem -LiteralPath $engine -Directory -Filter 'engine-stage-*').Count){throw 'Stage was nested inside the installed engine'}
 if(@(Get-ChildItem -LiteralPath (Split-Path -Parent $engine) -Directory -Filter 'engine-backup-*').Count -ne 1){throw 'Previous engine backup is missing'}
 $after=Get-Content -LiteralPath $themeFile -Raw -Encoding UTF8|ConvertFrom-Json
 if($after.art.focusX -ne 0.321){throw 'Upgrade changed saved theme settings'}
 Write-Output 'PASS first install and real upgrade: exact runtime files, no nested stage, backup and settings preserved, global Node fallback'
}finally{
 $env:LOCALAPPDATA=$priorLocal
 $absolute=[IO.Path]::GetFullPath($fixture)
 $allowed=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
 if($absolute.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $absolute -Leaf) -match '^sakura-upgrade-test-[a-f0-9]{32}$'){
  if(Test-Path -LiteralPath $absolute){Remove-Item -LiteralPath $absolute -Recurse -Force}
 }
}
