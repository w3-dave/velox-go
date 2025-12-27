import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();
    const { orgId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a member of this org
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    // EXTERNAL users cannot view members list
    if (membership.role === "EXTERNAL") {
      return NextResponse.json(
        { error: "External users cannot access organization settings" },
        { status: 403 }
      );
    }

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        appAccess: {
          select: {
            appSlug: true,
          },
        },
        groupMemberships: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, then MEMBER, then EXTERNAL
        { createdAt: "asc" },
      ],
    });

    // Transform appAccess to array of slugs and groups to simplified array
    const membersWithDetails = members.map((member) => ({
      ...member,
      appAccess: member.appAccess.map((a) => a.appSlug),
      groups: member.groupMemberships.map((gm) => ({
        id: gm.group.id,
        name: gm.group.name,
      })),
      groupMemberships: undefined, // Remove the raw groupMemberships from response
    }));

    return NextResponse.json(membersWithDetails);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update member role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();
    const { orgId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, role, appSlugs } = body;

    if (!memberId || !role) {
      return NextResponse.json({ error: "Member ID and role are required" }, { status: 400 });
    }

    if (!["ADMIN", "MEMBER", "EXTERNAL"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // EXTERNAL role requires app access
    if (role === "EXTERNAL") {
      if (!appSlugs || !Array.isArray(appSlugs) || appSlugs.length === 0) {
        return NextResponse.json(
          { error: "EXTERNAL role requires at least one app access" },
          { status: 400 }
        );
      }
    }

    // Verify user is OWNER
    const userMembership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!userMembership || userMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can change member roles" }, { status: 403 });
    }

    // Get the target member
    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot change owner's role
    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 });
    }

    // Cannot change own role
    if (targetMember.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    // Handle app access changes
    const wasExternal = targetMember.role === "EXTERNAL";
    const becomingExternal = role === "EXTERNAL";

    // Use transaction for role + app access changes
    const updatedMember = await prisma.$transaction(async (tx) => {
      // If changing FROM EXTERNAL, delete app access records
      if (wasExternal && !becomingExternal) {
        await tx.memberAppAccess.deleteMany({
          where: { memberId },
        });
      }

      // If changing TO EXTERNAL, create app access records
      if (becomingExternal) {
        // Delete existing app access (if any)
        await tx.memberAppAccess.deleteMany({
          where: { memberId },
        });
        // Create new app access records
        await tx.memberAppAccess.createMany({
          data: appSlugs.map((slug: string) => ({
            memberId,
            appSlug: slug,
          })),
        });
      }

      // Update the role
      return tx.orgMember.update({
        where: { id: memberId },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          appAccess: {
            select: {
              appSlug: true,
            },
          },
        },
      });
    });

    // Transform appAccess to array of slugs
    const result = {
      ...updatedMember,
      appAccess: updatedMember.appAccess.map((a) => a.appSlug),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();
    const { orgId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId } = body;

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

    // Get the member to be removed
    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot remove owner
    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove organization owner" }, { status: 400 });
    }

    // Admin cannot remove other admins
    if (userMembership.role === "ADMIN" && targetMember.role === "ADMIN") {
      return NextResponse.json({ error: "Admins cannot remove other admins" }, { status: 403 });
    }

    await prisma.orgMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
