# 🎯 SMART TAVSIYALAR TIZIMI - QOLLE

## ✅ **NIMA YARATILDI?**

### 1. **Database Schema** ✅
- ` SmartRecommendation` modeli yaratildi: [prisma/schema.prisma](prisma/schema.prisma:451-499)
- **Imkoniyatlar:**
  - Trigger asosida tavsiya (mahsulot yoki kategoriya tanlanganda)
  - Har doim ko'rsatiladigan tavsiyalar
  - Chegirma (foiz yoki qat'iy summa)
  - Vaqt chegarasi (boshlanish va tugash sanasi)
  - Statistika (ko'rildi, bosildi, sotildi)
  - Prioritet boshqaruvi

### 2. **Backend API** ✅
- **Fayl:** [src/app/api/horeca/recommendations/route.ts](src/app/api/horeca/recommendations/route.ts)
- **Endpointlar:**
  - `GET` - Tavsiyalarni olish (cart asosida)
  - `POST` - Yangi tavsiya yaratish
  - `PUT` - Tavsiya yangilash
  - `DELETE` - Tavsiya o'chirish
  - `PATCH` - Statistika yangilash (click, conversion)

### 3. **Frontend Component** ✅
- **Fayl:** [src/components/SmartRecommendations.tsx](src/components/SmartRecommendations.tsx)
- **Xususiyatlari:**
  - Avtomatik tavsiyalar ko'rsatish
  - Chegirma badge
  - Click tracking
  - Conversion tracking
  - Dark mode support
  - Responsive design

---

## 🚀 **QANDAY ISHLATISH?**

### **A. Test Ma'lumotlar Qo'shish**

#### 1. Prisma Studio orqali:
```bash
cd "d:\Anti garvity\UBT POS\UBT POS"
npx prisma studio
```

#### 2. SQL orqali (manual):
```sql
-- Misol: "Lavash" buyurtma qilinganda "Coca-Cola" tavsiya qilish
INSERT INTO SmartRecommendation (
    id, tenantId, triggerProductId, recommendProductId,
    recommendProductName, title, description, badgeText,
    badgeColor, discountType, discountValue, priority,
    showAlways, minCartAmount, isActive, createdAt, updatedAt
) VALUES (
    'rec_test_001',
    'YOUR_TENANT_ID', -- Sizning tenant ID
    'LAVASH_PRODUCT_ID', -- Lavash mahsulot ID
    'COLA_PRODUCT_ID', -- Coca-Cola mahsulot ID
    'Coca-Cola 1L',
    'Lavash bilan Coca-Cola!',
    'Faqat bugun 15% chegirma',
    'HIT',
    'red',
    'percent',
    15.0,
    10,
    0,
    0.0,
    1,
    datetime('now'),
    datetime('now')
);
```

#### 3. API orqali (tavsiya qilinadi):
```javascript
// POST /api/horeca/recommendations
const response = await fetch('/api/horeca/recommendations', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
        triggerProductId: 'LAVASH_ID', // null = barcha mahsulotlarga
        recommendProductId: 'COLA_ID',
        recommendProductName: 'Coca-Cola 1L',
        title: 'Lavash bilan Coca-Cola!',
        description: 'Faqat bugun 15% chegirma',
        badgeText: 'HIT',
        badgeColor: 'red',
        discountType: 'percent',
        discountValue: 15,
        priority: 10,
        showAlways: false,
        minCartAmount: 0
    })
});
```

---

### **B. POS Sahifasiga Integratsiya**

#### **Variant 1: Manual (Recommended)**

Ochish: [src/app/horeca-pos/page.tsx](src/app/horeca-pos/page.tsx)

**1. Import qo'shish** (✅ Allaqachon qo'shilgan):
```typescript
import SmartRecommendations from "@/components/SmartRecommendations";
```

**2. Component qo'shish** (siz qo'shasiz):

MenuModal yoki TableOrdering komponenti ichida, return statement oxirida:

