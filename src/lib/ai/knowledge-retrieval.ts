import { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/ai/embeddings";
import { AiLocale, knowledgeSearchLocaleParam, resolveAiLocale } from "@/lib/ai/locale";
import { KnowledgeCitation, KnowledgeDocumentType } from "@/types";

export interface RetrievedChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  document_title: string;
  document_type: KnowledgeDocumentType;
  score: number;
}

interface SemanticRow {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  document_title: string;
  document_type: KnowledgeDocumentType;
  similarity: number;
}

interface TextRow {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  document_title: string;
  document_type: KnowledgeDocumentType;
  rank: number;
}

export async function retrieveKnowledgeChunks(
  supabase: SupabaseClient,
  query: string,
  options?: { matchCount?: number; documentType?: KnowledgeDocumentType; locale?: AiLocale }
): Promise<RetrievedChunk[]> {
  const matchCount = options?.matchCount ?? 5;
  const filterType = options?.documentType ?? null;
  const locale = resolveAiLocale(options?.locale, query);
  const searchLocale = knowledgeSearchLocaleParam(locale, query);

  const embedding = await embedText(query);
  if (embedding) {
    const { data, error } = await supabase.rpc("search_knowledge_chunks", {
      query_embedding: embedding,
      match_count: matchCount,
      filter_type: filterType,
    });

    if (!error && data && (data as SemanticRow[]).length > 0) {
      return (data as SemanticRow[]).map((row) => ({
        id: row.id,
        document_id: row.document_id,
        content: row.content,
        chunk_index: row.chunk_index,
        document_title: row.document_title,
        document_type: row.document_type,
        score: row.similarity,
      }));
    }
  }

  const { data: textData, error: textError } = await supabase.rpc(
    "search_knowledge_chunks_text",
    {
      search_query: query,
      match_count: matchCount,
      filter_type: filterType,
      search_locale: searchLocale,
    }
  );

  if (textError || !textData) {
    console.error("Knowledge text search error:", textError);
    return [];
  }

  return (textData as TextRow[]).map((row) => ({
    id: row.id,
    document_id: row.document_id,
    content: row.content,
    chunk_index: row.chunk_index,
    document_title: row.document_title,
    document_type: row.document_type,
    score: row.rank,
  }));
}

export function chunksToCitations(chunks: RetrievedChunk[]): KnowledgeCitation[] {
  return chunks.map((chunk) => ({
    chunk_id: chunk.id,
    document_id: chunk.document_id,
    document_title: chunk.document_title,
    document_type: chunk.document_type,
    excerpt: chunk.content.slice(0, 280),
    score: chunk.score,
  }));
}

export function buildContextFromChunks(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] ${chunk.document_title} (${chunk.document_type})\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
