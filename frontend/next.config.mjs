/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: false,
    compress: true,
    poweredByHeader: false,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
    },
    images: {
        remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: 'localhost' }],
        minimumCacheTTL: 3600,
    },
    experimental: {
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
