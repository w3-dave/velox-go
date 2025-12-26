import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST() {
  try {
    const stripe = getStripe();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's primary organization (first one they own)
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        role: "OWNER",
      },
      include: { org: true },
    });

    if (!membership?.org?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: membership.org.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL || "https://go.veloxlabs.app"}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
