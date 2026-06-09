/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    compress: true,
    async rewrites() {
        return [
            {
                source: '/api/smart/:path*',
                destination: process.env.LOCAL_API_URL ? `${process.env.LOCAL_API_URL}/api/smart/:path*` : '/api/smart/:path*',
            }
        ];
    },
    images: {
        domains: ['localhost'],
    },
    experimental: {
        // Tree-shake icon/chart libraries — only imports used symbols.
        // lucide-react has 1000+ icons; without this the full library is bundled.
        optimizePackageImports: ['lucide-react', 'recharts'],
    },

    // Eski URL lardan yangi URL larga redirect (ubt → smart rename)
    async redirects() {
        return [
            // /ubt-pos → /smart-pos
            {
                source: '/ubt-pos',
                destination: '/smart-pos',
                permanent: true,
            },
            // /ubt-pos/main, /ubt-pos/staff va boshqalar
            {
                source: '/ubt-pos/:path*',
                destination: '/smart-pos/:path*',
                permanent: true,
            },
            // /ubt → /smart (dashboard)
            {
                source: '/ubt',
                destination: '/smart',
                permanent: true,
            },
            // /ubt/moliya, /ubt/ombor/kirim va boshqalar
            {
                source: '/ubt/:path*',
                destination: '/smart/:path*',
                permanent: true,
            },
        ];
    },

    // Security Headers - XSS, Clickjacking va boshqa hujumlardan himoya
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'geolocation=(), microphone=(), camera=()',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
