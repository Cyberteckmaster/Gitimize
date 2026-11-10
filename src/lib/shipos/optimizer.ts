import { RepoFacts } from "./ingest";

export interface OptimizationPack {
  seo: SEOOptimization;
  aeo: AEOOptimization;
  geo: GEOOptimization;
  overallScore: number;
  recommendations: Recommendation[];
}

export interface SEOOptimization {
  score: number;
  title: string;
  description: string;
  keywords: string[];
  topics: string[];
  jsonLd: string;
  robotsTxt: string;
  sitemap: string;
  openGraph: OpenGraphTags;
  twitterCard: TwitterCardTags;
  canonicalUrl: string;
}

export interface AEOOptimization {
  score: number;
  faq: FAQItem[];
  howTo: HowToItem[];
  speakable: SpeakableContent;
  structuredData: string;
}

export interface GEOOptimization {
  score: number;
  agentsTxt: string;
  llmsTxt: string;
  aiSummary: string;
  trainingData: string;
  citationReady: boolean;
}

export interface OpenGraphTags {
  title: string;
  description: string;
  url: string;
  type: string;
  image: string;
  siteName: string;
  twitterHandle?: string;
}

export interface TwitterCardTags {
  card: string;
  site?: string;
  creator?: string;
  title: string;
  description: string;
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToItem {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; url?: string }>;
}

export interface SpeakableContent {
  xpath?: string;
  cssSelector?: string;
}

export interface Recommendation {
  id: string;
  category: "seo" | "aeo" | "geo";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "trivial" | "easy" | "moderate" | "hard";
  code?: string;
  files?: string[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
]);

function extractKeywords(text: string, max: number = 20): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function generateTopics(facts: RepoFacts): string[] {
  const topics = new Set(facts.topics);
  
  if (facts.language) topics.add(facts.language.toLowerCase());
  if (facts.packageJson) {
    const deps = { ...facts.packageJson.dependencies, ...facts.packageJson.devDependencies };
    const frameworks = ["nextjs", "react", "vue", "svelte", "angular", "astro", "remix", "nuxt", "express", "fastify", "hono", "elysia", "nestjs", "django", "rails", "laravel", "spring", "go", "rust", "python", "typescript", "javascript"];
    for (const dep of Object.keys(deps)) {
      const lower = dep.toLowerCase();
      if (frameworks.some(f => lower.includes(f))) topics.add(f);
    }
  }
  
  return Array.from(topics).slice(0, 20);
}

export async function runOptimization(facts: RepoFacts): Promise<OptimizationPack> {
  const repoUrl = `https://github.com/${facts.fullName}`;
  const repoName = facts.repo;
  const owner = facts.owner;
  const description = facts.description || `${repoName} - A modern, well-structured project`;
  const keywords = extractKeywords(`${description} ${facts.readme || ""} ${JSON.stringify(facts.packageJson || {})}`);
  const topics = generateTopics(facts);
  
  // SEO
  const seo = generateSEO(facts, repoUrl, description, keywords, topics);
  
  // AEO
  const aeo = generateAEO(facts, repoUrl, description, keywords);
  
  // GEO
  const geo = generateGEO(facts, repoUrl, description, keywords, topics);
  
  // Overall score
  const overallScore = Math.round((seo.score + aeo.score + geo.score) / 3);
  
  // Recommendations
  const recommendations = generateRecommendations(facts, seo, aeo, geo);
  
  return {
    seo,
    aeo,
    geo,
    overallScore,
    recommendations,
  };
}

