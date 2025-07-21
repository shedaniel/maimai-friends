import { cookies } from 'next/headers';
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
    // If cookies() fails (e.g., during static generation), fall back to default
    console.log('Unable to access cookies, using default locale');
  }

  // Default to English
  return defaultLocale;
} 