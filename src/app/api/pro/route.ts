import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  
  if (action === "status") {
    // Mock PRO status - in reality check Stripe/subscription
    return NextResponse.json({
      ok: true,
      pro: {
        tier: "FREE",
        status: "ACTIVE",
        seats: 1,
        usedSeats: 0,
        currentPeriodEnd: null,
        features: {
          render4k: false,
          scheduledAudits: false,
          publicApi: false,
          teamSeats: false,
        },
      },
    });
  }
  
  if (action === "checkout") {
    // Return Stripe checkout session URL
    return NextResponse.json({
      ok: true,
      url: "https://checkout.stripe.com/pay/cs_test_...",
    });
  }
  
  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;
  
  if (action === "create-portal-session") {
    return NextResponse.json({
      ok: true,
      url: "https://billing.stripe.com/p/session/...",
    });
  }
  
  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}