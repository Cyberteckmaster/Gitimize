export interface VideoScript {
  version: "1.0";
  metadata: VideoMetadata;
  acts: Act[];
  totalDuration: number;
  voiceoverProvider: "openai" | "anthropic" | "fallback";
  voiceoverVoice: string;
  captions: Caption[];
}

export interface VideoMetadata {
  repoUrl: string;
  repoName: string;
  repoDescription: string;
  style: "launch" | "technical" | "story" | "minimal";
  targetSeconds: number;
  generatedAt: string;
  auditFacts: AuditFacts;
}

export interface AuditFacts {
  score: number;
  grade: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  hasReadme: boolean;
  hasTests: boolean;
  hasCi: boolean;
  hasDocker: boolean;
  license: string;
}

export interface Act {
  id: string;
  order: number;
  title: string;
  duration: number;
  scenes: Scene[];
  voiceover: string;
  visualCues: VisualCue[];
}

export interface Scene {
  id: string;
  type: "title" | "code" | "terminal" | "ui" | "diagram" | "stats" | "logo" | "text" | "github" | "comparison";
  content: SceneContent;
  duration: number;
  transition: "cut" | "fade" | "slide" | "zoom";
  annotations?: Annotation[];
}

export interface SceneContent {
  title?: string;
  subtitle?: string;
  body?: string;
  code?: CodeContent;
  terminal?: TerminalContent;
  ui?: UIContent;
  diagram?: DiagramContent;
  stats?: StatsContent;
  logo?: LogoContent;
  text?: TextContent;
  github?: GitHubContent;
  comparison?: ComparisonContent;
}

export interface CodeContent {
  language: string;
  code: string;
  highlightLines?: number[];
  filename?: string;
}

export interface TerminalContent {
  prompt: string;
  commands: Array<{ command: string; output?: string; delay?: number }>;
  workingDir?: string;
}

export interface UIContent {
  screenshot?: string;
  url?: string;
  device?: "desktop" | "mobile" | "tablet";
  interactions?: Array<{ action: string; selector: string; delay: number }>;
}

export interface DiagramContent {
  type: "architecture" | "flow" | "sequence" | "class" | "er" | "timeline";
  mermaid: string;
}

export interface StatsContent {
  metrics: Array<{ label: string; value: string | number; change?: string }>;
  layout: "grid" | "list" | "cards";
}

export interface LogoContent {
  svg: string;
  animation?: "draw" | "fade" | "pulse" | "rotate";
}

export interface TextContent {
  lines: string[];
  alignment: "left" | "center" | "right";
  style: "headline" | "body" | "caption" | "quote";
}

export interface GitHubContent {
  repoUrl: string;
  showStars: boolean;
  showForks: boolean;
  showIssues: boolean;
  showPRs: boolean;
  highlightFile?: string;
}

export interface ComparisonContent {
  before: string;
  after: string;
  metric: string;
}

export interface VisualCue {
  time: number;
  type: "highlight" | "zoom" | "pointer" | "text" | "arrow";
  target: string;
  content?: string;
}

export interface Annotation {
  type: "label" | "arrow" | "box" | "circle" | "text";
  position: { x: number; y: number };
  content: string;
  style?: Record<string, string>;
}

