import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Localization from "expo-localization";
import { I18nManager, View } from "react-native";
import { ar } from "@/i18n/ar";
import { en, type TranslationKeys } from "@/i18n/en";
import { mobileI18n } from "@/i18n/instance";

export type AppLocale = "en" | "ar";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (scope: string, options?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Enable RTL support once at startup (layout uses context, not forceRTL toggles). */
if (!I18nManager.isRTL && typeof I18nManager.allowRTL === "function") {
  I18nManager.allowRTL(true);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const device = Localization.getLocales()[0]?.languageCode;
  const initial: AppLocale = device === "ar" ? "ar" : "en";
  const [locale, setLocaleState] = useState<AppLocale>(initial);

  useEffect(() => {
    mobileI18n.locale = locale;
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (scope: string, options?: Record<string, string | number>) =>
      mobileI18n.t(scope, options),
    [locale]
  );

  const isRtl = locale === "ar";

  const value = useMemo(
    () => ({ locale, setLocale, t, isRtl }),
    [locale, setLocale, t, isRtl]
  );

  return (
    <LocaleContext.Provider value={value}>
      <View key={locale} style={{ flex: 1, direction: isRtl ? "rtl" : "ltr" }}>
        {children}
      </View>
    </LocaleContext.Provider>
  );
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslation requires LocaleProvider");
  }
  return ctx;
}

export function useLocaleStrings(): TranslationKeys {
  const { locale } = useTranslation();
  return locale === "ar" ? ar : en;
}
