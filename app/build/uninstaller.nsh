!macro customUnInstall
  ; Skip cleanup during auto-updates — only run on actual uninstall
  ${ifNot} ${isUpdated}
    ; Remove app data from %APPDATA% (Roaming)
    ; Contains: app-config.json, asset-cache/
    RMDir /r "$APPDATA\hytale-server-manager"

    ; Remove updater cache from %LOCALAPPDATA% (Local)
    ; Contains: electron-updater download cache
    RMDir /r "$LOCALAPPDATA\hytale-server-manager-updater"
  ${endIf}
!macroend
