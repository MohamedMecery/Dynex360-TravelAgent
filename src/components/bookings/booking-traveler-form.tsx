"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { FieldError } from "@/components/forms/field-error";
import { useTranslation } from "@/i18n/locale-provider";
import type { BookingTravelerRowValues } from "@/lib/validation/booking-form";
import type { PricingTier } from "@/types";

interface BookingTravelerFormProps {
  rows: BookingTravelerRowValues[];
  onChange: (rows: BookingTravelerRowValues[]) => void;
  errors?: string;
  disabled?: boolean;
}

export function BookingTravelerForm({
  rows,
  onChange,
  errors,
  disabled = false,
}: BookingTravelerFormProps) {
  const { t } = useTranslation();

  const updateRow = (index: number, patch: Partial<BookingTravelerRowValues>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...rows, { first_name: "", last_name: "", tier: "adult" }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("bookings.travelers")}</h3>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            {t("bookings.addTraveler")}
          </Button>
        )}
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-4 sm:grid-cols-4">
          <div>
            <Label>{t("fields.firstName")}</Label>
            <Input
              value={row.first_name}
              disabled={disabled}
              onChange={(e) => updateRow(index, { first_name: e.target.value })}
            />
          </div>
          <div>
            <Label>{t("fields.lastName")}</Label>
            <Input
              value={row.last_name}
              disabled={disabled}
              onChange={(e) => updateRow(index, { last_name: e.target.value })}
            />
          </div>
          <div>
            <Label>{t("bookingAgent.tier")}</Label>
            <Select
              value={row.tier}
              disabled={disabled}
              onChange={(e) => updateRow(index, { tier: e.target.value as PricingTier })}
            >
              <option value="adult">{t("bookingAgent.tiers.adult")}</option>
              <option value="child">{t("bookingAgent.tiers.child")}</option>
              <option value="infant">{t("bookingAgent.tiers.infant")}</option>
            </Select>
          </div>
          <div className="flex items-end">
            {!disabled && rows.length > 1 && (
              <Button type="button" variant="destructive" size="sm" onClick={() => removeRow(index)}>
                {t("common.delete")}
              </Button>
            )}
          </div>
          {index === 0 && (
            <p className="sm:col-span-4 text-xs text-muted-foreground">{t("bookings.leadTravelerHint")}</p>
          )}
        </div>
      ))}
      <FieldError message={errors} />
    </div>
  );
}
