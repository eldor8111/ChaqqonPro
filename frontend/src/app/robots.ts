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
                    "/smart/",
                    "/smart-pos/",
                    "/kassa/",
                    "/agent-portal/",
                ],
            },
        ],
        sitemap: "https://smart.e-code.uz/sitemap.xml",
    };
}
