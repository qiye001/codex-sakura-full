$ErrorActionPreference='Stop'
$repository=Split-Path -Parent $PSScriptRoot
. (Join-Path $repository 'assets\launcher\scripts\common.ps1')
$stateRoot=Get-CtlStateRoot
$fixture=Join-Path $stateRoot ('visibility-test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $fixture|Out-Null
try{
 $script=Join-Path $fixture 'outside.vbs'
 $sentinel=Join-Path $fixture 'sentinel.txt'
 $result=Join-Path $fixture 'result.txt'
 [IO.File]::WriteAllText($sentinel,'fixture',[Text.Encoding]::ASCII)
 $source=@'
Option Explicit
Dim fs, output
Set fs=CreateObject("Scripting.FileSystemObject")
Set output=fs.CreateTextFile(WScript.Arguments(0),True,True)
output.WriteLine CStr(fs.FileExists(WScript.Arguments(1)))
output.Close
'@
 [IO.File]::WriteAllText($script,$source,[Text.Encoding]::ASCII)
 # WMI starts an independent process without inheriting a Store app's VFS view.
 $command='"'+(Join-Path $env:WINDIR 'System32\cscript.exe')+'" //B //Nologo "'+$script+'" "'+$result+'" "'+$sentinel+'"'
 $startup=New-CimInstance Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0}
 $created=Invoke-CimMethod Win32_Process Create -Arguments @{CommandLine=$command;ProcessStartupInformation=$startup}
 if($created.ReturnValue -ne 0){throw "External visibility process failed: $($created.ReturnValue)"}
 $deadline=(Get-Date).AddSeconds(15)
 while(-not(Test-Path -LiteralPath $result) -and (Get-Date) -lt $deadline){Start-Sleep -Milliseconds 200}
 if(-not(Test-Path -LiteralPath $result)){throw 'Runtime root is not visible to an external Windows process'}
 if((Get-Content -LiteralPath $result -Raw -Encoding Unicode).Trim() -ne 'True'){throw 'External process cannot read the runtime root'}
 Write-Output 'PASS state root is readable and writable from an independent external Windows process'
}finally{
 $absolute=[IO.Path]::GetFullPath($fixture)
 $allowed=[IO.Path]::GetFullPath($stateRoot).TrimEnd('\')+'\'
 if($absolute.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $absolute -Leaf) -match '^visibility-test-[a-f0-9]{32}$'){
  if(Test-Path -LiteralPath $absolute){Remove-Item -LiteralPath $absolute -Recurse -Force}
 }
}
