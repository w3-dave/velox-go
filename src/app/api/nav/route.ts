import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { veloxApps } from "@/lib/apps";

export async function GET() {
  try {
    const session = await auth();

    // Public response for unauthenticated users
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          apps: veloxApps.map((app) => ({
            slug: app.slug,
            name: app.name,
            icon: app.icon,
            color: app.color,
            url: app.url,
            status: app.status,
          })),
          user: null,
          subscriptions: [],
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }

    // Get user's subscriptions
    const memberships = await prisma.orgMember.findMany({
      where: { userId: session.user.id },
      select: { orgId: true },
    });

    const orgIds = memberships.map((m) => m.orgId);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        orgId: { in: orgIds },
        status: "active",
      },
      select: { appSlug: true },
    });

    const subscribedApps = subscriptions.map((s) => s.appSlug);

    return NextResponse.json(
      {
        apps: veloxApps.map((app) => ({
          slug: app.slug,
          name: app.name,
          icon: app.icon,
          color: app.color,
          url: app.url,
          status: app.status,
        })),
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
        subscriptions: subscribedApps,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching nav data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
