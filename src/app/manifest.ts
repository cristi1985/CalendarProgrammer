import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calendar Programmer",
    short_name: "Calendar",
    description: "Room booking and workspace calendar management tool",
    start_url:"/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons:[
        {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
        },
        {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
        },
    ],
    }
}