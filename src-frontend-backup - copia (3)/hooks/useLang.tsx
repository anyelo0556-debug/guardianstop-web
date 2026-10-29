import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Lang } from "@/i18n";

type TranslationType = typeof translations.es | typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TranslationType;
}

const LangContext = createContext<LangContextType>({
  lang: "es",
  setLang: () => {},
  t: translations.es,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");
  const t = translations[lang];
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
