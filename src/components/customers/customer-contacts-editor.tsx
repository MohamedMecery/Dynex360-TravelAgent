"use client";

import { useCallback, useState } from "react";
import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/forms/field-error";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import {
  customerContactSchema,
  emptyContactForm,
  type CustomerContactFormValues,
} from "@/lib/validation/customer-nested-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { CustomerContact } from "@/types";

interface CustomerContactsEditorProps {
  customerId: string;
}

export function CustomerContactsEditor({ customerId }: CustomerContactsEditorProps) {
  const { t } = useTranslation();
  const tenantId = useTenantId();
  const [form, setForm] = useState<CustomerContactFormValues>(emptyContactForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomerContactFormValues, string>>>({});

  const { data, isLoading, refetch } = useList<CustomerContact>({
    resource: "customer_contacts",
    filters: [{ field: "customer_id", operator: "eq", value: customerId }],
    sorters: [{ field: "created_at", order: "asc" }],
    pagination: { pageSize: 100 },
  });

  const { mutate: createContact, isLoading: creating } = useCreate();
  const { mutate: updateContact, isLoading: updating } = useUpdate();
  const { mutate: deleteContact } = useDelete();

  const contacts = data?.data ?? [];

  const resetForm = useCallback(() => {
    setForm(emptyContactForm());
    setEditingId(null);
    setFormError(null);
    setFieldErrors({});
  }, []);

  const startEdit = (contact: CustomerContact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      role: contact.role ?? "",
    });
    setFormError(null);
    setFieldErrors({});
  };

  const resolveFieldError = (key: keyof CustomerContactFormValues, code?: string): string | undefined => {
    if (!code) return undefined;
    if (code === "nameRequired") return t("customers.contactNameRequired");
    if (code === "nameTooLong") return t("customers.contactNameTooLong");
    if (code === "invalidEmail") return t("customers.invalidEmail");
    return code;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId) return;

    const parsed = customerContactSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof CustomerContactFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          next[field as keyof CustomerContactFormValues] = String(issue.message);
        }
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    const values = parsed.data;
    const payload = {
      name: values.name,
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      role: values.role?.trim() || null,
    };

    if (editingId) {
      updateContact(
        { resource: "customer_contacts", id: editingId, values: payload },
        {
          onSuccess: () => {
            resetForm();
            void refetch();
          },
          onError: () => setFormError(t("customers.contactSaveError")),
        }
      );
      return;
    }

    createContact(
      {
        resource: "customer_contacts",
        values: { ...payload, customer_id: customerId, tenant_id: tenantId },
      },
      {
        onSuccess: () => {
          resetForm();
          void refetch();
        },
        onError: () => setFormError(t("customers.contactSaveError")),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t("customers.confirmDeleteContact"))) return;
    deleteContact({ resource: "customer_contacts", id }, { onSuccess: () => void refetch() });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t("customers.contacts")}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={resetForm}>
          {t("customers.addContact")}
        </Button>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("customers.noContacts")}</p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.id} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{contact.name}</p>
                    {contact.role && (
                      <p className="text-muted-foreground">{contact.role}</p>
                    )}
                    <p className="mt-1 text-muted-foreground">
                      {[contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(contact)}>
                      {t("common.edit")}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(contact.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-dashed p-4">
          <p className="text-sm font-medium">
            {editingId ? t("customers.editContact") : t("customers.addContact")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("fields.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <FieldError message={resolveFieldError("name", fieldErrors.name)} />
            </div>
            <div>
              <Label>{t("customers.contactRole")}</Label>
              <Input value={form.role ?? ""} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
            </div>
            <div>
              <Label>{t("fields.email")}</Label>
              <Input value={form.email ?? ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <FieldError message={resolveFieldError("email", fieldErrors.email)} />
            </div>
            <div>
              <Label>{t("fields.phone")}</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || updating || !tenantId}>
              {creating || updating ? t("common.saving") : editingId ? t("common.save") : t("common.create")}
            </Button>
            {(editingId || form.name) && (
              <Button type="button" variant="outline" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
