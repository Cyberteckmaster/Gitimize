"use client";

import { useState, useCallback } from "react";
import { Button, Card, Input, Badge, Tabs, TabPanel, Progress, Alert, Select, Avatar, Tooltip } from "@/ui/components";
import { cn, formatNumber, generateId, parseRepoUrl } from "@/ui/utils";
import { 
  Github, Zap, Search, Video, Image, BarChart, Shield, 
  Star, Fork, Code, FileText, Settings, Rocket,
  CheckCircle, AlertCircle, Loader2, Download,
  ChevronRight, ExternalLink, Copy, Eye, Edit,
  Trash2, Clock, RotateCcw, Info, Layers
} from "lucide-react";

const MODES = [
  { id: "full-package", name: "Full Package", icon: Rocket, description: "One URL → README, demo, pitch, report, SEO, health, ledger, export", gradient: "from-primary to-secondary" },
  { id: "full-repo-auditor", name: "Full Repo Auditor", icon: Search, description: "50 checks × 100 points across Docs, Code, Security, DevOps, Community", gradient: "from-secondary to-accent" },
  { id: "optimization-engine", name: "Optimization Engine", icon: BarChart, description: "SEO/AEO/GEO 0-100 scoring + 54-point pack to 100/100/100", gradient: "from-accent to-primary" },
  { id: "demo-maker", name: "Demo Maker", icon: Video, description: "5-min demo film: 10 acts, 300s schema, LLM voiceover, WebM export", gradient: "from-purple-500 to-pink-500" },
  { id: "readme-upgrader", name: "README Upgrader", icon: FileText, description: "Zero-trust README audit across 8 categories → 100/100 README", gradient: "from-green-500 to-teal-500" },
  { id: "video-studio", name: "Video Studio (Path A)", icon: Image, description: "Cinematic canvas + browser recorder. Edit, play, export WebM — $0", gradient: "from-orange-500 to-red-500" },
  { id: "render-cloud", name: "Render Cloud (Path B)", icon: Zap, description: "Real 4K pipeline on free GPU quotas, ZIP bundle with deploy files", gradient: "from-cyan-500 to-blue-500" },
  { id: "competitor-radar", name: "Competitor Radar", icon: Shield, description: "Repo-to-video field mapped: 15 tools, 5 categories, 11-capability matrix", gradient: "from-indigo-500 to-purple-500" },
  { id: "pro", name: "PRO", icon: Settings, description: "4K renders, scheduled audits, public API keys, team seats", gradient: "from-amber-500 to-orange-500" },
];

const PRESETS = [
  { id: "meta-hackathon", name: "Meta Hackathon", description: "Optimized for hackathon submissions" },
  { id: "launch-week", name: "Launch Week", description: "Maximum visibility for product launches" },
  { id: "oss-showcase", name: "OSS Showcase", description: "Open source project presentation" },
  { id: "technical-deep-dive", name: "Technical Deep Dive", description: "Code-focused technical presentation" },
];

