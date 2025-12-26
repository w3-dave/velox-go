import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organizations
    const memberships = await prisma.orgMember.findMany({
      where: { userId: session.user.id },
      select: { orgId: true },
    });

    const orgIds = memberships.map((m) => m.orgId);

    // Get subscriptions for all user's organizations
    const subscriptions = await prisma.subscription.findMany({
      where: {
        orgId: { in: orgIds },
        status: { in: ["active", "trialing", "past_due"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
