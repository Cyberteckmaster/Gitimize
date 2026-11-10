import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, targetId, helpful, comment } = body;
  
  if (!type || !targetId || helpful === undefined) {
    return NextResponse.json({ ok: false, error: "type, targetId, helpful are required" }, { status: 400 });
  }
  
  const feedback = await prisma.feedback.create({
    data: {
      type: type.toUpperCase() as any,
      targetId,
      helpful,
      comment,
    },
  });
  
  return NextResponse.json({ ok: true, feedback });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const targetId = searchParams.get("targetId");
  
  const where: any = {};
  if (type) where.type = type.toUpperCase();
  if (targetId) where.targetId = targetId;
  
  const feedback = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  
  const stats = await prisma.feedback.groupBy({
    by: ["helpful"],
    where,
    _count: true,
  });
  
  return NextResponse.json({ ok: true, feedback, stats });
}