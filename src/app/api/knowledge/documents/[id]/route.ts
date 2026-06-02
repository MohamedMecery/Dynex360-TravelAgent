import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { reingestKnowledgeDocument } from "@/lib/ai/ingest-document";
import { knowledgeDocumentCreateSchema } from "@/lib/validation/knowledge-document";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    if (!hasAiPermission(access.role, "knowledge.manage")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing knowledge.manage permission" } },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("knowledge_documents")
      .update({ deleted_at: new Date().toISOString(), status: "archived", updated_by: user.id })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json(
        { error: { code: "DELETE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("Knowledge document delete error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Delete failed" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    if (!hasAiPermission(access.role, "knowledge.manage")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing knowledge.manage permission" } },
        { status: 403 }
      );
    }

    const parsed = knowledgeDocumentCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Content required for reindex" } },
        { status: 400 }
      );
    }

    const chunkCount = await reingestKnowledgeDocument(
      supabase,
      id,
      tenantId,
      user.id,
      parsed.data.content
    );

    return NextResponse.json({ data: { id, chunk_count: chunkCount } });
  } catch (error) {
    console.error("Knowledge document reindex error:", error);
    return NextResponse.json(
      {
        error: {
          code: "REINDEX_ERROR",
          message: error instanceof Error ? error.message : "Reindex failed",
        },
      },
      { status: 500 }
    );
  }
}
