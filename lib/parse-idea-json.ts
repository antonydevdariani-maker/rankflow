import { slugify } from "@/lib/slug";

export type ArticleIdea = {
  title: string;
  slug: string;
  description: string;
  keywords: string[];
};

/** Pull the first `{ ... }` block from model output (handles prose before/after JSON). */
function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      "Could not find a JSON object in the idea response. First 200 chars: " +
        raw.slice(0, 200).replace(/\s+/g, " "),
    );
  }
  return raw.slice(start, end + 1);
}

export function parseArticleIdea(raw: string): ArticleIdea {
  const stripped = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const jsonStr = extractJsonObject(stripped);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse error";
    throw new Error(`Invalid JSON from idea step: ${msg}. Snippet: ${jsonStr.slice(0, 180)}…`);
  }

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const slugRaw = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
  const description =
    typeof parsed.description === "string" ? parsed.description.trim() : "";
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((k): k is string => typeof k === "string")
    : [];

  if (!title || !description) {
    throw new Error("Idea JSON missing required title or description");
  }

  const slug = slugRaw ? slugify(slugRaw) : slugify(title);
  return { title, slug, description, keywords };
}