```tsx
export default function HorecaPosPage() {
    // ... mavjud kod ...

    const [cart, setCart] = useState<CartItem[]>([]);

    const handleAddFromRecommendation = (productId: string, productName: string, price: number) => {
        // Tavsiya mahsulotni savatga qo'shish
        const product = { id: productId, name: productName, price, /* ... */ };
        setCart(prev => [...prev, { item: product, qty: 1 }]);
    };

    const cartItemIds = cart.map(c => c.item.id);
    const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);

    return (
        <PosCtx.Provider value={{ lang, dark }}>
            {/* ... mavjud UI ... */}

            {/* Smart Tavsiyalar - Sahifa oxirida */}
            <SmartRecommendations
                cartItems={cartItemIds}
                cartTotal={cartTotal}
                tenantToken={store.kassirSession?.token || store.deviceSession?.token}
                onAddToCart={handleAddFromRecommendation}
                lang={lang}
                dark={dark}
            />
        </PosCtx.Provider>
    );
}
```

---

## 📊 **MISOL STSENARIYLAR**

### **Stsenariy 1: Lavash + Ichimlik**
```javascript
// Lavash buyurtma qilganda Pepsi tavsiya qilish
{
    triggerProductId: "lavash_id",
    recommendProductId: "pepsi_id",
    recommendProductName: "Pepsi 1L",
    title: "Lavash bilan Pepsi!",
    description: "Ichimlik 10% arzon",
    badgeText: "HIT",
    badgeColor: "blue",
    discountType: "percent",
    discountValue: 10,
    priority: 10
}
```

### **Stsenariy 2: Premium Upgrade**
```javascript
// Oddiy Lavash tanlanganda Premium Lavash tavsiya qilish
{
    triggerProductId: "lavash_oddiy_id",
    recommendProductId: "lavash_premium_id",
    recommendProductName: "Premium Big Lavash",
    title: "Premium versiyani sinab ko'ring!",
    description: "Faqat +5000 so'm qo'shim",
    badgeText: "PREMIUM",
    badgeColor: "purple",
    discountType: "none",
    discountValue: 0,
    priority: 15
}
```

### **Stsenariy 3: Minimal Summa Bilan**
```javascript
// 50,000 so'mdan ko'p buyurtmada bepul yetkazish
{
    triggerProductId: null, // Barcha mahsulotlarga
    recommendProductId: "delivery_service_id",
    recommendProductName: "Bepul Yetkazib Berish",
    title: "Bepul yetkazish!",
    description: "50,000 so'mdan yuqori buyurtmalarga",
    badgeText: "BEPUL",
    badgeColor: "green",
    discountType: "fixed",
    discountValue: 5000, // Yetkazish narxi
    priority: 5,
    showAlways: true,
    minCartAmount: 50000
}
```

### **Stsenariy 4: Vaqtinchalik Aksiya**
```javascript
// Faqat 3 kun davomida
{
    triggerProductId: null,
    recommendProductId: "new_product_id",
    recommendProductName: "Yangi Taom",
    title: "Yangi mahsulot!",
    description: "Faqat 3 kun - 20% chegirma",
    badgeText: "YANGI",
    badgeColor: "orange",
    discountType: "percent",
    discountValue: 20,
    priority: 20,
    showAlways: true,
    startDate: "2026-03-26T00:00:00Z",
    endDate: "2026-03-29T23:59:59Z"
}
```

---

## 📈 **STATISTIKA VA TAHLIL**

### **Konversion Ko'rsatkichlarini Ko'rish**

```sql
SELECT
    recommendProductName,
    viewCount,
    clickCount,
    conversionCount,
    ROUND(clickCount * 100.0 / NULLIF(viewCount, 0), 2) as CTR_percent,
    ROUND(conversionCount * 100.0 / NULLIF(clickCount, 0), 2) as conversion_percent
FROM SmartRecommendation
WHERE tenantId = 'YOUR_TENANT_ID'
ORDER BY conversionCount DESC
LIMIT 10;
```

### **Eng Samarali Tavsiyalar**
```sql
SELECT
    title,
    recommendProductName,
    badgeText,
    discountValue,
    conversionCount,
    viewCount
FROM SmartRecommendation
WHERE tenantId = 'YOUR_TENANT_ID' AND isActive = 1
ORDER BY conversionCount DESC
LIMIT 5;
```

---

## 🎨 **BADGE RANGLARI**

