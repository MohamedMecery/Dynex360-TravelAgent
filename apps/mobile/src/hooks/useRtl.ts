import { I18nManager } from "react-native";
import { useTranslation } from "@/i18n/LocaleProvider";

/** RTL layout helper driven by active locale. */
export function useRtl() {
  const { isRtl: localeRtl } = useTranslation();
  const isRtl = localeRtl || I18nManager.isRTL;
  return {
    isRtl,
    direction: isRtl ? ("rtl" as const) : ("ltr" as const),
    row: isRtl ? "row-reverse" as const : "row" as const,
    textAlign: isRtl ? ("right" as const) : ("left" as const),
  };
}
