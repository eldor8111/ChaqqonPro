import type { Metadata } from "next";

// Ofitsiant sahifasi o'z manifestidan foydalanadi — APK to'g'ridan-to'g'ri
// /mobile/waiter da ochiladi (start_url), nomi "SMART Ofitsiant".
export const metadata: Metadata = {
    title: "SMART Ofitsiant",
    manifest: "/waiter-manifest.json",
    appleWebApp: {
        capable: true,
        title: "Ofitsiant",
        statusBarStyle: "black-translucent",
    },
};

export default function WaiterLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
