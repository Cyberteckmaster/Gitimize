import { VideoScript } from "./story-engine";

export interface RenderJob {
  id: string;
  script: VideoScript;
  format: "webm" | "mp4" | "gif" | "zip-bundle";
  resolution: "720p" | "1080p" | "4k";
  fps: number;
  status: "pending" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  gpuSecondsUsed: number;
  bundleUrl?: string;
  error?: string;
  metadata?: RenderMetadata;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RenderMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  fileSize: number;
  gpuSeconds: number;
  cpuSeconds: number;
  remotionVersion: string;
  ffmpegVersion: string;
}

export interface QuotaStatus {
  date: string;
  gpuSecondsUsed: number;
  gpuSecondsLimit: number;
  cpuSecondsUsed: number;
  rendersCount: number;
  remainingGpuSeconds: number;
  canRender: boolean;
  nextReset: string;
}

const GPU_SECONDS_PER_4K_SECOND = 2;
const GPU_SECONDS_PER_1080P_SECOND = 0.5;
const GPU_SECONDS_PER_720P_SECOND = 0.2;
const DAILY_GPU_LIMIT = 300;

const activeRenders = new Map<string, RenderJob>();
const quotaLedger = new Map<string, { used: number; limit: number; cpuUsed: number; count: number }>();

