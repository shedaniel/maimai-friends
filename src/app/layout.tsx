import { LocaleProvider } from '@/components/providers/locale-provider';
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { getLocale } from '@/i18n/locale-server';
import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import localFont from "next/font/local";
import { Noto_Sans_SC, Noto_Sans_TC } from "next/font/google";
import { VercelToolbar } from "@vercel/toolbar/next";
import "./globals.css";

// Local fonts
const inter = localFont({
  src: "../../public/res/fonts/Inter-VariableFont_opsz,wght.woff2",
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/res/fonts/GeistMono-VariableFont_wght.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

const notoSansJP = localFont({
  src: "../../public/res/fonts/NotoSansJP-VariableFont_wght.woff2",
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const murecho = localFont({
  src: "../../public/res/fonts/Murecho-VariableFont_wght.woff2",
  variable: "--font-murecho",
  display: "swap",
});

// Google Fonts for Chinese variants
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

// Function to get locale-specific font variables
function getLocaleFontClass(locale: string) {
  const baseClasses = `${inter.variable} ${geistMono.variable} ${murecho.variable}`;
  
  switch (locale) {
    case 'zh-TW':
    case 'zh-HK':
      return `${baseClasses} ${notoSansTC.variable} ${notoSansJP.variable}`;
    case 'zh-CN':
      return `${baseClasses} ${notoSansSC.variable} ${notoSansJP.variable}`;
    case 'ja':
    default:
      return `${baseClasses} ${notoSansJP.variable}`;
  }
}

export const metadata: Metadata = {
  title: "tomomai ともマイ",
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
  const shouldInjectToolbar = process.env.NODE_ENV === "development";

  return (
    <html lang={locale}>
      <body
        className={`${getLocaleFontClass(locale)} antialiased bg-background min-h-[100dvh]`}
      >
        <NextIntlClientProvider messages={messages}>
          <LocaleProvider initialLocale={locale}>
            <TRPCProvider>
              {children}
              {shouldInjectToolbar && <VercelToolbar />}
              <Toaster />
            </TRPCProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