export interface Caption {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

const ACT_TEMPLATES: Record<string, Array<{ title: string; weight: number; minDuration: number }>> = {
  launch: [
    { title: "Hook & Problem", weight: 0.15, minDuration: 20 },
    { title: "Solution Reveal", weight: 0.15, minDuration: 25 },
    { title: "Live Demo", weight: 0.25, minDuration: 40 },
    { title: "Key Features", weight: 0.15, minDuration: 25 },
    { title: "Architecture", weight: 0.1, minDuration: 15 },
    { title: "Getting Started", weight: 0.1, minDuration: 15 },
    { title: "Community & Stats", weight: 0.05, minDuration: 10 },
    { title: "Call to Action", weight: 0.05, minDuration: 10 },
  ],
  technical: [
    { title: "Architecture Overview", weight: 0.2, minDuration: 30 },
    { title: "Core Concepts", weight: 0.2, minDuration: 30 },
    { title: "Code Walkthrough", weight: 0.3, minDuration: 50 },
    { title: "API & Integration", weight: 0.15, minDuration: 20 },
    { title: "Performance & Benchmarks", weight: 0.1, minDuration: 15 },
    { title: "Testing Strategy", weight: 0.05, minDuration: 10 },
  ],
  story: [
    { title: "Origin Story", weight: 0.15, minDuration: 25 },
    { title: "The Problem", weight: 0.15, minDuration: 25 },
    { title: "The Journey", weight: 0.2, minDuration: 35 },
    { title: "The Solution", weight: 0.2, minDuration: 35 },
    { title: "Impact & Adoption", weight: 0.15, minDuration: 25 },
    { title: "Future Vision", weight: 0.1, minDuration: 15 },
    { title: "Join Us", weight: 0.05, minDuration: 10 },
  ],
  minimal: [
    { title: "What is it?", weight: 0.25, minDuration: 30 },
    { title: "Quick Demo", weight: 0.4, minDuration: 50 },
    { title: "Install & Run", weight: 0.2, minDuration: 25 },
    { title: "Links & Thanks", weight: 0.15, minDuration: 15 },
  ],
};

export function generateVideoScript(
  facts: any,
  audit: any,
  options: { targetSeconds: number; style: "launch" | "technical" | "story" | "minimal" }
): VideoScript {
  const template = ACT_TEMPLATES[options.style];
  const totalDuration = options.targetSeconds;
  
  // Calculate act durations
  const actDurations = template.map(t => Math.max(t.minDuration, Math.round(t.weight * totalDuration)));
  const diff = totalDuration - actDurations.reduce((a, b) => a + b, 0);
  for (let i = 0; i < Math.abs(diff); i++) {
    actDurations[i % actDurations.length] += diff > 0 ? 1 : -1;
  }
  
  const auditFacts: AuditFacts = {
    score: audit?.score || 0,
    grade: audit?.grade || "F",
    stars: facts.stars || 0,
    forks: facts.forks || 0,
    language: facts.language || "Multiple",
    topics: facts.topics || [],
    hasReadme: !!facts.readme && facts.readme.length > 100,
    hasTests: !!facts.packageJson?.scripts?.test,
    hasCi: facts.githubActions?.length > 0,
    hasDocker: !!facts.dockerfile,
    license: facts.license || "MIT",
  };
  
  const acts: Act[] = template.map((t, i) => generateAct(t.title, actDurations[i], i + 1, facts, auditFacts, options.style));
  
  const voiceover = generateVoiceover(acts, facts, auditFacts, options.style);
  
  return {
    version: "1.0",
    metadata: {
      repoUrl: `https://github.com/${facts.fullName}`,
      repoName: facts.repo,
      repoDescription: facts.description || "",
      style: options.style,
      targetSeconds: totalDuration,
      generatedAt: new Date().toISOString(),
      auditFacts,
    },
    acts,
    totalDuration,
    voiceoverProvider: "fallback",
    voiceoverVoice: "system",
    captions: generateCaptions(voiceover, acts),
  };
}

function generateAct(
  title: string,
  duration: number,
  order: number,
  facts: any,
  audit: AuditFacts,
  style: string
): Act {
  const scenes: Scene[] = [];
  let remaining = duration;
  
  switch (title) {
    case "Hook & Problem":
      scenes.push(
        createScene("title", {
          title: facts.repo,
          subtitle: facts.description || "A powerful solution for modern developers",
        }, Math.min(8, remaining * 0.4)),
        createScene("text", {
          lines: [
            "Every developer faces this challenge...",
            "Complex setup, fragile builds, endless configuration.",
            "What if there was a better way?",
          ],
          alignment: "center",
          style: "headline",
        }, Math.min(12, remaining * 0.6))
      );
      break;
      
    case "Solution Reveal":
      scenes.push(
        createScene("logo", {
          svg: generateLogoSVG(facts.repo),
          animation: "draw",
        }, Math.min(8, remaining * 0.3)),
        createScene("text", {
          lines: [
            `Introducing ${facts.repo}`,
            facts.description || "The modern way to build",
            `⭐ ${audit.stars} stars • ${audit.forks} forks • ${audit.license} License`,
          ],
          alignment: "center",
          style: "headline",
        }, Math.min(17, remaining * 0.7))
      );
      break;
      
    case "Live Demo":
    case "Quick Demo":
      scenes.push(
        createScene("terminal", {
          prompt: "$",
          commands: [
            { command: `git clone https://github.com/${facts.fullName}.git`, output: "Cloning into 'repo'...", delay: 2 },
            { command: `cd ${facts.repo}`, delay: 0.5 },
            { command: "npm install", output: "added 247 packages in 3s", delay: 3 },
            { command: "npm run dev", output: "Server running at http://localhost:3000", delay: 2 },
          ],
        }, Math.min(25, remaining * 0.6)),
        createScene("ui", {
          device: "desktop",
          interactions: [
            { action: "click", selector: "button#get-started", delay: 1 },
            { action: "type", selector: "input#search", delay: 1 },
          ],
        }, Math.min(15, remaining * 0.4))
      );
      break;
      
    case "Key Features":
      scenes.push(
        createScene("stats", {
          metrics: [
            { label: "TypeScript", value: "Strict Mode", change: "✓" },
            { label: "Tests", value: audit.hasTests ? "Configured" : "Missing", change: audit.hasTests ? "✓" : "⚠" },
            { label: "CI/CD", value: audit.hasCi ? "Active" : "Missing", change: audit.hasCi ? "✓" : "⚠" },
            { label: "Docker", value: audit.hasDocker ? "Ready" : "Missing", change: audit.hasDocker ? "✓" : "⚠" },
            { label: "License", value: audit.license, change: "✓" },
            { label: "Grade", value: audit.grade, change: audit.grade !== "F" ? "✓" : "⚠" },
          ],
          layout: "cards",
        }, Math.min(20, remaining * 0.5)),
        createScene("text", {
          lines: facts.topics.slice(0, 5).map(t => `• ${t}`),
          alignment: "left",
          style: "body",
        }, Math.min(15, remaining * 0.5))
      );
      break;
      
    case "Architecture":
    case "Architecture Overview":
      scenes.push(
        createScene("diagram", {
          type: "architecture",
          mermaid: generateArchitectureMermaid(facts),
        }, Math.min(20, remaining * 0.7)),
        createScene("code", {
          language: "typescript",
          code: generateSampleCode(facts),
          filename: "src/index.ts",
          highlightLines: [1, 5, 10],
        }, Math.min(15, remaining * 0.3))
      );
      break;
      
    case "Getting Started":
    case "Install & Run":
      scenes.push(
        createScene("terminal", {
          prompt: "$",
          commands: [
            { command: `npm create ${facts.repo}@latest my-app`, output: "✓ Project created", delay: 2 },
            { command: "cd my-app && npm install", output: "Dependencies installed", delay: 3 },
            { command: "npm run dev", output: "🚀 Ready at localhost:3000", delay: 1 },
          ],
        }, Math.min(20, remaining * 0.7)),
        createScene("github", {
          repoUrl: `https://github.com/${facts.fullName}`,
          showStars: true,
          showForks: true,
        }, Math.min(10, remaining * 0.3))
      );
      break;
      
    case "Community & Stats":
      scenes.push(
        createScene("stats", {
          metrics: [
            { label: "Stars", value: audit.stars.toLocaleString() },
            { label: "Forks", value: audit.forks.toLocaleString() },
            { label: "Contributors", value: facts.contributors?.length || "Many" },
            { label: "Releases", value: facts.releases?.length || 0 },
            { label: "Grade", value: audit.grade },
            { label: "Score", value: `${audit.score}/100` },
          ],
          layout: "grid",
        }, Math.min(15, remaining * 0.7)),
        createScene("text", {
          lines: [
            "Join our community!",
            "GitHub Discussions • Discord • Twitter",
            "Contributors welcome 🎉",
          ],
          alignment: "center",
          style: "body",
        }, Math.min(10, remaining * 0.3))
      );
      break;
      
    case "Call to Action":
    case "Links & Thanks":
    case "Join Us":
      scenes.push(
        createScene("text", {
          lines: [
            `Star us on GitHub!`,
            `https://github.com/${facts.fullName}`,
            "",
            "Thanks for watching! 🚀",
          ],
          alignment: "center",
          style: "headline",
        }, remaining)
      );
      break;
      
    case "Core Concepts":
      scenes.push(
        createScene("diagram", {
          type: "flow",
          mermaid: generateConceptsMermaid(facts),
        }, Math.min(20, remaining * 0.5)),
        createScene("code", {
          language: "typescript",
          code: generateConceptCode(facts),
          filename: "src/core.ts",
        }, Math.min(20, remaining * 0.5))
      );
      break;
      
    case "Code Walkthrough":
      scenes.push(
        createScene("code", {
          language: "typescript",
          code: generateMainCode(facts),
          filename: "src/main.ts",
          highlightLines: [1, 10, 25, 40],
        }, Math.min(30, remaining * 0.6)),
        createScene("terminal", {
          prompt: "$",
          commands: [
            { command: "npm run build", output: "✓ Build successful", delay: 2 },
            { command: "npm test", output: "✓ 42 tests passing", delay: 2 },
          ],
        }, Math.min(20, remaining * 0.4))
      );
      break;
      
    case "API & Integration":
      scenes.push(
        createScene("diagram", {
          type: "sequence",
          mermaid: generateApiMermaid(facts),
        }, Math.min(20, remaining * 0.5)),
        createScene("code", {
          language: "json",
          code: generateApiExample(facts),
          filename: "api/example.json",
        }, Math.min(20, remaining * 0.5))
      );
      break;
      
    case "Performance & Benchmarks":
      scenes.push(
        createScene("stats", {
          metrics: [
            { label: "Bundle Size", value: "45 KB gzipped" },
            { label: "Cold Start", value: "< 100ms" },
            { label: "Memory", value: "12 MB baseline" },
            { label: "Throughput", value: "10,000 req/s" },
          ],
          layout: "cards",
        }, remaining)
      );
      break.
      
    case "Testing Strategy":
      scenes.push(
        createScene("text", {
          lines: [
            "✓ Unit tests (Vitest)",
            "✓ Integration tests",
            "✓ E2E tests (Playwright)",
            "✓ Coverage > 80%",
            "✓ CI runs on every PR",
          ],
          alignment: "left",
          style: "body",
        }, remaining)
      );
      break.
      
    case "Origin Story":
      scenes.push(
        createScene("text", {
          lines: [
            "It started with a frustration...",
            "Existing tools were too complex",
            "We needed something simpler",
            "So we built it ourselves",
          ],
          alignment: "center",
          style: "quote",
        }, Math.min(20, remaining * 0.6)),
        createScene("timeline", {
          type: "timeline",
          mermaid: generateTimelineMermaid(facts),
        }, Math.min(15, remaining * 0.4))
      );
      break.
      
    case "The Problem":
      scenes.push(
        createScene("text", {
          lines: [
            "Developers waste hours on:",
            "• Configuration hell",
            "• Inconsistent APIs",
            "• Poor TypeScript support",
            "• Slow feedback loops",
          ],
          alignment: "left",
          style: "body",
        }, remaining)
      );
      break.
      
    case "The Journey":
      scenes.push(
        createScene("timeline", {
          type: "timeline",
          mermaid: generateJourneyMermaid(facts),
        }, remaining)
      );
      break.
      
    case "The Solution":
      scenes.push(
        createScene("text", {
          lines: [
            `${facts.repo} solves this by:`,
            "• Zero-config defaults",
            "• Type-safe APIs",
            "• Fast, incremental builds",
            "• Great developer experience",
          ],
          alignment: "left",
          style: "body",
        }, Math.min(20, remaining * 0.5)),
        createScene("comparison", {
          before: "Complex config files",
          after: "Just works™",
          metric: "Setup time",
        }, Math.min(15, remaining * 0.5))
      );
      break.
      
    case "Impact & Adoption":
      scenes.push(
        createScene("stats", {
          metrics: [
            { label: "Downloads/week", value: "50K+" },
            { label: "Dependents", value: "1,200+" },
            { label: "Contributors", value: "50+" },
            { label: "Production apps", value: "100+" },
          ],
          layout: "grid",
        }, remaining)
      );
      break.
      
    case "Future Vision":
      scenes.push(
        createScene("text", {
          lines: [
            "What's next for " + facts.repo + "?",
            "• v2.0 with new architecture",
            "• Plugin ecosystem",
            "• Visual editor",
            "• Cloud deployment",
          ],
          alignment: "center",
          style: "headline",
        }, remaining)
      );
      break.
      
    default:
      scenes.push(
        createScene("text", {
          lines: [title, "Content coming soon..."],
          alignment: "center",
          style: "body",
        }, remaining)
      );
  }
  
  const validScenes = scenes.filter(s => s.duration > 0);
  const actualDuration = validScenes.reduce((a, b) => a + b.duration, 0);
  
  return {
    id: `act-${order}`,
    order,
    title,
    duration: actualDuration,
    scenes: validScenes,
    voiceover: generateActVoiceover(title, facts, audit, style),
    visualCues: generateVisualCues(validScenes),
  };
}

function createScene(type: Scene["type"], content: SceneContent, duration: number): Scene {
  return {
    id: `scene-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    content,
    duration: Math.max(1, Math.round(duration)),
    transition: "cut",
  };
}

function generateVoiceover(acts: Act[], facts: any, audit: AuditFacts, style: string): string {
  const parts = [
    `Welcome to the demo of ${facts.repo}. ${facts.description || "A powerful tool for developers."}`,
    ...acts.map(a => a.voiceover),
    `That's ${facts.repo} — star us on GitHub at github.com/${facts.fullName}. Thanks for watching!`,
  ];
  return parts.join(" ");
}

function generateActVoiceover(title: string, facts: any, audit: AuditFacts, style: string): string {
  const voices: Record<string, string> = {
    "Hook & Problem": "Every developer knows the pain of complex setup and fragile builds.",
    "Solution Reveal": `Meet ${facts.repo} — ${facts.description || "the modern solution"}.`,
    "Live Demo": "Let's see it in action. Clone, install, run — it just works.",
    "Quick Demo": "Here's how quick it is to get started.",
    "Key Features": `Built with ${audit.language}, featuring strict TypeScript, ${audit.hasTests ? "comprehensive tests" : "test-ready architecture"}, ${audit.hasCi ? "automated CI" : "CI-ready"}, and ${audit.hasDocker ? "Docker support" : "container-ready"}.`,
    "Architecture": "The architecture is clean and modular, designed for scale.",
    "Architecture Overview": "At its core, a plugin-based architecture with zero-config defaults.",
    "Core Concepts": "Three core concepts: composability, type-safety, and performance.",
    "Code Walkthrough": "Let's walk through the main entry point and see how simple it is.",
    "API & Integration": "REST and GraphQL APIs with full TypeScript support.",
    "Performance & Benchmarks": "Benchmarks show sub-100ms cold starts and 10K requests per second.",
    "Testing Strategy": "Comprehensive testing with unit, integration, and E2E coverage.",
    "Getting Started": "Get started in three commands. Create, install, run.",
    "Install & Run": "Just three commands to a running application.",
    "Community & Stats": `With ${audit.stars} stars and ${audit.forks} forks, the community is growing fast.`,
    "Call to Action": "Ready to try it? Star the repo and join the community!",
    "Links & Thanks": "All links in the description. Thanks for watching!",
    "Join Us": "Join us on GitHub Discussions and Discord. Contributors welcome!",
    "Origin Story": "It began with a simple question: why is this so hard?",
    "The Problem": "Configuration fatigue, inconsistent APIs, and slow feedback loops.",
    "The Journey": "From a weekend project to a production-ready framework.",
    "The Solution": "Zero-config, type-safe, and blazing fast by default.",
    "Impact & Adoption": "Trusted by thousands of developers and hundreds of companies.",
    "Future Vision": "The roadmap includes plugins, visual tools, and cloud deployment.",
    "What is it?": `${facts.repo} is ${facts.description || "a modern development tool"}.`,
  };
  return voices[title] || `This section covers ${title.toLowerCase()}.`;
}

function generateCaptions(voiceover: string, acts: Act[]): Caption[] {
  const captions: Caption[] = [];
  let time = 0;
  
  for (const act of acts) {
    const words = act.voiceover.split(" ");
    const wordsPerSecond = 2.5;
    const duration = act.duration;
    const chunkSize = Math.ceil(words.length / Math.max(1, duration / 3));
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      const start = time + (i / words.length) * duration;
      const end = time + ((i + chunkSize) / words.length) * duration;
      captions.push({ start, end, text: chunk });
    }
    time += duration;
  }
  
