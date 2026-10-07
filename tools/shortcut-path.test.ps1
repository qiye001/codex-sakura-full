$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('sakura-shortcut-test-'+[guid]::NewGuid().ToString('N'))
$engine=Join-Path $fixture '用户 空格\engine'
New-Item -ItemType Directory -Force -Path (Join-Path $engine 'scripts'),(Join-Path $engine 'bin')|Out-Null
try{
 Copy-Item -LiteralPath (Join-Path $root 'assets\launcher\scripts\common.ps1') -Destination (Join-Path $engine 'scripts\common.ps1')
 Copy-Item -LiteralPath (Join-Path $root 'assets\launcher\bin\run-hidden.vbs') -Destination (Join-Path $engine 'bin\run-hidden.vbs')
 $probe=Join-Path $engine 'scripts\probe.ps1'
 [IO.File]::WriteAllText($probe,'[IO.File]::WriteAllText((Join-Path $PSScriptRoot "result.txt"),"OK")',[Text.Encoding]::ASCII)
 . (Join-Path $engine 'scripts\common.ps1')
 $link=Join-Path $fixture 'Codex.lnk'
 New-CtlShortcut -ShortcutPath $link -ScriptPath $probe
 $shell=New-Object -ComObject WScript.Shell
 $shortcut=$shell.CreateShortcut($link)
 if($shortcut.Arguments -ne '"bin\run-hidden.vbs" "scripts\probe.ps1"'){throw 'Shortcut arguments must use engine-relative paths'}
 # CI has no interactive desktop. Suppress host dialogs in this fixture only.
 $shortcut.Arguments='//B '+$shortcut.Arguments
 $shortcut.Save()
 foreach($attempt in 1..2){
  $resultFile=Join-Path $engine 'scripts\result.txt'
  if(Test-Path -LiteralPath $resultFile){Remove-Item -LiteralPath $resultFile}
  $process=Start-Process -FilePath $link -WorkingDirectory $env:WINDIR -WindowStyle Hidden -PassThru
  if(-not $process.WaitForExit(20000)){
   $process.Kill()
   throw "Test fixture shortcut launch $attempt timed out"
  }
  if($process.ExitCode -ne 0 -or -not(Test-Path -LiteralPath $resultFile)){throw "Shortcut launch $attempt failed: $($process.ExitCode)"}
 }
 Write-Output 'PASS actual WSH shortcut: Chinese and space paths, different working directory, repeated click'
}finally{
 $absolute=[IO.Path]::GetFullPath($fixture)
 $allowed=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
 if($absolute.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $absolute -Leaf) -match '^sakura-shortcut-test-[a-f0-9]{32}$'){
  if(Test-Path -LiteralPath $absolute){Remove-Item -LiteralPath $absolute -Recurse -Force}
 }
}
