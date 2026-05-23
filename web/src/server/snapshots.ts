"use server";

import { prisma } from "@/lib/db";

// 프로젝트의 모든 스냅샷 (단계 무관, 최신순) — 시간여행 타임라인 (US8)
export async function listSnapshots(projectId: string) {
  return prisma.snapshot.findMany({
    where: { stage: { projectId } },
    orderBy: { createdAt: "desc" },
  });
}
