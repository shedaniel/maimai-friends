import { cookies } from 'next/headers';
import { Locale, defaultLocale, locales } from './locale';

export async function getLocale(): Promise<Locale> {
  // Try to get from cookie first (for immediate language switching)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale;
  
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // Default to English
  return defaultLocale;
} 