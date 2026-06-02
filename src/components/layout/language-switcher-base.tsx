"use client";

import { cn } from "@/lib/utils";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";

interface LanguageSwitcherBaseProps {
  className?: string;
  showLabel?: boolean;
  locale: Locale;
  locales: Locale[];
  label: string;
  getOptionLabel?: (locale: Locale) => string;
  onSelect: (locale: Locale) => void;
}

export function LanguageSwitcherBase({
  className,
  showLabel = false,
  locale,
  locales,
  label,
  getOptionLabel,
  onSelect,
}: LanguageSwitcherBaseProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <div
        className="flex gap-1 rounded-md border p-0.5"
        role="group"
        aria-label={label}
      >
        {locales.map((code) => {
          const optionLabel = getOptionLabel?.(code) ?? LOCALE_LABELS[code];
          return (
            <button
              key={code}
              type="button"
              onClick={() => onSelect(code)}
              aria-pressed={locale === code}
              lang={code}
              className={cn(
                "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                locale === code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
