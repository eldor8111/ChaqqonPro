import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/super-admin/",
                    "/ubt/",
                    "/ubt-pos/",
                    "/kassa/",
                    "/agent-portal/",
                ],
            },
        ],
        sitemap: "https://chaqqonpro.e-code.uz/sitemap.xml",
    };
}
