import { PrismaClient } from "@prisma/client";

// Prisma 클라이언트 싱글턴 — dev HMR 시 커넥션 누수 방지 (DB는 web이 단독 소유, plan §1)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
