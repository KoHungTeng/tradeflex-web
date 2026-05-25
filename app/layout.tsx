import { ThemeProvider } from './ThemeContext'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from './CurrencyContext'
import { LanguageProvider } from './LanguageContext'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeFlex",
  description: "Trading Journal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
  <CurrencyProvider>
    <ThemeProvider>{children}</ThemeProvider>
  </CurrencyProvider>
</LanguageProvider>
      </body>
    </html>
  );
}