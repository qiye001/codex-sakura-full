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
 $unicodeArguments=[CodexThemeLauncher.UnicodeShortcut]::Arguments($link)
 $expectedArguments='"'+(Join-Path $engine 'bin\run-hidden.vbs')+'" "scripts\probe.ps1"'
 if($unicodeArguments -ne $expectedArguments){throw "Shortcut arguments mismatch. Expected: $expectedArguments Actual: $unicodeArguments"}
 # CI has no interactive desktop. Suppress host dialogs in this fixture only.
 [CodexThemeLauncher.UnicodeShortcut]::Save($link,(Join-Path $env:WINDIR 'System32\wscript.exe'),'//B '+$unicodeArguments,$engine,$null)
 foreach($attempt in 1..2){
  $resultFile=Join-Path $engine 'scripts\result.txt'
  if(Test-Path -LiteralPath $resultFile){Remove-Item -LiteralPath $resultFile}
  $process=Start-Process -FilePath $link -WorkingDirectory $env:WINDIR -WindowStyle Hidden -PassThru
  if(-not $process.WaitForExit(20000)){
   $process.Kill()
   throw "Test fixture shortcut launch $attempt timed out"
  }
  if($process.ExitCode -ne 0 -or -not(Test-Path -LiteralPath $resultFile)){
   Write-Output "Fixture engine: $engine"
   Get-ExecutionPolicy -List | Format-Table | Out-String | Write-Output
   $priorPreference=$ErrorActionPreference
   try{
    $ErrorActionPreference='Continue'
    Push-Location $engine
    & powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File 'scripts\probe.ps1' 2>&1 | Out-String | Write-Output
    Write-Output "Direct PowerShell exit: $LASTEXITCODE"
    & cscript.exe //Nologo //B 'bin\run-hidden.vbs' 'scripts\probe.ps1' 2>&1 | Out-String | Write-Output
    Write-Output "Direct WSH exit: $LASTEXITCODE"
   }finally{Pop-Location;$ErrorActionPreference=$priorPreference}
   throw "Shortcut launch $attempt failed: $($process.ExitCode)"
  }
 }
 Write-Output 'PASS actual WSH shortcut: Chinese and space paths, different working directory, repeated click'
}finally{
 $absolute=[IO.Path]::GetFullPath($fixture)
 $allowed=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
 if($absolute.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $absolute -Leaf) -match '^sakura-shortcut-test-[a-f0-9]{32}$'){
  if(Test-Path -LiteralPath $absolute){Remove-Item -LiteralPath $absolute -Recurse -Force}
 }
}
