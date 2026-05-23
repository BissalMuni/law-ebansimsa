"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProblemsPanel } from "@/components/ProblemsPanel";
import { DiffView, type DiffSection } from "@/components/DiffView";
import { HistoryView } from "@/components/HistoryView";
import { ReviewMatrix } from "@/components/ReviewMatrix";

// Bottom Panel (ui-spec §6.5) — 문제 / 이력 / 변경(개정) 탭
export function BottomPanel({
  projectId,
  amendSections,
}: {
  projectId: string;
  amendSections?: DiffSection[];
}) {
  const isAmend = !!amendSections;
  return (
    <Tabs defaultValue="problems" className="flex h-full flex-col">
      <TabsList className="m-1 self-start">
        <TabsTrigger value="problems">문제</TabsTrigger>
        <TabsTrigger value="review">검토</TabsTrigger>
        <TabsTrigger value="history">이력</TabsTrigger>
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
        {isAmend && (
          <TabsContent value="diff" className="mt-0 h-full">
            <DiffView sections={amendSections} />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
