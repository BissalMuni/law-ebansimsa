"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  normalizeProjectInput,
  isAmendmentKind,
  type ProjectInput,
} from "@/lib/project-rules";
import { buildSeedStages } from "@/lib/stages";
import { parseOrdinance } from "@/lib/api-client";

// Project CRUD — Server Actions (DB 는 web 단독 소유, plan §1). 검증은 project-rules 경유.

export async function createProject(input: ProjectInput) {
  const { originalContent, ...projectData } = normalizeProjectInput(input);
  // 프로젝트 생성과 동시에 표준 8단계를 시드 (T014, data-model §4.1)
  const project = await prisma.project.create({
    data: { ...projectData, stages: { create: buildSeedStages() } },
    include: { stages: true },
  });

  // 개정 모드: 확보한 원문을 즉시 조문(條文)으로 파싱해 본칙 단계에 적재한다.
  // body·originalBody 를 함께 채워 개정안 버퍼와 읽기전용 원본을 동시에 보존한다 (data-model OrdinanceSection)
  if (isAmendmentKind(projectData.kind) && originalContent) {
    const mainStage = project.stages.find((s) => s.key === "main");
    if (mainStage) {
      const { articles } = await parseOrdinance(originalContent);
      if (articles.length > 0) {
        await prisma.ordinanceSection.createMany({
          data: articles.map((a) => ({
            projectId: project.id,
            stageId: mainStage.id,
            articleNo: a.article_no,
            articleLabel: a.article_label,
            title: a.title,
            body: a.body,
            originalBody: a.body,
            changeType: "unchanged",
            order: a.order,
          })),
        });
      }
    }
  }

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
