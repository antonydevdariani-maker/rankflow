export type BlogConfig = {
  id: string;
  name: string;
  githubRepo: string;
  articlesPath: string;
  niche: string;
};

/** Add blogs by editing this file — no database. */
export const BLOGS: BlogConfig[] = [
  {
    id: "autorank",
    name: "AutoRank",
    githubRepo: "antonydevdariani-maker/my-seo-blog",
    articlesPath: "content/articles",
    niche: "car modifications and accessories",
  },
];

export function getBlogById(id: string): BlogConfig | undefined {
  return BLOGS.find((b) => b.id === id);
}
