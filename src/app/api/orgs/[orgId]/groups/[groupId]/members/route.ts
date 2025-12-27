import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List group members
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

    // EXTERNAL users cannot view groups
    if (membership.role === "EXTERNAL") {
      return NextResponse.json(
        { error: "External users cannot access organization settings" },
        { status: 403 }
      );
    }

    // Verify group exists and belongs to this org
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const members = groupMembers.map((gm) => ({
      id: gm.member.id,
      role: gm.member.role,
      user: gm.member.user,
      addedAt: gm.createdAt,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add member to group
export async function POST(
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
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    // Verify user is OWNER or ADMIN
    const userMembership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!userMembership || (userMembership.role !== "OWNER" && userMembership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only owners and admins can add group members" }, { status: 403 });
    }

    // Verify group exists and belongs to this org
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify target member exists and belongs to this org
    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
    }

    // Check if member is already in the group
    const existingGroupMember = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId,
          memberId,
        },
      },
    });

    if (existingGroupMember) {
      return NextResponse.json({ error: "Member is already in this group" }, { status: 400 });
    }

    // Add member to group
    const groupMember = await prisma.groupMember.create({
      data: {
        groupId,
        memberId,
      },
    });

    return NextResponse.json({
      id: targetMember.id,
      role: targetMember.role,
      user: targetMember.user,
      addedAt: groupMember.createdAt,
    });
  } catch (error) {
    console.error("Error adding group member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove member from group
export async function DELETE(
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
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    // Verify user is OWNER or ADMIN
    const userMembership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!userMembership || (userMembership.role !== "OWNER" && userMembership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only owners and admins can remove group members" }, { status: 403 });
    }

    // Verify group exists and belongs to this org
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Find the group membership
    const groupMember = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId,
          memberId,
        },
      },
    });

    if (!groupMember) {
      return NextResponse.json({ error: "Member is not in this group" }, { status: 404 });
    }

    // Remove member from group
    await prisma.groupMember.delete({
      where: { id: groupMember.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing group member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
