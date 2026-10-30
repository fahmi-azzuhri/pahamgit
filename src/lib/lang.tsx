import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { currentLang, dict, LANG_KEY, type Copy, type Lang } from "./i18n"

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Copy } | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => currentLang())
  const setLang = (next: Lang) => {
    localStorage.setItem(LANG_KEY, next)
    setLangState(next)
  }
  const value = useMemo(() => ({ lang, setLang, t: dict[lang] }), [lang])
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export function useLang() {
  const ctx = useContext(LangCtx)
  if (!ctx) throw new Error("useLang outside LangProvider")
  return ctx
}