export default function HomePage() {
  const [activeMode, setActiveMode] = useState("full-package");
  const [repoUrl, setRepoUrl] = useState("");
  const [preset, setPreset] = useState("meta-hackathon");
  const [strictness, setStrictness] = useState("balanced");
  const [targetSeconds, setTargetSeconds] = useState(300);
  const [style, setStyle] = useState("launch");
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const validateUrl = (url: string) => {
    const parsed = parseRepoUrl(url);
    return parsed !== null;
  };

  const handleSubmit = async (mode: string) => {
    if (!validateUrl(repoUrl)) {
      addLog("❌ Invalid GitHub URL");
      return;
    }

    setIsProcessing(true);
    const jobId = generateId("job");
    
    try {
      let endpoint = "";
      let body: any = { repoUrl };

      switch (mode) {
        case "full-package":
          endpoint = "/api/ship";
          body.preset = preset;
          break;
        case "full-repo-auditor":
          endpoint = "/api/audit";
          body.strictness = strictness;
          break;
        case "optimization-engine":
          endpoint = "/api/optimize";
          break;
        case "demo-maker":
          endpoint = "/api/demo";
          body.targetSeconds = targetSeconds;
          body.style = style;
          break;
        case "readme-upgrader":
          endpoint = "/api/upgrade";
          break;
        case "video-studio":
          addLog("🎬 Opening Video Studio...");
          return;
        case "render-cloud":
          endpoint = "/api/render";
          break;
        case "competitor-radar":
          addLog("📊 Loading Competitor Radar...");
          return;
        case "pro":
          addLog("🔒 PRO features require authentication");
          return;
      }

      addLog(`🚀 Starting ${MODES.find(m => m.id === mode)?.name} job...`);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      if (data.ok) {
        addLog(`✅ Job created: ${data.id}`);
        pollJob(data.id, mode);
      } else {
        addLog(`❌ Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pollJob = async (jobId: string, mode: string) => {
    const endpointMap: Record<string, string> = {
      "full-package": "/api/ship",
      "full-repo-auditor": "/api/audit",
      "optimization-engine": "/api/optimize",
      "demo-maker": "/api/demo",
      "readme-upgrader": "/api/upgrade",
      "render-cloud": "/api/render",
    };

    const endpoint = endpointMap[mode];
    if (!endpoint) return;

    const poll = async () => {
      try {
        const response = await fetch(`${endpoint}/${jobId}`);
        const data = await response.json();
        
        setJobs(prev => ({ ...prev, [jobId]: data }));
        
        if (data.status === "completed") {
          addLog(`🎉 Job completed: ${jobId}`);
          if (data.output?.bundleUrl) {
            addLog(`📦 Bundle: ${data.output.bundleUrl}`);
          }
          if (data.output?.webmUrl) {
            addLog(`🎬 Video: ${data.output.webmUrl}`);
          }
        } else if (data.status === "failed") {
          addLog(`💥 Job failed: ${data.error || "Unknown error"}`);
        } else {
          addLog(`⏳ ${data.stage || data.status}: ${data.progress}%`);
          setTimeout(poll, 2000);
        }
      } catch (error) {
        addLog(`❌ Poll error: ${error instanceof Error ? error.message : "Unknown"}`);
      }
    };

    poll();
  };

  const ModeCard = ({ mode, isActive, onClick }: { mode: typeof MODES[0]; isActive: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-200 text-left group",
        "hover:shadow-lg hover:-translate-y-1",
        isActive
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-outline-variant bg-surface-elevated hover:border-outline"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-3 rounded-lg", mode.gradient)}>
          <mode.icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">
            {mode.name}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
            {mode.description}
          </p>
        </div>
        {isActive && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface-elevated/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container-wide px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-on-surface">ShipOS</h1>
                <p className="text-xs text-on-surface-variant">Universal Submission Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" dot>v1.0.0</Badge>
              <a href="https://github.com/shipos/shipos" target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
                <Github className="w-4 h-4 mr-1" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container-wide py-8 px-4">
        {/* Mode Rail */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-on-surface">Choose Your Mode</h2>
            <Badge variant="secondary">9 Modes</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODES.map(mode => (
              <ModeCard
                key={mode.id}
                mode={mode}
                isActive={activeMode === mode.id}
                onClick={() => setActiveMode(mode.id)}
              />
            ))}
          </div>
        </section>

        {/* Input Section */}
        <Card className="mb-8" padding="lg">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="repo-url" className="label">GitHub Repository URL</label>
              <div className="relative">
                <Input
                  id="repo-url"
                  type="url"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  leftIcon={<Github className="w-5 h-5" />}
                  error={repoUrl && !validateUrl(repoUrl) ? "Invalid GitHub URL format" : undefined}
                />
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                Supports github.com/owner/repo, github.com/owner/repo.git, or just owner/repo
              </p>
            </div>
            
            <div>
              <label htmlFor="preset" className="label">Preset / Options</label>
              <Select
                id="preset"
                value={preset}
                onChange={e => setPreset(e.target.value)}
                options={PRESETS.map(p => ({ value: p.id, label: p.name }))}
                placeholder="Select preset"
              />
            </div>
          </div>

          {/* Mode-specific options */}
          {(activeMode === "full-repo-auditor" || activeMode === "demo-maker") && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {activeMode === "full-repo-auditor" && (
                <>
                  <Select
                    label="Strictness"
                    value={strictness}
                    onChange={e => setStrictness(e.target.value as any)}
                    options={[
                      { value: "lenient", label: "Lenient - Fewer checks, faster" },
                      { value: "balanced", label: "Balanced - Standard audit" },
                      { value: "strict", label: "Strict - All checks, zero tolerance" },
                    ]}
                  />
                </>
              )}
              {activeMode === "demo-maker" && (
                <>
                  <div>
                    <label htmlFor="target-seconds" className="label">Target Duration</label>
                    <Select
                      id="target-seconds"
                      value={targetSeconds.toString()}
                      onChange={e => setTargetSeconds(parseInt(e.target.value))}
                      options={[
                        { value: "60", label: "60s - Quick teaser" },
                        { value: "150", label: "150s - Standard demo" },
                        { value: "300", label: "300s - Full 5-min film" },
                      ]}
                    />
                  </div>
                  <Select
                    label="Style"
                    value={style}
                    onChange={e => setStyle(e.target.value as any)}
                    options={[
                      { value: "launch", label: "Launch - Hook, demo, features, CTA" },
                      { value: "technical", label: "Technical - Architecture, code, API" },
                      { value: "story", label: "Story - Origin, problem, journey, vision" },
                      { value: "minimal", label: "Minimal - What, demo, install, links" },
                    ]}
                  </Select>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            size="lg"
            onClick={() => handleSubmit(activeMode)}
            disabled={isProcessing || !repoUrl || !validateUrl(repoUrl)}
            icon={<Zap className="w-5 h-5" />}
          >
            {isProcessing ? "Processing..." : `Run ${MODES.find(m => m.id === activeMode)?.name}`}
          </Button>
          
          {activeMode === "video-studio" && (
            <Button variant="outline" onClick={() => addLog("🎬 Video Studio - Path A (Browser)")}>
              <Image className="w-5 h-5" />
              Open Video Studio
            </Button>
          )}
          
          {activeMode === "competitor-radar" && (
            <Button variant="outline" onClick={() => addLog("📊 Competitor Radar loaded")}>
              <Shield className="w-5 h-5" />
              View Radar
            </Button>
          )}

          <Button variant="ghost" onClick={() => setLogs([])}>
            <RotateCcw className="w-5 h-5" />
            Clear Logs
          </Button>
        </div>

        {/* Jobs & Logs */}
        <Tabs
          tabs={[
            { id: "jobs", label: "Jobs", icon: <Layers className="w-4 h-4" /> },
            { id: "logs", label: "Logs", icon: <FileText className="w-4 h-4" /> },
          ]}
          defaultTab="jobs"
        >
          <TabPanel tabId="jobs" activeTab={activeMode}>
            <div className="space-y-4">
              {Object.entries(jobs).length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No jobs yet. Enter a repo URL and click Run.</p>
                </div>
              ) : (
                Object.entries(jobs).map(([id, job]) => (
                  <Card key={id} className="overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-outline-variant">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{MODES.find(m => m.id === activeMode)?.name}</p>
                          <p className="text-sm text-on-surface-variant">{id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "error" : "info"}>
                          {job.status}
                        </Badge>
                        {job.progress !== undefined && (
                          <Progress value={job.progress} size="sm" showLabel className="w-32" />
                        )}
                      </div>
                    </div>
                    {job.output && (
                      <div className="p-4 border-t border-outline-variant">
                        <div className="flex flex-wrap gap-2">
                          {job.output.bundleUrl && (
                            <Button variant="outline" size="sm" onClick={() => window.open(job.output.bundleUrl, "_blank")}>
                              <Download className="w-4 h-4" />
                              Bundle
                            </Button>
                          )}
                          {job.output.webmUrl && (
                            <Button variant="outline" size="sm" onClick={() => window.open(job.output.webmUrl, "_blank")}>
                              <Video className="w-4 h-4" />
                              Video
                            </Button>
                          )}
                          {job.output.reportUrl && (
                            <Button variant="outline" size="sm" onClick={() => window.open(job.output.reportUrl, "_blank")}>
                              <ExternalLink className="w-4 h-4" />
                              Report
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabPanel>
          
          <TabPanel tabId="logs" activeTab={activeMode}>
            <Card className="max-h-96 overflow-y-auto">
              <div className="p-4 font-mono text-sm text-on-surface-variant bg-surface-variant rounded-t-lg border-b border-outline-variant">
                <div className="flex items-center justify-between">
                  <span>Console Output</span>
                  <Badge variant="secondary">{logs.length} entries</Badge>
                </div>
              </div>
              <div className="p-4 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-8">No logs yet. Start a job to see output.</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="py-1 border-b border-outline-variant/50 last:border-0">
                      <span className="text-on-surface-variant/50">[{new Date().toLocaleTimeString()}]</span>
                      <span className="ml-2">{log}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabPanel>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-surface-elevated/50 py-8">
        <div className="container-wide px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-3">ShipOS</h4>
              <p className="text-sm text-on-surface-variant">
                The Universal Submission Engine. One URL → Complete launch kit.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Modes</h4>
              <ul className="space-y-1 text-sm text-on-surface-variant">
                {MODES.slice(0, 4).map(m => <li key={m.id}>{m.name}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">More Modes</h4>
              <ul className="space-y-1 text-sm text-on-surface-variant">
                {MODES.slice(4).map(m => <li key={m.id}>{m.name}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Links</h4>
              <ul className="space-y-1 text-sm">
                <li><a href="https://github.com/shipos/shipos" target="_blank" rel="noopener" className="link">GitHub</a></li>
                <li><a href="/docs" className="link">Documentation</a></li>
                <li><a href="/api" className="link">API Reference</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-outline-variant text-center text-sm text-on-surface-variant">
            <p>MIT Licensed • Built with Next.js 16, TypeScript, Tailwind 4, Prisma, Bun</p>
          </div>
        </div>
      </footer>
    </div>
  );
}