import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRenderJob, getRenderJob, listRenderJobs, getQuotaStatus } from "@/lib/shipos/render-worker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, format = "webm", resolution = "1080p", fps = 30 } = body;
    
    if (!script) {
      return NextResponse.json({ ok: false, error: "script is required" }, { status: 400 });
    }
    
    const quota = await getQuotaStatus();
    const estimatedGpu = script.totalDuration * (resolution === "4k" ? 2 : resolution === "1080p" ? 0.5 : 0.2);
    
    if (!quota.canRender || quota.remainingGpuSeconds < estimatedGpu) {
      return NextResponse.json({ 
        ok: false, 
        error: `Insufficient GPU quota. Need ${Math.ceil(estimatedGpu)}s, have ${quota.remainingGpuSeconds}s. Resets at ${quota.nextReset}` 
      }, { status: 429 });
    }
    
    const renderJob = await createRenderJob(script, { format, resolution, fps });
    
    const job = await prisma.job.create({
      data: {
        type: "RENDER",
        status: "PENDING",
        input: body,
      },
    });
    
    setTimeout(() => syncRenderJob(job.id, renderJob.id), 100);
    
    return NextResponse.json({ ok: true, id: job.id, renderId: renderJob.id });
  } catch (error) {
    console.error("Render API error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

async function syncRenderJob(jobId: string, renderId: string) {
  const renderJob = getRenderJob(renderId);
  if (renderJob) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: renderJob.status === "completed" ? "COMPLETED" : renderJob.status === "failed" ? "FAILED" : "RUNNING",
        stage: renderJob.status,
        progress: renderJob.progress,
        output: renderJob.bundleUrl ? { bundleUrl: renderJob.bundleUrl, metadata: renderJob.metadata } : undefined,
      },
    });
    
    if (renderJob.status !== "completed" && renderJob.status !== "failed") {
      setTimeout(() => syncRenderJob(jobId, renderId), 3000);
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const quota = searchParams.get("quota");
  
  if (quota === "true") {
    const status = await getQuotaStatus();
    return NextResponse.json({ ok: true, quota: status });
  }
  
  if (id) {
    const job = await prisma.job.findUnique({
      where: { id },
    });
    
    if (!job) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, job });
  }
  
  const jobs = await prisma.job.findMany({
    where: { type: "RENDER" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  
  return NextResponse.json({ ok: true, jobs });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }
  
  await prisma.job.delete({ where: { id } });
  
  return NextResponse.json({ ok: true });
}