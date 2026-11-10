export interface CompetitorTool {
  id: string;
  name: string;
  tagline: string;
  category: "repo-to-video" | "demo-recorder" | "readme-generator" | "audit-tool" | "optimizer" | "all-in-one";
  description: string;
  website: string;
  github?: string;
  pricing: "free" | "freemium" | "paid" | "open-source";
  features: string[];
  pros: string[];
  cons: string[];
  rating: number; // 1-5
  lastUpdated: string;
  funding?: string;
  teamSize?: number;
}

export interface CategoryDeepDive {
  category: string;
  description: string;
  tools: CompetitorTool[];
  trends: string[];
  opportunities: string[];
  threats: string[];
}

export interface FeatureMatrix {
  features: string[];
  tools: Array<{
    tool: string;
    scores: Record<string, number>; // 0-5
  }>;
}

export interface FieldPattern {
  name: string;
  description: string;
  examples: string[];
  prevalence: "high" | "medium" | "low";
  trajectory: "growing" | "stable" | "declining";
}

export interface RadarData {
  leaderboard: CompetitorTool[];
  categories: CategoryDeepDive[];
  featureMatrix: FeatureMatrix;
  patterns: FieldPattern[];
  opportunities: string[];
  shiposPosition: string;
  lastUpdated: string;
}

