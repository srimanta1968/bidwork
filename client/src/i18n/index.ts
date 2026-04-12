import { createContext, useContext } from 'react';
import { en } from './en';
import { es } from './es';

export type Translations = typeof en;
export type Language = 'en' | 'es';

const translations: Record<Language, Translations> = { en, es };

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export interface I18nContextType {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
}

export const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  t: en,
  setLang: () => {},
});

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}
