import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: {
    default: "Velox Labs - Account & Apps",
    template: "%s | Velox Labs",
  },
  description: "Manage your Velox Labs account, subscriptions, and access all your apps.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {/* Velox navigation widget */}
        <Script
          src="/widget/nav.js"
          strategy="afterInteractive"
        />
        {/* Main content - padding managed by widget */}
        {children}
      </body>
    </html>
  );
}
