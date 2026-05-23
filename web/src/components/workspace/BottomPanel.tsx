"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProblemsPanel } from "@/components/ProblemsPanel";
import { DiffView, type DiffSection } from "@/components/DiffView";
import { HistoryView } from "@/components/HistoryView";
import { ReviewMatrix } from "@/components/ReviewMatrix";
import { ExportPanel } from "@/components/ExportPanel";

// Bottom Panel (ui-spec §6.5) — 문제 / 검토 / 이력 / 출력 / 변경(개정) 탭
export function BottomPanel({
  projectId,
  projectTitle,
  municipality,
  amendSections,
}: {
  projectId: string;
  projectTitle: string;
  municipality: string;
  amendSections?: DiffSection[];
}) {
  const isAmend = !!amendSections;
  return (
    <Tabs defaultValue="problems" className="flex h-full flex-col">
      <TabsList className="m-1 self-start">
        <TabsTrigger value="problems">문제</TabsTrigger>
        <TabsTrigger value="review">검토</TabsTrigger>
        <TabsTrigger value="history">이력</TabsTrigger>
        <TabsTrigger value="export">출력</TabsTrigger>
        {isAmend && <TabsTrigger value="diff">변경</TabsTrigger>}
      </TabsList>
      <div className="min-h-0 flex-1 overflow-auto">
        <TabsContent value="problems" className="mt-0 h-full">
          <ProblemsPanel />
        </TabsContent>
        <TabsContent value="review" className="mt-0 h-full">
          <ReviewMatrix projectId={projectId} />
        </TabsContent>
        <TabsContent value="history" className="mt-0 h-full">
          <HistoryView projectId={projectId} />
        </TabsContent>
        <TabsContent value="export" className="mt-0 h-full">
          <ExportPanel
            projectId={projectId}
            projectTitle={projectTitle}
            municipality={municipality}
          />
        </TabsContent>
        {isAmend && (
          <TabsContent value="diff" className="mt-0 h-full">
            <DiffView sections={amendSections} />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
