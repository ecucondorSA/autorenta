import React, { createContext, useContext } from 'react';
import { Language, translations, t } from './translations';

interface LanguageContextType {
  lang: Language;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, lang }: { children: React.ReactNode; lang: Language }) {
  return (
    <LanguageContext.Provider value={{ lang, t: (key) => t(lang, key) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslations must be used within LanguageProvider');
  }
  return context;
}
