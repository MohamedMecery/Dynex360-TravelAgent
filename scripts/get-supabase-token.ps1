# Reads the Supabase CLI access token from Windows Credential Manager and prints it.
# The token itself is never stored in the repo.
$sig = @'
[DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
[DllImport("advapi32.dll")]
public static extern void CredFree(IntPtr cred);
'@
if (-not ([System.Management.Automation.PSTypeName]'Win32.Cred').Type) {
  Add-Type -MemberDefinition $sig -Namespace Win32 -Name Cred | Out-Null
}
$ptr = [IntPtr]::Zero
if (-not [Win32.Cred]::CredRead('Supabase CLI:supabase', 1, 0, [ref]$ptr)) {
  Write-Error "Supabase CLI credential not found in Credential Manager"
  exit 1
}
$blobSize = [System.Runtime.InteropServices.Marshal]::ReadInt32($ptr, 32)
$blobPtr  = [System.Runtime.InteropServices.Marshal]::ReadIntPtr($ptr, 40)
$bytes = New-Object byte[] $blobSize
[System.Runtime.InteropServices.Marshal]::Copy($blobPtr, $bytes, 0, $blobSize)
[Win32.Cred]::CredFree($ptr)
[System.Text.Encoding]::UTF8.GetString($bytes)
