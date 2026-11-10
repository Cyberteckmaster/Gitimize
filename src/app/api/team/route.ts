import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateId } from "@/ui/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "team" or "apikeys"
  const proLicenseId = searchParams.get("proLicenseId");
  
  if (type === "apikeys" && proLicenseId) {
    const keys = await prisma.apiKey.findMany({
      where: { proLicenseId },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json({ ok: true, keys });
  }
  
  if (type === "team" && proLicenseId) {
    const license = await prisma.proLicense.findUnique({
      where: { id: proLicenseId },
      include: { apiKeys: true },
    });
    
    if (!license) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, team: license });
  }
  
  return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, proLicenseId, name, permissions } = body;
  
  if (action === "create-api-key" && proLicenseId) {
    const prefix = "sko_";
    const key = `${prefix}${generateId("").replace("id_", "")}`;
    const keyHash = await hashKey(key);
    
    const apiKey = await prisma.apiKey.create({
      data: {
        proLicenseId,
        name: name || "API Key",
        keyHash,
        keyPrefix: key.slice(0, 12),
        permissions: permissions || ["audit:read", "optimize:read"],
      },
    });
    
    return NextResponse.json({ ok: true, key: { ...apiKey, key } });
  }
  
  if (action === "invite-member" && proLicenseId) {
    // In reality, send invitation email
    return NextResponse.json({ ok: true, message: "Invitation sent" });
  }
  
  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }
  
  if (type === "apikey") {
    await prisma.apiKey.delete({ where: { id } });
  } else if (type === "member") {
    // Remove team member
  }
  
  return NextResponse.json({ ok: true });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}