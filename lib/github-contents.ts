const GH_API = "https://api.github.com";

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RankFlow-Personal/1.0",
  };
}

/**
 * PUT file to repo. URL shape:
 * https://api.github.com/repos/{owner}/{repo}/contents/{path}
 */
export async function putRepoFile(params: {
  owner: string;
  repo: string;
  /** e.g. content/articles/my-slug.mdx */
  path: string;
  token: string;
  branch: string;
  contentUtf8: string;
  message: string;
}): Promise<void> {
  const { owner, repo, path, token, branch, contentUtf8, message } = params;

  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const url = `${GH_API}/repos/${owner}/${repo}/contents/${encodedPath}`;

  const headers = githubHeaders(token);

  const existingRes = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  let sha: string | undefined;
  if (existingRes.ok) {
    const existingJson = (await existingRes.json()) as { sha?: string };
    sha = existingJson.sha;
  } else if (existingRes.status !== 404) {
    const t = await existingRes.text();
    throw new Error(
      `GitHub GET ${path}: ${existingRes.status} ${t.slice(0, 600)}`,
    );
  }

  const putBody: Record<string, unknown> = {
    message,
    content: Buffer.from(contentUtf8, "utf8").toString("base64"),
    branch,
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const t = await putRes.text();
    throw new Error(`GitHub PUT ${path}: ${putRes.status} ${t.slice(0, 800)}`);
  }
}
