import { VideoScript, Act, Scene } from "./story-engine";
import { RepoFacts } from "./ingest";
import { AuditResult } from "./audit";

export interface DemoJob {
  id: string;
  repoUrl: string;
  targetSeconds: number;
  style: "launch" | "technical" | "story" | "minimal";
  status: "pending" | "generating_script" | "generating_scenes" | "rendering" | "completed" | "failed";
  progress: number;
  script?: VideoScript;
  webmUrl?: string;
  renderCloudId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoOptions {
  repoUrl: string;
  targetSeconds?: number;
  style?: "launch" | "technical" | "story" | "minimal";
  voiceoverProvider?: "openai" | "anthropic" | "fallback";
  voiceoverVoice?: string;
  includeAuditFacts?: boolean;
  customScript?: Partial<VideoScript>;
}

const activeJobs = new Map<string, DemoJob>();

export async function createDemoJob(options: DemoOptions): Promise<DemoJob> {
  const id = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const job: DemoJob = {
    id,
    repoUrl: options.repoUrl,
    targetSeconds: options.targetSeconds || 300,
    style: options.style || "launch",
    status: "pending",
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  activeJobs.set(id, job);
  
  // Start processing asynchronously
  processDemoJob(job, options).catch(console.error);
  
  return job;
}

export function getDemoJob(id: string): DemoJob | undefined {
  return activeJobs.get(id);
}

export function listDemoJobs(): DemoJob[] {
  return Array.from(activeJobs.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deleteDemoJob(id: string): boolean {
  return activeJobs.delete(id);
}

async function processDemoJob(job: DemoJob, options: DemoOptions): Promise<void> {
  try {
    // Stage 1: Generate script
    updateJob(job, { status: "generating_script", progress: 10 });
    
    const { ingestRepo } = await import("./ingest");
    const { runAudit } = await import("./audit");
    const { generateVideoScript } = await import("./story-engine");
    
    const facts = await ingestRepo(job.repoUrl);
    const audit = await runAudit(facts, "balanced");
    
    const script = generateVideoScript(facts, audit, {
      targetSeconds: job.targetSeconds,
      style: job.style,
    });
    
    // Apply custom script modifications if provided
    if (options.customScript) {
      Object.assign(script, options.customScript);
    }
    
    updateJob(job, { 
      script, 
      status: "generating_scenes", 
      progress: 40 
    });
    
    // Stage 2: Generate scenes (in a real implementation, this would create Remotion compositions)
    await generateScenes(script, facts, audit);
    
    updateJob(job, { status: "rendering", progress: 70 });
    
    // Stage 3: Render (Path A - browser, or Path B - render cloud)
    const webmUrl = await renderDemo(script, job.id);
    
    updateJob(job, { 
      webmUrl, 
      status: "completed", 
      progress: 100 
    });
    
  } catch (error) {
    updateJob(job, { 
      status: "failed", 
      error: error instanceof Error ? error.message : "Unknown error",
      progress: 0 
    });
  }
}

function updateJob(job: DemoJob, updates: Partial<DemoJob>): void {
  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
  activeJobs.set(job.id, job);
}

async function generateScenes(script: VideoScript, facts: RepoFacts, audit: AuditResult): Promise<void> {
  // In a real implementation, this would generate Remotion composition files
  // For now, we validate the script structure
  if (!script.acts || script.acts.length === 0) {
    throw new Error("No acts in script");
  }
  
  let totalSceneDuration = 0;
  for (const act of script.acts) {
    for (const scene of act.scenes) {
      totalSceneDuration += scene.duration;
    }
  }
  
  if (Math.abs(totalSceneDuration - script.totalDuration) > 5) {
    console.warn(`Scene duration mismatch: ${totalSceneDuration}s vs ${script.totalDuration}s`);
  }
}

async function renderDemo(script: VideoScript, jobId: string): Promise<string> {
  // Path A: Browser-based rendering using MediaRecorder
  // This would be triggered from the client side
  // For server-side, we return a placeholder URL
  
  // In production, this would:
  // 1. Generate Remotion project
  // 2. Either:
  //    a. Return a URL for browser rendering (Path A)
  //    b. Queue for Render Cloud (Path B)
  
  return `/api/demo/${jobId}/render`;
}

export async function renderInBrowser(script: VideoScript, canvas: HTMLCanvasElement): Promise<Blob> {
  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 8000000,
  });
  
  const chunks: BlobPart[] = [];
  
  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
    
    mediaRecorder.onerror = reject;
    
    mediaRecorder.start(100);
    
    // Play the script on canvas
    playScriptOnCanvas(script, canvas).then(() => {
      mediaRecorder.stop();
    }).catch(reject);
  });
}

