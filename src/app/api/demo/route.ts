import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestRepo } from "@/lib/shipos/ingest";
import { runAudit } from "@/lib/shipos/audit";
import { createDemoJob, getDemoJob, listDemoJobs, deleteDemoJob } from "@/lib/shipos/demo-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, targetSeconds = 300, style = "launch" } = body;
    
    if (!repoUrl) {
      return NextResponse.json({ ok: false, error: "repoUrl is required" }, { status: 400 });
    }
    
    const demoJob = await createDemoJob({ repoUrl, targetSeconds, style });
    
    const job = await prisma.job.create({
      data: {
        type: "DEMO",
        status: "PENDING",
        input: body,
        project: {
          connectOrCreate: {
            where: { repoUrl },
            create: { repoUrl, repoName: "", owner: "" },
          },
        },
      },
    });
    
    // Sync demo job with our internal tracking
    setTimeout(() => syncDemoJob(job.id, demoJob.id), 100);
    
    return NextResponse.json({ ok: true, id: job.id, demoId: demoJob.id });
  } catch (error) {
    console.error("Demo API error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

async function syncDemoJob(jobId: string, demoId: string) {
  const demoJob = getDemoJob(demoId);
  if (demoJob) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: demoJob.status === "completed" ? "COMPLETED" : demoJob.status === "failed" ? "FAILED" : "RUNNING",
        stage: demoJob.status,
        progress: demoJob.progress,
        output: demoJob.webmUrl ? { webmUrl: demoJob.webmUrl } : undefined,
      },
    });
    
    if (demoJob.status !== "completed" && demoJob.status !== "failed") {
      setTimeout(() => syncDemoJob(jobId, demoId), 2000);
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (id) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: { project: true },
    });
    
    if (!job) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, job });
  }
  
  const jobs = await prisma.job.findMany({
    where: { type: "DEMO" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { project: true },
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