  return captions;
}

function generateVisualCues(scenes: Scene[]): VisualCue[] {
  const cues: VisualCue[] = [];
  let time = 0;
  
  for (const scene of scenes) {
    if (scene.type === "code" && scene.content.code) {
      cues.push({ time: time + 1, type: "highlight", target: "code-editor", content: "Key implementation" });
    }
    if (scene.type === "terminal") {
      cues.push({ time: time + 0.5, type: "pointer", target: "terminal", content: "Commands to run" });
    }
    if (scene.type === "stats") {
      cues.push({ time: time + 0.5, type: "highlight", target: "metrics", content: "Key metrics" });
    }
    time += scene.duration;
  }
  
  return cues;
}

function generateLogoSVG(name: string): string {
  const initial = name.charAt(0).toUpperCase();
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad)"/>
  <text x="50" y="68" font-family="system-ui, sans-serif" font-size="50" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
}

function generateArchitectureMermaid(facts: any): string {
  return `graph TB
    subgraph Client["Client Layer"]
      UI[Web UI]
      CLI[CLI Tool]
      SDK[SDKs]
    end
    
    subgraph Core["Core Engine"]
      Router[Router]
      Plugin[Plugin System]
      Cache[Cache Layer]
    end
    
    subgraph Services["Services"]
      Auth[Auth]
      DB[Database]
      Queue[Queue]
      Storage[Storage]
    end
    
    UI --> Router
    CLI --> Router
    SDK --> Router
    Router --> Plugin
    Plugin --> Cache
    Plugin --> Auth
    Plugin --> DB
    Plugin --> Queue
    Plugin --> Storage
    
    classDef client fill:#e0e7ff,stroke:#6366f1
    classDef core fill:#fef3c7,stroke:#f59e0b
    classDef svc fill:#dcfce7,stroke:#22c55e
    class UI,CLI,SDK client
    class Router,Plugin,Cache core
    class Auth,DB,Queue,Storage svc`;
}

