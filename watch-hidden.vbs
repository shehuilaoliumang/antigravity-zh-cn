' Hidden launcher for the Antigravity zh-CN watcher.
' Scheduled tasks that start powershell.exe or node.exe directly can flash a
' console even with -WindowStyle Hidden. wscript.exe is a GUI process, and
' WshShell.Run with window style 0 starts the watcher with no window.
Option Explicit
Dim sh, fso, root, node, localApp, programFiles, cmd, mode, wait, i, arg
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
localApp = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%")
programFiles = sh.ExpandEnvironmentStrings("%ProgramFiles%")
node = localApp & "\Programs\node-v22.21.0\node.exe"
If Not fso.FileExists(node) Then
  node = programFiles & "\nodejs\node.exe"
End If
mode = "--daemon"
wait = True
For i = 0 To WScript.Arguments.Count - 1
  arg = LCase(WScript.Arguments(i))
  If arg = "--detect" Then
    mode = "--detect"
  ElseIf arg = "--stop" Then
    mode = "--stop"
  ElseIf arg = "--run" Then
    mode = "--run"
  End If
Next
If Not fso.FileExists(node) Then
  WScript.Quit 1
End If
cmd = """" & node & """ """ & root & "\watch.mjs"" " & mode
sh.Run cmd, 0, wait
