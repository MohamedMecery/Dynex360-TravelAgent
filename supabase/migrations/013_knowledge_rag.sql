-- ============================================================================
-- TravelOS Migration 013_knowledge_rag
-- Knowledge corpus: pgvector extension, documents, chunks, semantic search RPC
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE knowledge_document_type AS ENUM (
    'policy', 'faq', 'contract', 'package', 'sop'
);

CREATE TYPE knowledge_document_status AS ENUM (
    'processing', 'published', 'archived'
);

-- ----------------------------------------------------------------------------
-- knowledge_documents — source file metadata
-- ----------------------------------------------------------------------------
CREATE TABLE knowledge_documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    document_type  knowledge_document_type NOT NULL DEFAULT 'policy',
    storage_path   TEXT,
    status         knowledge_document_status NOT NULL DEFAULT 'processing',
    metadata       JSONB NOT NULL DEFAULT '{}',
    deleted_at     TIMESTAMPTZ,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_documents_tenant_id ON knowledge_documents(tenant_id);
CREATE INDEX idx_knowledge_documents_status     ON knowledge_documents(tenant_id, status)
    WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- knowledge_chunks — RAG retrieval units with embeddings
-- ----------------------------------------------------------------------------
CREATE TABLE knowledge_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    content      TEXT NOT NULL,
    embedding    vector(1536),
    token_count  INT,
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_knowledge_chunks_doc_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_knowledge_chunks_tenant_id  ON knowledge_chunks(tenant_id);
CREATE INDEX idx_knowledge_chunks_document   ON knowledge_chunks(document_id);

CREATE INDEX idx_knowledge_chunks_embedding
    ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Full-text fallback when embeddings are unavailable
CREATE INDEX idx_knowledge_chunks_fts
    ON knowledge_chunks
    USING gin (to_tsvector('english', content));

CREATE TRIGGER trg_knowledge_documents_updated_at
    BEFORE UPDATE ON knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Semantic search (tenant-scoped via current_tenant_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
    query_embedding vector(1536),
    match_count     INT DEFAULT 5,
    filter_type     knowledge_document_type DEFAULT NULL
)
RETURNS TABLE (
    id              UUID,
    document_id     UUID,
    content         TEXT,
    chunk_index     INT,
    similarity      FLOAT,
    document_title  TEXT,
    document_type   knowledge_document_type
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.chunk_index,
        (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity,
        kd.title AS document_title,
        kd.document_type
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kc.tenant_id = public.current_tenant_id()
      AND kd.deleted_at IS NULL
      AND kd.status = 'published'
      AND kc.embedding IS NOT NULL
      AND (filter_type IS NULL OR kd.document_type = filter_type)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT GREATEST(match_count, 1);
$$;

-- Keyword fallback search (tenant-scoped)
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks_text(
    search_query TEXT,
    match_count  INT DEFAULT 5,
    filter_type  knowledge_document_type DEFAULT NULL
)
RETURNS TABLE (
    id              UUID,
    document_id     UUID,
    content         TEXT,
    chunk_index     INT,
    rank            FLOAT,
    document_title  TEXT,
    document_type   knowledge_document_type
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.chunk_index,
        ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', search_query))::FLOAT AS rank,
        kd.title AS document_title,
        kd.document_type
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kc.tenant_id = public.current_tenant_id()
      AND kd.deleted_at IS NULL
      AND kd.status = 'published'
      AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', search_query)
      AND (filter_type IS NULL OR kd.document_type = filter_type)
    ORDER BY rank DESC
    LIMIT GREATEST(match_count, 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks(vector, INT, knowledge_document_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks_text(TEXT, INT, knowledge_document_type) TO authenticated;