export async function createRenderJob(
  script: VideoScript,
  options: { format?: RenderJob["format"]; resolution?: RenderJob["resolution"]; fps?: number } = {}
): Promise<RenderJob> {
  const id = `render_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const format = options.format || "webm";
  const resolution = options.resolution || "1080p";
  const fps = options.fps || 30;
  
  const gpuPerSecond = getGpuPerSecond(resolution);
  const estimatedGpuSeconds = Math.ceil(script.totalDuration * gpuPerSecond);
  
  // Check quota
  const quota = await checkQuota(estimatedGpuSeconds);
  if (!quota.canRender) {
    throw new Error(`Insufficient GPU quota. Need ${estimatedGpuSeconds}s, have ${quota.remainingGpuSeconds}s remaining. Resets at ${quota.nextReset}`);
  }
  
  const job: RenderJob = {
    id,
    script,
    format,
    resolution,
    fps,
    status: "pending",
    progress: 0,
    gpuSecondsUsed: 0,
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  activeRenders.set(id, job);
  
  // Start processing
  processRenderJob(job, estimatedGpuSeconds).catch(console.error);
  
  return job;
}

export function getRenderJob(id: string): RenderJob | undefined {
  return activeRenders.get(id);
}

export function listRenderJobs(): RenderJob[] {
  return Array.from(activeRenders.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getQuotaStatus(): Promise<QuotaStatus> {
  const today = new Date().toISOString().split("T")[0];
  const ledger = quotaLedger.get(today) || { used: 0, limit: DAILY_GPU_LIMIT, cpuUsed: 0, count: 0 };
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  return {
    date: today,
    gpuSecondsUsed: ledger.used,
    gpuSecondsLimit: ledger.limit,
    cpuSecondsUsed: ledger.cpuUsed,
    rendersCount: ledger.count,
    remainingGpuSeconds: Math.max(0, ledger.limit - ledger.used),
    canRender: ledger.used < ledger.limit,
    nextReset: tomorrow.toISOString(),
  };
}

async function checkQuota(needed: number): Promise<QuotaStatus> {
  const quota = await getQuotaStatus();
  return {
    ...quota,
    canRender: quota.remainingGpuSeconds >= needed,
  };
}

async function processRenderJob(job: RenderJob, estimatedGpuSeconds: number): Promise<void> {
  try {
    updateJob(job, { status: "queued", progress: 5 });
    
    // Reserve quota
    await reserveQuota(job.id, estimatedGpuSeconds);
    
    updateJob(job, { status: "processing", progress: 10 });
    
    // Generate Remotion project
    const projectPath = await generateRemotionProject(job);
    updateJob(job, { progress: 30 });
    
    // Render with Remotion
    const outputPath = await renderWithRemotion(job, projectPath);
    updateJob(job, { progress: 70 });
    
    // Post-process with ffmpeg (if needed)
    const finalPath = await postProcess(job, outputPath);
    updateJob(job, { progress: 85 });
    
    // Create bundle
    const bundleUrl = await createBundle(job, finalPath);
    updateJob(job, { progress: 95 });
    
    // Finalize
    const metadata = await getMetadata(finalPath, job);
    const actualGpuSeconds = Math.ceil(job.script.totalDuration * getGpuPerSecond(job.resolution));
    
    updateJob(job, { 
      bundleUrl, 
      status: "completed", 
      progress: 100,
      gpuSecondsUsed: actualGpuSeconds,
      metadata,
      completedAt: new Date().toISOString(),
    });
    
    // Update quota
    await consumeQuota(job.id, actualGpuSeconds);
    
  } catch (error) {
    updateJob(job, { 
      status: "failed", 
      error: error instanceof Error ? error.message : "Unknown error",
      progress: 0 
    });
    // Release reserved quota
    await releaseQuota(job.id);
  }
}

function updateJob(job: RenderJob, updates: Partial<RenderJob>): void {
  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
  activeRenders.set(job.id, job);
}

async function reserveQuota(jobId: string, seconds: number): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ledger = quotaLedger.get(today) || { used: 0, limit: DAILY_GPU_LIMIT, cpuUsed: 0, count: 0 };
  ledger.used += seconds;
  quotaLedger.set(today, ledger);
}

async function consumeQuota(jobId: string, seconds: number): Promise<void> {
  // Already reserved, just confirm
}

async function releaseQuota(jobId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ledger = quotaLedger.get(today);
  if (ledger) {
    // In reality, we'd track per-job reservation
    // For now, we don't release since we don't track per-job
  }
}

function getGpuPerSecond(resolution: RenderJob["resolution"]): number {
  switch (resolution) {
    case "4k": return GPU_SECONDS_PER_4K_SECOND;
    case "1080p": return GPU_SECONDS_PER_1080P_SECOND;
    case "720p": return GPU_SECONDS_PER_720P_SECOND;
  }
}

function getResolutionDimensions(resolution: RenderJob["resolution"]): { width: number; height: number } {
  switch (resolution) {
    case "4k": return { width: 3840, height: 2160 };
    case "1080p": return { width: 1920, height: 1080 };
    case "720p": return { width: 1280, height: 720 };
  }
}

async function generateRemotionProject(job: RenderJob): Promise<string> {
  // In a real implementation, this would:
  // 1. Create a temporary directory
  // 2. Generate package.json with remotion dependencies
  // 3. Generate composition files from the VideoScript
  // 4. Generate component files for each scene type
  // 5. Return the project path
  
  const { width, height } = getResolutionDimensions(job.resolution);
  
  const projectStructure = {
    "package.json": generatePackageJson(job),
    "src/index.ts": generateIndexTs(job),
    "src/compositions/MainComposition.tsx": generateMainComposition(job),
    "src/components/SceneRenderer.tsx": generateSceneRenderer(),
    "src/components/sceneTypes/TitleScene.tsx": generateTitleSceneComponent(),
    "src/components/sceneTypes/CodeScene.tsx": generateCodeSceneComponent(),
    "src/components/sceneTypes/TerminalScene.tsx": generateTerminalSceneComponent(),
    "src/components/sceneTypes/StatsScene.tsx": generateStatsSceneComponent(),
    "src/components/sceneTypes/TextScene.tsx": generateTextSceneComponent(),
    "src/components/sceneTypes/LogoScene.tsx": generateLogoSceneComponent(),
    "src/components/sceneTypes/DiagramScene.tsx": generateDiagramSceneComponent(),
    "remotion.config.ts": generateRemotionConfig(job),
    "tsconfig.json": generateTsConfig(),
  };
  
  // In reality, write files to disk
  // For now, return a virtual path
  return `/tmp/remotion-${job.id}`;
}

function generatePackageJson(job: RenderJob): string {
  return JSON.stringify({
    name: `shipos-render-${job.id}`,
    version: "1.0.0",
    private: true,
    scripts: {
      "build": "remotion bundle",
      "render": "remotion render",
      "preview": "remotion preview",
    },
    dependencies: {
      "react": "^18.3.0",
      "react-dom": "^18.3.0",
      "remotion": "^4.0.257",
      "@remotion/cli": "^4.0.257",
      "@remotion/bundler": "^4.0.257",
      "@remotion/renderer": "^4.0.257",
      "lucide-react": "^0.460.0",
    },
    devDependencies: {
      "@remotion/tailwind": "^4.0.257",
      "typescript": "^5.6.3",
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1",
    },
  }, null, 2);
}

function generateIndexTs(job: RenderJob): string {
  const { width, height } = getResolutionDimensions(job.resolution);
  
  return `import { registerRoot } from "remotion";
import { MainComposition } from "./compositions/MainComposition";

registerRoot(() => (
  <MainComposition
    durationInFrames={${job.script.totalDuration * job.fps}}
    fps={${job.fps}}
    width={${width}}
    height={${height}}
  />
));`;
}

function generateMainComposition(job: RenderJob): string {
  return `import { useVideoConfig, sequence, Series } from "remotion";
import { SceneRenderer } from "../components/SceneRenderer";
import { acts } from "./script-data";

export const MainComposition: React.FC = () => {
  const videoConfig = useVideoConfig();
  
  return (
    <>
      {acts.map((act, actIndex) => (
        <Series key={act.id} from={act.startFrame}>
          {act.scenes.map((scene, sceneIndex) => (
            <SceneRenderer
              key={scene.id}
              scene={scene}
              actIndex={actIndex}
              sceneIndex={sceneIndex}
            />
          ))}
        </Series>
      ))}
    </>
  );
};

// This would be injected at build time
declare const acts: any[];`;
}

function generateSceneRenderer(): string {
  return `import { useCurrentFrame } from "remotion";
import { TitleScene } from "./sceneTypes/TitleScene";
import { CodeScene } from "./sceneTypes/CodeScene";
import { TerminalScene } from "./sceneTypes/TerminalScene";
import { StatsScene } from "./sceneTypes/StatsScene";
import { TextScene } from "./sceneTypes/TextScene";
import { LogoScene } from "./sceneTypes/LogoScene";
import { DiagramScene } from "./sceneTypes/DiagramScene";

interface SceneRendererProps {
  scene: any;
  actIndex: number;
  sceneIndex: number;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, actIndex, sceneIndex }) => {
  const frame = useCurrentFrame();
  const sceneStartFrame = scene.startFrame || 0;
  const sceneFrame = frame - sceneStartFrame;
  const progress = scene.durationInFrames > 0 ? sceneFrame / scene.durationInFrames : 0;
  
  if (progress < 0 || progress > 1) return null;
  
  const commonProps = {
    scene,
    progress,
    width: 1920,
    height: 1080,
  };
  
  switch (scene.type) {
    case "title":
      return <TitleScene {...commonProps} />;
    case "code":
      return <CodeScene {...commonProps} />;
    case "terminal":
      return <TerminalScene {...commonProps} />;
    case "stats":
      return <StatsScene {...commonProps} />;
    case "text":
      return <TextScene {...commonProps} />;
    case "logo":
      return <LogoScene {...commonProps} />;
    case "diagram":
      return <DiagramScene {...commonProps} />;
    default:
      return <TextScene {...commonProps} />;
  }
};`;
}

function generateTitleSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface TitleSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const TitleScene: React.FC<TitleSceneProps> = ({ scene, progress, width, height }) => {
  const opacity = Math.min(1, progress * 3);
  const content = scene.content;
  
  return (
    <div style={{
      width,
      height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#0f0f0f',
      color: 'white',
      opacity,
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 'bold', margin: 0 }}>
        {content.title}
      </h1>
      {content.subtitle && (
        <p style={{ fontSize: 24, color: '#a0a0a0', marginTop: 16 }}>
          {content.subtitle}
        </p>
      )}
    </div>
  );
};`;
}

function generateCodeSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface CodeSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const CodeScene: React.FC<CodeSceneProps> = ({ scene, progress, width, height }) => {
  const content = scene.content;
  const code = content.code || "";
  const lines = code.split("\\n");
  const visibleLines = Math.floor(progress * lines.length);
  
  return (
    <div style={{
      width: width * 0.8,
      height: height * 0.8,
      background: '#1e1e1e',
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.5,
    }}>
      <div style={{
        display: 'flex',
        background: '#2d2d2d',
        borderBottom: '1px solid #3a3a3a',
        padding: '8px 12px',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f57', marginRight: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e', marginRight: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#28ca42' }} />
      </div>
      <pre style={{ margin: 0, padding: 16, overflow: 'auto', height: 'calc(100% - 40px)' }}>
        {lines.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{ 
            color: '#d4d4d4',
            background: content.highlightLines?.includes(i + 1) ? 'rgba(255,255,0,0.1)' : 'transparent',
          }}>
            <span style={{ color: '#858585', marginRight: 16, userSelect: 'none' }}>
              {String(i + 1).padStart(3, ' ')}
            </span>
            {line}
          </div>
        ))}
      </pre>
    </div>
  );
};`;
}

function generateTerminalSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface TerminalSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const TerminalScene: React.FC<TerminalSceneProps> = ({ scene, progress, width, height }) => {
  const content = scene.content;
  const commands = content.commands || [];
  
  const totalLines = commands.reduce((acc: number, c: any) => acc + (c.output ? 2 : 1), 0);
  const visibleLines = Math.floor(progress * totalLines);
  
  let lineCount = 0;
  const output: React.ReactNode[] = [];
  
  for (const cmd of commands) {
    if (lineCount >= visibleLines) break;
    output.push(
      <div key={`cmd-${lineCount}`} style={{ display: 'flex', marginBottom: 4 }}>
        <span style={{ color: '#4ec9b0', marginRight: 8 }}>{content.prompt}</span>
        <span style={{ color: '#d4d4d4' }}>{cmd.command}</span>
      </div>
    );
    lineCount++;
    
    if (cmd.output && lineCount < visibleLines) {
      output.push(
        <div key={`out-${lineCount}`} style={{ marginLeft: 24, color: '#cccccc' }}>
          {cmd.output}
        </div>
      );
      lineCount++;
    }
  }
  
  return (
    <div style={{
      width: width * 0.7,
      height: height * 0.7,
      background: '#1e1e1e',
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.5,
    }}>
      <div style={{
        display: 'flex',
        background: '#3c3c3c',
        borderBottom: '1px solid #3a3a3a',
        padding: '8px 12px',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f57', marginRight: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e', marginRight: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#28ca42' }} />
        <span style={{ marginLeft: 12, color: '#cccccc' }}>Terminal</span>
      </div>
      <div style={{ padding: 16, overflow: 'auto', height: 'calc(100% - 40px)' }}>
        {output}
      </div>
    </div>
  );
};`;
}

function generateStatsSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface StatsSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const StatsScene: React.FC<StatsSceneProps> = ({ scene, progress, width, height }) => {
  const content = scene.content;
  const metrics = content.metrics || [];
  const layout = content.layout || 'grid';
  
  if (layout === 'grid') {
    const cols = Math.ceil(Math.sqrt(metrics.length));
    return (
      <div style={{
        width: width * 0.9,
        height: height * 0.8,
        display: 'grid',
        gridTemplateColumns: \`repeat(\${cols}, 1fr)\`,
        gap: 24,
        padding: 24,
      }}>
        {metrics.map((metric: any, i: number) => {
          if (i / metrics.length > progress) return null;
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>
                {metric.value}
              </div>
              <div style={{ fontSize: 14, color: '#a0a0a0', marginTop: 8 }}>
                {metric.label}
              </div>
              {metric.change && (
                <div style={{ 
                  fontSize: 14, 
                  marginTop: 8,
                  color: metric.change.startsWith('✓') ? '#22c55e' : '#f59e0b'
                }}>
                  {metric.change}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
  return null;
};`;
}

function generateTextSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface TextSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const TextScene: React.FC<TextSceneProps> = ({ scene, progress, width, height }) => {
  const content = scene.content;
  const lines = content.lines || [];
  const style = content.style || 'body';
  const alignment = content.alignment || 'center';
  
  const visibleLines = Math.floor(progress * lines.length);
  
  const styleMap: Record<string, React.CSSProperties> = {
    headline: { fontSize: 36, fontWeight: 'bold', color: 'white' },
    body: { fontSize: 20, color: '#e0e0e0' },
    caption: { fontSize: 14, color: '#888888' },
    quote: { fontSize: 24, fontStyle: 'italic', color: '#f59e0b' },
  };
  
  const textAlignMap: Record<string, 'left' | 'center' | 'right'> = {
    left: 'left',
    center: 'center',
    right: 'right',
  };
  
  return (
    <div style={{
      width: width * 0.8,
      height: height * 0.8,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: textAlignMap[alignment] === 'left' ? 'flex-start' : textAlignMap[alignment] === 'right' ? 'flex-end' : 'center',
      textAlign: textAlignMap[alignment],
      background: 'transparent',
    }}>
      {lines.slice(0, visibleLines).map((line: string, i: number) => (
        <div key={i} style={{
          ...styleMap[style],
          opacity: Math.min(1, (progress - i / lines.length) * lines.length),
          marginBottom: 16,
        }}>
          {line}
        </div>
      ))}
    </div>
  );
};`;
}

function generateLogoSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface LogoSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const LogoScene: React.FC<LogoSceneProps> = ({ scene, progress, width, height }) => {
  const content = scene.content;
  const animation = content.animation || 'fade';
  const size = Math.min(width, height) * 0.4;
  
  let opacity = 1;
  let scale = 1;
  
  if (animation === 'draw') {
    opacity = progress;
  } else if (animation === 'pulse') {
    opacity = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
  } else if (animation === 'scale') {
    scale = progress;
  }
  
  return (
    <div style={{
      width,
      height,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#0f0f0f',
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: \`scale(\${scale})\`,
        opacity,
      }}>
        <span style={{ fontSize: size * 0.5, fontWeight: 'bold', color: 'white' }}>
          {content.svg ? 'S' : 'S'}
        </span>
      </div>
    </div>
  );
};`;
}

function generateDiagramSceneComponent(): string {
  return `import { Canvas } from "remotion";

interface DiagramSceneProps {
  scene: any;
  progress: number;
  width: number;
  height: number;
}

export const DiagramScene: React.FC<DiagramSceneProps> = ({ scene, progress, width, height }) => {
  const steps = Math.floor(progress * 5);
  
  return (
    <div style={{
      width: width * 0.8,
      height: height * 0.8,
      background: '#1e1e1e',
      borderRadius: 8,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: i < steps ? 1 : 0.3,
            transition: 'opacity 0.3s',
          }}>
            <div style={{
              width: 120,
              height: 80,
              border: '2px solid #6366f1',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: i < steps ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            }}>
              <span style={{ color: 'white', fontSize: 14 }}>Step {i + 1}</span>
            </div>
            {i < 4 && (
              <div style={{
                width: 40,
                height: 2,
                background: '#6366f1',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  right: -5,
                  top: -4,
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid #6366f1',
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};`;
}

function generateRemotionConfig(job: RenderJob): string {
  return `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setChromiumOpenGlRenderer("angle");
Config.setChromiumDisableWebSecurity(true);
Config.setChromiumHeadless(true);`;
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      lib: ["DOM", "DOM.Iterable", "ES2020"],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      module: "ESNext",
      moduleResolution: "node",
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
    },
    include: ["src"],
  }, null, 2);
}

