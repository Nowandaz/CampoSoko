import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: `${APP_NAME}: ${APP_TAGLINE}`, short_name: APP_NAME, description: APP_TAGLINE, start_url: "/", scope: "/", display: "standalone", orientation: "portrait", lang: "en-KE", categories: ["shopping", "education"],
    background_color: "#ffffff", theme_color: "#ea580c",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
    shortcuts: [
      { name: "Sell something", url: "/sell", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Wanted ads", url: "/?tab=wanted", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My dashboard", url: "/dashboard", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
