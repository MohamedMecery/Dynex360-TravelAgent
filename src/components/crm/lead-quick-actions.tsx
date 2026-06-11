"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiAssignLead,
  apiConvertLeadToCustomer,
  apiConvertLeadToOpportunity,
  apiLogWhatsAppActivity,
  whatsAppUrl,
} from "@/lib/crm/leads-api-client";
import type { Lead } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";

interface TenantUser {
  id: string;
  full_name: string | null;
  email: string;
}

interface LeadQuickActionsProps {
  lead: Lead;
  canWrite: boolean;
  users?: TenantUser[];
  onRefresh?: () => void;
}

export function LeadQuickActions({
  lead,
  canWrite,
  users = [],
  onRefresh,
}: LeadQuickActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState(lead.owner_id);
  const [message, setMessage] = useState<string | null>(null);

  const wa = whatsAppUrl(lead.whatsapp ?? lead.mobile);
  const terminal = lead.status === "won" || lead.status === "lost";

  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    setMessage(null);
    try {
      await fn();
      onRefresh?.();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t("leads.actionError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leads.quickActions")}</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-2 px-6 pb-6">
        {canWrite && !terminal && (
          <Button
            type="button"
            variant="default"
            className="w-full"
            disabled={busy !== null}
            onClick={() =>
              run("opp", async () => {
                const { opportunity } = await apiConvertLeadToOpportunity(lead.id);
                router.push(`/crm/opportunities/show/${opportunity.id}`);
              })
            }
          >
            {busy === "opp" ? t("common.saving") : t("leads.convertOpportunity")}
          </Button>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline" className="w-full">
              {t("leads.openWhatsApp")}
            </Button>
          </a>
        )}
        {canWrite && !terminal && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                run("whatsapp", async () => {
                  await apiLogWhatsAppActivity(lead.id);
                  setMessage(t("leads.whatsappLogged"));
                })
              }
            >
              {busy === "whatsapp" ? t("common.saving") : t("leads.logWhatsApp")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                run("customer", async () => {
                  const { customer_id } = await apiConvertLeadToCustomer(lead.id);
                  router.push(`/customers/show/${customer_id}`);
                })
              }
            >
              {busy === "customer" ? t("common.saving") : t("leads.convertCustomer")}
            </Button>
            {users.length > 0 && (
              <div className="flex gap-2 pt-1">
                <Select
                  className="flex-1"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? u.email}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null || ownerId === lead.owner_id}
                  onClick={() =>
                    run("assign", async () => {
                      await apiAssignLead(lead.id, ownerId);
                      setMessage(t("leads.assigned"));
                    })
                  }
                >
                  {t("leads.assign")}
                </Button>
              </div>
            )}
          </>
        )}
        {lead.customer_id && (
          <Link href={`/customers/show/${lead.customer_id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("leads.viewCustomer")}
            </Button>
          </Link>
        )}
        {canWrite && (
          <Link href={`/crm/leads/edit/${lead.id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("common.edit")}
            </Button>
          </Link>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </Card>
  );
}
