import { LocaleProvider } from '@/components/providers/locale-provider';
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { getLocale } from '@/i18n/locale-server';
import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist_Mono, Inter, Kaisei_Decol, Murecho, Noto_Sans_JP, Noto_Sans_SC, Noto_Sans_TC, Zen_Kaku_Gothic_New } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Noto Sans fonts for different locales
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc", 
  subsets: ["latin"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"], 
  display: "swap",
});

const murecho = Murecho({
  variable: "--font-murecho",
  subsets: ["latin"],
  display: "swap",
});

// Function to get locale-specific font variables
function getLocaleFontClass(locale: string) {
  const baseClasses = `${inter.variable} ${geistMono.variable} ${murecho.variable}`;
  
  switch (locale) {
    case 'zh-TW':
      return `${baseClasses} ${notoSansTC.variable} ${notoSansJP.variable}`;
    case 'zh-CN':
      return `${baseClasses} ${notoSansSC.variable} ${notoSansJP.variable}`;
    case 'ja':
    default:
      return `${baseClasses} ${notoSansJP.variable}`;
  }
}

export const metadata: Metadata = {
  title: "maimai friends",
  description: "Track and analyze maimai scores with friends.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get messages for the current locale
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${getLocaleFontClass(locale)} antialiased bg-background min-h-[100dvh]`}
      >
        <NextIntlClientProvider messages={messages}>
          <LocaleProvider initialLocale={locale}>
            <TRPCProvider>
              {children}
              <Toaster />
            </TRPCProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
