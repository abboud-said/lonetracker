import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lönetracker — lön med OB för butiksanställda",
  description:
    "För dig som jobbar i butik och har timlön: ladda upp schemat och se vad månaden faktiskt ger, med OB-tillägg enligt Detaljhandelsavtalet. Allt räknas ut lokalt i webbläsaren.",
  applicationName: "Lönetracker",
  appleWebApp: { capable: true, title: "Lönetracker", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
