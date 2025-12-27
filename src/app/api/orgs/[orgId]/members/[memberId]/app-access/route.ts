import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get app access for a member
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, memberId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has permission (OWNER or ADMIN)
    const userMembership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!userMembership || userMembership.role === "MEMBER" || userMembership.role === "EXTERNAL") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get the target member
    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
      include: {
        appAccess: {
          select: {
            appSlug: true,
          },
        },
      },
    });

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      memberId,
      appSlugs: targetMember.appAccess.map((a) => a.appSlug),
    });
  } catch (error) {
    console.error("Error fetching app access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update app access for a member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, memberId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has permission (OWNER or ADMIN)
    const userMembership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!userMembership || userMembership.role === "MEMBER" || userMembership.role === "EXTERNAL") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get the target member
    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Only EXTERNAL members can have app access managed
    if (targetMember.role !== "EXTERNAL") {
      return NextResponse.json(
        { error: "App access can only be managed for EXTERNAL members" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { appSlugs } = body;

    if (!appSlugs || !Array.isArray(appSlugs) || appSlugs.length === 0) {
      return NextResponse.json(
        { error: "At least one app access is required" },
        { status: 400 }
      );
    }

    // Replace all app access records
    await prisma.$transaction(async (tx) => {
      await tx.memberAppAccess.deleteMany({
        where: { memberId },
      });
      await tx.memberAppAccess.createMany({
        data: appSlugs.map((slug: string) => ({
          memberId,
          appSlug: slug,
        })),
      });
    });

    return NextResponse.json({
      memberId,
      appSlugs,
    });
  } catch (error) {
    console.error("Error updating app access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