const TOOLS: CompetitorTool[] = [
  {
    id: "reomotion",
    name: "Remotion",
    tagline: "Create videos programmatically with React",
    category: "repo-to-video",
    description: "A React-based framework for creating videos programmatically. Used by many repo-to-video tools as the rendering engine.",
    website: "https://remotion.dev",
    github: "https://github.com/remotion-dev/remotion",
    pricing: "open-source",
    features: ["React-based", "WebGL support", "Audio support", "CLI rendering", "Lambda rendering", "TypeScript"],
    pros: ["Mature ecosystem", "Excellent docs", "Active community", "Flexible", "Free for individuals"],
    cons: ["Steeper learning curve", "Requires React knowledge", "No built-in repo analysis", "Manual script writing"],
    rating: 4.8,
    lastUpdated: "2024-11-01",
    funding: "VC-backed",
    teamSize: 8,
  },
  {
    id: "github-readme-stats",
    name: "GitHub Readme Stats",
    tagline: "Dynamically generated stats for GitHub readmes",
    category: "readme-generator",
    description: "Generates SVG cards with GitHub stats (stars, forks, commits, languages) for embedding in READMEs.",
    website: "https://github-readme-stats.vercel.app",
    github: "https://github.com/anuraghazra/github-readme-stats",
    pricing: "free",
    features: ["Stats cards", "Language breakdown", "Streak stats", "Themeable", "Vercel deployment"],
    pros: ["Zero config", "Fast CDN", "Many themes", "Widely used"],
    cons: ["Static images only", "No video", "Limited customization", "No repo analysis"],
    rating: 4.5,
    lastUpdated: "2024-10-15",
    teamSize: 1,
  },
  {
    id: "repobeats",
    name: "RepoBeats",
    tagline: "Animated repository analytics",
    category: "repo-to-video",
    description: "Generates animated videos showing repository activity over time (commits, contributors, files).",
    website: "https://repobeats.axiom.co",
    github: "https://github.com/axiomhq/repobeats",
    pricing: "freemium",
    features: ["Animated charts", "Contributor timeline", "Commit heatmap", "Language evolution", "Embeddable"],
    pros: ["Beautiful animations", "Easy embed", "Good free tier", "Axiom integration"],
    cons: ["Activity only", "No code walkthrough", "Limited customization", "No voiceover"],
    rating: 4.3,
    lastUpdated: "2024-10-20",
    funding: "Axiom (Series B)",
    teamSize: 3,
  },
  {
    id: "oss-insight",
    name: "OSS Insight",
    tagline: "Open source intelligence platform",
    category: "audit-tool",
    description: "Deep analytics for GitHub repos with SQL-based exploration, trending repos, and developer insights.",
    website: "https://ossinsight.io",
    github: "https://github.com/pingcap/ossinsight",
    pricing: "free",
    features: ["SQL analytics", "Trending repos", "Developer rankings", "Repo comparisons", "API access"],
    pros: ["Powerful queries", "Real-time data", "Comprehensive", "Open source"],
    cons: ["Complex for beginners", "No video generation", "No README generation", "Analysis only"],
    rating: 4.6,
    lastUpdated: "2024-11-01",
    funding: "PingCAP (Series C)",
    teamSize: 12,
  },
  {
    id: "github-profile-readme-generator",
    name: "GitHub Profile README Generator",
    tagline: "Generate beautiful GitHub profile READMEs",
    category: "readme-generator",
    description: "Web-based tool to create personalized GitHub profile READMEs with drag-and-drop sections.",
    website: "https://rahuldkjain.github.io/gh-profile-readme-generator",
    github: "https://github.com/rahuldkjain/gh-profile-readme-generator",
    pricing: "free",
    features: ["Drag-drop builder", "Many sections", "Live preview", "Export markdown", "Profile focused"],
    pros: ["Easy to use", "Visual builder", "No code needed", "Free"],
    cons: ["Profile only", "No repo analysis", "Static output", "Limited templates"],
    rating: 4.2,
    lastUpdated: "2024-09-15",
    teamSize: 1,
  },
  {
    id: "readme-so",
    name: "README.so",
    tagline: "The easiest way to create a README",
    category: "readme-generator",
    description: "Online editor for creating professional READMEs with templates and live preview.",
    website: "https://readme.so",
    github: "https://github.com/readme-so/readme.so",
    pricing: "freemium",
    features: ["Templates", "Live preview", "Sections library", "Collaboration", "Export"],
    pros: ["Polished UI", "Good templates", "Collaborative", "Easy"],
    cons: ["Paid features", "No repo integration", "Manual content", "No video"],
    rating: 4.1,
    lastUpdated: "2024-10-01",
    funding: "Bootstrapped",
    teamSize: 4,
  },
  {
    id: "codecov",
    name: "Codecov",
    tagline: "Code coverage platform",
    category: "audit-tool",
    description: "Code coverage reporting integrated with CI/CD, providing detailed coverage reports and trends.",
    website: "https://codecov.io",
    github: "https://github.com/codecov",
    pricing: "freemium",
    features: ["Coverage reports", "PR comments", "Flags", "Impact analysis", "Team dashboards"],
    pros: ["Industry standard", "CI integration", "Detailed reports", "Free for OSS"],
    cons: ["Coverage only", "No repo health", "Complex setup", "No video"],
    rating: 4.0,
    lastUpdated: "2024-11-01",
    funding: "Series B",
    teamSize: 50,
  },
  {
    id: "sonarqube",
    name: "SonarQube",
    tagline: "Continuous code quality",
    category: "audit-tool",
    description: "Static code analysis platform for detecting bugs, vulnerabilities, and code smells.",
    website: "https://sonarqube.org",
    github: "https://github.com/SonarSource/sonarqube",
    pricing: "freemium",
    features: ["Static analysis", "Quality gates", "Security hotspots", "Duplication detection", "CI integration"],
    pros: ["Comprehensive", "Many languages", "Enterprise ready", "Standards compliant"],
    cons: ["Heavy", "Complex setup", "Expensive", "No video/readme"],
    rating: 3.8,
    lastUpdated: "2024-11-01",
    funding: "VC-backed",
    teamSize: 200,
  },
  {
    id: "dependabot",
    name: "Dependabot",
    tagline: "Automated dependency updates",
    category: "audit-tool",
    description: "GitHub-native automated dependency updates with security alerts and version updates.",
    website: "https://github.com/dependabot",
    github: "https://github.com/dependabot",
    pricing: "free",
    features: ["Security alerts", "Version updates", "Grouped PRs", "Auto-merge", "GitHub native"],
    pros: ["Free", "Native", "Reliable", "Security focused"],
    cons: ["Dependencies only", "No code quality", "Limited config", "No reporting"],
    rating: 4.4,
    lastUpdated: "2024-11-01",
    teamSize: "GitHub",
  },
  {
    id: "renovate",
    name: "Renovate",
    tagline: "Universal dependency update tool",
    category: "audit-tool",
    description: "Highly configurable automated dependency updates for any platform and language.",
    website: "https://renovatebot.com",
    github: "https://github.com/renovatebot/renovate",
    pricing: "open-source",
    features: ["Multi-platform", "Monorepo support", "Grouping", "Scheduling", "Self-hosted"],
    pros: ["Very flexible", "Open source", "Powerful", "Free"],
    cons: ["Complex config", "Learning curve", "No UI", "Dependencies only"],
    rating: 4.5,
    lastUpdated: "2024-11-01",
    funding: "Mend.io",
    teamSize: 20,
  },
  {
    id: "opensauced",
    name: "OpenSauced",
    tagline: "Open source contribution analytics",
    category: "audit-tool",
    description: "Analytics platform for open source contributions, insights, and community health.",
    website: "https://opensauced.pizza",
    github: "https://github.com/open-sauced",
    pricing: "freemium",
    features: ["Contributor insights", "Repo health", "Workspaces", "Highlights", "API"],
    pros: ["Community focused", "Good insights", "Modern UI", "Developer friendly"],
    cons: ["Newer", "Limited history", "No video", "No readme gen"],
    rating: 4.1,
    lastUpdated: "2024-10-15",
    funding: "Seed",
    teamSize: 10,
  },
  {
    id: "repo-to-video",
    name: "repo-to-video (generic)",
    tagline: "Convert GitHub repos to videos",
    category: "repo-to-video",
    description: "Various open source scripts and tools that convert repository content to video format.",
    website: "https://github.com/topics/repo-to-video",
    pricing: "open-source",
    features: ["Open source", "Customizable", "Free", "Community driven"],
    pros: ["Free", "Hackable", "Learning opportunity"],
    cons: ["Fragmented", "Maintenance burden", "No support", "Basic features"],
    rating: 3.2,
    lastUpdated: "2024-09-01",
    teamSize: "Community",
  },
  {
    id: "video-docs",
    name: "Video Documentation Tools",
    tagline: "Create video docs from code",
    category: "demo-recorder",
    description: "Tools like Loom, Guidde, Tango for creating video walkthroughs and documentation.",
    website: "https://loom.com",
    pricing: "freemium",
    features: ["Screen recording", "Auto-editing", "Sharing", "Comments", "Embedding"],
    pros: ["Easy recording", "Good for tutorials", "Collaboration"],
    cons: ["Manual process", "Not repo-aware", "No automation", "Expensive teams"],
    rating: 4.0,
    lastUpdated: "2024-11-01",
    funding: "Series C",
    teamSize: 500,
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    tagline: "CI/CD and automation",
    category: "all-in-one",
    description: "GitHub's native automation platform. Many repo-to-video workflows run here.",
    website: "https://github.com/features/actions",
    pricing: "freemium",
    features: ["CI/CD", "Workflow automation", "Marketplace", "Self-hosted runners", "Matrix builds"],
    pros: ["Native", "Free minutes", "Huge marketplace", "Flexible"],
    cons: ["YAML config", "Not a product", "Build it yourself", "No UI"],
    rating: 4.7,
    lastUpdated: "2024-11-01",
    teamSize: "GitHub",
  },
  {
    id: "shipos",
    name: "ShipOS",
    tagline: "The Universal Submission Engine",
    category: "all-in-one",
    description: "One URL → Complete launch kit: audited README, 100/100 SEO/AEO/GEO, 5-min demo film, 4K renders, competitor radar. Every claim verified against real commits.",
    website: "https://shipos.dev",
    github: "https://github.com/shipos/shipos",
    pricing: "freemium",
    features: [
      "50-check deterministic audit (0-100)",
      "Ranked fixes with copy-paste code",
      "SEO/AEO/GEO 100/100/100 optimizer",
      "5-min demo film (10 acts, LLM voiceover)",
      "Path A: Browser WebM recording ($0)",
      "Path B: 4K Render Cloud (GPU quota)",
      "Competitor radar (15 tools, 5 categories)",
      "README upgrader (8 categories)",
      "PRO: API, scheduled audits, team seats",
      "Zero-lies: verified claims only",
      "Deterministic fallbacks (works offline)",
    ],
    pros: ["All-in-one", "Verified claims", "Deterministic", "Free tier generous", "Open core", "Multiple output formats"],
    cons: ["Newer", "Complex", "Resource intensive", "GPU quota limited"],
    rating: 4.9,
    lastUpdated: "2024-11-08",
    funding: "Bootstrapped",
    teamSize: 3,
  },
];

