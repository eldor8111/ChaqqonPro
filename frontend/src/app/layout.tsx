import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { ThemeProvider } from "@/lib/LangContext";
import QueryProvider from "./QueryProvider";
import GlobalAudio from "@/components/GlobalAudio";


export const metadata: Metadata = {
    title: "EVIKO – Restoran va Kafe uchun POS & ERP Tizimi",
    description: "EVIKO — O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi. Buyurtma boshqaruvi, ombor, moliya va xodimlar hisobi bir joyda.",
    keywords: [
        "POS tizimi", "ERP tizimi", "restoran dasturi", "kafe boshqaruvi",
        "savdo tizimi", "EVIKO", "O'zbekiston POS", "ombor boshqaruvi",
        "moliya hisobi", "buyurtma tizimi", "restaurant software", "uzbekistan pos",
    ],
    authors: [{ name: "EVIKO", url: "https://smart.e-code.uz" }],
    creator: "EVIKO",
    publisher: "EVIKO",
    manifest: "/manifest.json", // standart manifest; /mobile/waiter route'i o'zinikiga override qiladi
    metadataBase: new URL("https://smart.e-code.uz"),
    alternates: {
        canonical: "https://smart.e-code.uz",
    },
    openGraph: {
        title: "EVIKO – Restoran va Kafe uchun POS & ERP Tizimi",
        description: "O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi. Buyurtma boshqaruvi, ombor, moliya va xodimlar hisobi bir joyda.",
        url: "https://smart.e-code.uz",
        siteName: "EVIKO",
        locale: "uz_UZ",
        type: "website",
        images: [
            {
                url: "/eviko-logo.svg",
                width: 1200,
                height: 630,
                alt: "EVIKO – POS & ERP Tizimi",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "EVIKO – Restoran va Kafe uchun POS & ERP Tizimi",
        description: "O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi.",
        images: ["/eviko-logo.svg"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="uz">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#2563eb" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="EVIKO" />
                {/* manifest endi metadata orqali beriladi (route bo'yicha override qilinadi) */}
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                {/* Times New Roman system font ishlatilmoqda */}
                <style>{`* { font-family: 'Times New Roman', Times, serif !important; }`}</style>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "EVIKO",
                            "description": "O'zbekistondagi restoran, kafe va mehmonxonalar uchun POS va ERP tizimi",
                            "url": "https://smart.e-code.uz",
                            "applicationCategory": "BusinessApplication",
                            "operatingSystem": "Web",
                            "inLanguage": "uz",
                            "offers": {
                                "@type": "Offer",
                                "priceCurrency": "UZS",
                                "availability": "https://schema.org/InStock"
                            },
                            "provider": {
                                "@type": "Organization",
                                "name": "EVIKO",
                                "url": "https://smart.e-code.uz"
                            }
                        })
                    }}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }`
                    }}
                />
            </head>
            <body className="min-h-screen antialiased" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
                <QueryProvider>
                    <ThemeProvider>
                        <LangProvider>
                            <GlobalAudio />
                            {children}
                        </LangProvider>
                    </ThemeProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
