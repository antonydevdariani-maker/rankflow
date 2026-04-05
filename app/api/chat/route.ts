import { NextResponse } from "next/server";
import { groqChat, GROQ_MODEL } from "@/lib/groq";

export const runtime = "nodejs";

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: ChatTurn[];
    };

    const latest = body.message?.trim();
    if (!latest) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const history = Array.isArray(body.history) ? body.history : [];
    const trimmedHistory = history
      .filter(
        (h): h is ChatTurn =>
          (h.role === "user" || h.role === "assistant") &&
          typeof h.content === "string",
      )
      .slice(-20)
      .map((h) => ({ role: h.role, content: h.content.slice(0, 8000) }));

    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      {
        role: "system",
        content: `You are an SEO and content strategy expert helping a solo publisher. Be concise, practical, and specific. Model: ${GROQ_MODEL}.`,
      },
      ...trimmedHistory.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: latest },
    ];

    const reply = await groqChat(messages, 2048);
    return NextResponse.json({ reply });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
