import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Remove sslmode from URL and configure SSL separately
  const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]+/g, '');

  const pool = new pg.Pool({
    connectionString: cleanConnectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false, // Required for Digital Ocean managed databases
    } : false,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
