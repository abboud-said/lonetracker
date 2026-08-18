import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lönetracker",
    short_name: "Lönetracker",
    description: "Räkna ut lön med OB-tillägg från ditt schema.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf9",
    theme_color: "#1f6f5c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
