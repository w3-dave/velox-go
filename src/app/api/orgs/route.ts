import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.orgMember.findMany({
      where: { userId: session.user.id },
      include: {
        org: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const orgs = memberships.map((membership) => ({
      id: membership.org.id,
      name: membership.org.name,
      slug: membership.org.slug,
      type: membership.org.type,
      role: membership.role,
      memberCount: membership.org._count.members,
    }));

    return NextResponse.json(orgs);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type = "BUSINESS" } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        type,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
        // Auto-create default entity for BUSINESS organizations
        ...(type === "BUSINESS" && {
          entities: {
            create: {
              name,
              slug: "default",
              isDefault: true,
            },
          },
        }),
      },
      include: {
        entities: type === "BUSINESS",
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
