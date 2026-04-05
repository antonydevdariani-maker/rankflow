const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "llama-3.3-70b-versatile";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type GroqOptions = {
  /** Ask for JSON object output when the model supports it (idea step). */
  jsonObject?: boolean;
};

export async function groqChat(
  messages: ChatMessage[],
  maxTokens = 4096,
  options: GroqOptions = {},
) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing GROQ_API_KEY in environment (.env.local)");
  }

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.65,
    max_tokens: maxTokens,
  };

  if (options.jsonObject) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq ${res.status}: ${t.slice(0, 800)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from Groq");
  return text;
}
