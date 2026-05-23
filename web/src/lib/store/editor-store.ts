import { create } from "zustand";

// 조문 영속 메타 — 자동저장 시 어느 OrdinanceSection 인지 식별 (T019)
export interface SectionMeta {
  sectionId?: string;
  projectId: string;
  stageId: string;
  articleNo: number;
  articleLabel?: string;
  order: number;
}

// 에디터에 열린 문서 모델 — 탭 콘텐츠. 탭 자체의 열림/활성은 ui-store 가 관리.
export interface EditorDocument {
  id: string;
  title: string;
  value: string;
  readOnly: boolean;
  language: string;
  meta?: SectionMeta;
}

export interface UpsertDocInput {
  id: string;
  title: string;
  value: string;
  readOnly?: boolean;
  language?: string;
  meta?: SectionMeta;
}

interface EditorState {
  documents: Record<string, EditorDocument>;
  upsertDocument: (doc: UpsertDocInput) => void;
  setValue: (id: string, value: string) => void;
  setSectionId: (id: string, sectionId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  documents: {},

  upsertDocument: (doc) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [doc.id]: {
          id: doc.id,
          title: doc.title,
          value: doc.value,
          readOnly: doc.readOnly ?? false,
          language: doc.language ?? "markdown",
          meta: doc.meta,
        },
      },
    })),

  setValue: (id, value) =>
    set((state) => {
      const doc = state.documents[id];
      // 없거나 읽기전용(원본 보호, US6)이면 무시
      if (!doc || doc.readOnly) return {};
      return { documents: { ...state.documents, [id]: { ...doc, value } } };
    }),

  setSectionId: (id, sectionId) =>
    set((state) => {
      const doc = state.documents[id];
      if (!doc || !doc.meta) return {};
      return {
        documents: {
          ...state.documents,
          [id]: { ...doc, meta: { ...doc.meta, sectionId } },
        },
      };
    }),
}));
