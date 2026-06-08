CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.kie_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'general',
  project text,
  status text NOT NULL DEFAULT 'processing',
  storage_path text,
  size_bytes integer NOT NULL DEFAULT 0,
  chunk_count integer NOT NULL DEFAULT 0,
  summary text,
  entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kie_documents TO anon, authenticated;
GRANT ALL ON public.kie_documents TO service_role;

ALTER TABLE public.kie_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kie_docs read" ON public.kie_documents FOR SELECT USING (true);
CREATE POLICY "kie_docs insert" ON public.kie_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "kie_docs update" ON public.kie_documents FOR UPDATE USING (true);
CREATE POLICY "kie_docs delete" ON public.kie_documents FOR DELETE USING (true);

CREATE TABLE public.kie_doc_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.kie_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  token_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kie_doc_chunks TO anon, authenticated;
GRANT ALL ON public.kie_doc_chunks TO service_role;

ALTER TABLE public.kie_doc_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kie_chunks read" ON public.kie_doc_chunks FOR SELECT USING (true);
CREATE POLICY "kie_chunks insert" ON public.kie_doc_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "kie_chunks delete" ON public.kie_doc_chunks FOR DELETE USING (true);

CREATE INDEX kie_doc_chunks_embedding_idx ON public.kie_doc_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX kie_doc_chunks_doc_idx ON public.kie_doc_chunks(document_id);

CREATE OR REPLACE FUNCTION public.match_kie_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_name text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT c.id, c.document_id, d.name AS document_name, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kie_doc_chunks c
  JOIN public.kie_documents d ON d.id = c.document_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_kie_chunks(vector, integer) TO anon, authenticated, service_role;