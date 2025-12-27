import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET single organization
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

    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
      include: {
        org: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    // EXTERNAL users cannot access org settings
    if (membership.role === "EXTERNAL") {
      return NextResponse.json(
        { error: "External users cannot access organization settings" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: membership.org.id,
      name: membership.org.name,
      slug: membership.org.slug,
      type: membership.org.type,
      role: membership.role,
      memberCount: membership.org._count.members,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update organization (name, slug, type)
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

    // Verify user is OWNER
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can update organization settings" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, type } = body;

    const updateData: { name?: string; slug?: string; type?: "INDIVIDUAL" | "BUSINESS" } = {};

    if (name) {
      updateData.name = name;
    }

    if (slug) {
      // Validate slug format
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: "Slug must be lowercase letters, numbers, and hyphens only" },
          { status: 400 }
        );
      }

      // Check if slug is taken
      const existing = await prisma.organization.findUnique({
        where: { slug },
      });

      if (existing && existing.id !== orgId) {
        return NextResponse.json({ error: "Slug is already taken" }, { status: 400 });
      }

      updateData.slug = slug;
    }

    if (type) {
      if (!["INDIVIDUAL", "BUSINESS"].includes(type)) {
        return NextResponse.json(
          { error: "Type must be INDIVIDUAL or BUSINESS" },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete organization
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
    const { confirmation } = body;

    if (confirmation !== "DELETE") {
      return NextResponse.json({ error: "Please type DELETE to confirm" }, { status: 400 });
    }

    // Verify user is OWNER
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
      include: {
        org: true,
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can delete organizations" }, { status: 403 });
    }

    // Prevent deleting INDIVIDUAL orgs (personal accounts)
    if (membership.org.type === "INDIVIDUAL") {
      return NextResponse.json(
        { error: "Cannot delete personal organization. Delete your account instead." },
        { status: 400 }
      );
    }

    // Delete the organization (cascades to members, subscriptions, invitations)
    await prisma.organization.delete({
      where: { id: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