function generateSEO(facts: RepoFacts, repoUrl: string, description: string, keywords: string[], topics: string[]): OptimizationPack["seo"] {
  const title = `${facts.repo} - ${description.slice(0, 60 - facts.repo.length)}`;
  const desc = description.slice(0, 160);
  
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: facts.repo,
    description: desc,
    url: repoUrl,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    author: {
      "@type": "Organization",
      name: facts.owner,
      url: `https://github.com/${facts.owner}`,
    },
    license: facts.license ? `https://spdx.org/licenses/${facts.license}.html` : "https://opensource.org/licenses/MIT",
    keywords: keywords.join(", "),
    datePublished: facts.createdAt,
    dateModified: facts.updatedAt,
    version: facts.packageJson?.version || "1.0.0",
    screenshot: `https://opengraph.githubassets.com/1/${facts.fullName}`,
  }, null, 2);
  
  const openGraph: OpenGraphTags = {
    title,
    description: desc,
    url: repoUrl,
    type: "website",
    image: `https://opengraph.githubassets.com/1/${facts.fullName}`,
    siteName: "GitHub",
    twitterHandle: facts.owner,
  };
  
  const twitterCard: TwitterCardTags = {
    card: "summary_large_image",
    site: facts.owner,
    creator: facts.owner,
    title,
    description: desc,
    image: `https://opengraph.githubassets.com/1/${facts.fullName}`,
  };
  
  const robotsTxt = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${repoUrl}/sitemap.xml`;
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${repoUrl}</loc>
    <lastmod>${facts.updatedAt.split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${repoUrl}#readme</loc>
    <lastmod>${facts.updatedAt.split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${repoUrl}/releases</loc>
    <lastmod>${facts.updatedAt.split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${repoUrl}/issues</loc>
    <lastmod>${facts.updatedAt.split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
  
  let score = 50;
  if (facts.readme && facts.readme.length > 500) score += 15;
  if (facts.topics.length >= 5) score += 10;
  if (facts.description && facts.description.length > 50) score += 10;
  if (facts.license) score += 5;
  if (facts.homepage) score += 5;
  if (facts.packageJson?.repository) score += 5;
  
  return {
    score: Math.min(100, score),
    title,
    description: desc,
    keywords,
    topics,
    jsonLd,
    robotsTxt,
    sitemap,
    openGraph,
    twitterCard,
    canonicalUrl: repoUrl,
  };
}

function generateAEO(facts: RepoFacts, repoUrl: string, description: string, keywords: string[]): OptimizationPack["aeo"] {
  const faq: FAQItem[] = [
    {
      question: `What is ${facts.repo}?`,
      answer: description,
    },
    {
      question: `How do I install ${facts.repo}?`,
      answer: `Clone the repository and install dependencies:\n\`\`\`bash\ngit clone ${repoUrl}.git\ncd ${facts.repo}\nnpm install\n\`\`\``,
    },
    {
      question: `What license does ${facts.repo} use?`,
      answer: `${facts.repo} is licensed under the ${facts.license || "MIT"} License.`,
    },
    {
      question: `Where can I find documentation for ${facts.repo}?`,
      answer: `Documentation is available in the README and at ${facts.homepage || repoUrl}.`,
    },
    {
      question: `How can I contribute to ${facts.repo}?`,
      answer: `See CONTRIBUTING.md for contribution guidelines. Fork the repo, create a branch, make changes, and submit a PR.`,
    },
  ];
  
  const howTo: HowToItem[] = [
    {
      name: `Install ${facts.repo}`,
      description: `Set up ${facts.repo} on your local machine`,
      steps: [
        { name: "Clone repository", text: `git clone ${repoUrl}.git` },
        { name: "Enter directory", text: `cd ${facts.repo}` },
        { name: "Install dependencies", text: "npm install" },
        { name: "Run development server", text: "npm run dev" },
      ],
    },
  ];
  
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: facts.repo,
    url: repoUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${repoUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }, null, 2);
  
  let score = 40;
  if (facts.readme && facts.readme.includes("## FAQ")) score += 20;
  if (facts.readme && facts.readme.includes("## Installation")) score += 15;
  if (facts.readme && facts.readme.includes("## Usage")) score += 15;
  if (facts.contributing) score += 10;
  
  return {
    score: Math.min(100, score),
    faq,
    howTo,
    speakable: { cssSelector: "main article, .markdown-body, #readme" },
    structuredData,
  };
}

