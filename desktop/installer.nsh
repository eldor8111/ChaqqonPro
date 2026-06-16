!macro customInstall
  ; Asosiy "EVIKO POS" desktop yorlig'ini electron-builder o'zi yaratadi (createDesktopShortcut).
  ; Bu yerda faqat eski (rebrand'gacha) "SMART POS" yorlig'ini tozalaymiz — ekranda
  ; ikkita yorliq qolmasligi uchun (eski buzuq yorliq SMART POS V2.exe ga ishora qilardi).
  Delete "$DESKTOP\SMART POS.lnk"
!macroend

!macro customUnInstall
  ; O'chirishda eski yorliq qoldig'ini ham tozalaymiz
  Delete "$DESKTOP\SMART POS.lnk"
!macroend
