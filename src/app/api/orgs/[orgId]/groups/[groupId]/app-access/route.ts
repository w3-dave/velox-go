import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { veloxApps } from "@/lib/apps";

const validAppSlugs = veloxApps.map((app) => app.slug);

// GET - Get group's app access
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; groupId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, groupId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is OWNER or ADMIN
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only owners and admins can view group app access" }, { status: 403 });
    }

    // Verify group exists and belongs to this org
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        appAccess: {
          select: { appSlug: true },
        },
      },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({
      appSlugs: group.appAccess.map((a) => a.appSlug),
    });
  } catch (error) {
    console.error("Error fetching group app access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update group's app access
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; groupId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, groupId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appSlugs } = body;

    if (!Array.isArray(appSlugs)) {
      return NextResponse.json({ error: "appSlugs must be an array" }, { status: 400 });
    }

    // Validate all app slugs
    const invalidSlugs = appSlugs.filter((slug: string) => !validAppSlugs.includes(slug));
    if (invalidSlugs.length > 0) {
      return NextResponse.json(
        { error: `Invalid app slugs: ${invalidSlugs.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify user is OWNER or ADMIN
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only owners and admins can update group app access" }, { status: 403 });
    }

    // Verify group exists and belongs to this org
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Update app access in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing app access
      await tx.groupAppAccess.deleteMany({
        where: { groupId },
      });

      // Create new app access records
      if (appSlugs.length > 0) {
        await tx.groupAppAccess.createMany({
          data: appSlugs.map((slug: string) => ({
            groupId,
            appSlug: slug,
          })),
        });
      }
    });

    return NextResponse.json({
      appSlugs,
    });
  } catch (error) {
    console.error("Error updating group app access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
