import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomBytes, createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

// Generate a short-lived SSO token for cross-domain auth
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a random token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute expiry

  // Sign the token with a secret
  const secret = process.env.NEXTAUTH_SECRET || "fallback-secret";
  const signature = createHmac("sha256", secret)
    .update(`${token}:${session.user.id}:${expiresAt.toISOString()}`)
    .digest("hex");

  // Store the token (using VerificationToken model as a simple store)
  await prisma.verificationToken.create({
    data: {
      identifier: `sso:${session.user.id}`,
      token: token,
      expires: expiresAt,
    },
  });

  return NextResponse.json({
    token,
    signature,
    userId: session.user.id,
    expiresAt: expiresAt.toISOString(),
  });
}
