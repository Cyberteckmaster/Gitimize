"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { VideoScript, Scene, Act } from "./story-engine";

export interface CinemaCanvasProps {
  script: VideoScript;
  width?: number;
  height?: number;
  onFrame?: (frame: number, totalFrames: number) => void;
  onComplete?: () => void;
}

export interface CinemaPlayerState {
  status: "idle" | "playing" | "paused" | "recording" | "exporting";
  currentTime: number;
  currentAct: number;
  currentScene: number;
  progress: number;
  fps: number;
  recordingBlob?: Blob;
}

export function useCinemaCanvas(script: VideoScript) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CinemaPlayerState>({
    status: "idle",
    currentTime: 0,
    currentAct: 0,
    currentScene: 0,
    progress: 0,
    fps: 30,
  });
  
  const animationRef = useRef<number>();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  
  const totalFrames = script.totalDuration * 30;
  
  const getCurrentActAndScene = useCallback((time: number) => {
    let accumulated = 0;
    for (let actIndex = 0; actIndex < script.acts.length; actIndex++) {
      const act = script.acts[actIndex];
      for (let sceneIndex = 0; sceneIndex < act.scenes.length; sceneIndex++) {
        const scene = act.scenes[sceneIndex];
        if (time < accumulated + scene.duration) {
          return { actIndex, sceneIndex, scene, sceneStartTime: accumulated };
        }
        accumulated += scene.duration;
      }
    }
    return { actIndex: script.acts.length - 1, sceneIndex: script.acts[script.acts.length - 1].scenes.length - 1, scene: script.acts[script.acts.length - 1].scenes[script.acts[script.acts.length - 1].scenes.length - 1], sceneStartTime: accumulated };
  }, [script]);
  
  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { width, height } = canvasRef.current || { width: 1920, height: 1080 };
    const { actIndex, sceneIndex, scene, sceneStartTime } = getCurrentActAndScene(time);
    const sceneProgress = (time - sceneStartTime) / scene.duration;
    
    // Clear
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, width, height);
    
    // Render scene
    renderScene(ctx, scene, width, height, sceneProgress);
    
    // Update state
    setState(s => ({
      ...s,
      currentTime: time,
      currentAct: actIndex,
      currentScene: sceneIndex,
      progress: time / script.totalDuration,
    }));
  }, [getCurrentActAndScene, script.totalDuration]);
  
  const animate = useCallback((timestamp: number) => {
    if (!canvasRef.current) return;
    
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const frame = Math.floor(elapsed * 30);
    
    if (frame >= totalFrames) {
      setState(s => ({ ...s, status: "idle", currentTime: script.totalDuration, progress: 1 }));
      if (state.status === "recording") {
        stopRecording();
      }
      if (state.status === "playing") {
        // Call onComplete callback
      }
      return;
    }
    
    frameRef.current = frame;
    const time = frame / 30;
    
    const ctx = canvasRef.current.getContext("2d")!;
    renderFrame(ctx, time);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [renderFrame, totalFrames, script.totalDuration, state.status]);
  
  const play = useCallback(() => {
    if (state.status === "playing") return;
    
    setState(s => ({ ...s, status: "playing" }));
    startTimeRef.current = performance.now() - state.currentTime * 1000;
    animationRef.current = requestAnimationFrame(animate);
  }, [state.status, state.currentTime, animate]);
  
  const pause = useCallback(() => {
    if (state.status !== "playing") return;
    
    setState(s => ({ ...s, status: "paused" }));
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [state.status]);
  
  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(script.totalDuration, time));
    setState(s => ({ ...s, currentTime: clampedTime }));
    startTimeRef.current = performance.now() - clampedTime * 1000;
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")!;
      renderFrame(ctx, clampedTime);
    }
  }, [script.totalDuration, renderFrame]);
  
  const startRecording = useCallback(async () => {
    if (!canvasRef.current) return;
    
    const stream = canvasRef.current.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 8000000,
    });
    
    chunksRef.current = [];
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setState(s => ({ ...s, recordingBlob: blob, status: "idle" }));
    };
    
    recorderRef.current = recorder;
    recorder.start(100);
    
    setState(s => ({ ...s, status: "recording" }));
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);
  
  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);
  
  const exportVideo = useCallback(async (): Promise<Blob> => {
    // For high-quality export, we render frame by frame
    // This is slower but produces better quality
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 16000000,
    });
    
    const chunks: BlobPart[] = [];
    
    return new Promise((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
      
      recorder.onerror = reject;
      
      recorder.start(100);
      
      // Render all frames as fast as possible
      let frame = 0;
      const renderNext = () => {
        if (frame >= totalFrames) {
          recorder.stop();
          return;
        }
        
        const time = frame / 30;
        renderFrame(ctx, time);
        frame++;
        
        // Use setTimeout(0) to yield to event loop
        setTimeout(renderNext, 0);
      };
      
      renderNext();
    });
  }, [totalFrames, renderFrame]);
  
  const downloadRecording = useCallback(() => {
    if (state.recordingBlob) {
      const url = URL.createObjectURL(state.recordingBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${script.metadata.repoName}-demo.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [state.recordingBlob, script.metadata.repoName]);
  
  return {
    canvasRef,
    state,
    play,
    pause,
    seek,
    startRecording,
    stopRecording,
    exportVideo,
    downloadRecording,
  };
}

function renderScene(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  // Reuse the same rendering logic from demo-engine
  // This is a simplified version - in reality, import from demo-engine
  switch (scene.type) {
    case "title":
      renderTitle(ctx, scene, w, h, progress);
      break;
    case "code":
      renderCode(ctx, scene, w, h, progress);
      break;
    case "terminal":
      renderTerminal(ctx, scene, w, h, progress);
      break;
    case "stats":
      renderStats(ctx, scene, w, h, progress);
      break;
    case "text":
      renderText(ctx, scene, w, h, progress);
      break;
    case "logo":
      renderLogo(ctx, scene, w, h, progress);
      break;
    case "diagram":
      renderDiagram(ctx, scene, w, h, progress);
      break;
  }
}

function renderTitle(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
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

function renderCode(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const code = content.code || "";
  const lines = code.split("\n");
  
  ctx.fillStyle = "#1e1e1e";
  const editorH = Math.min(h * 0.8, lines.length * 24 + 40);
  const editorY = (h - editorH) / 2;
  ctx.fillRect(w * 0.1, editorY, w * 0.8, editorH);
  
  ctx.fillStyle = "#3a3d41";
  ctx.fillRect(w * 0.1, editorY, 60, editorH);
  
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#d4d4d4";
  
  const visibleLines = Math.floor(progress * lines.length);
  for (let i = 0; i < visibleLines && i < lines.length; i++) {
    const y = editorY + 30 + i * 24;
    if (y > editorY + editorH - 20) break;
    
    ctx.fillStyle = "#858585";
    ctx.fillText(String(i + 1).padStart(3), w * 0.1 + 10, y);
    
    ctx.fillStyle = "#d4d4d4";
    ctx.fillText(lines[i], w * 0.1 + 70, y);
  }
  
  if (content.highlightLines) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
    for (const line of content.highlightLines) {
      const y = editorY + 10 + line * 24;
      ctx.fillRect(w * 0.1, y, w * 0.8, 24);
    }
  }
}

function renderTerminal(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const commands = content.commands || [];
  
  ctx.fillStyle = "#1e1e1e";
  const termH = h * 0.7;
  const termY = (h - termH) / 2;
  ctx.fillRect(w * 0.15, termY, w * 0.7, termH);
  
  ctx.fillStyle = "#3c3c3c";
  ctx.fillRect(w * 0.15, termY, w * 0.7, 30);
  ctx.fillStyle = "#cccccc";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Terminal", w * 0.15 + 15, termY + 20);
  
  ctx.font = "14px 'JetBrains Mono', monospace";
  let y = termY + 50;
  
  const totalOutputLines = commands.reduce((acc, c) => acc + (c.output ? 1 : 0) + 1, 0);
  const visibleLines = Math.floor(progress * totalOutputLines);
  let lineCount = 0;
  
  for (const cmd of commands) {
    if (lineCount >= visibleLines) break;
    
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

function renderStats(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
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
      
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y, cardW - 40, cardH - 40);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(metric.value), x + (cardW - 40) / 2, y + 50);
      
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

function renderText(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
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

function renderLogo(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  const content = scene.content;
  const animation = content.animation || "fade";
  
  const size = Math.min(w, h) * 0.4;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  
  if (animation === "draw") {
    ctx.globalAlpha = progress;
  } else if (animation === "pulse") {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
  }
  
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

function renderDiagram(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, progress: number): void {
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  
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

export function CinemaCanvas({ script, width = 1920, height = 1080 }: CinemaCanvasProps) {
  const { canvasRef, state, play, pause, seek, startRecording, stopRecording, exportVideo, downloadRecording } = useCinemaCanvas(script);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: "1px solid #333", borderRadius: 8, background: "#0f0f0f" }}
      />
      
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={play} disabled={state.status === "playing"}>
          ▶ Play
        </button>
        <button onClick={pause} disabled={state.status !== "playing"}>
          ⏸ Pause
        </button>
        <button onClick={startRecording} disabled={state.status === "recording"}>
          🔴 Record
        </button>
        <button onClick={stopRecording} disabled={state.status !== "recording"}>
          ⏹ Stop
        </button>
        <button onClick={exportVideo} disabled={state.status !== "idle"}>
          💾 Export HQ
        </button>
        <button onClick={downloadRecording} disabled={!state.recordingBlob}>
          ⬇ Download
        </button>
      </div>
      
      <div style={{ width: "100%", maxWidth: width }}>
        <input
          type="range"
          min={0}
          max={script.totalDuration}
          step={0.1}
          value={state.currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
          <span>Act {state.currentAct + 1} / {script.acts.length}</span>
          <span>Scene {state.currentScene + 1}</span>
          <span>{state.currentTime.toFixed(1)}s / {script.totalDuration}s</span>
          <span>{(state.progress * 100).toFixed(0)}%</span>
        </div>
      </div>
      
      <div style={{ fontSize: 12, color: "#888", textAlign: "center" }}>
        <p>Resolution: {width}×{height} @ 30fps</p>
        <p>Total: {script.acts.length} acts, {script.acts.reduce((a, b) => a + b.scenes.length, 0)} scenes</p>
      </div>
    </div>
  );
}