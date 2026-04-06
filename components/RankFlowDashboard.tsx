"use client";

import { useState, useEffect, useRef } from "react";
import { BLOGS } from "@/lib/blogs";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublishState =
  | { kind: "idle" }
  | { kind: "loading"; step: string }
  | { kind: "ok"; title: string; slug: string }
  | { kind: "err"; message: string };

type ChatMsg = { role: "user" | "assistant"; content: string };

type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 300) };
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-indigo-400"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

// ─── Article Feed ─────────────────────────────────────────────────────────────

function ArticleFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((data: { articles?: Article[]; error?: string }) => {
        if (data.articles) setArticles(data.articles);
        else setError(data.error ?? "Failed to load articles");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">Live Article Feed</span>
        </div>
        <span className="text-xs text-zinc-700 font-mono">my-seo-blog</span>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-10 text-zinc-600">
            <Spinner size={18} />
            <span className="text-sm">Fetching from GitHub…</span>
          </div>
        )}

        {!loading && error && (
          <div className="px-5 py-6 text-sm text-red-400/80">{error}</div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="px-5 py-8 text-sm text-zinc-600 text-center">
            No articles yet — publish your first one above.
          </div>
        )}

        {articles.map((a) => (
          <div
            key={a.slug}
            className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200 truncate">{a.title}</p>
              {a.description && (
                <p className="text-xs text-zinc-600 mt-0.5 truncate">{a.description}</p>
              )}
            </div>
            <time className="text-xs text-zinc-600 shrink-0 pt-0.5">
              {formatDate(a.date)}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Publish Card ─────────────────────────────────────────────────────────────

function PublishCard({ blogId }: { blogId: string }) {
  const blog = BLOGS.find((b) => b.id === blogId);
  const [state, setState] = useState<PublishState>({ kind: "idle" });
  const [topic, setTopic] = useState("");

  if (!blog) return null;

  async function handlePublish() {
    if (state.kind === "loading") return;
    setState({ kind: "loading", step: "Generating article idea…" });

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: blog!.id, topic: topic.trim() }),
      });

      const data = await parseJson(res);
      const err = typeof data.error === "string" ? data.error : undefined;
      const title = typeof data.title === "string" ? data.title : undefined;
      const slug = typeof data.slug === "string" ? data.slug : undefined;

      if (!res.ok || !data.ok || !title || !slug) {
        setState({
          kind: "err",
          message: err ?? `Request failed (HTTP ${res.status})`,
        });
        return;
      }

      setState({ kind: "ok", title, slug });
    } catch {
      setState({ kind: "err", message: "Network error — check your connection." });
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
      {/* Blog header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">{blog.name}</h3>
          </div>
          <p className="text-xs text-zinc-500 font-mono">{blog.githubRepo}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{blog.niche}</p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {/* Topic input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Custom Topic{" "}
          <span className="text-zinc-700 normal-case font-normal">
            (optional — leave blank for AI to choose)
          </span>
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. best cold air intakes for turbocharged engines"
          disabled={state.kind === "loading"}
          className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition disabled:opacity-50"
        />
      </div>

      {/* Publish button */}
      <button
        type="button"
        disabled={state.kind === "loading"}
        onClick={() => void handlePublish()}
        className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-5 py-3 text-sm transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
      >
        {state.kind === "loading" ? (
          <>
            <Spinner size={15} />
            <span className="text-indigo-200">
              {(state as { kind: "loading"; step: string }).step}
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Generate & Publish
          </>
        )}
      </button>

      {/* Status messages */}
      {state.kind === "ok" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-3 h-3 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Published: {state.title}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Live on AutoRank in ~60 seconds
            </p>
          </div>
        </div>
      )}

      {state.kind === "err" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-3 h-3 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">Publish failed</p>
            <p className="text-xs text-red-500/80 mt-0.5 whitespace-pre-wrap break-words">
              {state.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SEO Chat ─────────────────────────────────────────────────────────────────

function SEOChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    setInput("");
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });
      const data = await parseJson(res);
      const reply = typeof data.reply === "string" ? data.reply : undefined;
      const err = typeof data.error === "string" ? data.error : undefined;

      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply ?? err ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Give me 5 article ideas for car mods",
    "What long-tail keywords should I target?",
    "How do I improve my article CTR?",
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.07]">
        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div>
          <span className="text-sm font-semibold text-white">SEO Strategy Chat</span>
          <p className="text-[10px] text-zinc-700">
            Groq · llama-3.3-70b-versatile
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto max-h-[380px] p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-600 mb-4">
              Ask me anything about content strategy and SEO.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.07] text-zinc-500 hover:text-zinc-300 hover:border-indigo-500/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5 ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white/10 text-zinc-400"
                }`}
              >
                {m.role === "user" ? "U" : "AI"}
              </div>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm max-w-[82%] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-600/20 text-zinc-200 rounded-tr-sm"
                    : "bg-white/[0.04] text-zinc-300 rounded-tl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-zinc-400 mt-0.5">
              AI
            </div>
            <div className="bg-white/[0.04] rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 p-3 border-t border-white/[0.07]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about keywords, content strategy, article ideas…"
          disabled={loading}
          className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
        >
          {loading ? (
            <Spinner size={14} />
          ) : (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function RankFlowDashboard() {
  return (
    <div
      className="min-h-screen bg-[#080810]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(99,102,241,0.10), transparent)",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Rank<span className="text-indigo-400">Flow</span>
            </h1>
          </div>
          <p className="text-sm text-zinc-600 ml-12">
            Personal publishing dashboard · AI-powered SEO pipeline
          </p>
        </header>

        {/* Sections */}
        <div className="space-y-8">
          {/* Blogs */}
          <section>
            <SectionLabel>Blogs</SectionLabel>
            <div className="space-y-4">
              {BLOGS.map((blog) => (
                <PublishCard key={blog.id} blogId={blog.id} />
              ))}
            </div>
          </section>

          {/* Feed */}
          <section>
            <SectionLabel>Recently Published</SectionLabel>
            <ArticleFeed />
          </section>

          {/* Chat */}
          <section>
            <SectionLabel>SEO Chat</SectionLabel>
            <SEOChat />
          </section>
        </div>

        <footer className="mt-16 text-center text-xs text-zinc-800">
          RankFlow · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
        {children}
      </span>
      <div className="h-px flex-1 bg-white/[0.05]" />
    </div>
  );
}
