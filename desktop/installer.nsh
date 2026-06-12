!macro customInstall
  ; Ish stoliga yorliq yaratish (majburiy)
  CreateShortcut "$DESKTOP\SMART POS.lnk" "$INSTDIR\SMART POS V2.exe" "" "$INSTDIR\resources\assets\icon.ico"
!macroend

!macro customUnInstall
  ; O'chirishda yorliqni ham o'chirish
  Delete "$DESKTOP\SMART POS.lnk"
!macroend
