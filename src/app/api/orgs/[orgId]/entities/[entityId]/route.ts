import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a single entity
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; entityId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, entityId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a member of the organization
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity || entity.orgId !== orgId) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json(entity);
  } catch (error) {
    console.error("Error fetching entity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update an entity
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; entityId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, entityId } = await params;

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

    if (!membership || membership.role === "MEMBER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Verify entity exists and belongs to this org
    const existingEntity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!existingEntity || existingEntity.orgId !== orgId) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const body = await request.json();
    // Extract fields that shouldn't be persisted to database
    const { slug, isDefault, sameAsDelivery, ...updateData } = body;

    // If updating slug, validate uniqueness within org
    if (slug && slug !== existingEntity.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: "Slug must be lowercase letters, numbers, and hyphens only" },
          { status: 400 }
        );
      }

      const existingSlug = await prisma.entity.findUnique({
        where: { orgId_slug: { orgId, slug } },
      });

      if (existingSlug && existingSlug.id !== entityId) {
        return NextResponse.json(
          { error: "Slug is already in use" },
          { status: 400 }
        );
      }

      updateData.slug = slug;
    }

    // Handle isDefault flag changes
    if (isDefault === true && !existingEntity.isDefault) {
      // Setting as default - unset other defaults
      await prisma.entity.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    } else if (isDefault === false && existingEntity.isDefault) {
      // Cannot unset default if it's the only entity
      const entityCount = await prisma.entity.count({ where: { orgId } });
      if (entityCount === 1) {
        return NextResponse.json(
          { error: "Cannot unset default on the only entity" },
          { status: 400 }
        );
      }
      updateData.isDefault = false;
    }

    const entity = await prisma.entity.update({
      where: { id: entityId },
      data: updateData,
    });

    return NextResponse.json(entity);
  } catch (error) {
    console.error("Error updating entity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete an entity
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string; entityId: string }> }
) {
  try {
    const session = await auth();
    const { orgId, entityId } = await params;

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

    if (!membership || membership.role === "MEMBER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Verify entity exists and belongs to this org
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity || entity.orgId !== orgId) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Cannot delete the only entity
    const entityCount = await prisma.entity.count({ where: { orgId } });
    if (entityCount === 1) {
      return NextResponse.json(
        { error: "Cannot delete the only entity. Organizations must have at least one entity." },
        { status: 400 }
      );
    }

    // If deleting default, set another entity as default
    if (entity.isDefault) {
      const nextDefault = await prisma.entity.findFirst({
        where: { orgId, id: { not: entityId } },
        orderBy: { createdAt: "asc" },
      });
      if (nextDefault) {
        await prisma.entity.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.entity.delete({
      where: { id: entityId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