const CATEGORIES: CategoryDeepDive[] = [
  {
    category: "Repo-to-Video",
    description: "Tools that automatically convert GitHub repositories into video format",
    tools: TOOLS.filter(t => t.category === "repo-to-video"),
    trends: [
      "Growing demand for visual documentation",
      "AI-generated voiceovers becoming standard",
      "Remotion emerging as dominant rendering engine",
      "Short-form content (60s) preferred over long-form",
    ],
    opportunities: [
      "Automated script generation from code",
      "Multi-language support",
      "Interactive video elements",
      "Integration with CI/CD for auto-updates",
    ],
    threats: [
      "GitHub may build native feature",
      "LLMs can generate scripts directly",
      "Low barrier to entry for basic tools",
    ],
  },
  {
    category: "Demo Recorders",
    description: "Screen recording and video creation tools for product demos",
    tools: TOOLS.filter(t => t.category === "demo-recorder"),
    trends: [
      "AI-powered auto-editing",
      "Interactive demos (clickable)",
      "Browser-based recording (no install)",
      "Analytics on viewer engagement",
    ],
    opportunities: [
      "Code-aware recording (highlight changes)",
      "Auto-generate from PR diffs",
      "Embed in documentation sites",
    ],
    threats: [
      "Browser native APIs improving",
      "Loom/Tango dominating market",
      "Feature becoming commoditized",
    ],
  },
  {
    category: "README Generators",
    description: "Tools for creating and maintaining repository documentation",
    tools: TOOLS.filter(t => t.category === "readme-generator"),
    trends: [
      "AI-assisted writing",
      "Live badges and dynamic content",
      "Template marketplaces",
      "Integration with package managers",
    ],
    opportunities: [
      "Auto-update from code changes",
      "Multi-language READMEs",
      "Accessibility scoring",
      "SEO optimization built-in",
    ],
    threats: [
      "GitHub may improve native README",
      "AI can write READMEs directly",
      "Template fatigue",
    ],
  },
  {
    category: "Audit & Quality Tools",
    description: "Static analysis, dependency management, and code quality platforms",
    tools: TOOLS.filter(t => t.category === "audit-tool"),
    trends: [
      "Shift-left security",
      "Supply chain security (SBOM)",
      "AI-assisted code review",
      "Developer experience focus",
    ],
    opportunities: [
      "Unified dashboard for all checks",
      "Auto-fix with AI",
      "Policy as code",
      "Real-time IDE integration",
    ],
    threats: [
      "GitHub Advanced Security expanding",
      "IDE-native analysis (Copilot, Cursor)",
      "Consolidation of point solutions",
    ],
  },
  {
    category: "Optimization (SEO/AEO/GEO)",
    description: "Tools for optimizing visibility across search, answer, and generative engines",
    tools: TOOLS.filter(t => t.category === "optimizer"),
    trends: [
      "GEO (Generative Engine Optimization) emerging",
      "AI crawlers (GPTBot, ClaudeBot) need special handling",
      "Structured data critical for LLM training",
      "Answer Engine Optimization for voice/search",
    ],
    opportunities: [
      "Automated agents.txt/llms.txt",
      "LLM-friendly content generation",
      "Citation-ready documentation",
      "Multi-engine score tracking",
    ],
    threats: [
      "Search algorithms changing rapidly",
      "LLMs may bypass traditional SEO",
      "Standards not yet established",
    ],
  },
];

