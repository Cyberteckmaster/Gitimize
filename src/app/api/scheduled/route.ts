import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (id) {
    const scheduled = await prisma.scheduledAudit.findUnique({
      where: { id },
      include: { proLicense: true },
    });
    
    if (!scheduled) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, scheduled });
  }
  
  const scheduled = await prisma.scheduledAudit.findMany({
    where: { enabled: true },
    orderBy: { nextRunAt: "asc" },
    take: 50,
    include: { proLicense: true },
  });
  
  return NextResponse.json({ ok: true, scheduled });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { proLicenseId, cronExpression, strictness = "balanced" } = body;
  
  if (!proLicenseId) {
    return NextResponse.json({ ok: false, error: "proLicenseId is required" }, { status: 400 });
  }
  
  // Calculate next run time
  const nextRunAt = calculateNextRun(cronExpression);
  
  const scheduled = await prisma.scheduledAudit.create({
    data: {
      proLicenseId,
      cronExpression,
      strictness: strictness.toUpperCase() as any,
      nextRunAt,
    },
  });
  
  return NextResponse.json({ ok: true, scheduled });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }
  
  await prisma.scheduledAudit.delete({ where: { id } });
  
  return NextResponse.json({ ok: true });
}

function calculateNextRun(cronExpression: string): Date {
  // Simplified - in reality use a cron parser like croner
  const now = new Date();
  return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day for now
}