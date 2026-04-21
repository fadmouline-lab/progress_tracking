import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cursor Starter",
  description: "Production-ready Next.js starter for rapid AI-assisted development",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} h-full min-h-dvh w-full font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
