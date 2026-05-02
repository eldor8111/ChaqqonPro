/** @type {import('next').NextConfig} */
const nextConfig = {
    assetPrefix: '/ubt',
    output: 'standalone',
    reactStrictMode: true,
    compress: true,
    images: {
        domains: ['localhost'],
    },
    experimental: {
        // Tree-shake icon/chart libraries — only imports used symbols.
        // lucide-react has 1000+ icons; without this the full library is bundled.
        optimizePackageImports: ['lucide-react', 'recharts'],
    },

    // Security Headers - XSS, Clickjacking va boshqa hujumlardan himoya
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY', // Clickjacking dan himoya
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff', // MIME-sniffing dan himoya
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'geolocation=(), microphone=(), camera=()', // Keraksiz APIlarni o'chirish
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block', // Legacy XSS himoyasi
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
