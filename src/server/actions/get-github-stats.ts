import { unstable_cache } from "next/cache";

interface GitHubRepoData {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  description: string;
  language: string;
  updated_at: string;
}

const OWNER = "slugylink";
const REPO = "slugy";
const CACHE_KEY_STATS = ["github-stats"];
const CACHE_KEY_STARS = ["github-stars"];
const REVALIDATE_SECONDS = 10800; // 3 hours

export const getGitHubStats = unstable_cache(
  async (): Promise<GitHubRepoData | null> => {
    try {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "slugy-app",
        },
        next: { revalidate: REVALIDATE_SECONDS },
      });

      if (!res.ok) {
        console.error(`GitHub API error: ${res.status} ${res.statusText}`);
        return null;
      }

      const data: GitHubRepoData = await res.json();
      return data;
    } catch (error) {
      console.error("Error fetching GitHub stats:", error);
      return null;
    }
  },
  CACHE_KEY_STATS,
  {
    revalidate: REVALIDATE_SECONDS,
    tags: CACHE_KEY_STATS,
  },
);

export const getGitHubStars = unstable_cache(
  async (): Promise<number> => {
    const stats = await getGitHubStats();
    return stats?.stargazers_count ?? 0;
  },
  CACHE_KEY_STARS,
  {
    revalidate: REVALIDATE_SECONDS,
    // It's good to keep tags aligned for proper cache invalidation
    tags: CACHE_KEY_STATS,
  },
);
