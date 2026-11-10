import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestRepo, ingestFromFileList } from "@/lib/shipos/ingest";
import { runAudit } from "@/lib/shipos/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, fileList, strictness = "balanced" } = body;
    
    const job = await prisma.job.create({
      data: {
        type: "AUDIT",
        status: "PENDING",
        input: body,
        project: repoUrl ? {
          connectOrCreate: {
            where: { repoUrl },
            create: { repoUrl, repoName: "", owner: "" },
          },
        } : undefined,
      },
    });
    
    processAuditJob(job.id, repoUrl, fileList, strictness).catch(console.error);
    
    return NextResponse.json({ ok: true, id: job.id });
  } catch (error) {
    console.error("Audit API error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

async function processAuditJob(jobId: string, repoUrl: string | undefined, fileList: any[], strictness: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", stage: "ingesting", startedAt: new Date() },
  });
  
  try {
    let facts;
    
    if (fileList && fileList.length > 0) {
      facts = await ingestFromFileList(fileList);
    } else if (repoUrl) {
      facts = await ingestRepo(repoUrl);
    } else {
      throw new Error("Either repoUrl or fileList is required");
    }
    
    await prisma.job.update({
      where: { id: jobId },
      data: { stage: "auditing", progress: 50 },
    });
    
    const audit = await runAudit(facts, strictness as any);
    
    if (repoUrl) {
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
    }
    
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        stage: "done",
        progress: 100,
        output: audit,
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
    where: { type: "AUDIT" },
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