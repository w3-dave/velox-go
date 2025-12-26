import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { password, confirmation } = body;

    // Verify confirmation text
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm" },
        { status: 400 }
      );
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
        memberships: {
          where: { role: "OWNER" },
          include: {
            org: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For password-based accounts, verify password
    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required" },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Password is incorrect" },
          { status: 400 }
        );
      }
    }

    // Check for organizations where user is sole owner
    const soleOwnerOrgs = user.memberships.filter((m) => {
      const owners = m.org.members.filter((member) => member.role === "OWNER");
      return owners.length === 1;
    });

    // Delete organizations where user is sole owner
    if (soleOwnerOrgs.length > 0) {
      await prisma.organization.deleteMany({
        where: {
          id: { in: soleOwnerOrgs.map((m) => m.org.id) },
        },
      });
    }

    // Delete user (cascades to memberships, accounts, sessions)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
