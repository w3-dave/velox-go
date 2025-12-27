import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get group details
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

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
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
        },
        appAccess: {
          select: { appSlug: true },
        },
      },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.map((gm) => ({
        id: gm.member.id,
        role: gm.member.role,
        user: gm.member.user,
      })),
      appAccess: group.appAccess.map((a) => a.appSlug),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update group
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
    const { name, description } = body;

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
      return NextResponse.json({ error: "Only owners and admins can update groups" }, { status: 403 });
    }

    // Verify group exists and belongs to this org
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup || existingGroup.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingGroup.name) {
      const duplicateGroup = await prisma.group.findUnique({
        where: {
          orgId_name: {
            orgId,
            name: name.trim(),
          },
        },
      });

      if (duplicateGroup) {
        return NextResponse.json({ error: "A group with this name already exists" }, { status: 400 });
      }
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        members: {
          select: { id: true },
        },
        appAccess: {
          select: { appSlug: true },
        },
      },
    });

    return NextResponse.json({
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      memberCount: updatedGroup.members.length,
      appAccess: updatedGroup.appAccess.map((a) => a.appSlug),
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete group
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
      return NextResponse.json({ error: "Only owners and admins can delete groups" }, { status: 403 });
    }

    // Verify group exists and belongs to this org
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group || group.orgId !== orgId) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Delete group (cascades to GroupMember and GroupAppAccess)
    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
