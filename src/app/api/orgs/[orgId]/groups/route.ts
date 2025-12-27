import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all groups in organization
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

    // EXTERNAL users cannot view groups
    if (membership.role === "EXTERNAL") {
      return NextResponse.json(
        { error: "External users cannot access organization settings" },
        { status: 403 }
      );
    }

    const groups = await prisma.group.findMany({
      where: { orgId },
      include: {
        members: {
          select: { id: true },
        },
        appAccess: {
          select: { appSlug: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Transform to include counts and app slugs
    const groupsWithDetails = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.members.length,
      appAccess: group.appAccess.map((a) => a.appSlug),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    return NextResponse.json({ groups: groupsWithDetails });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new group
export async function POST(
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
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Only owners and admins can create groups" }, { status: 403 });
    }

    // Check if group name already exists in this org
    const existingGroup = await prisma.group.findUnique({
      where: {
        orgId_name: {
          orgId,
          name: name.trim(),
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json({ error: "A group with this name already exists" }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        orgId,
      },
    });

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: 0,
      appAccess: [],
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
