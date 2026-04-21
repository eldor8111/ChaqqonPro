import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { ThemeProvider } from "@/lib/LangContext";
import QueryProvider from "./QueryProvider";

export const metadata: Metadata = {
    title: "ChaqqonPro – Restoran va Kafe uchun POS & ERP Tizimi",
    description: "ChaqqonPro — O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi. Buyurtma boshqaruvi, ombor, moliya va xodimlar hisobi bir joyda.",
    keywords: [
        "POS tizimi", "ERP tizimi", "restoran dasturi", "kafe boshqaruvi",
        "savdo tizimi", "ChaqqonPro", "O'zbekiston POS", "ombor boshqaruvi",
        "moliya hisobi", "buyurtma tizimi", "restaurant software", "uzbekistan pos",
    ],
    authors: [{ name: "ChaqqonPro", url: "https://chaqqonpro.e-code.uz" }],
    creator: "ChaqqonPro",
    publisher: "ChaqqonPro",
    metadataBase: new URL("https://chaqqonpro.e-code.uz"),
    alternates: {
        canonical: "https://chaqqonpro.e-code.uz",
    },
    openGraph: {
        title: "ChaqqonPro – Restoran va Kafe uchun POS & ERP Tizimi",
        description: "O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi. Buyurtma boshqaruvi, ombor, moliya va xodimlar hisobi bir joyda.",
        url: "https://chaqqonpro.e-code.uz",
        siteName: "ChaqqonPro",
        locale: "uz_UZ",
        type: "website",
        images: [
            {
                url: "/logo.jpg",
                width: 1200,
                height: 630,
                alt: "ChaqqonPro – POS & ERP Tizimi",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "ChaqqonPro – Restoran va Kafe uchun POS & ERP Tizimi",
        description: "O'zbekistondagi restoran, kafe va mehmonxonalar uchun eng qulay POS va ERP tizimi.",
        images: ["/logo.jpg"],
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
                <meta name="apple-mobile-web-app-title" content="ChaqqonPro" />
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
                            "name": "ChaqqonPro",
                            "description": "O'zbekistondagi restoran, kafe va mehmonxonalar uchun POS va ERP tizimi",
                            "url": "https://chaqqonpro.e-code.uz",
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
                                "name": "ChaqqonPro",
                                "url": "https://chaqqonpro.e-code.uz"
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
                            {children}
                        </LangProvider>
                    </ThemeProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