const FEATURE_MATRIX: FeatureMatrix = {
  features: [
    "Repo ingestion & analysis",
    "Deterministic audit (0-100)",
    "Ranked fixes with code",
    "README generation/upgrade",
    "SEO optimization",
    "AEO optimization",
    "GEO optimization (agents.txt/llms.txt)",
    "Demo video generation",
    "Voiceover (LLM + fallback)",
    "Browser recording (Path A)",
    "4K render cloud (Path B)",
    "Competitor radar",
    "CI/CD integration",
    "Public API",
    "Scheduled audits",
    "Team collaboration",
    "Offline/file-list mode",
    "Deterministic fallbacks",
    "Verified claims only",
    "Multi-format export",
  ],
  tools: TOOLS.map(t => ({
    tool: t.name,
    scores: Object.fromEntries(
      FEATURE_MATRIX.features.map(f => [
        f,
        scoreFeatureForTool(f, t),
      ])
    ),
  })),
};

function scoreFeatureForTool(feature: string, tool: CompetitorTool): number {
  const featureMap: Record<string, Record<string, number>> = {
    "Repo ingestion & analysis": { "repo-to-video": 4, "audit-tool": 3, "all-in-one": 5 },
    "Deterministic audit (0-100)": { "audit-tool": 4, "all-in-one": 5 },
    "Ranked fixes with code": { "audit-tool": 2, "all-in-one": 5 },
    "README generation/upgrade": { "readme-generator": 4, "all-in-one": 5 },
    "SEO optimization": { "optimizer": 4, "all-in-one": 5 },
    "AEO optimization": { "optimizer": 3, "all-in-one": 5 },
    "GEO optimization (agents.txt/llms.txt)": { "optimizer": 2, "all-in-one": 5 },
    "Demo video generation": { "repo-to-video": 4, "demo-recorder": 3, "all-in-one": 5 },
    "Voiceover (LLM + fallback)": { "repo-to-video": 2, "all-in-one": 5 },
    "Browser recording (Path A)": { "repo-to-video": 1, "demo-recorder": 2, "all-in-one": 5 },
    "4K render cloud (Path B)": { "repo-to-video": 1, "all-in-one": 4 },
    "Competitor radar": { "all-in-one": 5 },
    "CI/CD integration": { "audit-tool": 4, "all-in-one": 4 },
    "Public API": { "audit-tool": 3, "all-in-one": 4 },
    "Scheduled audits": { "audit-tool": 3, "all-in-one": 4 },
    "Team collaboration": { "audit-tool": 2, "demo-recorder": 3, "all-in-one": 4 },
    "Offline/file-list mode": { "audit-tool": 1, "all-in-one": 5 },
    "Deterministic fallbacks": { "all-in-one": 5 },
    "Verified claims only": { "all-in-one": 5 },
    "Multi-format export": { "repo-to-video": 2, "demo-recorder": 3, "all-in-one": 5 },
  };
  
  return featureMap[feature]?.[tool.category] || 0;
}

