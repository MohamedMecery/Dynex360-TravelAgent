node : node:fs:440
At C:\Users\User\AppData\Local\Temp\ps-script-7eecfdb1-319a-46a6-adb3-23f62492e4c3.ps1:19 char:35
+ cd E:\Dynex360\Travel-OS-Project; node --input-type=module -e "
+                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (node:fs:440:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'E:\Dynex360\database\migrations\034_crm_dashboard_rpc.sql'
    at readFileSync (node:fs:440:20)
    at file:///E:/Dynex360/Travel-OS-Project/[eval1]:8:15
    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:272:26)
    at async ModuleLoader.executeModuleJob (node:internal/modules/esm/loader:268:20)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'E:\\Dynex360\\database\\migrations\\034_crm_dashboard_rpc.sql'
}

Node.js v22.22.0
