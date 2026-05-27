import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { ThemeProvider } from "@/lib/LangContext";
import QueryProvider from "./QueryProvider";
import GlobalAudio from "@/components/GlobalAudio";


export const metadata: Metadata = {
    title: "SMART – Restoran va Kafe uchun POS & ERP Tizimi",
    description: "SMART — O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi. Buyurtma boshqaruvi, ombor, moliya va xodimlar hisobi bir joyda.",
    keywords: [
        "POS tizimi", "ERP tizimi", "restoran dasturi", "kafe boshqaruvi",
        "savdo tizimi", "SMART", "O'zbekiston POS", "ombor boshqaruvi",
        "moliya hisobi", "buyurtma tizimi", "restaurant software", "uzbekistan pos",
    ],
    authors: [{ name: "SMART", url: "https://smart.e-code.uz" }],
    creator: "SMART",
    publisher: "SMART",
    metadataBase: new URL("https://smart.e-code.uz"),
    alternates: {
        canonical: "https://smart.e-code.uz",
    },
    openGraph: {
        title: "SMART – Restoran va Kafe uchun POS & ERP Tizimi",
        description: "O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi. Buyurtma boshqaruvi, ombor, moliya va xodimlar hisobi bir joyda.",
        url: "https://smart.e-code.uz",
        siteName: "SMART",
        locale: "uz_UZ",
        type: "website",
        images: [
            {
                url: "/smart-logo.svg",
                width: 1200,
                height: 630,
                alt: "SMART – POS & ERP Tizimi",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "SMART – Restoran va Kafe uchun POS & ERP Tizimi",
        description: "O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi.",
        images: ["/smart-logo.svg"],
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
                <meta name="apple-mobile-web-app-title" content="SMART" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "SMART",
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
                                "name": "SMART",
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
