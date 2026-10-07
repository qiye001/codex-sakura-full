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

Dim exitCode
exitCode = shell.Run(command, 0, True)
If exitCode <> 0 Then
  MsgBox "Codex wallpaper launcher could not finish. Your running Codex session has been left untouched." & vbCrLf & vbCrLf & "Details: " & shell.ExpandEnvironmentStrings("%LOCALAPPDATA%\SakuraUser\launch.log"), vbExclamation, "Codex wallpaper"
End If
WScript.Quit exitCode
