"use client";

import { useState } from "react";
import { BLOGS } from "@/lib/blogs";

type PublishState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; title: string; slug: string }
  | { kind: "err"; message: string };

type ChatMsg = { role: "user" | "assistant"; content: string };

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 300) };
  }
}

export default function RankFlowDashboard() {
  const [publishById, setPublishById] = useState<Record<string, PublishState>>(
    () =>
      Object.fromEntries(BLOGS.map((b) => [b.id, { kind: "idle" as const }])),
  );

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  async function handlePublish(blogId: string) {
    setPublishById((s) => ({ ...s, [blogId]: { kind: "loading" } }));
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId }),
      });
      const data = await parseJson(res);
      const err = typeof data.error === "string" ? data.error : undefined;
      const title = typeof data.title === "string" ? data.title : undefined;
      const slug = typeof data.slug === "string" ? data.slug : undefined;
      const okFlag = data.ok === true;

      if (!res.ok) {
        setPublishById((s) => ({
          ...s,
          [blogId]: {
            kind: "err",
            message: err ?? `Request failed (HTTP ${res.status})`,
          },
        }));
        return;
      }

      if (!okFlag || !title || !slug) {
        setPublishById((s) => ({
          ...s,
          [blogId]: {
            kind: "err",
            message:
              err ??
              "Publish finished but response was missing ok/title/slug. Check server logs.",
          },
        }));
        return;
      }

      setPublishById((s) => ({
        ...s,
        [blogId]: { kind: "ok", title, slug },
      }));
    } catch {
      setPublishById((s) => ({
        ...s,
        [blogId]: { kind: "err", message: "Network error" },
      }));
    }
  }

  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    setChatInput("");
    setChatMessages((m) => [...m, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatMessages,
        }),
      });
      const data = await parseJson(res);
      const reply =
        typeof data.reply === "string" ? data.reply : undefined;
      const err = typeof data.error === "string" ? data.error : undefined;

      if (!res.ok || !reply) {
        setChatMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: err ?? "Something went wrong.",
          },
        ]);
        return;
      }

      setChatMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-grid-fade">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-white/[0.08] pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            RankFlow
          </h1>
          <p className="mt-2 text-sm text-rf-muted sm:text-base">
            My Personal Publishing Dashboard
          </p>
        </header>

        <section className="mt-10 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Blogs
          </h2>
          <ul className="grid gap-5 sm:grid-cols-1">
            {BLOGS.map((blog) => {
              const st = publishById[blog.id] ?? { kind: "idle" as const };
              return (
                <li
                  key={blog.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-glass backdrop-blur-xl transition hover:border-rf-accent/25 hover:shadow-glow"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {blog.name}
                      </h3>
                      <p className="mt-1 text-sm text-rf-muted">{blog.niche}</p>
                      <p className="mt-2 font-mono text-xs text-zinc-600">
                        {blog.githubRepo} · {blog.articlesPath}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={st.kind === "loading"}
                      onClick={() => void handlePublish(blog.id)}
                      className="shrink-0 rounded-xl bg-rf-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {st.kind === "loading"
                        ? "Generating..."
                        : "Generate & Publish"}
                    </button>
                  </div>
                  {st.kind === "ok" ? (
                    <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-sm">
                      <p className="font-semibold text-emerald-400">{st.title}</p>
                      <p className="text-zinc-300">
                        <span className="text-zinc-500">Slug: </span>
                        <span className="font-mono text-zinc-200">{st.slug}</span>
                      </p>
                      <p className="text-zinc-400">
                        Article published to AutoRank blog. It will be live on
                        Vercel in ~60 seconds.
                      </p>
                    </div>
                  ) : null}
                  {st.kind === "err" ? (
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm text-red-400">
                      {st.message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-16 border-t border-white/[0.08] pt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            SEO chat
          </h2>
          <p className="mt-2 text-sm text-rf-muted">
            Ask for angles, outlines, or keyword ideas. History clears on refresh.
          </p>

          <div className="mt-6 flex max-h-[420px] flex-col rounded-2xl border border-white/[0.08] bg-black/30">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-zinc-600">
                  Start a conversation…
                </p>
              ) : (
                chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-6 rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-zinc-200"
                        : "mr-6 rounded-lg border border-rf-accent/20 bg-rf-accent/10 p-3 text-sm text-zinc-200"
                    }
                  >
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {m.role === "user" ? "You" : "RankFlow"}
                    </span>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={handleChatSend}
              className="flex flex-col gap-2 border-t border-white/[0.08] p-3 sm:flex-row"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="e.g. Give me 5 article ideas for winter car prep…"
                className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-black/50 px-4 text-sm text-white outline-none ring-rf-accent/30 focus:ring-2"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-rf-bg transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {chatLoading ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
