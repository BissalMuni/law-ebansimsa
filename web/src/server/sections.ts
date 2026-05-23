"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// 조문·메시지·스냅샷 영속 — Server Actions (DB 는 web 단독 소유, plan §1)

export interface SaveSectionInput {
  id?: string;
  projectId: string;
  stageId: string;
  articleNo: number;
  articleLabel?: string | null;
  title: string;
  body: string;
  originalBody?: string | null;
  changeType?: string | null;
  order: number;
}

// 조(條) 단위 본문 저장 — 신규 생성 또는 갱신 (FR-016, 자동저장 대상)
export async function saveSection(input: SaveSectionInput) {
  const { id, ...data } = input;
  if (id) {
    return prisma.ordinanceSection.update({ where: { id }, data });
  }
  return prisma.ordinanceSection.create({ data });
}

// 개정 모드 — 로드된 원본 조문들을 일괄 생성 (US6)
export async function createSections(inputs: SaveSectionInput[]) {
  if (inputs.length === 0) return;
  await prisma.ordinanceSection.createMany({
    data: inputs.map(({ id: _id, ...data }) => data),
  });
  if (inputs[0]) revalidatePath(`/draft/${inputs[0].projectId}`);
}

// 채팅 메시지 저장 — AI 메시지는 citations(근거) 필수 추적 (헌법 P1)
export async function saveMessage(input: {
  stageId: string;
  role: "user" | "ai" | "system";
  content: string;
  citations?: string[];
  attachments?: unknown;
  applied?: boolean;
}) {
  return prisma.message.create({
    data: {
      stageId: input.stageId,
      role: input.role,
      content: input.content,
      citations: input.citations ?? undefined,
      attachments: (input.attachments as object | undefined) ?? undefined,
      applied: input.applied ?? false,
    },
  });
}

// 시간여행용 스냅샷 — 단계 확정·AI 응답 수용 시 생성 (D5, §7.6)
export async function createSnapshot(input: {
  stageId: string;
  trigger: "confirm" | "ai_apply" | "manual_save";
  actor: "user" | "ai";
  label?: string;
  content: unknown;
}) {
  return prisma.snapshot.create({
    data: {
      stageId: input.stageId,
      trigger: input.trigger,
      actor: input.actor,
      label: input.label,
      content: input.content as object,
    },
  });
}

// 단계의 조문 목록 (에디터·미리보기용)
export async function listSections(projectId: string) {
  return prisma.ordinanceSection.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}

// 특정 단계가 소유한 조문만 (단계 확정 검증 대상)
export async function listStageSections(projectId: string, stageId: string) {
  return prisma.ordinanceSection.findMany({
    where: { projectId, stageId },
    orderBy: { order: "asc" },
  });
}
