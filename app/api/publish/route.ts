import { NextResponse } from "next/server";
import { getBlogById } from "@/lib/blogs";
import { groqChat } from "@/lib/groq";
import { parseArticleIdea } from "@/lib/parse-idea-json";
import { putRepoFile } from "@/lib/github-contents";

export const runtime = "nodejs";

export const maxDuration = 300;

const BRANCH = process.env.GITHUB_BRANCH?.trim() || "main";

function toMdxFrontmatter(
  idea: {
    title: string;
    slug: string;
    description: string;
    keywords: string[];
    tags: string[];
  },
  dateIso: string,
  bodyMd: string,
): string {
  const kw = JSON.stringify(idea.keywords);
  const tags = JSON.stringify(idea.tags);
  return `---
title: "${idea.title.replace(/"/g, '\\"')}"
description: "${idea.description.replace(/"/g, '\\"')}"
date: "${dateIso}"
slug: "${idea.slug}"
keywords: ${kw}
tags: ${tags}
---

${bodyMd}`;
}

export async function POST(req: Request) {
  try {
    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Missing GITHUB_TOKEN in .env.local" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as { blogId?: string; topic?: string };
    const blogId = body.blogId?.trim();
    const customTopic = body.topic?.trim() || "";

    if (!blogId) {
      return NextResponse.json({ error: "blogId required" }, { status: 400 });
    }

    const blog = getBlogById(blogId);
    if (!blog) {
      return NextResponse.json({ error: "Unknown blog id" }, { status: 404 });
    }

    const [owner, repo] = blog.githubRepo.split("/");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid githubRepo in lib/blogs.ts" },
        { status: 500 },
      );
    }

    // Use custom topic if provided, otherwise fall back to the blog's niche
    const nichePrompt = customTopic
      ? `Niche: ${blog.niche}\nSpecific topic focus: ${customTopic}`
      : `Niche: ${blog.niche}`;

    // 1) Idea as JSON (json_object mode when supported; parser still tolerates extra text)
    let ideaRaw: string;
    try {
      ideaRaw = await groqChat(
        [
          {
            role: "system",
            content:
              "You are an SEO strategist. Respond with a single JSON object only (valid JSON). Keys: title, slug, description, keywords, tags.",
          },
          {
            role: "user",
            content: `${nichePrompt}

Return JSON with exactly these keys:
- title: string
- slug: string (url-friendly)
- description: string (under 160 chars)
- keywords: string array (3-6 items, for SEO/meta)
- tags: string array (3-5 items, lowercase kebab-case topics for site tag pages, e.g. cold-air-intake, performance)`,
          },
        ],
        1024,
        { jsonObject: true },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("response_format") || msg.includes("json_object")) {
        ideaRaw = await groqChat(
          [
            {
              role: "system",
              content:
                "You are an SEO strategist. Reply with JSON only, no markdown fences or extra text.",
            },
            {
              role: "user",
              content: `${nichePrompt}

Return a single JSON object only:
{"title":"...","slug":"...","description":"...","keywords":["..."],"tags":["..."]}`,
            },
          ],
          1024,
        );
      } else {
        throw e;
      }
    }

    const idea = parseArticleIdea(ideaRaw);

    // 2) Full article markdown (~1500 words)
    const articleMd = await groqChat(
      [
        {
          role: "system",
          content:
            "You are an expert SEO writer. Output GitHub-flavored Markdown only. No YAML frontmatter. Use ## and ### headings. Target roughly 1500 words. Conversational, helpful tone.",
        },
        {
          role: "user",
          content: `Write the full article body only (Markdown).

Title: ${idea.title}
Meta description: ${idea.description}
Keywords: ${idea.keywords.join(", ")}
Tags: ${idea.tags.join(", ")}
${nichePrompt}

Requirements:
- About 1500 words
- Intro and conclusion
- Actionable H2/H3 sections`,
        },
      ],
      8192,
    );

    const today = new Date().toISOString().slice(0, 10);
    const mdx = toMdxFrontmatter(idea, today, articleMd);
    const base = blog.articlesPath.replace(/^\/+|\/+$/g, "");
    const filePath = `${base}/${idea.slug}.mdx`;

    await putRepoFile({
      owner,
      repo,
      path: filePath,
      token,
      branch: BRANCH,
      contentUtf8: mdx,
      message: `chore(rankflow): publish ${idea.title}`,
    });

    return NextResponse.json({
      ok: true,
      title: idea.title,
      slug: idea.slug,
      tags: idea.tags,
      path: filePath,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: message.slice(0, 2000) },
      { status: 500 },
    );
  }
}