async function renderWithRemotion(job: RenderJob, projectPath: string): Promise<string> {
  // In a real implementation, this would call:
  // npx remotion render src/index.ts MainComposition output.mp4 --concurrency=4
  
  // For now, simulate rendering time
  const frames = job.script.totalDuration * job.fps;
  const estimatedSeconds = frames / 30 / 4; // 4x speed with concurrency
  
  await new Promise(r => setTimeout(r, Math.min(estimatedSeconds * 100, 5000)));
  
  return `/tmp/render-${job.id}.${job.format === "gif" ? "gif" : "webm"}`;
}

async function postProcess(job: RenderJob, inputPath: string): Promise<string> {
  // In a real implementation, this would use ffmpeg for:
  // - Format conversion
  // - Compression
  // - Adding metadata
  // - Generating thumbnails
  
  if (job.format === "mp4") {
    // ffmpeg -i input.webm -c:v libx264 -crf 23 -preset medium output.mp4
    return inputPath.replace(".webm", ".mp4");
  }
  if (job.format === "gif") {
    // ffmpeg -i input.webm -vf "fps=15,scale=640:-1:flags=lanczos" -c:v gif output.gif
    return inputPath.replace(".webm", ".gif");
  }
  return inputPath;
}

async function createBundle(job: RenderJob, renderPath: string): Promise<string> {
  // Create ZIP bundle with:
  // - Rendered video
  // - Thumbnails
  // - Metadata JSON
  // - Caption files (SRT, VTT)
  // - Script JSON
  
  const bundleName = `${job.script.metadata.repoName}-${job.resolution}-${job.format}.zip`;
  
  // In reality, use jszip to create bundle
  // For now, return a placeholder URL
  return `/api/render/${job.id}/bundle`;
}

