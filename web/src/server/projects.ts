"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeProjectInput, type ProjectInput } from "@/lib/project-rules";
import { buildSeedStages } from "@/lib/stages";

// Project CRUD — Server Actions (DB 는 web 단독 소유, plan §1). 검증은 project-rules 경유.

export async function createProject(input: ProjectInput) {
  const data = normalizeProjectInput(input);
  // 프로젝트 생성과 동시에 표준 8단계를 시드 (T014, data-model §4.1)
  const project = await prisma.project.create({
    data: { ...data, stages: { create: buildSeedStages() } },
  });
  revalidatePath("/");
  return project;
}

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getProject(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export async function deleteProject(id: string) {
  // Cascade 로 하위(Stage/Section/...) 전부 삭제 (data-model D4)
  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
}
