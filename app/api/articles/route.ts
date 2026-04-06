import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GH_API = "https://api.github.com";
const OWNER = "antonydevdariani-maker";
const REPO = "my-seo-blog";
const ARTICLES_PATH = "content/articles";

type GHFileEntry = {
  name: string;
  path: string;
  type: string;
  sha: string;
};

type GHFileContent = {
  content: string;
  encoding: string;
};

function parseFrontmatter(raw: string): Record<string, string | string[]> {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const result: Record<string, string | string[]> = {};

  for (const line of block.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    // Array value like: keywords: ["a", "b"]
    if (val.startsWith("[")) {
      try {
        result[key] = JSON.parse(val) as string[];
      } catch {
        result[key] = val;
      }
    } else {
      result[key] = val.replace(/^["']|["']$/g, "");
    }
  }

  return result;
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RankFlow/1.0",
  };
}

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: "Missing GITHUB_TOKEN" }, { status: 500 });
    }

    const headers = githubHeaders(token);

    // List all .mdx files in the articles directory
    const listRes = await fetch(
      `${GH_API}/repos/${OWNER}/${REPO}/contents/${ARTICLES_PATH}`,
      { headers, cache: "no-store" }
    );

    if (!listRes.ok) {
      const t = await listRes.text();
      return NextResponse.json(
        { error: `GitHub list failed: ${listRes.status} ${t.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const files = (await listRes.json()) as GHFileEntry[];
    const mdxFiles = files
      .filter((f) => f.type === "file" && f.name.endsWith(".mdx"))
      .slice(-8) // take up to 8 most recently listed
      .reverse();

    // Fetch content of each file to extract frontmatter
    const articles = await Promise.all(
      mdxFiles.map(async (file) => {
        try {
          const res = await fetch(
            `${GH_API}/repos/${OWNER}/${REPO}/contents/${file.path}`,
            { headers, cache: "no-store" }
          );
          if (!res.ok) return null;
          const data = (await res.json()) as GHFileContent;
          const decoded = Buffer.from(data.content, "base64").toString("utf-8");
          const fm = parseFrontmatter(decoded);

          return {
            slug: (fm.slug as string) || file.name.replace(/\.mdx$/, ""),
            title: (fm.title as string) || file.name.replace(/\.mdx$/, ""),
            description: (fm.description as string) || "",
            date: (fm.date as string) || "",
            keywords: (fm.keywords as string[]) || [],
          };
        } catch {
          return null;
        }
      })
    );

    const sorted = articles
      .filter(Boolean)
      .sort((a, b) => {
        if (!a!.date || !b!.date) return 0;
        return new Date(b!.date).getTime() - new Date(a!.date).getTime();
      });

    return NextResponse.json({ articles: sorted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