async function getMetadata(filePath: string, job: RenderJob): Promise<RenderMetadata> {
  const { width, height } = getResolutionDimensions(job.resolution);
  
  return {
    duration: job.script.totalDuration,
    width,
    height,
    fps: job.fps,
    codec: job.format === "mp4" ? "h264" : "vp9",
    bitrate: job.resolution === "4k" ? 50000 : job.resolution === "1080p" ? 8000 : 4000,
    fileSize: Math.round(job.script.totalDuration * (job.resolution === "4k" ? 50000 : 8000) / 8),
    gpuSeconds: job.gpuSecondsUsed,
    cpuSeconds: job.script.totalDuration * 2,
    remotionVersion: "4.0.257",
    ffmpegVersion: "7.0",
  };
}

export async function generateHFBundle(job: RenderJob): Promise<Blob> {
  // Generate Hugging Face compatible bundle
  // Includes model card, video, metadata, captions
  
  const bundle = {
    modelCard: generateModelCard(job),
    video: job.bundleUrl,
    metadata: job.metadata,
    captions: job.script.captions,
    script: job.script,
  };
  
  return new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
}

function generateModelCard(job: RenderJob): string {
  return `---
license: ${job.script.metadata.license || "mit"}
tags:
  - demo
  - ${job.script.metadata.repoName}
  - ${job.resolution}
  - generated
---

# ${job.script.metadata.repoName} Demo

Auto-generated demo video for [${job.script.metadata.repoName}](${job.script.metadata.repoUrl}).

## Video Details

- **Duration**: ${job.script.totalDuration}s
- **Resolution**: ${job.resolution}
- **Format**: ${job.format}
- **FPS**: ${job.fps}
- **Style**: ${job.script.metadata.style}

## Repository Stats

- ⭐ Stars: ${job.script.metadata.auditFacts.stars}
- 🍴 Forks: ${job.script.metadata.auditFacts.forks}
- 📝 License: ${job.script.metadata.auditFacts.license}
- 🏷️ Topics: ${job.script.metadata.auditFacts.topics.join(", ")}

## Generation

Generated by [ShipOS](https://github.com/shipos/shipos) Render Cloud.
`;
}