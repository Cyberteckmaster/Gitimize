import { Octokit } from "octokit";
import * as cheerio from "cheerio";
import { z } from "zod";

export const RepoFactsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  stars: z.number(),
  forks: z.number(),
  watchers: z.number(),
  language: z.string().nullable(),
  languages: z.record(z.number()),
  topics: z.array(z.string()),
  license: z.string().nullable(),
  homepage: z.string().nullable(),
  defaultBranch: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pushedAt: z.string(),
  size: z.number(),
  openIssues: z.number(),
  openPRs: z.number(),
  releases: z.array(z.object({
    tagName: z.string(),
    name: z.string(),
    body: z.string().nullable(),
    publishedAt: z.string(),
    prerelease: z.boolean(),
    draft: z.boolean(),
  })).max(10),
  contributors: z.array(z.object({
    login: z.string(),
    contributions: z.number(),
    avatarUrl: z.string(),
  })).max(20),
  readme: z.string().nullable(),
  readmePath: z.string().nullable(),
  packageJson: z.any().nullable(),
  tsconfig: z.any().nullable(),
  dockerfile: z.string().nullable(),
  githubActions: z.array(z.object({
    name: z.string(),
    path: z.string(),
    content: z.string(),
  })),
  dependabot: z.any().nullable(),
  codeowners: z.string().nullable(),
  contributing: z.string().nullable(),
  changelog: z.string().nullable(),
  securityPolicy: z.string().nullable(),
  issueTemplates: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })),
  prTemplate: z.string().nullable(),
  envExample: z.string().nullable(),
  gitignore: z.string().nullable(),
  prettierrc: z.any().nullable(),
  eslintConfig: z.any().nullable(),
  husky: z.any().nullable(),
  commitlint: z.any().nullable(),
  renovate: z.any().nullable(),
  dependabotConfig: z.any().nullable(),
  githubWorkflowPermissions: z.string().nullable(),
  branchProtection: z.any().nullable(),
  repoRules: z.any().nullable(),
  discussions: z.boolean(),
  wiki: z.boolean(),
  projects: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.string(),
  fork: z.boolean(),
  mirrorUrl: z.string().nullable(),
  source: z.enum(["live", "snapshot"]),
  fetchedAt: z.string(),
});

export type RepoFacts = z.infer<typeof RepoFactsSchema>;

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: { timeout: 15000 },
});

const RETRY_DELAYS = [1000, 2000, 4000, 8000];
const MAX_RETRIES = RETRY_DELAYS.length;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === MAX_RETRIES) break;
      
      const isRetryable = error instanceof Error && (
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("429") ||
        error.message.includes("502") ||
        error.message.includes("503") ||
        error.message.includes("504")
      );
      
      if (!isRetryable) throw error;
      
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
  
  throw lastError!;
}

