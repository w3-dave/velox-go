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

    // Verify user has permission
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership || membership.role === "MEMBER" || membership.role === "EXTERNAL") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        orgId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Verify user has permission (OWNER or ADMIN)
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership || membership.role === "MEMBER" || membership.role === "EXTERNAL") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = "MEMBER", appSlugs } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
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

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { orgId },
        },
      },
    });

    if (existingUser?.memberships.length) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findUnique({
      where: {
        email_orgId: { email, orgId },
      },
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return NextResponse.json({ error: "Invitation already pending" }, { status: 400 });
    }

    // Delete expired invitation if exists
    if (existingInvitation) {
      await prisma.invitation.delete({
        where: { id: existingInvitation.id },
      });
    }

    // Create new invitation (expires in 7 days)
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        orgId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        appSlugs: role === "EXTERNAL" ? appSlugs.join(",") : null,
      },
    });

    // TODO: Send invitation email

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
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

    // Verify user has permission
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    });

    if (!membership || membership.role === "MEMBER" || membership.role === "EXTERNAL") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { invitationId } = body;

    await prisma.invitation.delete({
      where: {
        id: invitationId,
        orgId, // Ensure invitation belongs to this org
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
