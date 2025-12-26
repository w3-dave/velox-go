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
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, then MEMBER
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
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

    if (!userMembership || userMembership.role === "MEMBER") {
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
