import { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "@/lib/ai/chunking";
import { embedText } from "@/lib/ai/embeddings";
import { KnowledgeDocumentType } from "@/types";

export interface IngestDocumentInput {
  tenantId: string;
  userId: string;
  title: string;
  documentType: KnowledgeDocumentType;
  content: string;
  storagePath?: string;
}

export interface IngestDocumentResult {
  documentId: string;
  chunkCount: number;
}

export async function ingestKnowledgeDocument(
  supabase: SupabaseClient,
  input: IngestDocumentInput
): Promise<IngestDocumentResult> {
  const { data: document, error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      tenant_id: input.tenantId,
      title: input.title,
      document_type: input.documentType,
      storage_path: input.storagePath,
      status: "processing",
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("id")
    .single();

  if (docError || !document) {
    throw new Error(docError?.message ?? "Failed to create knowledge document");
  }

  try {
    const chunks = chunkText(input.content);
    await supabase.from("knowledge_chunks").delete().eq("document_id", document.id);

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.content);
      const { error: chunkError } = await supabase.from("knowledge_chunks").insert({
        document_id: document.id,
        tenant_id: input.tenantId,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding,
        token_count: chunk.tokenCount,
      });

      if (chunkError) {
        throw new Error(chunkError.message);
      }
    }

    const { error: publishError } = await supabase
      .from("knowledge_documents")
      .update({ status: "published", updated_by: input.userId })
      .eq("id", document.id);

    if (publishError) {
      throw new Error(publishError.message);
    }

    return { documentId: document.id, chunkCount: chunks.length };
  } catch (error) {
    await supabase
      .from("knowledge_documents")
      .update({ status: "archived", updated_by: input.userId })
      .eq("id", document.id);
    throw error;
  }
}

export async function reingestKnowledgeDocument(
  supabase: SupabaseClient,
  documentId: string,
  tenantId: string,
  userId: string,
  content: string
): Promise<number> {
  const { error: statusError } = await supabase
    .from("knowledge_documents")
    .update({ status: "processing", updated_by: userId })
    .eq("id", documentId)
    .eq("tenant_id", tenantId);

  if (statusError) {
    throw new Error(statusError.message);
  }

  const chunks = chunkText(content);
  await supabase.from("knowledge_chunks").delete().eq("document_id", documentId);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    const { error: chunkError } = await supabase.from("knowledge_chunks").insert({
      document_id: documentId,
      tenant_id: tenantId,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding,
      token_count: chunk.tokenCount,
    });

    if (chunkError) {
      throw new Error(chunkError.message);
    }
  }

  const { error: publishError } = await supabase
    .from("knowledge_documents")
    .update({ status: "published", updated_by: userId })
    .eq("id", documentId);

  if (publishError) {
    throw new Error(publishError.message);
  }

  return chunks.length;
}
