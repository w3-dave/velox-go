import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { veloxApps } from "@/lib/apps";

// Build allowed origins from environment variables
function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  // Add configured app URLs
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL;
  const notaUrl = process.env.NEXT_PUBLIC_NOTA_URL;

  if (appUrl) origins.add(appUrl);
  if (wwwUrl) origins.add(wwwUrl);
  if (notaUrl) origins.add(notaUrl);

  // Production fallbacks
  origins.add("https://veloxlabs.app");
  origins.add("https://www.veloxlabs.app");
  origins.add("https://go.veloxlabs.app");
  origins.add("https://nota.veloxlabs.app");

  // Local dev origins
  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
    origins.add("http://localhost:3002");
  }

  return Array.from(origins);
}

const ALLOWED_ORIGINS = getAllowedOrigins();

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

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
            free: app.free || false,
          })),
          user: null,
          subscriptions: [],
        },
        { headers: corsHeaders }
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
          free: app.free || false,
        })),
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
        subscriptions: subscribedApps,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error fetching nav data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
