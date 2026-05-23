"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// 타 지자체 참고 조례 — Server Actions (US7). 참고만 가능, 복제 금지는 api 가 강제 (P4).

export async function createReference(input: {
  projectId: string;
  source: "file" | "opendata" | "paste";
  title: string;
  municipality?: string | null;
  content: string;
  sourceUrl?: string | null;
  includedInContext?: boolean;
}) {
  const ref = await prisma.reference.create({
    data: {
      projectId: input.projectId,
      source: input.source,
      title: input.title,
      municipality: input.municipality ?? null,
      content: input.content,
      sourceUrl: input.sourceUrl ?? null,
      includedInContext: input.includedInContext ?? false,
    },
  });
  revalidatePath(`/draft/${input.projectId}`);
  return ref;
}

export async function listReferences(projectId: string) {
  return prisma.reference.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

// AI 컨텍스트 포함/제외 토글 (P4 — 포함 시 복제 금지 지시가 함께 주입됨)
export async function setReferenceContext(id: string, included: boolean) {
  const ref = await prisma.reference.update({
    where: { id },
    data: { includedInContext: included },
  });
  revalidatePath(`/draft/${ref.projectId}`);
  return ref;
}

export async function deleteReference(id: string) {
  const ref = await prisma.reference.delete({ where: { id } });
  revalidatePath(`/draft/${ref.projectId}`);
}
