"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "uz" | "ru" | "en";
type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "light",
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeContext.Provider value={{ theme: "light", toggleTheme: () => { } }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);




interface LangContextType {
    lang: Language;
    setLang: (l: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, Record<string, string>>> = {
    uz: {
        common: {
            save: "Saqlash", cancel: "Bekor qilish", delete: "O'chirish", edit: "Tahrirlash",
            add: "Qo'shish", search: "Qidirish", filter: "Filter", export: "Eksport",
            print: "Chop etish", close: "Yopish", confirm: "Tasdiqlash", loading: "Yuklanmoqda...",
            noData: "Ma'lumot topilmadi", total: "Jami", status: "Holat", actions: "Amallar",
            date: "Sana", amount: "Summa", name: "Nomi", phone: "Telefon", address: "Manzil",
            active: "Faol", inactive: "Nofaol", yes: "Ha", no: "Yo'q",
            view: "Ko'rish", units: "dona", refresh: "Yangilash", and: "va"
        },
        nav: {
            dashboard: "Bosh sahifa", pos: "Kassa", inventory: "Ombor", crm: "CRM",
            reports: "Hisobotlar", staff: "Xodimlar", ai: "AI Moduli", ubt: "UBT",
            pharmacy: "Dorixona", wholesale: "Ulgurji", ecommerce: "E-Tijorat", settings: "Sozlamalar",
            users: "Foydalanuvchilar", users_kassir: "Kassir", users_ofitsiant: "Ofitsiant",
            users_kuryer: "Kuryer", users_manablog: "Monoblok", users_povar: "Oshpaz",
            users_menejer: "Menejer", users_omborchi: "Zavsklad", users_history: "Kirim tarixi",
            users_attendance: "Davomat tarixi", ombor: "Ombor", ombor_qoldiqlar: "Qoldiqlar",
            ombor_kirim: "Kirim", ombor_chiqim: "Chiqim", ombor_kochirish: "Ko'chirish",
            ombor_inventarizatsiya: "Inventarizatsiya", ombor_sjisaniya: "Hisobdan chiqarish",
            attendance: "Davomat", nomenclature: "Nomenklatura", nom_dishes: "Taomlar",
            nom_dish_cats: "Taomlar kategoriyasi", nom_semi: "Yarim tayyor", nom_semi_cats: "Yar. tayyor kategoriyasi",
            nom_raw: "Xomashyo", nom_raw_cats: "Xomashyo kategoriyasi", finance: "Moliya",
            fin_cash: "Kassa & P&L", contractors: "Kontragentlar", support: "Tex yordam", billing: "Obuna va Tariflar"
        },
        dashboard: {
            title: "Bosh Sahifa", welcome: "Xush kelibsiz", todaySales: "Bugungi savdo",
            totalRevenue: "Jami daromad", activeOrders: "Faol buyurtmalar", staffOnline: "Xodimlar (faol)",
            revenueChart: "Daromad grafigi", topProducts: "Eng ko'p sotilganlar",
            recentTransactions: "So'nggi tranzaksiyalar", lowStock: "Kam zaxira", branchOverview: "Filiallar"
        },
        auth: {
            login: "Kirish", logout: "Chiqish", username: "Foydalanuvchi nomi", password: "Parol",
            forgotPassword: "Parolni unutdingizmi?", welcome: "ChaqqonPro ga xush kelibsiz",
            loginSubtitle: "Tizimga kirish uchun ma'lumotlaringizni kiriting"
        },
        pos: {
            title: "Kassa (POS)", smenaOpen: "Smena ochiq", searchProduct: "Mahsulot, shtrix-kod yoki SKU...",
            scan: "Skan", cart: "Savatcha", addCustomer: "Mijoz qo'shish", emptyCart: "Savatcha bo'sh",
            discount: "Chegirma", subtotal: "Og'ir summa", totalAmount: "Jami summa",
            cash: "Naqd", card: "Karta", qr: "QR kod", installment: "Bo'lib to'lash",
            processPayment: "To'lovni amalga oshirish", newSale: "Yangi savdo", printReceipt: "Chek chiqarish",
            paymentSuccess: "To'lov muvaffaqiyatli!", printingReceipt: "Chek chiqarilmoqda...", pay: "To'lash"
        },
        inventory: {
            title: "Ombor", itemsCount: "ta mahsulot", lowStockCount: "ta kam zaxira", addProduct: "Mahsulot qo'shish",
            totalProducts: "Jami mahsulotlar", activeSku: "Faol SKU", lowStock: "Kam zaxira", outOfStock: "Tugagan",
            all: "Barchasi", category: "Kategoriya", barcode: "Shtrix-kod", wholesalePrice: "Optom narxi", sellingPrice: "Sotish narxi",
            currentStock: "Joriy zaxira", supplier: "Yetkazib beruvchi", normal: "Normal", low: "Kam", out: "Tugagan",
            plu: "Tarozi (PLU) kodi", image: "Rasm", blockQuantity: "Blokdagi soni", blockPrice: "Blok narxi", addCategory: "Kategoriya qo'shish",
            unit: "O'lchov birligi"
        },
        crm: {
            title: "CRM", customersCount: "ta mijoz", aiSegmentEnabled: "AI segmentatsiya yoqilgan",
            addCustomer: "Mijoz qo'shish", totalCustomers: "Jami mijozlar", vipCustomers: "VIP mijozlar",
            totalBonuses: "Jami bonuslar", monthlyGrowth: "Oylik o'sish", aiRecommendation: "AI Tavsiya",
            apply: "Qo'llash", all: "Barchasi", segment: "Segment", bonusPoints: "Bonus ballari", totalPurchases: "Jami xaridlar", visits: "Tashriflar", lastVisit: "Oxirgi tashrif"
        },
        reports: {
            title: "Hisobotlar", subTitle: "Moliyaviy tahlil va savdo hisobotlari", daily: "Kunlik", monthly: "Oylik", yearly: "Yillik",
            totalRevenue: "Jami daromad", totalExpense: "Jami xarajat", netProfit: "Sof foyda", avgMargin: "O'rtacha marja",
            profitLoss: "Foyda-Zarar Hisoboti (P&L)", last6Months: "So'nggi 6 oy", revenue: "Daromad", grossProfit: "Gross foyda",
            branchShare: "Filiallar ulushi", salesPercent: "Savdo foizida", month: "Oy", cogs: "Tannarx (COGS)", expenses: "Xarajatlar", margin: "Marja"
        },
        staff: {
            title: "Xodimlar Moduli", activeStaff: "ta xodim faol", shiftOpenSince: "Smena 08:00 dan beri ochiq",
            openShift: "Smenani ochish", closeShift: "Smenani yopish", addEmployee: "Xodim qo'shish",
            totalStaff: "Jami xodimlar", todaySales: "Bugungi savdo", fraudAlerts: "Firibgarlik signallari",
            staffList: "Xodimlar ro'yxati", employee: "Xodim", role: "Lavozim", branch: "Filial", transaction: "Tranzaksiya",
            high: "Yuqori", medium: "O'rta", view: "Ko'rish", warn: "Ogohlantirish",
            phone: "Telefon", salary: "Maosh", hireDate: "Ishga kirgan sana", pin: "PIN kod",
            editEmployee: "Xodimni tahrirlash", deleteEmployee: "Xodimni o'chirish",
            confirmDelete: "O'chirishni tasdiqlang", confirmDeleteText: "Bu xodim ma'lumotlari butunlay o'chib ketadi. Davom etasizmi?",
            dismiss: "Bekor qilish", noAlerts: "Firibgarlik signallari yo'q",
            searchPlaceholder: "Xodim qidirish...",
            shiftHistory: "Smena tarixi", shiftDate: "Sana",
            tabStaff: "Xodimlar", tabFraud: "Signallar", tabShifts: "Smena tarixi",
            roleCashier: "Kassir", roleManager: "Menejer", roleAdmin: "Administrator", roleWarehouse: "Omborchi",
            filterAll: "Barchasi", searchPlaceholder: "Xodim nomini qidiring...",
            openShiftAt: "Smena ochildi", closeShiftAt: "Smena yopildi",
            permissions: "Ruxsatlar", editPermissions: "Ruxsatlarni tahrirlash",
            permModules: "Modullar", permActions: "Amallar",
            permPos: "Kassa (POS)", permInventory: "Ombor", permCrm: "CRM",
            permReports: "Hisobotlar", permStaff: "Xodimlar", permAi: "AI Moduli",
            permUbt: "UBT", permPharmacy: "Dorixona", permWholesale: "Ulgurji", permEcommerce: "E-Tijorat",
            permDiscounts: "Chegirma berish", permRefunds: "Qaytarish", permPriceEdit: "Narx o'zgartirish",
            permStockEdit: "Zaxira tahrirlash", permReportExport: "Hisobot eksport", permCustomerEdit: "Mijoz tahrirlash", permShiftManage: "Smena boshqarish",
            noPermissions: "Ruxsatlar yo'q", permissionsUpdated: "Ruxsatlar saqlandi",
            inheritFromRole: "Roldan olish"
        },
        ai: {
            title: "AI Moduli", subTitle: "AI modellar real vaqtda ishlayapti", refreshModel: "Modelni yangilash",
            accuracy: "Prognoz aniqligi", recommendations: "Tavsiyalar", riskProducts: "Risk mahsulotlar",
            fraudSignal: "Firibgarlik signali", demandForecast: "Talab Prognozi", prediction7d: "Kelgusi 7 kun uchun AI bashorati",
            aiInsights: "AI Tavsiyalar", restockRecommendations: "Zaxira To'ldirish Tavsiyalari", autoOrder: "Avtomatik buyurtma",
            product: "Mahsulot", currentStock: "Joriy zaxira", forecast7d: "7 kunlik prognoz", reorderPoint: "Qayta buyurtma nuqtasi",
            aiRecommendationMenu: "AI Tavsiya", critical: "Kritik", attention: "Diqqat", normal: "Normal"
        },
        ubt: {
            title: "UBT Moduli", subTitle: "Restoran va mehmonxona boshqaruvi", addReservation: "Bron qo'shish",
            occupiedTables: "Band stollar", freeTables: "Bo'sh stollar", reservedTables: "Bron qilingan", newOrders: "Yangi buyurtmalar",
            tableMap: "Stol xaritasi", kds: "Oshxona (KDS)", occupied: "Band", free: "Bo'sh", reserved: "Bron",
            new: "Yangi", preparing: "Tayyorlanmoqda", ready: "Tayyor",
            markPreparing: "Tayyorlashni boshlash", markReady: "Tayyor",
            closeTable: "Stolni yopish", openTable: "Stol ochish",
            guestName: "Mehmon ismi", reservedAt: "Bron vaqti",
            confirmReservation: "Bronni tasdiqlash", selectTable: "Stol tanlash",
            confirmToOccupied: "Bandga o'tkazish", confirmToFree: "Bo'shatish",
            tableActions: "Stol amallari", totalAmount: "Umumiy summa",
            noOrders: "Buyurtmalar yo'q"
        },
        pharmacy: {
            title: "Dorixona Moduli", drugsCount: "ta dori", expiringSoonCount: "ta muddati yaqin", refreshCatalog: "Katalogni yangilash",
            addDrug: "Dori qo'shish", totalDrugs: "Jami dorilar", expiring90d: "Muddati yaqin (90 kun)", expired: "Muddati o'tgan",
            categories: "Kategoriyalar", expiringDrugs: "Muddati yaqin dorilar", searchPlaceholder: "Nomi, shtrix-kod, seriya raqami...",
            drugName: "Dori nomi", serialNumber: "Seriya raqami", expiryDate: "Muddati",
            editDrug: "Tahrirlash", deleteDrug: "O'chirish",
            confirmDelete: "O'chirishni tasdiqlang", confirmDeleteText: "Bu dori katalogdan o'chiriladi. Davom etasizmi?",
            tabAll: "Barcha dorilar", tabExpiring: "Muddati yaqin", tabExpired: "Muddati o'tgan",
            minStock: "Min. zaxira", prescription: "Retsept", manufacturer: "Ishlab chiqaruvchi",
            requiresPrescription: "Retsept kerak", noPrescription: "Retseptsiz",
            expiringDrugsMessage: "ta dori 90 kun ichida tugaydi",
            filterCategory: "Kategoriya", lowStock: "Kam zaxira", noStock: "Zaxira yo'q",
            stockLabel: "Zaxira", priceLabel: "Narx",
            addDrugTitle: "Yangi dori qo'shish", editDrugTitle: "Dorini tahrirlash",
            noExpiring: "Muddati yaqin dori yo'q", noExpired: "Muddati o'tgan dori yo'q",
        },
        wholesale: {
            title: "Ulgurji Savdo Moduli", clientsCount: "ta ulgurji mijoz", invoice: "Hisob-faktura", addClient: "Mijoz qo'shish",
            totalClients: "Jami mijozlar", totalDebt: "Umumiy qarz", limitNear: "Limit yaqin", blocked: "Bloklangan",
            bulkPricing: "Ulgurji Narx Tartibi", searchPlaceholder: "Mijoz nomi yoki kontakt...", company: "Kompaniya",
            contact: "Kontakt", currentDebt: "Joriy qarz", debtLimit: "Qarz limiti", limitPercent: "Limit foizi", lastOrder: "Oxirgi buyurtma"
        },
        ecommerce: {
            title: "E-Tijorat Moduli", subTitle: "Online buyurtmalar va yetkazib berish", telegramBot: "Telegram Bot", instagramSync: "Instagram Sync",
            totalOrders: "Jami buyurtmalar", pending: "Kutilmoqda", delivering: "Yetkazilmoqda", todayRevenue: "Bugungi daromad",
            all: "Barchasi", trackCourier: "Kuryerni kuzatish", preparing: "Tayyorlanmoqda", completed: "Yakunlandi"
        },
        settings: {
            title: "Sozlamalar", subTitle: "Tizim sozlamalari va boshqaruv paneli", branches: "Filiallar", users: "Foydalanuvchilar",
            roles: "Rollar va RBAC", billing: "Obuna", backup: "Backup", audit: "Audit jurnali", addBranch: "Filial qo'shish",
            branchManagement: "Filiallar boshqaruvi", addUser: "Foydalanuvchi qo'shish", rolesAndPermissions: "Rollar va Ruxsatnomalar",
            billingPlan: "Obuna Tarifi", choose: "Tanlash", currentPlan: "Joriy tarif", serverBackup: "Server Backup",
            takeBackupNow: "Hozir backup olish", auditLog: "Audit Jurnali", action: "Harakat", detail: "Tafsilot", type: "Tur"
        }
    },
    ru: {
        common: {
            save: "Сохранить", cancel: "Отмена", delete: "Удалить", edit: "Редактировать",
            add: "Добавить", search: "Поиск", filter: "Фильтр", export: "Экспорт",
            print: "Печать", close: "Закрыть", confirm: "Подтвердить", loading: "Загрузка...",
            noData: "Данные не найдены", total: "Итого", status: "Статус", actions: "Действия",
            date: "Дата", amount: "Сумма", name: "Название", phone: "Телефон", address: "Адрес",
            active: "Активный", inactive: "Неактивный", yes: "Да", no: "Нет",
            view: "Посмотреть", units: "шт", refresh: "Обновить", and: "и"
        },
        nav: {
            dashboard: "Главная", pos: "Касса", inventory: "Склад", crm: "CRM",
            reports: "Отчёты", staff: "Сотрудники", ai: "ИИ Модуль", ubt: "UBT",
            pharmacy: "Аптека", wholesale: "Оптовая торговля", ecommerce: "Э-коммерция", settings: "Настройки",
            users: "Пользователи", users_kassir: "Кассир", users_ofitsiant: "Официант",
            users_kuryer: "Курьер", users_manablog: "Моноблок", users_povar: "Повар",
            users_menejer: "Менеджер", users_omborchi: "Завсклад", users_history: "История входа",
            users_attendance: "Посещаемость", ombor: "Склад", ombor_qoldiqlar: "Остатки",
            ombor_kirim: "Приход", ombor_chiqim: "Расход", ombor_kochirish: "Перемещение",
            ombor_inventarizatsiya: "Инвентаризация", ombor_sjisaniya: "Списание",
            attendance: "Посещаемость", nomenclature: "Номенклатура", nom_dishes: "Блюда",
            nom_dish_cats: "Категории блюд", nom_semi: "Полуфабрикаты", nom_semi_cats: "Категории полуфабр.",
            nom_raw: "Сырье", nom_raw_cats: "Категории сырья", finance: "Финансы",
            fin_cash: "Касса и P&L", contractors: "Контрагенты", support: "Техподдержка", billing: "Подписка и Тарифы"
        },
        dashboard: {
            title: "Главная панель", welcome: "Добро пожаловать", todaySales: "Продажи сегодня",
            totalRevenue: "Общая выручка", activeOrders: "Активные заказы", staffOnline: "Сотрудники онлайн",
            revenueChart: "График доходов", topProducts: "Топ товаров",
            recentTransactions: "Последние транзакции", lowStock: "Заканчивающийся товар", branchOverview: "Обзор филиалов"
        },
        auth: {
            login: "Войти", logout: "Выйти", username: "Имя пользователя", password: "Пароль",
            forgotPassword: "Забыли пароль?", welcome: "Добро пожаловать в ChaqqonPro",
            loginSubtitle: "Введите данные для входа в систему"
        },
        pos: {
            title: "Касса (POS)", smenaOpen: "Смена открыта", searchProduct: "Товар, штрих-код или артикул...",
            scan: "Скан", cart: "Корзина", addCustomer: "Добавить клиента", emptyCart: "Корзина пуста",
            discount: "Скидка", subtotal: "Подытог", totalAmount: "К оплате",
            cash: "Наличные", card: "Карта", qr: "QR-код", installment: "Рассрочка",
            processPayment: "Оплатить", newSale: "Новая продажа", printReceipt: "Печатать чек",
            paymentSuccess: "Оплата успешна!", printingReceipt: "Печать чека...", pay: "Оплатить"
        },
        inventory: {
            title: "Склад", itemsCount: "товаров", lowStockCount: "заканчиваются", addProduct: "Добавить товар",
            totalProducts: "Всего товаров", activeSku: "Активные SKU", lowStock: "Мало на складе", outOfStock: "Нет в наличии",
            all: "Все", category: "Категория", barcode: "Штрих-код", wholesalePrice: "Оптовая цена", sellingPrice: "Цена продажи",
            currentStock: "Текущий остаток", supplier: "Поставщик", normal: "Норма", low: "Мало", out: "Нет на складе",
            plu: "PLU Код (Весы)", image: "Изображение", blockQuantity: "Кол-во в блоке", blockPrice: "Цена за блок", addCategory: "Добавить категорию",
            unit: "Единица изм."
        },
        crm: {
            title: "CRM", customersCount: "клиентов", aiSegmentEnabled: "AI-сегментация включена",
            addCustomer: "Добавить клиента", totalCustomers: "Всего клиентов", vipCustomers: "VIP клиенты",
            totalBonuses: "Всего бонусов", monthlyGrowth: "Месячный рост", aiRecommendation: "ИИ Рекомендация",
            apply: "Применить", all: "Все", segment: "Сегмент", bonusPoints: "Бонусные баллы", totalPurchases: "Всего покупок", visits: "Визиты", lastVisit: "Последний визит"
        },
        reports: {
            title: "Отчёты", subTitle: "Финансовый анализ и отчёты по продажам", daily: "Ежедневно", monthly: "Ежемесячно", yearly: "Ежегодно",
            totalRevenue: "Общий доход", totalExpense: "Общие расходы", netProfit: "Чистая прибыль", avgMargin: "Средняя маржа",
            profitLoss: "Отчёт о прибылях и убытках", last6Months: "Последние 6 месяцев", revenue: "Доход", grossProfit: "Валовая прибыль",
            branchShare: "Доля филиалов", salesPercent: "В процентах от продаж", month: "Месяц", cogs: "Себестоимость продаж", expenses: "Расходы", margin: "Маржа"
        },
        staff: {
            title: "Модуль сотрудников", activeStaff: "сотрудников активно", shiftOpenSince: "Смена открыта с 08:00",
            openShift: "Открыть смену", closeShift: "Закрыть смену", addEmployee: "Добавить сотрудника",
            totalStaff: "Всего сотрудников", todaySales: "Продажи сегодня", fraudAlerts: "Сигналы мошенничества",
            staffList: "Список сотрудников", employee: "Сотрудник", role: "Должность", branch: "Филиал", transaction: "Транзакция",
            high: "Высокий", medium: "Средний", view: "Смотреть", warn: "Предупредить",
            phone: "Телефон", salary: "Зарплата", hireDate: "Дата приёма", pin: "PIN код",
            editEmployee: "Редактировать сотрудника", deleteEmployee: "Удалить сотрудника",
            confirmDelete: "Подтвердите удаление", confirmDeleteText: "Данные сотрудника будут удалены полностью. Продолжить?",
            dismiss: "Отклонить", noAlerts: "Сигналов мошенничества нет",
            searchPlaceholder: "Поиск сотрудника...",
            shiftHistory: "История смен", shiftDate: "Дата",
            tabStaff: "Сотрудники", tabFraud: "Сигналы", tabShifts: "История смен",
            roleCashier: "Кассир", roleManager: "Менеджер", roleAdmin: "Администратор", roleWarehouse: "Кладовщик",
            filterAll: "Все",
            openShiftAt: "Смена открыта", closeShiftAt: "Смена закрыта",
            permissions: "Разрешения", editPermissions: "Редактировать разрешения",
            permModules: "Модули", permActions: "Действия",
            permPos: "Касса (POS)", permInventory: "Склад", permCrm: "CRM",
            permReports: "Отчёты", permStaff: "Сотрудники", permAi: "ИИ Модуль",
            permUbt: "UBT", permPharmacy: "Аптека", permWholesale: "Оптовая", permEcommerce: "Э-коммерция",
            permDiscounts: "Скидки", permRefunds: "Возвраты", permPriceEdit: "Изменение цен",
            permStockEdit: "Редакт. склада", permReportExport: "Экспорт отчётов", permCustomerEdit: "Ред. клиентов", permShiftManage: "Управление сменой",
            noPermissions: "Нет разрешений", permissionsUpdated: "Разрешения сохранены",
            inheritFromRole: "Взять из роли"
        },
        ai: {
            title: "ИИ Модуль", subTitle: "ИИ модели работают в реальном времени", refreshModel: "Обновить модель",
            accuracy: "Точность прогноза", recommendations: "Рекомендации", riskProducts: "Рисковые товары",
            fraudSignal: "Сигналы мошенничества", demandForecast: "Прогноз спроса", prediction7d: "Прогноз ИИ на 7 дней",
            aiInsights: "ИИ Инсайты", restockRecommendations: "Рекомендации по пополнению запасов", autoOrder: "Авто-заказ",
            product: "Товар", currentStock: "Текущий запас", forecast7d: "Прогноз на 7 дней", reorderPoint: "Точка дозаказа",
            aiRecommendationMenu: "ИИ Рекомендация", critical: "Критично", attention: "Внимание", normal: "Нормально"
        },
        ubt: {
            title: "UBT Модуль", subTitle: "Управление ресторанами и гостиницами", addReservation: "Добавить бронь",
            occupiedTables: "Занятые столы", freeTables: "Свободные столы", reservedTables: "Забронированные столы", newOrders: "Новые заказы",
            tableMap: "Схема залов", kds: "Кухня (KDS)", occupied: "Занят", free: "Свободен", reserved: "Резерв",
            new: "Новый", preparing: "Готовится", ready: "Готов",
            markPreparing: "Начать готовку", markReady: "Готово",
            closeTable: "Закрыть стол", openTable: "Открыть стол",
            guestName: "Имя гостя", reservedAt: "Время брони",
            confirmReservation: "Подтвердить бронь", selectTable: "Выбрать стол",
            confirmToOccupied: "Перевести в занятые", confirmToFree: "Освободить",
            tableActions: "Действия со столом", totalAmount: "Общая сумма",
            noOrders: "Нет заказов"
        },
        pharmacy: {
            title: "Модуль Аптеки", drugsCount: "лекарств", expiringSoonCount: "скоро истекает срок годности", refreshCatalog: "Обновить каталог",
            addDrug: "Добавить лекарство", totalDrugs: "Всего лекарств", expiring90d: "Истекает (90 дней)", expired: "Просрочено",
            categories: "Категории", expiringDrugs: "Лекарства с истекающим сроком годности", searchPlaceholder: "Название, штрих-код, серийный номер...",
            drugName: "Название лекарства", serialNumber: "Серийный номер", expiryDate: "Срок годности",
            editDrug: "Редактировать", deleteDrug: "Удалить",
            confirmDelete: "Подтвердите удаление", confirmDeleteText: "Этот препарат будет удалён из каталога. Продолжить?",
            tabAll: "Все препараты", tabExpiring: "Истекает срок", tabExpired: "Просрочено",
            minStock: "Мин. запас", prescription: "Рецепт", manufacturer: "Производитель",
            requiresPrescription: "Нужен рецепт", noPrescription: "Без рецепта",
            expiringDrugsMessage: "препаратов истекает через 90 дней",
            filterCategory: "Категория", lowStock: "Мало запаса", noStock: "Нет запаса",
            stockLabel: "Запас", priceLabel: "Цена",
            addDrugTitle: "Добавить препарат", editDrugTitle: "Редактировать препарат",
            noExpiring: "Нет препаратов с истекающим сроком", noExpired: "Нет просроченных препаратов",
        },
        wholesale: {
            title: "Модуль Оптовой торговли", clientsCount: "оптовых клиентов", invoice: "Счет-фактура", addClient: "Добавить клиента",
            totalClients: "Всего клиентов", totalDebt: "Общий долг", limitNear: "Близко к лимиту", blocked: "Заблокирован",
            bulkPricing: "Система оптовых цен", searchPlaceholder: "Название клиента или контакт...", company: "Компания",
            contact: "Контакт", currentDebt: "Текущий долг", debtLimit: "Лимит долга", limitPercent: "Процент лимита", lastOrder: "Последний заказ"
        },
        ecommerce: {
            title: "Модуль Э-коммерции", subTitle: "Онлайн заказы и доставка", telegramBot: "Telegram Бот", instagramSync: "Instagram Sync",
            totalOrders: "Всего заказов", pending: "Ожидают", delivering: "В доставке", todayRevenue: "Доход за сегодня",
            all: "Все", trackCourier: "Отследить курьера", preparing: "Готовятся", completed: "Завершены"
        },
        settings: {
            title: "Настройки", subTitle: "Настройки системы и панель управления", branches: "Филиалы", users: "Пользователи",
            roles: "Роли и RBAC", billing: "Подписка", backup: "Резервное копирование", audit: "Журнал аудита", addBranch: "Добавить филиал",
            branchManagement: "Управление филиалами", addUser: "Добавить пользователя", rolesAndPermissions: "Роли и Разрешения",
            billingPlan: "Тарифный план подписки", choose: "Выбрать", currentPlan: "Текущий план", serverBackup: "Резервное копирование сервера",
            takeBackupNow: "Сделать бэкап сейчас", auditLog: "Журнал аудита", action: "Действие", detail: "Деталь", type: "Тип"
        }
    },
    en: {
        common: {
            save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
            add: "Add", search: "Search", filter: "Filter", export: "Export",
            print: "Print", close: "Close", confirm: "Confirm", loading: "Loading...",
            noData: "No data found", total: "Total", status: "Status", actions: "Actions",
            date: "Date", amount: "Amount", name: "Name", phone: "Phone", address: "Address",
            active: "Active", inactive: "Inactive", yes: "Yes", no: "No",
            view: "View", units: "pcs", refresh: "Refresh", and: "and"
        },
        nav: {
            dashboard: "Dashboard", pos: "Point of Sale", inventory: "Inventory", products: "Products", crm: "CRM",
            reports: "Reports", staff: "Staff", ai: "AI Module", ubt: "UBT",
            pharmacy: "Pharmacy", wholesale: "Wholesale", ecommerce: "E-Commerce", settings: "Settings",
            ombor: "Warehouse", ombor_qoldiqlar: "Stock Balances", ombor_kirim: "Inbound",
            ombor_chiqim: "Outbound", ombor_kochirish: "Transfer", ombor_inventarizatsiya: "Inventory Check",
            ombor_sjisaniya: "Write-off",
            attendance: "Attendance", nomenclature: "Nomenclature", nom_dishes: "Dishes",
            nom_dish_cats: "Dish Categories", nom_semi: "Semi-finished", nom_semi_cats: "Semi Cat.",
            nom_raw: "Raw Materials", nom_raw_cats: "Raw Cat.", finance: "Finance",
            fin_cash: "Cash & P&L", contractors: "Contractors", support: "Support", billing: "Subscription & Tarif"
        },
        dashboard: {
            title: "Dashboard", welcome: "Welcome back", todaySales: "Today's Sales",
            totalRevenue: "Total Revenue", activeOrders: "Active Orders", staffOnline: "Staff Online",
            revenueChart: "Revenue Chart", topProducts: "Top Products",
            recentTransactions: "Recent Transactions", lowStock: "Low Stock Alerts", branchOverview: "Branch Overview"
        },
        auth: {
            login: "Login", logout: "Logout", username: "Username", password: "Password",
            forgotPassword: "Forgot password?", welcome: "Welcome to ChaqqonPro",
            loginSubtitle: "Enter your credentials to access the system"
        },
        pos: {
            title: "Point of Sale (POS)", smenaOpen: "Shift open", searchProduct: "Product, barcode or SKU...",
            scan: "Scan", cart: "Cart", addCustomer: "Add Customer", emptyCart: "Cart is empty",
            discount: "Discount", subtotal: "Subtotal", totalAmount: "Total Amount",
            cash: "Cash", card: "Card", qr: "QR Code", installment: "Installment",
            processPayment: "Process Payment", newSale: "New Sale", printReceipt: "Print Receipt",
            paymentSuccess: "Payment Successful!", printingReceipt: "Printing receipt...", pay: "Pay"
        },
        inventory: {
            title: "Inventory", itemsCount: "items", lowStockCount: "low stock", addProduct: "Add Product",
            totalProducts: "Total Products", activeSku: "Active SKUs", lowStock: "Low Stock", outOfStock: "Out of Stock",
            all: "All", category: "Category", barcode: "Barcode", wholesalePrice: "Wholesale Price", sellingPrice: "Selling Price",
            currentStock: "Current Stock", supplier: "Supplier", normal: "Normal", low: "Low", out: "Out of Stock",
            plu: "PLU Code (Scale)", image: "Image", blockQuantity: "Items in Block", blockPrice: "Block Price", addCategory: "Add Category",
            unit: "Unit"
        },
        crm: {
            title: "CRM", customersCount: "customers", aiSegmentEnabled: "AI Segmentation enabled",
            addCustomer: "Add Customer", totalCustomers: "Total Customers", vipCustomers: "VIP Customers",
            totalBonuses: "Total Bonuses", monthlyGrowth: "Monthly Growth", aiRecommendation: "AI Recommendation",
            apply: "Apply", all: "All", segment: "Segment", bonusPoints: "Bonus Points", totalPurchases: "Total Purchases", visits: "Visits", lastVisit: "Last Visit"
        },
        reports: {
            title: "Reports", subTitle: "Financial analysis and sales reports", daily: "Daily", monthly: "Monthly", yearly: "Yearly",
            totalRevenue: "Total Revenue", totalExpense: "Total Expense", netProfit: "Net Profit", avgMargin: "Average Margin",
            profitLoss: "Profit & Loss Statement (P&L)", last6Months: "Last 6 months", revenue: "Revenue", grossProfit: "Gross Profit",
            branchShare: "Branch Share", salesPercent: "In percent of sales", month: "Month", cogs: "COGS", expenses: "Expenses", margin: "Margin"
        },
        staff: {
            title: "Staff Module", activeStaff: "staff active", shiftOpenSince: "Shift open since 08:00",
            openShift: "Open Shift", closeShift: "Close Shift", addEmployee: "Add Employee",
            totalStaff: "Total Staff", todaySales: "Today's Sales", fraudAlerts: "Fraud Alerts",
            staffList: "Staff List", employee: "Employee", role: "Role", branch: "Branch", transaction: "Transaction",
            high: "High", medium: "Medium", view: "View", warn: "Warn",
            phone: "Phone", salary: "Salary", hireDate: "Hire Date", pin: "PIN Code",
            editEmployee: "Edit Employee", deleteEmployee: "Delete Employee",
            confirmDelete: "Confirm Deletion", confirmDeleteText: "Employee data will be permanently deleted. Continue?",
            dismiss: "Dismiss", noAlerts: "No fraud alerts",
            searchPlaceholder: "Search employee...",
            shiftHistory: "Shift History", shiftDate: "Date",
            tabStaff: "Staff", tabFraud: "Alerts", tabShifts: "Shift History",
            roleCashier: "Cashier", roleManager: "Manager", roleAdmin: "Administrator", roleWarehouse: "Warehouse",
            filterAll: "All",
            openShiftAt: "Shift opened", closeShiftAt: "Shift closed",
            permissions: "Permissions", editPermissions: "Edit Permissions",
            permModules: "Modules", permActions: "Actions",
            permPos: "POS (Cashier)", permInventory: "Inventory", permCrm: "CRM",
            permReports: "Reports", permStaff: "Staff", permAi: "AI Module",
            permUbt: "UBT", permPharmacy: "Pharmacy", permWholesale: "Wholesale", permEcommerce: "E-Commerce",
            permDiscounts: "Apply Discounts", permRefunds: "Process Refunds", permPriceEdit: "Edit Prices",
            permStockEdit: "Edit Stock", permReportExport: "Export Reports", permCustomerEdit: "Edit Customers", permShiftManage: "Manage Shifts",
            noPermissions: "No permissions", permissionsUpdated: "Permissions saved",
            inheritFromRole: "Inherit from role"
        },
        ai: {
            title: "AI Module", subTitle: "AI models running in real-time", refreshModel: "Refresh Model",
            accuracy: "Forecast Accuracy", recommendations: "Recommendations", riskProducts: "Risk Products",
            fraudSignal: "Fraud Signals", demandForecast: "Demand Forecast", prediction7d: "7-day AI prediction",
            aiInsights: "AI Insights", restockRecommendations: "Restock Recommendations", autoOrder: "Auto-Order",
            product: "Product", currentStock: "Current Stock", forecast7d: "7-day forecast", reorderPoint: "Reorder Point",
            aiRecommendationMenu: "AI Recommendation", critical: "Critical", attention: "Warning", normal: "Normal"
        },
        ubt: {
            title: "UBT Module", subTitle: "Restaurant and Hotel Management", addReservation: "Add Reservation",
            occupiedTables: "Occupied Tables", freeTables: "Free Tables", reservedTables: "Reserved Tables", newOrders: "New Orders",
            tableMap: "Table Map", kds: "Kitchen (KDS)", occupied: "Occupied", free: "Free", reserved: "Reserved",
            new: "New", preparing: "Preparing", ready: "Ready",
            markPreparing: "Start Preparing", markReady: "Mark Ready",
            closeTable: "Close Table", openTable: "Open Table",
            guestName: "Guest Name", reservedAt: "Reserved Time",
            confirmReservation: "Confirm Reservation", selectTable: "Select Table",
            confirmToOccupied: "Mark as Occupied", confirmToFree: "Free Table",
            tableActions: "Table Actions", totalAmount: "Total Amount",
            noOrders: "No Orders"
        },
        pharmacy: {
            title: "Pharmacy Module", drugsCount: "drugs", expiringSoonCount: "expiring soon", refreshCatalog: "Refresh Catalog",
            addDrug: "Add Drug", totalDrugs: "Total Drugs", expiring90d: "Expiring Soon (90 days)", expired: "Expired",
            categories: "Categories", expiringDrugs: "Expiring Drugs", searchPlaceholder: "Name, barcode, serial number...",
            drugName: "Drug Name", serialNumber: "Serial Number", expiryDate: "Expiry Date",
            editDrug: "Edit", deleteDrug: "Delete",
            confirmDelete: "Confirm Delete", confirmDeleteText: "This drug will be removed from the catalog. Continue?",
            tabAll: "All Drugs", tabExpiring: "Expiring Soon", tabExpired: "Expired",
            minStock: "Min. Stock", prescription: "Prescription", manufacturer: "Manufacturer",
            requiresPrescription: "Prescription Required", noPrescription: "OTC",
            expiringDrugsMessage: "drugs expiring within 90 days",
            filterCategory: "Category", lowStock: "Low Stock", noStock: "Out of Stock",
            stockLabel: "Stock", priceLabel: "Price",
            addDrugTitle: "Add New Drug", editDrugTitle: "Edit Drug",
            noExpiring: "No drugs expiring soon", noExpired: "No expired drugs",
        },
        wholesale: {
            title: "Wholesale Module", clientsCount: "wholesale clients", invoice: "Invoice", addClient: "Add Client",
            totalClients: "Total Clients", totalDebt: "Total Debt", limitNear: "Near Limit", blocked: "Blocked",
            bulkPricing: "Bulk Pricing Tiers", searchPlaceholder: "Client name or contact...", company: "Company",
            contact: "Contact", currentDebt: "Current Debt", debtLimit: "Debt Limit", limitPercent: "Limit Percentage", lastOrder: "Last Order"
        },
        ecommerce: {
            title: "E-Commerce Module", subTitle: "Online orders and delivery", telegramBot: "Telegram Bot", instagramSync: "Instagram Sync",
            totalOrders: "Total Orders", pending: "Pending", delivering: "Delivering", todayRevenue: "Today's Revenue",
            all: "All", trackCourier: "Track Courier", preparing: "Preparing", completed: "Completed"
        },
        settings: {
            title: "Settings", subTitle: "System settings and control panel", branches: "Branches", users: "Users",
            roles: "Roles & RBAC", billing: "Billing", backup: "Backup", audit: "Audit Log", addBranch: "Add Branch",
            branchManagement: "Branch Management", addUser: "Add User", rolesAndPermissions: "Roles and Permissions",
            billingPlan: "Subscription Plan", choose: "Choose", currentPlan: "Current Plan", serverBackup: "Server Backup",
            takeBackupNow: "Take Backup Now", auditLog: "Audit Log", action: "Action", detail: "Detail", type: "Type"
        },
        crm: {
            title: "CRM", customersCount: "customers", aiSegmentEnabled: "AI-Segmentation Enabled",
            addCustomer: "Add Customer", totalCustomers: "Total Customers", vipCustomers: "VIP Customers",
            totalBonuses: "Total Bonuses", monthlyGrowth: "Monthly Growth", aiRecommendation: "AI Recommendation",
            apply: "Apply", all: "All", segment: "Segment", bonusPoints: "Bonus Points", totalPurchases: "Total Purchases", visits: "Visits", lastVisit: "Last Visit",
            aiRecommendationMenu: "AI Recommendation", critical: "Critical", attention: "Warning", normal: "Normal"
        },
        ubt: {
            title: "UBT Module", subTitle: "Restaurant and Hotel Management", addReservation: "Add Reservation",
            occupiedTables: "Occupied Tables", freeTables: "Free Tables", reservedTables: "Reserved Tables", newOrders: "New Orders",
            tableMap: "Table Map", kds: "Kitchen (KDS)", occupied: "Occupied", free: "Free", reserved: "Reserved",
            new: "New", preparing: "Preparing", ready: "Ready",
            markPreparing: "Start Preparing", markReady: "Mark Ready",
            closeTable: "Close Table", openTable: "Open Table",
            guestName: "Guest Name", reservedAt: "Reserved Time",
            confirmReservation: "Confirm Reservation", selectTable: "Select Table",
            confirmToOccupied: "Mark as Occupied", confirmToFree: "Free Table",
            tableActions: "Table Actions", totalAmount: "Total Amount",
            noOrders: "No Orders"
        },
        pharmacy: {
            title: "Pharmacy Module", drugsCount: "drugs", expiringSoonCount: "expiring soon", refreshCatalog: "Refresh Catalog",
            addDrug: "Add Drug", totalDrugs: "Total Drugs", expiring90d: "Expiring Soon (90 days)", expired: "Expired",
            categories: "Categories", expiringDrugs: "Expiring Drugs", searchPlaceholder: "Name, barcode, serial number...",
            drugName: "Drug Name", serialNumber: "Serial Number", expiryDate: "Expiry Date",
            editDrug: "Edit", deleteDrug: "Delete",
            confirmDelete: "Confirm Delete", confirmDeleteText: "This drug will be removed from the catalog. Continue?",
            tabAll: "All Drugs", tabExpiring: "Expiring Soon", tabExpired: "Expired",
            minStock: "Min. Stock", prescription: "Prescription", manufacturer: "Manufacturer",
            requiresPrescription: "Prescription Required", noPrescription: "OTC",
            expiringDrugsMessage: "drugs expiring within 90 days",
            filterCategory: "Category", lowStock: "Low Stock", noStock: "Out of Stock",
            stockLabel: "Stock", priceLabel: "Price",
            addDrugTitle: "Add New Drug", editDrugTitle: "Edit Drug",
            noExpiring: "No drugs expiring soon", noExpired: "No expired drugs",
        },
        wholesale: {
            title: "Wholesale Module", clientsCount: "wholesale clients", invoice: "Invoice", addClient: "Add Client",
            totalClients: "Total Clients", totalDebt: "Total Debt", limitNear: "Near Limit", blocked: "Blocked",
            bulkPricing: "Bulk Pricing Tiers", searchPlaceholder: "Client name or contact...", company: "Company",
            contact: "Contact", currentDebt: "Current Debt", debtLimit: "Debt Limit", limitPercent: "Limit Percentage", lastOrder: "Last Order"
        },
        ecommerce: {
            title: "E-Commerce Module", subTitle: "Online orders and delivery", telegramBot: "Telegram Bot", instagramSync: "Instagram Sync",
            totalOrders: "Total Orders", pending: "Pending", delivering: "Delivering", todayRevenue: "Today's Revenue",
            all: "All", trackCourier: "Track Courier", preparing: "Preparing", completed: "Completed"
        },
        settings: {
            title: "Settings", subTitle: "System settings and control panel", branches: "Branches", users: "Users",
            roles: "Roles & RBAC", billing: "Billing", backup: "Backup", audit: "Audit Log", addBranch: "Add Branch",
            branchManagement: "Branch Management", addUser: "Add User", rolesAndPermissions: "Roles and Permissions",
            billingPlan: "Subscription Plan", choose: "Choose", currentPlan: "Current Plan", serverBackup: "Server Backup",
            takeBackupNow: "Take Backup Now", auditLog: "Audit Log", action: "Action", detail: "Detail", type: "Type"
        }
    }
};

const LangContext = createContext<LangContextType>({
    lang: "uz",
    setLang: () => { },
    t: (key: string) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Language>("uz");

    const t = (key: string): string => {
        const [section, field] = key.split(".");
        return translations[lang]?.[section]?.[field] ?? key;
    };

    return (
        <LangContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LangContext.Provider>
    );
}

export const useLang = () => useContext(LangContext);