export async function ingestRepo(repoUrl: string): Promise<RepoFacts> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");
  
  return fetchWithRetry(async () => {
    const repoData = await octokit.rest.repos.get({ owner, repo: cleanRepo });
    const repoInfo = repoData.data;
    
    const [
      languages,
      contributors,
      releases,
      readme,
      contents,
      workflows,
      branchProtection,
      rulesets,
      discussions,
    ] = await Promise.allSettled([
      octokit.rest.repos.listLanguages({ owner, repo: cleanRepo }),
      octokit.rest.repos.listContributors({ owner, repo: cleanRepo, per_page: 20 }),
      octokit.rest.repos.listReleases({ owner, repo: cleanRepo, per_page: 10 }),
      octokit.rest.repos.getReadme({ owner, repo: cleanRepo }),
      octokit.rest.repos.getContent({ owner, repo: cleanRepo, path: "" }),
      octokit.rest.actions.listRepoWorkflows({ owner, repo: cleanRepo }),
      octokit.rest.repos.getBranchProtection({ owner, repo: cleanRepo, branch: repoInfo.default_branch }),
      octokit.rest.repos.listRulesets({ owner, repo: cleanRepo }),
      octokit.rest.repos.get({ owner, repo: cleanRepo }).then(r => r.data.has_discussions),
    ]);
    
    const files = contents.status === "fulfilled" ? contents.value.data : [];
    const fileMap = new Map(files.map(f => [f.name.toLowerCase(), f]));
    
    const [
      packageJson,
      tsconfig,
      dockerfile,
      githubActions,
      dependabot,
      codeowners,
      contributing,
      changelog,
      securityPolicy,
      issueTemplates,
      prTemplate,
      envExample,
      gitignore,
      prettierrc,
      eslintConfig,
      husky,
      commitlint,
      renovate,
      dependabotConfig,
    ] = await Promise.allSettled([
      fetchFileContent(owner, cleanRepo, "package.json"),
      fetchFileContent(owner, cleanRepo, "tsconfig.json"),
      fetchFileContent(owner, cleanRepo, "Dockerfile"),
      fetchWorkflowFiles(owner, cleanRepo),
      fetchFileContent(owner, cleanRepo, ".github/dependabot.yml").catch(() => fetchFileContent(owner, cleanRepo, ".github/dependabot.yaml")),
      fetchFileContent(owner, cleanRepo, ".github/CODEOWNERS").catch(() => fetchFileContent(owner, cleanRepo, "CODEOWNERS")),
      fetchFileContent(owner, cleanRepo, "CONTRIBUTING.md").catch(() => fetchFileContent(owner, cleanRepo, ".github/CONTRIBUTING.md")),
      fetchFileContent(owner, cleanRepo, "CHANGELOG.md").catch(() => fetchFileContent(owner, cleanRepo, "CHANGELOG.rst")).catch(() => fetchFileContent(owner, cleanRepo, "HISTORY.md")),
      fetchFileContent(owner, cleanRepo, "SECURITY.md").catch(() => fetchFileContent(owner, cleanRepo, ".github/SECURITY.md")),
      fetchIssueTemplates(owner, cleanRepo),
      fetchFileContent(owner, cleanRepo, ".github/PULL_REQUEST_TEMPLATE.md").catch(() => fetchFileContent(owner, cleanRepo, "PULL_REQUEST_TEMPLATE.md")),
      fetchFileContent(owner, cleanRepo, ".env.example").catch(() => fetchFileContent(owner, cleanRepo, ".env.sample")),
      fetchFileContent(owner, cleanRepo, ".gitignore"),
      fetchFileContent(owner, cleanRepo, ".prettierrc").catch(() => fetchFileContent(owner, cleanRepo, ".prettierrc.json")).catch(() => fetchFileContent(owner, cleanRepo, "prettier.config.js")),
      fetchFileContent(owner, cleanRepo, ".eslintrc.json").catch(() => fetchFileContent(owner, cleanRepo, ".eslintrc.js")).catch(() => fetchFileContent(owner, cleanRepo, "eslint.config.js")),
      fetchFileContent(owner, cleanRepo, ".husky/pre-commit").catch(() => fetchFileContent(owner, cleanRepo, "package.json").then(p => JSON.parse(p).husky)),
      fetchFileContent(owner, cleanRepo, ".github/commitlint.config.js").catch(() => fetchFileContent(owner, cleanRepo, "commitlint.config.js")),
      fetchFileContent(owner, cleanRepo, "renovate.json").catch(() => fetchFileContent(owner, cleanRepo, ".github/renovate.json")),
      fetchFileContent(owner, cleanRepo, ".github/dependabot.yml").catch(() => fetchFileContent(owner, cleanRepo, ".github/dependabot.yaml")),
    ]);
    
    const readmeContent = readme.status === "fulfilled" 
      ? Buffer.from(readme.value.data.content, "base64").toString("utf-8")
      : null;
    
    const readmePath = readme.status === "fulfilled" ? readme.value.data.path : null;
    
    const workflowFiles = workflows.status === "fulfilled" 
      ? workflows.value.data.workflows.map(w => ({ name: w.name, path: w.path, content: "" }))
      : [];
    
    const bp = branchProtection.status === "fulfilled" ? branchProtection.value.data : null;
    const rs = rulesets.status === "fulfilled" ? rulesets.value.data : [];
    
    return {
      owner,
      repo: cleanRepo,
      fullName: repoInfo.full_name,
      description: repoInfo.description,
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      watchers: repoInfo.watchers_count,
      language: repoInfo.language,
      languages: languages.status === "fulfilled" ? languages.value.data : {},
      topics: repoInfo.topics || [],
      license: repoInfo.license?.spdx_id || null,
      homepage: repoInfo.homepage,
      defaultBranch: repoInfo.default_branch,
      createdAt: repoInfo.created_at,
      updatedAt: repoInfo.updated_at,
      pushedAt: repoInfo.pushed_at,
      size: repoInfo.size,
      openIssues: repoInfo.open_issues_count,
      openPRs: 0,
      releases: releases.status === "fulfilled" ? releases.value.data.map(r => ({
        tagName: r.tag_name,
        name: r.name || r.tag_name,
        body: r.body,
        publishedAt: r.published_at,
        prerelease: r.prerelease,
        draft: r.draft,
      })) : [],
      contributors: contributors.status === "fulfilled" ? contributors.value.data.map(c => ({
        login: c.login,
        contributions: c.contributions,
        avatarUrl: c.avatar_url,
      })) : [],
      readme: readmeContent,
      readmePath,
      packageJson: packageJson.status === "fulfilled" ? JSON.parse(packageJson.value) : null,
      tsconfig: tsconfig.status === "fulfilled" ? JSON.parse(tsconfig.value) : null,
      dockerfile: dockerfile.status === "fulfilled" ? dockerfile.value : null,
      githubActions: workflowFiles,
      dependabot: dependabot.status === "fulfilled" ? dependabot.value : null,
      codeowners: codeowners.status === "fulfilled" ? codeowners.value : null,
      contributing: contributing.status === "fulfilled" ? contributing.value : null,
      changelog: changelog.status === "fulfilled" ? changelog.value : null,
      securityPolicy: securityPolicy.status === "fulfilled" ? securityPolicy.value : null,
      issueTemplates: issueTemplates.status === "fulfilled" ? issueTemplates.value : [],
      prTemplate: prTemplate.status === "fulfilled" ? prTemplate.value : null,
      envExample: envExample.status === "fulfilled" ? envExample.value : null,
      gitignore: gitignore.status === "fulfilled" ? gitignore.value : null,
      prettierrc: prettierrc.status === "fulfilled" ? (prettierrc.value.startsWith("{") ? JSON.parse(prettierrc.value) : prettierrc.value) : null,
      eslintConfig: eslintConfig.status === "fulfilled" ? (eslintConfig.value.startsWith("{") ? JSON.parse(eslintConfig.value) : eslintConfig.value) : null,
      husky: husky.status === "fulfilled" ? husky.value : null,
      commitlint: commitlint.status === "fulfilled" ? commitlint.value : null,
      renovate: renovate.status === "fulfilled" ? (renovate.value.startsWith("{") ? JSON.parse(renovate.value) : renovate.value) : null,
      dependabotConfig: dependabotConfig.status === "fulfilled" ? dependabotConfig.value : null,
      githubWorkflowPermissions: null,
      branchProtection: bp,
      repoRules: rs,
      discussions: discussions.status === "fulfilled" ? discussions.value : false,
      wiki: repoInfo.has_wiki,
      projects: repoInfo.has_projects,
      archived: repoInfo.archived,
      disabled: repoInfo.disabled,
      visibility: repoInfo.visibility,
      fork: repoInfo.fork,
      mirrorUrl: repoInfo.mirror_url,
      source: "live",
      fetchedAt: new Date().toISOString(),
    };
  }, `ingest:${owner}/${cleanRepo}`);
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  const res = await octokit.rest.repos.getContent({ owner, repo, path });
  if ("content" in res.data) {
    return Buffer.from(res.data.content, "base64").toString("utf-8");
  }
  throw new Error("Not a file");
}

