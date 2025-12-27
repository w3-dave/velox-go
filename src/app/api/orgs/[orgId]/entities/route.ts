import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all entities for an organization
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

    // Verify user is a member of the organization
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

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    // Only BUSINESS orgs have entities
    if (membership.org.type !== "BUSINESS") {
      return NextResponse.json([]);
    }

    const entities = await prisma.entity.findMany({
      where: { orgId },
      orderBy: [
        { isDefault: "desc" }, // Default entity first
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(entities);
  } catch (error) {
    console.error("Error fetching entities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new entity
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

    // Verify user is OWNER or ADMIN
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

    if (!membership || membership.role === "MEMBER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Only BUSINESS orgs can have entities
    if (membership.org.type !== "BUSINESS") {
      return NextResponse.json(
        { error: "Only business organizations can have entities" },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Extract fields that shouldn't be persisted to database
    const { name, isDefault, sameAsDelivery, slug: _slug, ...entityData } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure unique slug within the organization
    let slug = baseSlug;
    let counter = 1;
    while (
      await prisma.entity.findUnique({
        where: { orgId_slug: { orgId, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.entity.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        slug,
        orgId,
        isDefault: isDefault || false,
        ...entityData,
      },
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (error) {
    console.error("Error creating entity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
