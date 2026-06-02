import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { readUploadAsText } from "@/lib/ai/chunking";
import { ingestKnowledgeDocument } from "@/lib/ai/ingest-document";
import { knowledgeDocumentCreateSchema } from "@/lib/validation/knowledge-document";

const KNOWLEDGE_BUCKET = "knowledge-documents";

export async function GET(): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, access } = gate;
    const { role } = access;

    if (!hasAiPermission(role, "knowledge.manage")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing knowledge.manage permission" } },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("id, title, document_type, status, storage_path, created_at, updated_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { code: "QUERY_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [], meta: { total: data?.length ?? 0 } });
  } catch (error) {
    console.error("Knowledge documents list error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list documents" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    const { role } = access;

    if (!hasAiPermission(role, "knowledge.manage")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing knowledge.manage permission" } },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let title: string;
    let documentType: "policy" | "faq" | "contract" | "package" | "sop";
    let content: string;
    let storagePath: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      title = String(form.get("title") ?? "").trim();
      documentType = (String(form.get("document_type") ?? "policy") as typeof documentType);

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "File is required" } },
          { status: 400 }
        );
      }

      if (!title) {
        title = file.name.replace(/\.[^.]+$/, "");
      }

      content = await readUploadAsText(file);

      const docId = crypto.randomUUID();
      storagePath = `${tenantId}/${docId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(KNOWLEDGE_BUCKET)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        return NextResponse.json(
          { error: { code: "STORAGE_ERROR", message: uploadError.message } },
          { status: 500 }
        );
      }
    } else {
      const parsed = knowledgeDocumentCreateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request body",
              details: parsed.error.flatten(),
            },
          },
          { status: 400 }
        );
      }
      title = parsed.data.title;
      documentType = parsed.data.document_type;
      content = parsed.data.content;
    }

    const result = await ingestKnowledgeDocument(supabase, {
      tenantId,
      userId: user.id,
      title,
      documentType,
      content,
      storagePath,
    });

    return NextResponse.json(
      { data: { ...result, title, document_type: documentType } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Knowledge document ingest error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INGEST_ERROR",
          message: error instanceof Error ? error.message : "Ingest failed",
        },
      },
      { status: 500 }
    );
  }
}
