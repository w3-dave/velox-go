import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

// Validate an SSO token and return user info
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, signature, userId, expiresAt } = body;

  if (!token || !signature || !userId || !expiresAt) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Check expiry
  if (new Date(expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  // Verify signature
  const secret = process.env.NEXTAUTH_SECRET || "fallback-secret";
  const expectedSignature = createHmac("sha256", secret)
    .update(`${token}:${userId}:${expiresAt}`)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Check token exists in database
  const storedToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: `sso:${userId}`,
      token: token,
      expires: { gt: new Date() },
    },
  });

  if (!storedToken) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Delete the token (single use)
  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: storedToken.identifier,
        token: storedToken.token,
      },
    },
  });

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
