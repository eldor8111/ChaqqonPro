import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { ThemeProvider } from "@/lib/LangContext";
import QueryProvider from "./QueryProvider";

export const metadata: Metadata = {
    title: "ChaqqonPro – Professional POS & ERP System",
    description: "O'zbekiston bozori uchun professional savdo va boshqaruv tizimi",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="uz">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
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
