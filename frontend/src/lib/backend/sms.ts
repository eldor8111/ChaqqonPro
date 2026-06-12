/**
 * Eskiz.uz SMS jo'natish xizmati uchun utilita (Utility)
 */

interface EskizTokenResponse {
    message: string;
    data: {
        token: string;
    };
    token_type: string;
}

// Tokenni keshda saqlash (qayta-qayta login so'rovini oldini olish uchun yaroqlilik muddati 30 kun gacha bo'ladi)
let _eskizToken: string | null = null;
let _eskizTokenTime: number = 0;

/**
 * Eskiz'dan avtorizatsiya tokenini olish
 */
async function getEskizToken(): Promise<string> {
    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;

    if (!email || !password) {
        throw new Error("SMS xizmati ishlamaydi: ESKIZ_EMAIL va ESKIZ_PASSWORD .env faylida ko'rsatilmagan.");
    }

    // Tokenni 20 kun (har doim fresh turishi uchun) yoki eskirmasdan qayta ishlatamiz
    const now = Date.now();
    if (_eskizToken && (now - _eskizTokenTime) < 1000 * 60 * 60 * 24 * 20) {
        return _eskizToken;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        throw new Error("Eskiz bilan ulanish (Avtorizatsiya) xatosi");
    }

    const data: EskizTokenResponse = await res.json();
    _eskizToken = data.data.token;
    _eskizTokenTime = now;

    return _eskizToken;
}

/**
 * Raqamga SMS jo'natish
 * @param phoneTelefon raqam, Masalan +998901234567 
 * @param message Xabar matni
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
    try {
        // Telefon raqamdan faqat raqamlarni olamiz ("+" va probellarsiz 998901234567 ko'rinishida bo'lishi kerak)
        const cleanPhone = phone.replace(/\D/g, "");

        const token = await getEskizToken();

        const formData = new FormData();
        formData.append("mobile_phone", cleanPhone);
        formData.append("message", message);
        formData.append("from", "4546"); // Eskiz.uz standarti (o'zgarishi mumkin e.g xaridor nick name)

        const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const result = await res.json();
        
        if (res.ok && result.status === "waiting") {
            return true;
        }

        console.error("SMS Xizmati ma'lumot qabul qilmadi:", result);
        return false;

    } catch (error) {
        console.error("SMS jo'natishda kritik xatolik:", error);
        return false;
    }
}