function generateConceptsMermaid(facts: any): string {
  return `graph LR
    A[Input] --> B[Parser]
    B --> C[Validator]
    C --> D[Transformer]
    D --> E[Generator]
    E --> F[Output]
    
    B --> G[Type Checker]
    G --> C
    D --> H[Optimizer]
    H --> E
    
    classDef process fill:#e0e7ff,stroke:#6366f1
    class B,C,D,E,G,H process`;
}

function generateTimelineMermaid(facts: any): string {
  return `timeline
    title ${facts.repo} History
    ${facts.createdAt?.slice(0, 4) || "2023"} : Project started
    ${(parseInt(facts.createdAt?.slice(0, 4) || "2023") + 1)} : First release
    ${(parseInt(facts.createdAt?.slice(0, 4) || "2023") + 2)} : 1K stars
    2024 : ${facts.stars}K+ stars
    2024 : Production adoption`;
}

function generateJourneyMermaid(facts: any): string {
  return `journey
    title Development Journey
    section Research
      Problem identification: 5: Me
      Market analysis: 4: Me
    section Development
      Core engine: 5: Team
      Plugin system: 4: Team
      TypeScript: 5: Team
    section Launch
      Beta release: 4: Community
      1.0 release: 5: Everyone
      Growth: 5: Community`;
}

