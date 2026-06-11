"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import type { LeadSource } from "@/types";

export interface LeadFormValues {
  full_name: string;
  mobile: string;
  whatsapp: string;
  email: string;
  preferred_contact_channel: string;
  source: LeadSource;
  destination_text: string;
  expected_budget: string;
  currency: string;
  travel_date: string;
  pax_count: string;
  notes: string;
  status: string;
  lost_reason: string;
}

interface LeadFormFieldsProps {
  register: UseFormRegister<LeadFormValues>;
  errors: FieldErrors<LeadFormValues>;
  showStatus?: boolean;
}

export function LeadFormFields({
  register,
  errors,
  showStatus = false,
}: LeadFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("leads.name")} *</label>
        <Input {...register("full_name", { required: true })} />
        {errors.full_name && (
          <p className="mt-1 text-sm text-destructive">{t("leads.nameRequired")}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fields.mobile")}</label>
          <Input {...register("mobile")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">WhatsApp</label>
          <Input {...register("whatsapp")} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("fields.email")}</label>
        <Input type="email" {...register("email")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("leads.sourceLabel")} *</label>
          <Select {...register("source", { required: true })}>
            {(
              [
                "whatsapp",
                "website",
                "facebook",
                "instagram",
                "tiktok",
                "referral",
                "walk_in",
                "phone_call",
                "other",
              ] as LeadSource[]
            ).map((s) => (
              <option key={s} value={s}>
                {t(`leads.source.${s}`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("leads.preferredChannel")}</label>
          <Select {...register("preferred_contact_channel")}>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">{t("leads.source.phone_call")}</option>
            <option value="email">{t("fields.email")}</option>
            <option value="in_person">{t("leads.channel.in_person")}</option>
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("leads.destination")}</label>
        <Input {...register("destination_text")} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("leads.budget")}</label>
          <Input type="number" min={0} step="0.01" {...register("expected_budget")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("leads.currency")}</label>
          <Input maxLength={3} {...register("currency")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("leads.pax")}</label>
          <Input type="number" min={1} {...register("pax_count")} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("leads.travelDate")}</label>
        <Input type="date" {...register("travel_date")} />
      </div>
      {showStatus && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("leads.statusLabel")}</label>
            <Select {...register("status")}>
              {(
                [
                  "new",
                  "contacted",
                  "qualified",
                  "proposal_sent",
                  "negotiation",
                  "won",
                  "lost",
                ] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {t(`leads.status.${s}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("leads.lostReason")}</label>
            <Input {...register("lost_reason")} />
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">{t("common.notes")}</label>
        <Textarea rows={3} {...register("notes")} />
      </div>
    </div>
  );
}
