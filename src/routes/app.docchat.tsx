import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ingestKieDocument,
  chatWithKieDocs,
  listKieDocuments,
  reserveKieUpload,
  type DocChatMessage,
} from "@/lib/kie-rag.functions";
import { extractTextFromFile } from "@/lib/pdf-extract";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  FileText,
  Send,
  Sparkles,
  Loader2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Brain,
} from "lucide-react";

export const Route = createFileRoute("/app/docchat")({
  head: () => ({ meta: [{ title: "Document Chat — Sentinel KIE" }] }),
  component: DocChat,
});

type Doc = {
  id: string;
  name: string;
  doc_type: string;
  project: string | null;
  status: string;
  chunk_count: number;
  summary: string | null;
  entities: unknown;
  insights: unknown;
  confidence: number;
  created_at: string;
};

function DocChat() {
  const list = useServerFn(listKieDocuments);
  const ingest = useServerFn(ingestKieDocument);
  const reserve = useServerFn(reserveKieUpload);
  const ask = useServerFn(chatWithKieDocs);
  const qc = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ["kie-docs"],
    queryFn: () => list() as Promise<Doc[]>,
    refetchInterval: 5_000,
  });

  const [activeDoc, setActiveDoc] = useState<string | undefined>();
  const [messages, setMessages] = useState<DocChatMessage[]>([]);
  const [sources, setSources] = useState<
    { n: number; documentName: string; similarity: number; excerpt: string }[]
  >([]);
  const [input, setInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      setUploadMsg(`Extracting ${file.name}…`);
      const text = await extractTextFromFile(file);
      if (!text || text.length < 20) throw new Error("Could not extract text.");
      const docType = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "text";
      setUploadMsg(`Reserving ${file.name}…`);
      const { documentId, storagePath } = await reserve({
        data: { name: file.name, docType, sizeBytes: file.size },
      });
      setUploadMsg(`Uploading ${file.name}…`);
      const up = await supabase.storage
        .from("kie-docs")
        .upload(storagePath, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);
      setUploadMsg(`Embedding ${text.length.toLocaleString()} chars…`);
      return ingest({
        data: {
          documentId,
          name: file.name,
          docType,
          content: text,
          storagePath,
          sizeBytes: file.size,
        },
      });
    },
    onSuccess: () => {
      setUploadMsg("Indexed ✓");
      qc.invalidateQueries({ queryKey: ["kie-docs"] });
      setTimeout(() => setUploadMsg(null), 2500);
    },
    onError: (e) => setUploadMsg(`Failed: ${(e as Error).message}`),
  });

  const askMut = useMutation({
    mutationFn: async (next: DocChatMessage[]) =>
      ask({ data: { messages: next, documentId: activeDoc } }),
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setSources(res.sources);
    },
  });

  const send = (t: string) => {
    const text = t.trim();
    if (!text || askMut.isPending) return;
    const next: DocChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    askMut.mutate(next);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Brain className="h-3 w-3" /> RAG · pgvector · Lovable AI
          </div>
          <h1 className="mt-3 font-display text-4xl">
            Chat with your <span className="text-gradient-emerald italic">documents.</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload brochures, market reports, RERA filings. KIE embeds them and answers grounded in source citations.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
          <Upload className="h-4 w-4" />
          {uploadMut.isPending ? "Processing…" : "Upload document"}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMut.mutate(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </label>
      </header>

      {uploadMsg && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs text-primary">
          {uploadMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Library */}
        <aside className="rounded-2xl border border-border/60 bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-primary" /> Library
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {docs.length} docs
            </span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <button
              onClick={() => setActiveDoc(undefined)}
              className={`w-full rounded-md px-3 py-2 text-left text-xs transition ${
                !activeDoc ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface"
              }`}
            >
              All documents
            </button>
            {docs.map((d) => {
              const active = activeDoc === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDoc(d.id)}
                  className={`mt-1 flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-xs transition ${
                    active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface"
                  }`}
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">{d.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                      {d.status === "processed" ? (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <CheckCircle2 className="h-3 w-3" /> {d.chunk_count} chunks
                        </span>
                      ) : d.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> processing
                        </span>
                      )}
                      {d.confidence > 0 && (
                        <span className="text-muted-foreground">{d.confidence}% conf</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {docs.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No documents yet. Upload your first PDF to begin.
              </div>
            )}
          </div>
        </aside>

        {/* Chat */}
        <div className="flex h-[70vh] flex-col rounded-2xl border border-border/60 bg-card/40">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <p className="mt-3 font-display text-2xl">
                  Ask anything about your documents
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Try: "Summarize the Whitefield market report", "What are the risks in this RERA filing?",
                  "Compare pricing across uploaded brochures."
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60 bg-surface"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {askMut.isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching {docs.length} docs…
                  </div>
                )}
                {sources.length > 0 && !askMut.isPending && (
                  <div className="mt-4 rounded-lg border border-border/60 bg-surface/50 p-3">
                    <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Sources
                    </div>
                    <div className="space-y-2">
                      {sources.map((s) => (
                        <div key={s.n} className="text-xs">
                          <span className="text-primary">[{s.n}]</span>{" "}
                          <span className="text-foreground">{s.documentName}</span>{" "}
                          <span className="text-muted-foreground">
                            · {(s.similarity * 100).toFixed(0)}% match
                          </span>
                          <div className="mt-1 text-muted-foreground">{s.excerpt}…</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border/60 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                docs.length === 0
                  ? "Upload a document first…"
                  : activeDoc
                    ? "Ask about this document…"
                    : "Ask across all documents…"
              }
              disabled={docs.length === 0}
              className="flex-1 rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={askMut.isPending || !input.trim() || docs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}