import { cookies, headers } from 'next/headers';
import { Locale, defaultLocale, locales } from './locale';

export async function getLocale(): Promise<Locale> {
  try {
    // Try to get from cookie first (for immediate language switching)
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale;
    
    if (localeCookie && locales.includes(localeCookie)) {
      return localeCookie;
    }
  } catch {
    // If cookies() fails (e.g., during static generation), fall back to detection
    console.log('Unable to access cookies, will try to detect from headers');
  }

  // If no cookie, try to detect from Accept-Language header
  try {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');
    
    if (acceptLanguage) {
      // Parse Accept-Language header (format: "en-US,en;q=0.9,ja;q=0.8")
      const languages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim());
      
      // Try to find exact match first
      for (const lang of languages) {
        if (locales.includes(lang as Locale)) {
          return lang as Locale;
        }
      }
      
      // Try to find partial match (e.g., "en-US" -> "en")
      for (const lang of languages) {
        const shortLang = lang.split('-')[0];
        const match = locales.find(locale => locale.startsWith(shortLang));
        if (match) {
          return match;
        }
      }
    }
  } catch {
    console.log('Unable to access headers, using default locale');
  }

  // Default to English
  return defaultLocale;
} 