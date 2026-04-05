export type BlogConfig = {
  id: string;
  name: string;
  githubRepo: string;
  articlesPath: string;
  niche: string;
  /** Public site origin (no trailing slash), e.g. http://localhost:3000 or https://your-blog.vercel.app */
  publicSiteOrigin: string;
  /** URL segment for posts, e.g. "blog" → /blog/{slug} */
  publicArticlePathSegment: string;
};

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Full URL to the rendered article on the public site. */
export function getPublishedArticleUrl(blog: BlogConfig, slug: string): string {
  const origin = trimTrailingSlash(blog.publicSiteOrigin);
  const seg = blog.publicArticlePathSegment.replace(/^\/+|\/+$/g, "");
  return `${origin}/${seg}/${encodeURIComponent(slug)}`;
}

/** Add blogs by editing this file — no database. */
export const BLOGS: BlogConfig[] = [
  {
    id: "autorank",
    name: "AutoRank",
    githubRepo: "antonydevdariani-maker/my-seo-blog",
    articlesPath: "content/articles",
    niche: "car modifications and accessories",
    publicSiteOrigin: trimTrailingSlash(
      process.env.NEXT_PUBLIC_VIEW_SITE_URL || "http://localhost:3000",
    ),
    publicArticlePathSegment: "blog",
  },
];

export function getBlogById(id: string): BlogConfig | undefined {
  return BLOGS.find((b) => b.id === id);
}
