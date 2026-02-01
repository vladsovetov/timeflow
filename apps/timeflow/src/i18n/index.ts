import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import en from "./translations/en";
import uk from "./translations/uk";
import ru from "./translations/ru";

const translations = { en, uk, ru };

const i18n = new I18n(translations);

const SUPPORTED_LOCALES = ["en", "uk", "ru"] as const;

function getDeviceLocale(): string {
  const locale = getLocales()[0]?.languageCode ?? "en";
  if (locale in translations) return locale;
  if (locale.startsWith("uk")) return "uk";
  if (locale.startsWith("ru")) return "ru";
  return "en";
}

export function getEffectiveLocale(profileLanguage: string | null | undefined): string {
  if (profileLanguage && profileLanguage in translations) return profileLanguage;
  return getDeviceLocale();
}

i18n.enableFallback = true;
i18n.defaultLocale = "en";
i18n.locale = getDeviceLocale();

type I18nContextValue = {
  t: (key: string, options?: Record<string, string | number>) => string;
  locale: string;
  setLocale: (locale: string) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState(getDeviceLocale);

  const updateLocale = useCallback(() => {
    const newLocale = getDeviceLocale();
    setLocaleState(newLocale);
    i18n.locale = newLocale;
  }, []);

  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          updateLocale();
        }
      }
    );
    return () => subscription.remove();
  }, [updateLocale]);

  const t = useCallback(
    (key: string, options?: Record<string, string | number>) => {
      return i18n.t(key, options);
    },
    [locale]
  );

  const setLocale = useCallback((newLocale: string) => {
    if (newLocale in translations) {
      setLocaleState(newLocale);
      i18n.locale = newLocale;
    }
  }, []);

  return React.createElement(I18nContext.Provider, {
    value: { t, locale, setLocale },
    children,
  });
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

export { i18n, SUPPORTED_LOCALES };
