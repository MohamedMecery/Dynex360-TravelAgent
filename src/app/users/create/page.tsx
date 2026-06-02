"use client";

import { useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity, useNavigation } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import { ASSIGNABLE_TENANT_ROLES } from "@/lib/users/assignable-roles";
import { inviteUserSchema } from "@/lib/validation/user-management";
import { UserRole } from "@/types";

interface InviteFormValues {
  email: string;
  full_name: string;
  role: UserRole;
}

export default function InviteUserPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canCreate } = useCan({
    resource: "users",
    action: "create",
    params: { role: identity?.role },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviteComplete, setInviteComplete] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [invitedUserId, setInvitedUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    defaultValues: { email: "", full_name: "", role: "sales_agent" },
  });

  if (canCreate?.can === false) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold">{t("users.inviteTitle")}</h2>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t("users.forbidden")}</p>
        </Card>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setInviteComplete(false);
    setOnboardingLink(null);
    setEmailSent(false);
    const parsed = inviteUserSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(t("users.validationError"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = (await response.json()) as {
        data?: {
          onboarding_link?: string;
          email_sent?: boolean;
          user: { id: string };
        };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(json.error?.message ?? t("users.inviteError"));
      }
      setOnboardingLink(json.data?.onboarding_link ?? null);
      setEmailSent(json.data?.email_sent ?? true);
      setInvitedUserId(json.data?.user.id ?? null);
      setInviteComplete(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("users.inviteError"));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("users.inviteTitle")}</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("users.inviteSubtitle")}</CardTitle>
        </CardHeader>
        {inviteComplete ? (
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-green-800">{t("users.inviteSuccess")}</p>
            {emailSent ? (
              <p className="text-xs text-muted-foreground">{t("users.inviteEmailSent")}</p>
            ) : (
              <p className="text-xs text-amber-800">{t("users.inviteEmailNotSent")}</p>
            )}
            {onboardingLink && (
              <div className="rounded-md border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t("users.onboardingLinkLabel")}</p>
                <p className="mt-1 font-mono text-sm break-all">{onboardingLink}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("users.onboardingLinkHint")}</p>
            <div className="flex gap-2">
              {invitedUserId && (
                <Link href={`/users/show/${invitedUserId}`}>
                  <Button type="button">{t("users.viewInvited")}</Button>
                </Link>
              )}
              <Button type="button" variant="default" onClick={() => list("users")}>
                {t("users.backToList")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.email")}</label>
              <Input type="email" {...register("email", { required: true })} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{t("users.emailRequired")}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.name")}</label>
              <Input {...register("full_name", { required: true })} />
              {errors.full_name && <p className="mt-1 text-xs text-red-600">{t("users.nameRequired")}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.role")}</label>
              <Select {...register("role")}>
                {ASSIGNABLE_TENANT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </Select>
            </div>
            {submitError && (
              <p className="text-sm text-red-700" role="alert">
                {submitError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t("common.loading") : t("users.sendInvite")}
              </Button>
              <Button type="button" variant="default" onClick={() => list("users")}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
