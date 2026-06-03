import type { SupabaseClient } from "@supabase/supabase-js";
const KNOWLEDGE_BUCKET = "knowledge-documents";

/** Reconstruct source text from storage or indexed chunks for reindex. */
export async function loadKnowledgeDocumentContent(
  supabase: SupabaseClient,
  documentId: string,
  tenantId: string
): Promise<string> {
  const { data: document, error: docError } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (docError || !document) {
    throw new Error(docError?.message ?? "Document not found");
  }

  if (document.storage_path) {
    const { data: file, error: storageError } = await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .download(document.storage_path);

    if (!storageError && file) {
      return await file.text();
    }
  }

  const { data: chunks, error: chunkError } = await supabase
    .from("knowledge_chunks")
    .select("content, chunk_index")
    .eq("document_id", documentId)
    .eq("tenant_id", tenantId)
    .order("chunk_index", { ascending: true });

  if (chunkError) {
    throw new Error(chunkError.message);
  }

  if (!chunks?.length) {
    throw new Error("No indexed content to reindex");
  }

  return chunks.map((c) => c.content).join("\n\n");
}