function generateApiMermaid(facts: any): string {
  return `sequenceDiagram
    participant Client
    participant Gateway
    participant Service
    participant DB
    
    Client->>Gateway: Request
    Gateway->>Gateway: Auth & Rate Limit
    Gateway->>Service: Forward
    Service->>DB: Query
    DB-->>Service: Data
    Service-->>Gateway: Response
    Gateway-->>Client: JSON`;
}

function generateSampleCode(facts: any): string {
  const lang = facts.language?.toLowerCase() || "typescript";
  if (lang.includes("python")) {
    return `from ${facts.repo} import App, Router

app = App()

@app.get("/")
async def hello():
    return {"message": "Hello, World!"}

@app.get("/api/users")
async def get_users():
    return await User.all()

if __name__ == "__main__":
    app.run()`;
  }
  if (lang.includes("go")) {
    return `package main

import (
    "github.com/${facts.owner}/${facts.repo}"
)

func main() {
    app := ${facts.repo}.New()
    
    app.GET("/", func(c *${facts.repo}.Context) {
        c.JSON(200, map[string]string{"message": "Hello!"})
    })
    
    app.Run(":3000")
}`;
  }
  if (lang.includes("rust")) {
    return `use ${facts.repo}::{App, Router};

#[tokio::main]
async fn main() {
    let app = App::new()
        .route("/", get(hello))
        .route("/api/users", get(get_users));
    
    app.listen("0.0.0.0:3000").await.unwrap();
}

async fn hello() -> &'static str {
    "Hello, World!"
}`;
  }
  return `import { App, Router, validate } from "${facts.repo}";

const app = new App();

// Type-safe route definition
const router = new Router()
  .get("/", () => ({ message: "Hello, World!" }))
  .get("/api/users", async () => await User.findAll())
  .post("/api/users", validate(UserSchema), async (ctx) => 
    await User.create(ctx.body)
  );

app.use(router);

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});`;
}

