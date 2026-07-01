import { scenarios } from "./scenarios";
import type { ScenarioPrompt } from "@/types";

export type PromptCategory =
  | "this-scenario"
  | "all-scenarios";

export const PROMPT_CATEGORIES: {
  id: PromptCategory;
  label: string;
}[] = [
  { id: "this-scenario", label: "This Scenario" },
  { id: "all-scenarios", label: "All Scenarios" },
];

export interface PromptWithScenario extends ScenarioPrompt {
  scenarioTitle: string;
  scenarioIcon: string;
}

export function getAllPrompts(): PromptWithScenario[] {
  return scenarios.flatMap((scenario) =>
    (scenario.prompts ?? []).map((prompt) => ({
      ...prompt,
      scenarioTitle: scenario.title,
      scenarioIcon: scenario.icon,
    }))
  );
}