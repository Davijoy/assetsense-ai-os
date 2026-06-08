import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ingestSchema = z.object({
  name: z.string().min(1).max(300),
  docType: z.string().min(1).max(80).default("general"),
  project: z.string().max(200).optional(),
  content: z.string().min(20).max(800_000),
  storagePath: z.string().max(500).optional(),
  sizeBytes: z.number().int().nonnegative().default(0),
});

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
  documentId: z.string().uuid().optional(),
});

export type DocChatMessage = z.infer<typeof chatSchema>["messages"][number];

// ---------- helpers ----------

function chunkText(text: string, target = 1100, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= target) return [clean];
  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > target) {
      if (buf) chunks.push(buf.trim());
      if (p.length > target) {
        for (let i = 0; i < p.length; i += target - overlap) {
          chunks.push(p.slice(i, i + target).trim());
        }
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter((c) => c.length > 30);
}

async function embedBatch(apiKey: string, inputs: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: inputs,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding gateway ${res.status}: ${t}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

// ---------- ingest ----------

export const ingestKieDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ingestSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) create doc row in processing state
    const { data: docRow, error: docErr } = await supabaseAdmin
      .from("kie_documents")
      .insert({
        name: data.name,
        doc_type: data.docType,
        project: data.project ?? null,
        status: "processing",
        storage_path: data.storagePath ?? null,
        size_bytes: data.sizeBytes,
      })
      .select("id")
      .single();
    if (docErr || !docRow) throw new Error(docErr?.message ?? "insert failed");
    const docId = docRow.id;

    try {
      // 2) chunk + embed
      const chunks = chunkText(data.content);
      if (chunks.length === 0) throw new Error("No usable content");

      const allEmbeddings: number[][] = [];
      const BATCH = 32;
      for (let i = 0; i < chunks.length; i += BATCH) {
        const slice = chunks.slice(i, i + BATCH);
        const embeds = await embedBatch(apiKey, slice);
        allEmbeddings.push(...embeds);
      }

      // 3) insert chunks. pgvector accepts a stringified array like "[0.1,0.2,...]"
      const rows = chunks.map((content, idx) => ({
        document_id: docId,
        chunk_index: idx,
        content,
        embedding: `[${allEmbeddings[idx].join(",")}]`,
        token_count: Math.round(content.length / 4),
      }));
      const chunkInsert = await supabaseAdmin.from("kie_doc_chunks").insert(rows);
      if (chunkInsert.error) throw new Error(chunkInsert.error.message);

      // 4) summarize + extract via chat model
      const sample = chunks.slice(0, 4).join("\n\n").slice(0, 8000);
      const sumRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are Sentinel KIE document analyzer. Return ONLY compact JSON: {\"summary\": string (max 280 chars), \"entities\": string[] (max 10 named entities: projects, cities, developers, prices), \"insights\": string[] (max 4 sharp insights), \"confidence\": number (0-100)}",
            },
            { role: "user", content: `Document: ${data.name}\n\n${sample}` },
          ],
        }),
      });
      let summary = "";
      let entities: string[] = [];
      let insights: string[] = [];
      let confidence = 80;
      if (sumRes.ok) {
        const j = (await sumRes.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = j.choices?.[0]?.message?.content ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            summary = String(parsed.summary ?? "").slice(0, 400);
            entities = Array.isArray(parsed.entities)
              ? parsed.entities.slice(0, 10).map(String)
              : [];
            insights = Array.isArray(parsed.insights)
              ? parsed.insights.slice(0, 4).map(String)
              : [];
            confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 80));
          } catch {
            summary = raw.slice(0, 280);
          }
        } else {
          summary = raw.slice(0, 280);
        }
      }

      await supabaseAdmin
        .from("kie_documents")
        .update({
          status: "processed",
          chunk_count: chunks.length,
          summary,
          entities,
          insights,
          confidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", docId);

      return { id: docId, chunks: chunks.length, summary, entities, insights, confidence };
    } catch (err) {
      await supabaseAdmin
        .from("kie_documents")
        .update({ status: "failed", summary: (err as Error).message.slice(0, 280) })
        .eq("id", docId);
      throw err;
    }
  });

// ---------- chat ----------

export const chatWithKieDocs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return { reply: "(no question)", sources: [] };

    const [queryEmbedding] = await embedBatch(apiKey, [lastUser.content]);
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;

    const { data: matches, error } = await supabaseAdmin.rpc("match_kie_chunks", {
      query_embedding: vectorLiteral as unknown as string,
      match_count: 6,
    });
    if (error) throw new Error(error.message);

    const ctxBlocks = (matches ?? [])
      .filter((m) => data.documentId ? m.document_id === data.documentId : true)
      .map(
        (m, i) =>
          `[Source ${i + 1} · ${m.document_name} · similarity ${(m.similarity * 100).toFixed(0)}%]\n${m.content}`,
      )
      .join("\n\n---\n\n");

    const system = `You are Sentinel KIE Document Copilot. Answer ONLY from the provided sources.
If the answer is not in the sources, say so clearly. Always cite as [Source N].
Format: Headline → 2-4 bullet insights with hard numbers → Recommendation (bold).

SOURCES:
${ctxBlocks || "(no matching context found)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return { reply: "Rate limit — try again shortly.", sources: [] };
      if (res.status === 402)
        return { reply: "AI credits exhausted. Add credits in workspace settings.", sources: [] };
      throw new Error(`AI gateway ${res.status}: ${t}`);
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = j.choices?.[0]?.message?.content ?? "(no response)";
    return {
      reply,
      sources: (matches ?? []).map((m, i) => ({
        n: i + 1,
        documentId: m.document_id,
        documentName: m.document_name,
        similarity: m.similarity,
        excerpt: m.content.slice(0, 240),
      })),
    };
  });

// ---------- list ----------

export const listKieDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("kie_documents")
    .select(
      "id,name,doc_type,project,status,size_bytes,chunk_count,summary,entities,insights,confidence,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
});