| Rang | Kod | Ishlatish |
|------|-----|-----------|
| 🔵 Qora | `blue` | Standart tavsiya |
| 🔴 Qizil | `red` | Chegirma, Aksiya |
| 🟢 Yashil | `green` | Bepul, Bonus |
| 🟠 To'q sariq | `orange` | Yangi mahsulot |
| 🟣 Binafsha | `purple` | Premium |
| 🔴 Pushti | `pink` | Maxsus taklif |

---

## 🔧 **KONFIGURATSIYA**

### **Tavsiya Algoritmi Parametrlari**

```typescript
// src/app/api/horeca/recommendations/route.ts
const triggerRecommendations = await prisma.smartRecommendation.findMany({
    // ...
    take: 5  // Maksimal 5 ta tavsiya (o'zgartirish mumkin)
});

const alwaysRecommendations = await prisma.smartRecommendation.findMany({
    // ...
    take: 3  // Har doim 3 ta (o'zgartirish mumkin)
});
```

### **UI Parametrlari**

```typescript
// src/components/SmartRecommendations.tsx
// Grid columns - ekran o'lchamiga qarab
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
// 2 ustun (mobil), 3 ustun (planshet), 5 ustun (desktop)
```

---

## ✨ **KEYINGI BOSQICH: ADMIN PANEL**

Tavsiyalarni boshqarish uchun admin panel yaratish kerak:

### **Admin Panel Features:**
1. **Tavsiyalar ro'yxati**
   - Filter (faol/nofaol, kategoriya, prioritet)
   - Qidiruv
   - Sorting

2. **Yangi tavsiya yaratish**
   - Mahsulot tanlash (trigger va recommend)
   - Matn kiritish (title, description)
   - Chegirma sozlash
   - Vaqt oralig'i belgilash

3. **Statistika Dashboard**
   - Eng ko'p ko'rilgan tavsiyalar
   - Eng yuqori konversion
   - A/B testing (2 xil tavsiya solishtirishish)

4. **Bulk Operations**
   - Ko'plab tavsiyalarni bir vaqtda faollashtirish/o'chirish
   - CSV import/export

---

## 🐛 **TROUBLESHOOTING**

### **Muammo: Tavsiyalar ko'rinmayapti**

**Tekshirish:**
1. Database da tavsiyalar bormi?
   ```sql
   SELECT COUNT(*) FROM SmartRecommendation WHERE isActive = 1;
   ```

2. API ishlayaptimi?
   ```bash
   curl "http://localhost:3005/api/horeca/recommendations?cartItems=[\"product_id\"]&cartTotal=10000"
   ```

3. Console da xatolik bormi?
   - Browser Developer Tools → Console

### **Muammo: Chegirma qo'llanmayapti**

**Tekshirish:**
```typescript
// Backend API da chegirma hisoblash
if (rec.discountType === "percent") {
    finalPrice = product.sellingPrice * (1 - rec.discountValue / 100);
} else if (rec.discountType === "fixed") {
    finalPrice = Math.max(0, product.sellingPrice - rec.discountValue);
}
```

### **Muammo: Prisma Client yangilanmagan**

```bash
cd "d:\Anti garvity\UBT POS\UBT POS"
npx prisma generate
```

Agar permission error bo'lsa, server to'xtatib qayta urinish:
```bash
# Ctrl+C (serverni to'xtatish)
npx prisma generate
npm run dev
```

---

## 📚 **QO'SHIMCHA RESURSLAR**

- [Database Schema](prisma/schema.prisma:451-499)
- [Backend API](src/app/api/horeca/recommendations/route.ts)
- [Frontend Component](src/components/SmartRecommendations.tsx)
- [Premium Features Plan](PREMIUM_FEATURES.md)

---

## 🎯 **KEYINGI QADAMLAR**

1. ✅ Schema yaratildi
2. ✅ Backend API yaratildi
3. ✅ Frontend komponenti yaratildi
4. 🔲 POS sahifasiga manual integratsiya (siz qo'shasiz)
5. 🔲 Test ma'lumotlar qo'shish
6. 🔲 Admin panel yaratish
7. 🔲 A/B testing qo'shish
8. 🔲 Analytics dashboard

---

**Savollar?** Menga yozing! 💬
