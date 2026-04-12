import { useState, ReactNode } from 'react';
import { I18nContext, Language, getTranslations } from '../i18n';

function getSavedLang(): Language {
  const saved = localStorage.getItem('bidwork_lang');
  if (saved === 'es') return 'es';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getSavedLang);

  const setLang = (newLang: Language) => {
    localStorage.setItem('bidwork_lang', newLang);
    setLangState(newLang);
  };

  return (
    <I18nContext.Provider value={{ lang, t: getTranslations(lang), setLang }}>
      {children}
    </I18nContext.Provider>
  );
}
