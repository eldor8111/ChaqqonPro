import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: "#0ea5e9",
                    50: "#f0f9ff",
                    100: "#e0f2fe",
                    200: "#bae6fd",
                    300: "#7dd3fc",
                    400: "#38bdf8",
                    500: "#0ea5e9",
                    600: "#0284c7",
                    700: "#0369a1",
                    800: "#075985",
                    900: "#0c4a6e",
                    950: "#082f49",
                },
                accent: {
                    50: "#faf0ff",
                    400: "#be6cff",
                    500: "#a040f0",
                    600: "#8422d8",
                },
                success: "#00d68f",
                warning: "#ffa520",
                danger: "#ff3e5b",
                // CSS variable-ga bog'liq dinamik ranglar
                surface: {
                    DEFAULT: "var(--bg-primary)",
                    card: "var(--bg-card)",
                    elevated: "var(--bg-elevated)",
                    border: "var(--border)",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            backgroundImage: {
                "gradient-brand": "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
                "gradient-card": "linear-gradient(135deg, rgba(10,22,37,0.95) 0%, rgba(4,8,15,0.98) 100%)",
                "gradient-success": "linear-gradient(135deg, #00b87a 0%, #00d68f 100%)",
                "gradient-danger": "linear-gradient(135deg, #cc1c3a 0%, #ff3e5b 100%)",
                "gradient-warning": "linear-gradient(135deg, #e08800 0%, #ffa520 100%)",
                "gradient-purple": "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
            },
            boxShadow: {
                glow: "0 0 24px rgba(29,101,224,0.4)",
                "glow-purple": "0 0 24px rgba(160,64,240,0.4)",
                "glow-success": "0 0 20px rgba(0,214,143,0.35)",
                "glow-danger": "0 0 20px rgba(255,62,91,0.35)",
                card: "0 8px 32px rgba(0,0,0,0.6)",
                "card-hover": "0 12px 40px rgba(0,0,0,0.7), 0 0 1px rgba(29,101,224,0.3)",
                "inner-glow": "inset 0 1px 0 rgba(29,101,224,0.12)",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-in-left": "slideInLeft 0.3s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
                shimmer: "shimmer 1.5s infinite",
            },
            keyframes: {
                fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
                slideUp: { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
                slideInLeft: { "0%": { transform: "translateX(-20px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
                shimmer: { "0%": { backgroundPosition: "-200px 0" }, "100%": { backgroundPosition: "calc(200px + 100%) 0" } },
            },
            backdropBlur: { xs: "2px" },
        },
    },
    plugins: [],
};

export default config;
