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
  title: "TongitsPinoy Profit Calculator",
  description:
    "Calculate Diamond Consume and Accurate Profit for TongitsPinoy games. Developed by jpaworx.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TP Profit",
  },
  // Older iOS versions still look for the Apple-prefixed tag.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "TongitsPinoy Profit Calculator",
    title: "TongitsPinoy Profit Calculator",
    description: "Calculate Diamond Consume and Accurate Profit for TongitsPinoy games",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  // Lets the app use the whole screen on notched phones (safe areas are padded in CSS).
  // Pinch-zoom is left enabled so small figures can be magnified.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
