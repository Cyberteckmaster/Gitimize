import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestRepo } from "@/lib/shipos/ingest";
import { runOptimization } from "@/lib/shipos/optimizer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl } = body;
    
    if (!repoUrl) {
      return NextResponse.json({ ok: false, error: "repoUrl is required" }, { status: 400 });
    }
    
    const job = await prisma.job.create({
      data: {
        type: "OPTIMIZE",
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
    
    processOptimizeJob(job.id, repoUrl).catch(console.error);
    
    return NextResponse.json({ ok: true, id: job.id });
  } catch (error) {
    console.error("Optimize API error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

async function processOptimizeJob(jobId: string, repoUrl: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", stage: "ingesting", startedAt: new Date() },
  });
  
  try {
    const facts = await ingestRepo(repoUrl);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { stage: "optimizing", progress: 50 },
    });
    
    const optimization = await runOptimization(facts);
    
    await prisma.project.update({
      where: { repoUrl },
      data: {
        repoName: facts.repo,
        owner: facts.owner,
        description: facts.description,
        stars: facts.stars,
        forks: facts.forks,
        language: facts.language,
        topics: facts.topics,
        defaultBranch: facts.defaultBranch,
        license: facts.license,
        homepage: facts.homepage,
        lastSyncedAt: new Date(),
      },
    });
    
    await prisma.optimization.create({
      data: {
        projectId: (await prisma.project.findUnique({ where: { repoUrl } }))!.id,
        seoScore: optimization.seo.score,
        aeoScore: optimization.aeo.score,
        geoScore: optimization.geo.score,
        overallScore: optimization.overallScore,
        pack: optimization,
        recommendations: optimization.recommendations,
      },
    });
    
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        stage: "done",
        progress: 100,
        output: optimization,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
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
    where: { type: "OPTIMIZE" },
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