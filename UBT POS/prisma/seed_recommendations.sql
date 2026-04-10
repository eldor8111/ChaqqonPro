-- ═══════════════════════════════════════════════════════════════════════════════
-- SMART TAVSIYALAR - TEST MA'LUMOTLAR
-- ═══════════════════════════════════════════════════════════════════════════════

-- MUHIM: SHOP001 tenantId ni o'zingiznikiga o'zgartiring!
-- Tenant ID ni olish: SELECT id FROM Tenant LIMIT 1;

-- ─── 1. LAVASH + ICHIMLIK ───────────────────────────────────────────────────────
-- Lavash buyurtma qilganda Pepsi tavsiya qilish
INSERT OR IGNORE INTO SmartRecommendation (
    id, tenantId, triggerProductId, triggerCategoryId,
    recommendProductId, recommendProductName,
    title, description, badgeText, badgeColor,
    discountType, discountValue, priority, showAlways, minCartAmount,
    isActive, viewCount, clickCount, conversionCount,
    startDate, endDate, createdAt, updatedAt
) VALUES (
    'rec_lavash_pepsi',
    (SELECT id FROM Tenant LIMIT 1), -- Tenant ID avtomatik
    NULL, -- triggerProductId (null = barcha mahsulotlarga)
    NULL, -- triggerCategoryId
    'prod_demo_pepsi', -- recommendProductId (demo uchun)
    'Pepsi 1L',
    'Ichimlik qo''shing!',
    'Lavash bilan Pepsi - eng yaxshi tanlov',
    'HIT',
    'blue',
    'percent',
    10.0,
    10,
    1, -- showAlways = true (har doim ko'rsatiladi)
    0.0,
    1,
    0, 0, 0,
    NULL, NULL,
    datetime('now'), datetime('now')
);

-- ─── 2. PREMIUM UPGRADE ─────────────────────────────────────────────────────────
-- Oddiy Lavash tanlanganda Premium variant tavsiya qilish
INSERT OR IGNORE INTO SmartRecommendation (
    id, tenantId, triggerProductId, triggerCategoryId,
    recommendProductId, recommendProductName,
    title, description, badgeText, badgeColor,
    discountType, discountValue, priority, showAlways, minCartAmount,
    isActive, viewCount, clickCount, conversionCount,
    startDate, endDate, createdAt, updatedAt
) VALUES (
    'rec_premium_upgrade',
    (SELECT id FROM Tenant LIMIT 1),
    NULL,
    NULL,
    'prod_demo_big_lavash',
    'Big Lavash Premium',
    'Premium versiyani sinab ko''ring!',
    'Faqat +5000 so''m qo''shimcha',
    'PREMIUM',
    'purple',
    'none',
    0.0,
    15,
    1,
    0.0,
    1,
    0, 0, 0,
    NULL, NULL,
    datetime('now'), datetime('now')
);

-- ─── 3. YANGI MAHSULOT AKSIYASI ────────────────────────────────────────────────
-- 20% chegirma - faqat 7 kun
INSERT OR IGNORE INTO SmartRecommendation (
    id, tenantId, triggerProductId, triggerCategoryId,
    recommendProductId, recommendProductName,
    title, description, badgeText, badgeColor,
    discountType, discountValue, priority, showAlways, minCartAmount,
    isActive, viewCount, clickCount, conversionCount,
    startDate, endDate, createdAt, updatedAt
) VALUES (
    'rec_new_product',
    (SELECT id FROM Tenant LIMIT 1),
    NULL,
    NULL,
    'prod_demo_new_item',
    'Yangi Combo Set',
    'Yangi mahsulot!',
    'Faqat 7 kun - 20% chegirma',
    'YANGI',
    'orange',
    'percent',
    20.0,
    20,
    1,
    0.0,
    1,
    0, 0, 0,
    datetime('now'),
    datetime('now', '+7 days'),
    datetime('now'), datetime('now')
);

-- ─── 4. MINIMAL SUMMA BILAN BEPUL YETKAZISH ───────────────────────────────────
-- 50,000 so'mdan ko'p buyurtmada
INSERT OR IGNORE INTO SmartRecommendation (
    id, tenantId, triggerProductId, triggerCategoryId,
    recommendProductId, recommendProductName,
    title, description, badgeText, badgeColor,
    discountType, discountValue, priority, showAlways, minCartAmount,
    isActive, viewCount, clickCount, conversionCount,
    startDate, endDate, createdAt, updatedAt
) VALUES (
    'rec_free_delivery',
    (SELECT id FROM Tenant LIMIT 1),
    NULL,
    NULL,
    'prod_demo_delivery',
    'Bepul Yetkazish',
    'Bepul yetkazib berish!',
    '50,000 so''mdan yuqori buyurtmalarga',
    'BEPUL',
    'green',
    'fixed',
    5000.0,
    5,
    1,
    50000.0, -- Minimal summa
    1,
    0, 0, 0,
    NULL, NULL,
    datetime('now'), datetime('now')
);

-- ─── 5. DESERT TAVSIYASI ───────────────────────────────────────────────────────
-- Taom buyurtma qilganda desert tavsiya qilish
INSERT OR IGNORE INTO SmartRecommendation (
    id, tenantId, triggerProductId, triggerCategoryId,
    recommendProductId, recommendProductName,
    title, description, badgeText, badgeColor,
    discountType, discountValue, priority, showAlways, minCartAmount,
    isActive, viewCount, clickCount, conversionCount,
    startDate, endDate, createdAt, updatedAt
) VALUES (
    'rec_dessert',
    (SELECT id FROM Tenant LIMIT 1),
    NULL,
    NULL,
    'prod_demo_tiramisu',
    'Tiramisu',
    'Desertni unutmang!',
    'Shirinlik 15% chegirma',
    'SHIRIN',
    'pink',
    'percent',
    15.0,
    12,
    1,
    20000.0,
    1,
    0, 0, 0,
    NULL, NULL,
    datetime('now'), datetime('now')
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DEMO MAHSULOTLAR (agar Product jadvalida bo'lmasa)
-- ═══════════════════════════════════════════════════════════════════════════════

-- MUHIM: Agar sizda allaqachon mahsulotlar bo'lsa, bu qismni o'tkazib yuboring

INSERT OR IGNORE INTO Product (
    id, tenantId, name, sku, barcode, category,
    sellingPrice, costPrice, stock, minStock, unit, image, createdAt
) VALUES
    ('prod_demo_pepsi', (SELECT id FROM Tenant LIMIT 1), 'Pepsi 1L', 'PEPSI1L', '4870004444444', 'Ichimliklar', 5000, 3000, 100, 10, 'dona', NULL, datetime('now')),
    ('prod_demo_big_lavash', (SELECT id FROM Tenant LIMIT 1), 'Big Lavash Premium', 'BIGLAVASH', '4870005555555', 'Taomlar', 25000, 12000, 50, 5, 'dona', NULL, datetime('now')),
    ('prod_demo_new_item', (SELECT id FROM Tenant LIMIT 1), 'Yangi Combo Set', 'COMBO1', '4870006666666', 'Kombo', 35000, 18000, 30, 5, 'dona', NULL, datetime('now')),
    ('prod_demo_delivery', (SELECT id FROM Tenant LIMIT 1), 'Bepul Yetkazish', 'DELIVERY', NULL, 'Xizmatlar', 5000, 0, 999, 0, 'dona', NULL, datetime('now')),
    ('prod_demo_tiramisu', (SELECT id FROM Tenant LIMIT 1), 'Tiramisu', 'TIRAMISU', '4870007777777', 'Desertlar', 12000, 5000, 20, 3, 'dona', NULL, datetime('now'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- NATIJA KO'RISH
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    id,
    title,
    recommendProductName,
    badgeText,
    discountType,
    discountValue,
    priority,
    showAlways,
    isActive
FROM SmartRecommendation
ORDER BY priority DESC;
