import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all active sessions for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current session token from JWT session
    // @ts-expect-error - sessionToken added in auth callbacks
    const currentSessionToken = session.sessionToken as string | undefined;

    const sessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        expires: { gt: new Date() },
      },
      orderBy: { expires: "desc" },
    });

    // Mark current session
    const sessionsWithCurrent = sessions.map((s) => ({
      id: s.id,
      expires: s.expires,
      isCurrent: s.sessionToken === currentSessionToken,
    }));

    return NextResponse.json(sessionsWithCurrent);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Revoke a specific session or all other sessions
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, revokeAll } = body;

    // Get current session token from JWT session
    // @ts-expect-error - sessionToken added in auth callbacks
    const currentSessionToken = session.sessionToken as string | undefined;

    if (revokeAll) {
      // Revoke all sessions except current
      await prisma.session.deleteMany({
        where: {
          userId: session.user.id,
          sessionToken: { not: currentSessionToken },
        },
      });

      return NextResponse.json({ success: true, message: "All other sessions revoked" });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Find the session to delete
    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!targetSession || targetSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Prevent revoking current session via API
    if (targetSession.sessionToken === currentSessionToken) {
      return NextResponse.json(
        { error: "Cannot revoke current session. Use sign out instead." },
        { status: 400 }
      );
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