async function fetchWorkflowFiles(owner: string, repo: string): Promise<Array<{name: string, path: string, content: string}>> {
  try {
    const contents = await octokit.rest.repos.getContent({ owner, repo, path: ".github/workflows" });
    const files = Array.isArray(contents.data) ? contents.data : [];
    const workflowFiles = files.filter(f => f.name.endsWith(".yml") || f.name.endsWith(".yaml"));
    const results = await Promise.allSettled(
      workflowFiles.map(async f => {
        const content = await fetchFileContent(owner, repo, f.path);
        return { name: f.name, path: f.path, content };
      })
    );
    return results.filter(r => r.status === "fulfilled").map(r => r.value);
  } catch {
    return [];
  }
}

async function fetchIssueTemplates(owner: string, repo: string): Promise<Array<{name: string, content: string}>> {
  try {
    const contents = await octokit.rest.repos.getContent({ owner, repo, path: ".github/ISSUE_TEMPLATE" });
    const files = Array.isArray(contents.data) ? contents.data : [];
    const results = await Promise.allSettled(
      files.filter(f => f.name.endsWith(".md") || f.name.endsWith(".yml") || f.name.endsWith(".yaml"))
        .map(async f => {
          const content = await fetchFileContent(owner, repo, f.path);
          return { name: f.name, content };
        })
    );
    return results.filter(r => r.status === "fulfilled").map(r => r.value);
  } catch {
    return [];
  }
}

