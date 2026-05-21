# ChaqqonPro Agent — O'rnatish va Foydalanish Qo'llanmasi

## Bu nima?

**ChaqqonPro Agent** — bu har bir restoran kassasida bitta o'rnatib qo'yiladigan kichik dastur.  
U orqa fonda yashirincha ishlaydi va onlayn tizimdan kelgan chek buyruqlarini USB printerga avtomatik chiqaradi.

## O'rnatish

1. `ChaqqonPro_Agent_Setup.exe` faylini ishga tushiring
2. "Install" ni bosing
3. Dastur o'rnatiladi va darhol ishga tushadi
4. Windows pastki o'ng burchagidagi **tizim tepsisida (system tray)** ChaqqonPro ikonkasi paydo bo'ladi

## Ishlatish

- **Ikonkaga o'ng tugma** → menyu ochiladi
- **Sozlamalar** → Server URL va boshqalarni o'zgartirish
- **Printerlarni sinxronlash** → Printerlarni serverga darhol yuborish
- **Chiqish** → Dasturni to'xtatish

## Avtomatik ishga tushish

O'rnatishdan keyin Windows yoqilganda Agent ham avtomatik ishga tushadi.  
Kassirlar hech narsa qilmasa ham bo'ladi — dastur o'zi ishlaydi!

## Texnik ma'lumot

| Parametr | Qiymat |
|---|---|
| Server | https://chaqqonpro.e-code.uz |
| Poll intervali | 2500 ms (har 2.5 soniya) |
| Sinxronizatsiya | Har 30 soniya |
| Print usuli | Windows Raw Print API (ESC/POS) |

## Muammolar

| Muammo | Yechim |
|---|---|
| Chek chiqmayapdi | Tray → "Printerlarni sinxronlash" ni bosing |
| Server topilmaydi | Sozlamalar → Server URL ni tekshiring |
| Printer ko'rinmaydi | Windows → Printers & scanners bo'limini tekshiring |
