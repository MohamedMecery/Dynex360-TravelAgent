"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/locale-provider";
import { KnowledgeDocument, KnowledgeDocumentType } from "@/types";

export default function KnowledgeSettingsPage() {
  const { t, isRtl } = useTranslation();
  const backArrow = isRtl ? "→" : "←";
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<KnowledgeDocumentType>("policy");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/knowledge/documents");
      const payload = (await response.json()) as {
        data?: KnowledgeDocument[];
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("knowledgeSettings.errorLoad"));
      }
      setDocuments(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("knowledgeSettings.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let response: Response;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("title", title || file.name);
        form.append("document_type", documentType);
        response = await fetch("/api/knowledge/documents", { method: "POST", body: form });
      } else {
        response = await fetch("/api/knowledge/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, document_type: documentType, content }),
        });
      }

      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("knowledgeSettings.errorUpload"));
      }

      setTitle("");
      setContent("");
      setFile(null);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("knowledgeSettings.errorUpload"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("knowledgeSettings.confirmDelete"))) return;
    const response = await fetch(`/api/knowledge/documents/${id}`, { method: "DELETE" });
    if (response.ok) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:underline">
          {backArrow} {t("settings.title")}
        </Link>
        <h2 className="mt-2 text-2xl font-bold">{t("knowledgeSettings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("knowledgeSettings.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("knowledgeSettings.uploadTitle")}</CardTitle>
        </CardHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 pb-6">
          <div>
            <Label htmlFor="title">{t("knowledgeSettings.docTitle")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("knowledgeSettings.docTitlePlaceholder")}
            />
          </div>
          <div>
            <Label htmlFor="document_type">{t("knowledgeSettings.docType")}</Label>
            <Select
              id="document_type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as KnowledgeDocumentType)}
            >
              {(["policy", "faq", "contract", "package", "sop"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`knowledgeSettings.types.${type}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="file">{t("knowledgeSettings.file")}</Label>
            <Input
              id="file"
              type="file"
              accept=".txt,.md,.json,text/plain,text/markdown,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("knowledgeSettings.fileHint")}</p>
          </div>
          {!file && (
            <div>
              <Label htmlFor="content">{t("knowledgeSettings.pasteContent")}</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder={t("knowledgeSettings.pastePlaceholder")}
                required={!file}
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting || (!file && !content.trim())}>
            {submitting ? t("knowledgeSettings.indexing") : t("knowledgeSettings.upload")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("knowledgeSettings.documentsTitle")}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("knowledgeSettings.docTitle")}</th>
                <th className="pb-2 pr-4">{t("knowledgeSettings.docType")}</th>
                <th className="pb-2 pr-4">{t("knowledgeSettings.status")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground">
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground">
                    {t("knowledgeSettings.noDocuments")}
                  </td>
                </tr>
              )}
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{doc.title}</td>
                  <td className="py-2 pr-4">{t(`knowledgeSettings.types.${doc.document_type}`)}</td>
                  <td className="py-2 pr-4">
                    <Badge>{doc.status}</Badge>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => void handleDelete(doc.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