export async function ingestFromFileList(fileList: Array<{path: string, content: string}>): Promise<RepoFacts> {
  const fileMap = new Map(fileList.map(f => [f.path.toLowerCase(), f.content]));
  
  const getFile = (paths: string[]): string | null => {
    for (const p of paths) {
      if (fileMap.has(p.toLowerCase())) return fileMap.get(p.toLowerCase())!;
    }
    return null;
  };
  
  const packageJson = getFile(["package.json"]);
  const pkg = packageJson ? JSON.parse(packageJson) : null;
  
  const repoName = pkg?.name || "unknown-repo";
  const owner = "local";
  
  return {
    owner,
    repo: repoName,
    fullName: `${owner}/${repoName}`,
    description: pkg?.description || null,
    stars: 0,
    forks: 0,
    watchers: 0,
    language: null,
    languages: {},
    topics: pkg?.keywords || [],
    license: pkg?.license || null,
    homepage: pkg?.homepage || null,
    defaultBranch: "main",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pushedAt: new Date().toISOString(),
    size: 0,
    openIssues: 0,
    openPRs: 0,
    releases: [],
    contributors: [],
    readme: getFile(["README.md", "README.rst", "README.txt", "readme.md"]),
    readmePath: fileList.find(f => f.path.toLowerCase().startsWith("readme"))?.path || null,
    packageJson: pkg,
    tsconfig: getFile(["tsconfig.json"]) ? JSON.parse(getFile(["tsconfig.json"])!) : null,
    dockerfile: getFile(["Dockerfile", "dockerfile"]),
    githubActions: [],
    dependabot: getFile([".github/dependabot.yml", ".github/dependabot.yaml"]),
    codeowners: getFile([".github/CODEOWNERS", "CODEOWNERS"]),
    contributing: getFile(["CONTRIBUTING.md", ".github/CONTRIBUTING.md"]),
    changelog: getFile(["CHANGELOG.md", "CHANGELOG.rst", "HISTORY.md"]),
    securityPolicy: getFile(["SECURITY.md", ".github/SECURITY.md"]),
    issueTemplates: [],
    prTemplate: getFile([".github/PULL_REQUEST_TEMPLATE.md", "PULL_REQUEST_TEMPLATE.md"]),
    envExample: getFile([".env.example", ".env.sample"]),
    gitignore: getFile([".gitignore"]),
    prettierrc: getFile([".prettierrc", ".prettierrc.json", "prettier.config.js"])?.startsWith("{") ? JSON.parse(getFile([".prettierrc", ".prettierrc.json", "prettier.config.js"])!) : getFile([".prettierrc", ".prettierrc.json", "prettier.config.js"]),
    eslintConfig: getFile([".eslintrc.json", ".eslintrc.js", "eslint.config.js"])?.startsWith("{") ? JSON.parse(getFile([".eslintrc.json", ".eslintrc.js", "eslint.config.js"])!) : getFile([".eslintrc.json", ".eslintrc.js", "eslint.config.js"]),
    husky: pkg?.husky || null,
    commitlint: getFile([".github/commitlint.config.js", "commitlint.config.js"]),
    renovate: getFile(["renovate.json", ".github/renovate.json"])?.startsWith("{") ? JSON.parse(getFile(["renovate.json", ".github/renovate.json"])!) : getFile(["renovate.json", ".github/renovate.json"]),
    dependabotConfig: getFile([".github/dependabot.yml", ".github/dependabot.yaml"]),
    githubWorkflowPermissions: null,
    branchProtection: null,
    repoRules: null,
    discussions: false,
    wiki: false,
    projects: false,
    archived: false,
    disabled: false,
    visibility: "private",
    fork: false,
    mirrorUrl: null,
    source: "snapshot",
    fetchedAt: new Date().toISOString(),
  };
}