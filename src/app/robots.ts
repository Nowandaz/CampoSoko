import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/r/", "/receipts", "/dashboard", "/account", "/sell", "/notifications"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