async function playScriptOnCanvas(script: VideoScript, canvas: HTMLCanvasElement): Promise<void> {
  const ctx = canvas.getContext("2d")!;
  const width = canvas.width;
  const height = canvas.height;
  
  let currentTime = 0;
  
  for (const act of script.acts) {
    for (const scene of act.scenes) {
      await renderScene(ctx, scene, width, height);
      currentTime += scene.duration;
    }
  }
}

async function renderScene(ctx: CanvasRenderingContext2D, scene: Scene, width: number, height: number): Promise<void> {
  const frames = scene.duration * 30; // 30 fps
  
  for (let frame = 0; frame < frames; frame++) {
    const progress = frame / frames;
    
    // Clear
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, width, height);
    
    // Render based on scene type
    switch (scene.type) {
      case "title":
        renderTitleScene(ctx, scene, width, height, progress);
        break;
      case "code":
        renderCodeScene(ctx, scene, width, height, progress);
        break;
      case "terminal":
        renderTerminalScene(ctx, scene, width, height, progress);
        break;
      case "stats":
        renderStatsScene(ctx, scene, width, height, progress);
        break;
      case "text":
        renderTextScene(ctx, scene, width, height, progress);
        break;
      case "logo":
        renderLogoScene(ctx, scene, width, height, progress);
        break;
      case "diagram":
        renderDiagramScene(ctx, scene, width, height, progress);
        break;
      default:
        renderTextScene(ctx, scene, width, height, progress);
    }
    
    // Wait for next frame
    await new Promise(r => requestAnimationFrame(r));
  }
}

function renderTitleScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const opacity = Math.min(1, progress * 3);
  
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText(content.title || "", w / 2, h / 2 - 40);
  
  if (content.subtitle) {
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillStyle = "#a0a0a0";
    ctx.fillText(content.subtitle, w / 2, h / 2 + 20);
  }
  ctx.globalAlpha = 1;
}

function renderCodeScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const code = content.code || "";
  const lines = code.split("\n");
  
  // Editor background
  ctx.fillStyle = "#1e1e1e";
  const editorH = Math.min(h * 0.8, lines.length * 24 + 40);
  const editorY = (h - editorH) / 2;
  ctx.fillRect(w * 0.1, editorY, w * 0.8, editorH);
  
  // Line numbers
  ctx.fillStyle = "#3a3d41";
  ctx.fillRect(w * 0.1, editorY, 60, editorH);
  
  // Code text
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#d4d4d4";
  
  const visibleLines = Math.floor(progress * lines.length);
  for (let i = 0; i < visibleLines && i < lines.length; i++) {
    const y = editorY + 30 + i * 24;
    if (y > editorY + editorH - 20) break;
    
    // Line number
    ctx.fillStyle = "#858585";
    ctx.fillText(String(i + 1).padStart(3), w * 0.1 + 10, y);
    
    // Code
    ctx.fillStyle = "#d4d4d4";
    ctx.fillText(lines[i], w * 0.1 + 70, y);
  }
  
  // Highlight lines
  if (content.highlightLines) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
    for (const line of content.highlightLines) {
      const y = editorY + 10 + line * 24;
      ctx.fillRect(w * 0.1, y, w * 0.8, 24);
    }
  }
}

function renderTerminalScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const commands = content.commands || [];
  
  ctx.fillStyle = "#1e1e1e";
  const termH = h * 0.7;
  const termY = (h - termH) / 2;
  ctx.fillRect(w * 0.15, termY, w * 0.7, termH);
  
  // Title bar
  ctx.fillStyle = "#3c3c3c";
  ctx.fillRect(w * 0.15, termY, w * 0.7, 30);
  ctx.fillStyle = "#cccccc";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Terminal", w * 0.15 + 15, termY + 20);
  
  // Commands
  ctx.font = "14px 'JetBrains Mono', monospace";
  let y = termY + 50;
  
  const totalOutputLines = commands.reduce((acc, c) => acc + (c.output ? 1 : 0) + 1, 0);
  const visibleLines = Math.floor(progress * totalOutputLines);
  let lineCount = 0;
  
  for (const cmd of commands) {
    if (lineCount >= visibleLines) break;
    
    // Prompt + command
    ctx.fillStyle = "#4ec9b0";
    ctx.fillText(`${content.prompt} ${cmd.command}`, w * 0.15 + 20, y);
    y += 24;
    lineCount++;
    
    if (cmd.output && lineCount < visibleLines) {
      ctx.fillStyle = "#cccccc";
      ctx.fillText(cmd.output, w * 0.15 + 20, y);
      y += 24;
      lineCount++;
    }
  }
}

function renderStatsScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const metrics = content.metrics || [];
  const layout = content.layout || "grid";
  
  if (layout === "grid") {
    const cols = Math.ceil(Math.sqrt(metrics.length));
    const rows = Math.ceil(metrics.length / cols);
    const cardW = (w * 0.8) / cols;
    const cardH = (h * 0.7) / rows;
    
    metrics.forEach((metric, i) => {
      if (i / metrics.length > progress) return;
      
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = w * 0.1 + col * cardW + 20;
      const y = h * 0.15 + row * cardH + 20;
      
      // Card background
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y, cardW - 40, cardH - 40);
      
      // Value
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(metric.value), x + (cardW - 40) / 2, y + 50);
      
      // Label
      ctx.fillStyle = "#a0a0a0";
      ctx.font = "14px system-ui";
      ctx.fillText(metric.label, x + (cardW - 40) / 2, y + 85);
      
      if (metric.change) {
        ctx.fillStyle = metric.change.startsWith("✓") ? "#22c55e" : "#f59e0b";
        ctx.fillText(metric.change, x + (cardW - 40) / 2, y + 110);
      }
    });
  }
}

function renderTextScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const lines = content.lines || [];
  const style = content.style || "body";
  const alignment = content.alignment || "center";
  
  ctx.textAlign = alignment;
  const x = alignment === "left" ? w * 0.15 : alignment === "right" ? w * 0.85 : w / 2;
  const startY = h / 2 - (lines.length * 30) / 2;
  
  const visibleLines = Math.floor(progress * lines.length);
  
  for (let i = 0; i < visibleLines && i < lines.length; i++) {
    const opacity = Math.min(1, (progress - i / lines.length) * lines.length);
    ctx.globalAlpha = opacity;
    
    switch (style) {
      case "headline":
        ctx.font = "bold 36px system-ui";
        ctx.fillStyle = "#ffffff";
        break;
      case "quote":
        ctx.font = "italic 24px system-ui";
        ctx.fillStyle = "#f59e0b";
        break;
      case "caption":
        ctx.font = "14px system-ui";
        ctx.fillStyle = "#888888";
        break;
      default:
        ctx.font = "20px system-ui";
        ctx.fillStyle = "#e0e0e0";
    }
    
    ctx.fillText(lines[i], x, startY + i * 40);
  }
  ctx.globalAlpha = 1;
}

function renderLogoScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const svg = content.svg;
  const animation = content.animation || "fade";
  
  const size = Math.min(w, h) * 0.4;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  
  // Parse and render SVG (simplified - in reality use canvg or similar)
  if (animation === "draw") {
    ctx.globalAlpha = progress;
  } else if (animation === "pulse") {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
  }
  
  // Draw a placeholder logo
  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 20);
  ctx.fill();
  
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.5}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", w / 2, h / 2);
  
  ctx.globalAlpha = 1;
}

function renderDiagramScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  // Simplified diagram rendering - in reality use mermaid-cli or similar
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  
  // Draw simple boxes and arrows based on progress
  const steps = Math.floor(progress * 5);
  for (let i = 0; i < steps; i++) {
    const x = w * 0.15 + i * (w * 0.7 / 5);
    const y = h / 2;
    
    ctx.strokeRect(x, y - 40, 120, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Step ${i + 1}`, x + 60, y + 10);
    
    if (i < steps - 1) {
      ctx.beginPath();
      ctx.moveTo(x + 120, y);
      ctx.lineTo(x + 120 + (w * 0.7 / 5) - 120, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 120 + (w * 0.7 / 5) - 130, y - 5);
      ctx.lineTo(x + 120 + (w * 0.7 / 5) - 120, y);
      ctx.lineTo(x + 120 + (w * 0.7 / 5) - 130, y + 5);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}