function generateConceptCode(facts: any): string {
  return `// Core types - fully typed
interface Plugin<TConfig = {}> {
  name: string;
  version: string;
  setup: (app: App, config: TConfig) => Promise<void>;
  hooks?: PluginHooks;
}

interface PluginHooks {
  "request:start"?: (ctx: Context) => void;
  "request:end"?: (ctx: Context) => void;
  "error"?: (err: Error, ctx: Context) => void;
}

// Plugin registry - zero-config discovery
class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  
  register(plugin: Plugin) {
    this.plugins.set(plugin.name, plugin);
  }
  
  async initialize(app: App) {
    for (const plugin of this.plugins.values()) {
      await plugin.setup(app, plugin.config);
    }
  }
}

// Type-safe configuration
const config = defineConfig({
  plugins: [
    auth({ provider: "github" }),
    database({ url: process.env.DATABASE_URL }),
    cache({ redis: process.env.REDIS_URL }),
  ],
});`;
}

function generateMainCode(facts: any): string {
  return `// Main entry point - ${facts.repo}
import { createApp, defineConfig, plugins } from "${facts.repo}";

// Zero-config setup with sensible defaults
const config = defineConfig({
  // Auto-detected from environment
  port: process.env.PORT || 3000,
  host: process.env.HOST || "0.0.0.0",
  
  // Plugin system - opt-in features
  plugins: [
    plugins.typescript(),      // Strict TS by default
    plugins.testing(),         // Vitest + coverage
    plugins.linting(),         // ESLint + Prettier
    plugins.docker(),          // Multi-stage Dockerfile
    plugins.ci(),              // GitHub Actions CI/CD
  ],
  
  // Type-safe environment validation
  env: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(32),
  },
});

// Create application with full type inference
const app = createApp(config);

// Auto-register routes from filesystem
app.scanRoutes("./src/routes");

// Enable OpenAPI generation
app.enableOpenAPI({
  title: "${facts.repo} API",
  version: "1.0.0",
});

// Start with graceful shutdown
app.start().then(() => {
  console.log(\`✅ \${config.name} running on port \${config.port}\`);
});`;
}

function generateApiExample(facts: any): string {
  return `{
  "openapi": "3.1.0",
  "info": {
    "title": "${facts.repo} API",
    "version": "1.0.0",
    "description": "${facts.description || "Auto-generated API"}"
  },
  "servers": [
    { "url": "http://localhost:3000", "description": "Development" },
    { "url": "https://api.${facts.repo}.dev", "description": "Production" }
  ],
  "paths": {
    "/health": {
      "get": {
        "summary": "Health check",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Health" }
              }
            }
          }
        }
      }
    },
    "/api/users": {
      "get": {
        "summary": "List users",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 20 } }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": { "type": "array", "items": { "$ref": "#/components/schemas/User" } }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Health": { "type": "object", "properties": { "status": { "type": "string", "enum": ["ok"] }, "timestamp": { "type": "string", "format": "date-time" } } },
      "User": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "email": { "type": "string", "format": "email" } } }
    }
  }
}`;
}