function generateGEO(facts: RepoFacts, repoUrl: string, description: string, keywords: string[], topics: string[]): OptimizationPack["geo"] {
  const agentsTxt = `# Agents.txt for ${facts.repo}
# Allows AI agents to understand and interact with this repository

User-agent: *
Allow: /

# Repository metadata
Repository: ${facts.fullName}
Description: ${description}
License: ${facts.license || "MIT"}
Language: ${facts.language || "Multiple"}
Topics: ${topics.join(", ")}

# Key files for AI understanding
README: ${repoUrl}/blob/${facts.defaultBranch}/README.md
License: ${repoUrl}/blob/${facts.defaultBranch}/LICENSE
Contributing: ${repoUrl}/blob/${facts.defaultBranch}/CONTRIBUTING.md
Changelog: ${repoUrl}/blob/${facts.defaultBranch}/CHANGELOG.md
Security: ${repoUrl}/blob/${facts.defaultBranch}/SECURITY.md

# API Documentation
API Docs: ${facts.homepage || repoUrl}/docs

# Package information
Package Manager: ${facts.packageJson?.packageManager || "npm"}
Version: ${facts.packageJson?.version || "1.0.0"}

# Contact
Issues: ${repoUrl}/issues
Discussions: ${repoUrl}/discussions
Security: ${repoUrl}/security/advisories/new`;

  const llmsTxt = `# ${facts.repo}

${description}

## Quick Links

- [Repository](${repoUrl})
- [Documentation](${facts.homepage || repoUrl})
- [Issues](${repoUrl}/issues)
- [Releases](${repoUrl}/releases)
- [Contributing](${repoUrl}/blob/${facts.defaultBranch}/CONTRIBUTING.md)

## Overview

${facts.repo} is a ${facts.language || "multi-language"} project for ${description.toLowerCase()}.

## Installation

\`\`\`bash
git clone ${repoUrl}.git
cd ${facts.repo}
npm install
\`\`\`

## Usage

\`\`\`bash
npm run dev
\`\`\`

## Key Features

${facts.topics.slice(0, 10).map(t => `- ${t}`).join("\n")}

## License

${facts.license || "MIT"} License

## Community

- GitHub: ${repoUrl}
- Issues: ${repoUrl}/issues
- Discussions: ${repoUrl}/discussions`;

  const aiSummary = `${facts.repo} is a ${facts.language || "multi-language"} open source project by ${facts.owner}. ${description} It has ${facts.stars} stars and ${facts.forks} forks on GitHub. Licensed under ${facts.license || "MIT"}. Key topics: ${topics.slice(0, 10).join(", ")}.`;
  
  const trainingData = `Repository: ${facts.fullName}
Description: ${description}
Language: ${facts.language}
Topics: ${topics.join(", ")}
Stars: ${facts.stars}
Forks: ${facts.forks}
License: ${facts.license}
Readme: ${facts.readme?.slice(0, 2000) || "No README"}
Package: ${JSON.stringify(facts.packageJson?.dependencies || {}).slice(0, 1000)}`;

  let score = 30;
  if (facts.readme && facts.readme.length > 1000) score += 20;
  if (facts.topics.length >= 5) score += 15;
  if (facts.description && facts.description.length > 100) score += 15;
  if (facts.license) score += 10;
  if (facts.contributing) score += 10;
  
  return {
    score: Math.min(100, score),
    agentsTxt,
    llmsTxt,
    aiSummary,
    trainingData,
    citationReady: true,
  };
}