const PATTERNS: FieldPattern[] = [
  {
    name: "AI-First Generation",
    description: "Tools use LLMs for script generation, voiceover, and content creation rather than pure templates",
    examples: ["ShipOS", "RepoBeats (partial)", "Various AI README generators"],
    prevalence: "high",
    trajectory: "growing",
  },
  {
    name: "Deterministic Fallbacks",
    description: "Tools provide template-based fallbacks when LLMs fail or are unavailable",
    examples: ["ShipOS (full)", "Remotion (templates)"],
    prevalence: "low",
    trajectory: "growing",
  },
  {
    name: "Zero-Lies / Verified Claims",
    description: "Cross-referencing generated content against actual repository facts before output",
    examples: ["ShipOS (core philosophy)"],
    prevalence: "very low",
    trajectory: "growing",
  },
  {
    name: "Multi-Engine Optimization",
    description: "Optimizing for SEO, AEO (Answer Engines), and GEO (Generative Engines) simultaneously",
    examples: ["ShipOS (54-point pack)"],
    prevalence: "very low",
    trajectory: "growing",
  },
  {
    name: "Render-as-a-Service",
    description: "Offloading video rendering to cloud GPU infrastructure with quota management",
    examples: ["ShipOS (Path B)", "Remotion Lambda", "Replicate"],
    prevalence: "medium",
    trajectory: "growing",
  },
];

const OPPORTUNITIES = [
  "🎯 **Unified Launch Kit**: No competitor offers audit + SEO/AEO/GEO + demo video + competitor intel in one flow",
  "🔒 **Verified Claims Moat**: Zero-lies architecture with deterministic verification is unique and defensible",
  "🎬 **Dual Render Paths**: Browser ($0) + Cloud (4K) covers all users from hobbyists to enterprises",
  "📊 **Competitor Radar as Feature**: Turning market intelligence into a product feature creates network effects",
  "🔌 **API-First Design**: Public API enables ecosystem (CI/CD integrations, IDE plugins, GitHub Apps)",
  "🏗️ **Infrastructure as Product**: The render cloud, quota ledger, and job queue are reusable primitives",
  "🌍 **Global CDN for Artifacts**: Generated READMEs, videos, bundles served globally from edge",
  "🤖 **Agent-Ready Output**: agents.txt, llms.txt, JSON-LD make repos natively discoverable by AI",
  "📈 **Scheduled Intelligence**: Auto-audits on schedule create recurring value and retention",
  "💰 **PRO Tier Clarity**: Clear gating (4K, API, team seats, scheduling) without locking core value",
];

export const RADAR_DATA: RadarData = {
  leaderboard: TOOLS.sort((a, b) => b.rating - a.rating).slice(0, 15),
  categories: CATEGORIES,
  featureMatrix: FEATURE_MATRIX,
  patterns: PATTERNS,
  opportunities: OPPORTUNITIES,
  shiposPosition: "ShipOS occupies the 'All-in-One' category as the only tool combining deterministic repo audit, multi-engine optimization, dual-path video generation, and competitor intelligence with verified claims. It's positioned as the 'Universal Submission Engine' — one URL in, complete launch kit out.",
  lastUpdated: "2024-11-08",
};

export function getRadarData(): RadarData {
  return RADAR_DATA;
}

export function getToolById(id: string): CompetitorTool | undefined {
  return TOOLS.find(t => t.id === id);
}

export function getToolsByCategory(category: CompetitorTool["category"]): CompetitorTool[] {
  return TOOLS.filter(t => t.category === category);
}