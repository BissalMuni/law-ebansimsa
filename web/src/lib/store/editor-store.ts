import { create } from "zustand";

// 에디터에 열린 문서 모델 — 탭 콘텐츠. 탭 자체의 열림/활성은 ui-store 가 관리.
export interface EditorDocument {
  id: string;
  title: string;
  value: string;
  readOnly: boolean;
  language: string;
}

export interface UpsertDocInput {
  id: string;
  title: string;
  value: string;
  readOnly?: boolean;
  language?: string;
}

interface EditorState {
  documents: Record<string, EditorDocument>;
  upsertDocument: (doc: UpsertDocInput) => void;
  setValue: (id: string, value: string) => void;
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
}));