function generateRecommendations(
  facts: RepoFacts,
  seo: OptimizationPack["seo"],
  aeo: OptimizationPack["aeo"],
  geo: OptimizationPack["geo"]
): Recommendation[] {
  const recs: Recommendation[] = [];
  
  if (seo.score < 100) {
    if (!facts.homepage) {
      recs.push({
        id: "seo-homepage",
        category: "seo",
        title: "Add homepage URL",
        description: "Set repository homepage in GitHub settings for better SEO",
        impact: "high",
        effort: "trivial",
      });
    }
    if (facts.topics.length < 10) {
      recs.push({
        id: "seo-topics",
        category: "seo",
        title: "Add more repository topics",
        description: "Add up to 20 relevant topics in GitHub settings for discoverability",
        impact: "high",
        effort: "trivial",
      });
    }
    recs.push({
      id: "seo-jsonld",
      category: "seo",
      title: "Deploy JSON-LD structured data",
      description: "Add the generated JSON-LD to your website or GitHub Pages",
      impact: "medium",
      effort: "easy",
      code: seo.jsonLd,
      files: ["public/structured-data.json", "app/layout.tsx"],
    });
    recs.push({
      id: "seo-robots",
      category: "seo",
      title: "Deploy robots.txt",
      description: "Add robots.txt to allow AI crawlers",
      impact: "high",
      effort: "trivial",
      code: seo.robotsTxt,
      files: ["public/robots.txt"],
    });
    recs.push({
      id: "seo-sitemap",
      category: "seo",
      title: "Deploy sitemap.xml",
      description: "Add sitemap for better indexing",
      impact: "medium",
      effort: "easy",
      code: seo.sitemap,
      files: ["public/sitemap.xml"],
    });
  }
  
  if (aeo.score < 100) {
    recs.push({
      id: "aeo-faq",
      category: "aeo",
      title: "Add FAQ section to README",
      description: "Include the generated FAQ in your README for Answer Engine Optimization",
      impact: "high",
      effort: "easy",
      code: aeo.faq.map(f => `### ${f.question}\n\n${f.answer}`).join("\n\n"),
      files: ["README.md"],
    });
    recs.push({
      id: "aeo-howto",
      category: "aeo",
      title: "Add HowTo structured data",
      description: "Embed HowTo schema for installation steps",
      impact: "medium",
      effort: "easy",
      code: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: aeo.howTo[0]?.name,
        description: aeo.howTo[0]?.description,
        step: aeo.howTo[0]?.steps.map(s => ({
          "@type": "HowToStep",
          name: s.name,
          text: s.text,
        })),
      }, null, 2),
      files: ["public/howto.json"],
    });
  }
  
  if (geo.score < 100) {
    recs.push({
      id: "geo-agents",
      category: "geo",
      title: "Deploy agents.txt",
      description: "Add agents.txt to repository root for AI agent discovery",
      impact: "high",
      effort: "trivial",
      code: geo.agentsTxt,
      files: ["agents.txt"],
    });
    recs.push({
      id: "geo-llms",
      category: "geo",
      title: "Deploy llms.txt",
      description: "Add llms.txt for LLM training and retrieval",
      impact: "high",
      effort: "trivial",
      code: geo.llmsTxt,
      files: ["llms.txt"],
    });
    recs.push({
      id: "geo-summary",
      category: "geo",
      title: "Add AI summary meta tag",
      description: "Include AI-friendly summary in HTML head",
      impact: "medium",
      effort: "trivial",
      code: `<meta name="ai-summary" content="${geo.aiSummary.replace(/"/g, '"')}">`,
      files: ["app/layout.tsx", "index.html"],
    });
  }
  
  return recs;
}

export function generateOptimizationArtifacts(pack: OptimizationPack): Array<{ path: string; content: string; description: string }> {
  const artifacts: Array<{ path: string; content: string; description: string }> = [];
  
  // SEO
  artifacts.push(
    { path: "public/structured-data.json", content: pack.seo.jsonLd, description: "JSON-LD structured data" },
    { path: "public/robots.txt", content: pack.seo.robotsTxt, description: "Robots.txt for crawlers" },
    { path: "public/sitemap.xml", content: pack.seo.sitemap, description: "Sitemap for search engines" },
  );
  
  // AEO
  artifacts.push(
    { path: "public/faq.json", content: JSON.stringify(pack.aeo.faq, null, 2), description: "FAQ structured data" },
    { path: "public/howto.json", content: pack.aeo.structuredData, description: "HowTo structured data" },
  );
  
  // GEO
  artifacts.push(
    { path: "agents.txt", content: pack.geo.agentsTxt, description: "Agents.txt for AI agents" },
    { path: "llms.txt", content: pack.geo.llmsTxt, description: "LLMs.txt for LLM training" },
  );
  
  // Recommendations as markdown
  const recMd = pack.recommendations.map(r => 
    `## ${r.title}\n\n**Category:** ${r.category.toUpperCase()}  \n**Impact:** ${r.impact}  \n**Effort:** ${r.effort}\n\n${r.description}\n\n${r.code ? `\`\`\`\n${r.code}\n\`\`\`` : ""}`
  ).join("\n\n---\n\n");
  
  artifacts.push({
    path: "OPTIMIZATION_RECOMMENDATIONS.md",
    content: `# Optimization Recommendations\n\n${recMd}`,
    description: "All optimization recommendations",
  });
  
  return artifacts;
}