// Command Palette 명령 모델·필터 — 순수 로직 (US10)
export interface Command {
  id: string;
  title: string;
  keywords?: string[];
  run: () => void;
}

// 제목·키워드 부분 일치(대소문자 무시). 빈 질의는 전체 반환.
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((c) => {
    const haystack = [c.title, ...(c.keywords ?? [])].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
