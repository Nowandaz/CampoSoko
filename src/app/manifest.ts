import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME, short_name: APP_NAME, description: APP_TAGLINE, start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#ea580c",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
