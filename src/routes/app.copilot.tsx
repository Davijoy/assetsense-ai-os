import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { askCopilot, type CopilotMessage } from "@/lib/copilot.functions";
import { Send, Sparkles, Brain, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — Assetsense KIE" }] }),
  component: Copilot,
});

const SUGGESTIONS = [
  "Why are bookings down this month?",
  "Which city should we double down on?",
  "Forecast revenue for next quarter.",
  "Which lead source has the best ROI?",
  "What inventory is at risk?",
];

function Copilot() {
  const ask = useServerFn(askCopilot);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async (next: CopilotMessage[]) => {
      const res = await ask({ data: { messages: next } });
      return res.reply;
    },
    onSuccess: (reply) => {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
  });

  const send = (text: string) => {
    const t = text.trim();
    if (!t || mutation.isPending) return;
    const next: CopilotMessage[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Brain className="h-3 w-3" /> KIE Copilot · Live
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Ask anything. Decide <span className="text-gradient-emerald italic">faster.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Grounded in your live CRM, marketplace and AI voice data.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-2xl">What do you want to know?</p>
            <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border/60 bg-surface px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface border border-border/60"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot about leads, revenue, inventory…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </form>
    </div>
  );
}