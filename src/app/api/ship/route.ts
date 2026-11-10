import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestRepo } from "@/lib/shipos/ingest";
import { runAudit } from "@/lib/shipos/audit";
import { generateAllArtifacts } from "@/lib/shipos/fixes";
import { runOptimization } from "@/lib/shipos/optimizer";
import { generateOptimizationArtifacts } from "@/lib/shipos/optimizer";
import { createDemoJob, getDemoJob, listDemoJobs, deleteDemoJob } from "@/lib/shipos/demo-engine";
import { createRenderJob, getRenderJob, listRenderJobs, getQuotaStatus } from "@/lib/shipos/render-worker";
import { generateReadme } from "@/lib/shipos/fixes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, preset = "meta-hackathon" } = body;
    
    if (!repoUrl) {
      return NextResponse.json({ ok: false, error: "repoUrl is required" }, { status: 400 });
    }
    
    const job = await prisma.job.create({
      data: {
        type: "SHIP",
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
    
    // Process asynchronously
    processShipJob(job.id, repoUrl, preset).catch(console.error);
    
    return NextResponse.json({ ok: true, id: job.id });
  } catch (error) {
    console.error("Ship API error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

async function processShipJob(jobId: string, repoUrl: string, preset: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", stage: "ingesting", startedAt: new Date() },
  });
  
  try {
    // Ingest
    const facts = await ingestRepo(repoUrl);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { stage: "auditing", progress: 20 },
    });
    
    // Audit
    const audit = await runAudit(facts, "balanced");
    
    await prisma.job.update({
      where: { id: jobId },
      data: { stage: "optimizing", progress: 40 },
    });
    
    // Optimize
    const optimization = await runOptimization(facts);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { stage: "generating", progress: 60 },
    });
    
    // Generate artifacts
    const artifacts = generateAllArtifacts(facts, audit);
    const optArtifacts = generateOptimizationArtifacts(optimization);
    
    // Generate README
    const readme = generateReadme(facts, audit);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { stage: "finalizing", progress: 80 },
    });
    
    // Update project with facts
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
    
    // Save audit
    await prisma.audit.create({
      data: {
        projectId: (await prisma.project.findUnique({ where: { repoUrl } }))!.id,
        score: audit.score,
        grade: audit.grade,
        checks: audit.checks,
        summary: audit.summary,
        fixes: audit.fixes,
        strictness: audit.strictness.toUpperCase() as any,
        source: audit.source.toUpperCase() as any,
      },
    });
    
    // Save optimization
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
    
    // Save upgrade
    await prisma.upgrade.create({
      data: {
        projectId: (await prisma.project.findUnique({ where: { repoUrl } }))!.id,
        originalReadme: facts.readme || "",
        upgradedReadme: readme,
        changes: artifacts.map(a => ({ path: a.path, description: a.description })),
        scoreBefore: 0,
        scoreAfter: 100,
        categories: audit.summary,
      },
    });
    
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        stage: "done",
        progress: 100,
        output: {
          audit,
          optimization,
          readme,
          artifacts: [...artifacts, ...optArtifacts].map(a => ({ path: a.path, description: a.description })),
          bundleUrl: `/api/ship/${jobId}/bundle`,
        },
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
    where: { type: "SHIP" },
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