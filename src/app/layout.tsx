import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Baloo_2, Source_Sans_3 } from "next/font/google";
import "./globals.css";

import { CalmModeScript } from "@/features/calm-mode/calm-mode-script";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  // Canonical URLs and social-card images resolve against the real domain.
  metadataBase: new URL("https://camiprints.com"),
  title: {
    default: "CamiPrints — Free coloring pages, made simple",
    template: "%s · CamiPrints",
  },
  description:
    "Browse, print, download free coloring pages — or turn your own photo into a page. No clutter, no ads, nothing that jumps at you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${baloo.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <head>
        <CalmModeScript />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        {/* Cookieless, anonymized page-view counts (Vercel Web
            Analytics) — the only traffic measurement on the site; see
            docs/privacy-and-retention.md. */}
        <Analytics />
      </body>
    </html>
  );
}
