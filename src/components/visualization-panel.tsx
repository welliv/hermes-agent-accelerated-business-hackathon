import {
  FileText,
  Code2,
  MessageSquareText,
  GraduationCap,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TransactionLog,
  CodeSnippets,
  PromptsTab,
  LearnTab,
} from "./visualizations";
import { useUIStore } from "@/stores";

export function VisualizationPanel() {
  const { visualizationTab, setVisualizationTab } = useUIStore();
  const tabsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = tabsListRef.current;
    if (!container) return;
    const activeTab = container.querySelector<HTMLElement>(
      '[data-state="active"]'
    );
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [visualizationTab]);

  return (
    <Tabs
      id="visualization-panel"
      value={visualizationTab}
      onValueChange={(value) =>
        setVisualizationTab(value as typeof visualizationTab)
      }
      className="flex h-full flex-col py-4"
    >
      <div ref={tabsListRef} className="mx-4 overflow-x-auto">
        <TabsList className="w-fit">
          <TabsTrigger value="log" className="gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            Log
          </TabsTrigger>
          <TabsTrigger value="snippets" className="gap-2">
            <Code2 className="h-4 w-4 shrink-0" />
            Code
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <MessageSquareText className="h-4 w-4 shrink-0" />
            Example Prompts
          </TabsTrigger>
          <TabsTrigger value="learn" className="gap-2">
            <GraduationCap className="h-4 w-4 shrink-0" />
            Learn
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="log" className="mt-0 flex-1 overflow-hidden">
        <TransactionLog />
      </TabsContent>

      <TabsContent value="snippets" className="mt-0 flex-1 overflow-hidden">
        <CodeSnippets />
      </TabsContent>

      <TabsContent value="prompts" className="mt-0 flex-1 overflow-y-auto">
        <PromptsTab />
      </TabsContent>

      <TabsContent value="learn" className="mt-0 flex-1 overflow-y-auto">
        <LearnTab />
      </TabsContent>
    </Tabs>
  );
}