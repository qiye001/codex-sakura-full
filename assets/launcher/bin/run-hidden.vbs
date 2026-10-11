Option Explicit

Function Quote(ByVal value)
  Quote = """" & Replace(value, """", "\""") & """"
End Function

If WScript.Arguments.Count < 1 Then
  WScript.Quit 2
End If

Dim shell, scriptPath, command, i, arg
Set shell = CreateObject("WScript.Shell")
Dim fileSystem
Set fileSystem = CreateObject("Scripting.FileSystemObject")
shell.CurrentDirectory = fileSystem.GetParentFolderName(fileSystem.GetParentFolderName(WScript.ScriptFullName))
scriptPath = WScript.Arguments(0)
If Not fileSystem.FileExists(scriptPath) Then
  MsgBox "Codex launcher script is missing. Reinstall the complete release package.", vbExclamation, "Codex Sakura"
  WScript.Quit 3
End If
command = "powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File " & Quote(scriptPath)

For i = 1 To WScript.Arguments.Count - 1
  arg = WScript.Arguments(i)
  If Left(arg, 1) = "-" And InStr(arg, " ") = 0 Then
    command = command & " " & arg
  Else
    command = command & " " & Quote(arg)
  End If
Next

Dim exitCode, startedAt
startedAt = Now
exitCode = shell.Run(command, 0, True)
If exitCode <> 0 Then
  Dim details, logText, logFile
  details = fileSystem.BuildPath(fileSystem.GetParentFolderName(shell.CurrentDirectory), "launch.log")
  logText = ""
  If fileSystem.FileExists(details) Then
  If fileSystem.GetFile(details).DateLastModified >= startedAt Then
    On Error Resume Next
    Set logFile = fileSystem.OpenTextFile(details, 1, False)
    logText = logFile.ReadAll
    logFile.Close
    On Error GoTo 0
  End If
  End If
  Dim logLines
  logText = Trim(logText)
  If Len(logText) > 0 Then
    logLines = Split(Replace(logText, vbCrLf, vbLf), vbLf)
    logText = logLines(UBound(logLines))
  End If
  If InStr(logText, "Codex was opened without the wallpaper shortcut") > 0 Then
    MsgBox ChrW(67) & ChrW(111) & ChrW(100) & ChrW(101) & ChrW(120) & ChrW(32) & ChrW(24403) & ChrW(21069) & ChrW(24050) & ChrW(25171) & ChrW(24320) & ChrW(65292) & ChrW(20294) & ChrW(27809) & ChrW(26377) & ChrW(21551) & ChrW(29992) & ChrW(22806) & ChrW(35266) & ChrW(36830) & ChrW(25509) & ChrW(12290) & ChrW(35831) & ChrW(20445) & ChrW(23384) & ChrW(36755) & ChrW(20837) & ChrW(24182) & ChrW(36864) & ChrW(20986) & ChrW(25972) & ChrW(20010) & ChrW(32) & ChrW(67) & ChrW(111) & ChrW(100) & ChrW(101) & ChrW(120) & ChrW(65292) & ChrW(20877) & ChrW(21452) & ChrW(20987) & ChrW(26700) & ChrW(38754) & ChrW(22270) & ChrW(26631) & ChrW(12290), vbInformation, "Codex"
  Else
    MsgBox ChrW(22806) & ChrW(35266) & ChrW(21551) & ChrW(21160) & ChrW(26410) & ChrW(23436) & ChrW(25104) & ChrW(65292) & ChrW(24403) & ChrW(21069) & ChrW(32) & ChrW(67) & ChrW(111) & ChrW(100) & ChrW(101) & ChrW(120) & ChrW(32) & ChrW(20250) & ChrW(35805) & ChrW(24050) & ChrW(20445) & ChrW(30041) & ChrW(12290) & ChrW(35831) & ChrW(26597) & ChrW(30475) & ChrW(26085) & ChrW(24535) & ChrW(65306) & vbCrLf & details, vbExclamation, "Codex"
  End If
End If
WScript.Quit exitCode
