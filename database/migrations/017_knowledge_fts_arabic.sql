-- Arabic full-text search support for knowledge chunks (bilingual KB)

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts_ar
    ON knowledge_chunks
    USING gin (to_tsvector('arabic', content));

DROP FUNCTION IF EXISTS public.search_knowledge_chunks_text(TEXT, INT, knowledge_document_type);

CREATE OR REPLACE FUNCTION public.search_knowledge_chunks_text(
    search_query   TEXT,
    match_count    INT DEFAULT 5,
    filter_type    knowledge_document_type DEFAULT NULL,
    search_locale  TEXT DEFAULT 'en'
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
    WITH params AS (
        SELECT
            search_query AS q,
            (search_query ~ '[\u0600-\u06FF]') AS has_arabic_chars,
            CASE
                WHEN search_locale = 'ar' THEN TRUE
                WHEN search_locale = 'en' THEN (search_query ~ '[\u0600-\u06FF]')
                ELSE (search_query ~ '[\u0600-\u06FF]')
            END AS use_arabic,
            TRUE AS use_english
    ),
    ranked AS (
        SELECT
            kc.id,
            kc.document_id,
            kc.content,
            kc.chunk_index,
            kd.title AS document_title,
            kd.document_type,
            GREATEST(
                CASE
                    WHEN p.use_english THEN
                        ts_rank(
                            to_tsvector('english', kc.content),
                            plainto_tsquery('english', p.q)
                        )
                    ELSE 0
                END,
                CASE
                    WHEN p.use_arabic THEN
                        ts_rank(
                            to_tsvector('arabic', kc.content),
                            plainto_tsquery('arabic', p.q)
                        )
                    ELSE 0
                END
            )::FLOAT AS rank
        FROM knowledge_chunks kc
        JOIN knowledge_documents kd ON kd.id = kc.document_id
        CROSS JOIN params p
        WHERE kc.tenant_id = public.current_tenant_id()
          AND kd.deleted_at IS NULL
          AND kd.status = 'published'
          AND (filter_type IS NULL OR kd.document_type = filter_type)
          AND (
              (p.use_english AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', p.q))
              OR
              (p.use_arabic AND to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', p.q))
          )
    )
    SELECT
        id,
        document_id,
        content,
        chunk_index,
        rank,
        document_title,
        document_type
    FROM ranked
    WHERE rank > 0
    ORDER BY rank DESC
    LIMIT GREATEST(match_count, 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks_text(TEXT, INT, knowledge_document_type, TEXT) TO authenticated;
