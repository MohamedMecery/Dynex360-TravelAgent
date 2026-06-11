"use client";

import Link from "next/link";
import type { DuplicateLeadMatch } from "@/lib/crm/duplicate-leads";
import { useTranslation } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/button";

interface DuplicateLeadAlertProps {
  exact: DuplicateLeadMatch[];
  possible: DuplicateLeadMatch[];
  onProceed?: () => void;
  proceeding?: boolean;
}

function MatchList({
  matches,
  variant,
}: {
  matches: DuplicateLeadMatch[];
  variant: "exact" | "possible";
}) {
  const { t } = useTranslation();
  if (matches.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {matches.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-2">
          <span>
            {m.lead_number} — {m.full_name} ({t(`leads.duplicateMatch.${m.match_reason}`)})
          </span>
          <Link href={`/crm/leads/show/${m.id}`}>
            <Button type="button" variant="outline" size="sm">
              {t("common.view")}
            </Button>
          </Link>
        </li>
      ))}
      {variant === "possible" && (
        <p className="text-xs text-amber-800">{t("leads.duplicatePossibleNote")}</p>
      )}
    </ul>
  );
}

export function DuplicateLeadAlert({
  exact,
  possible,
  onProceed,
  proceeding,
}: DuplicateLeadAlertProps) {
  const { t } = useTranslation();
  if (exact.length === 0 && possible.length === 0) return null;

  const isBlocking = exact.length > 0;

  return (
    <div
      className={
        isBlocking
          ? "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950"
          : "rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      }
      role="alert"
    >
      {isBlocking ? (
        <>
          <p className="font-medium">{t("leads.duplicateExactTitle")}</p>
          <p className="mt-1">{t("leads.duplicateExactHint")}</p>
          <MatchList matches={exact} variant="exact" />
        </>
      ) : (
        <>
          <p className="font-medium">{t("leads.duplicatePossibleTitle")}</p>
          <p className="mt-1">{t("leads.duplicateHint")}</p>
          <MatchList matches={possible} variant="possible" />
          {onProceed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={proceeding}
              onClick={onProceed}
            >
              {proceeding ? t("common.saving") : t("leads.duplicateProceed")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
