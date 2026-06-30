import { scenarios } from "./scenarios";
import type { ScenarioPrompt } from "@/types";

export type PromptCategory =
  | "this-scenario"
  | "getting-started"
  | "all-scenarios";

export const PROMPT_CATEGORIES: {
  id: PromptCategory;
  label: string;
}[] = [
  { id: "this-scenario", label: "This Scenario" },
  { id: "getting-started", label: "Getting Started" },
  { id: "all-scenarios", label: "All Scenarios" },
];

export interface PromptWithScenario extends ScenarioPrompt {
  scenarioTitle: string;
  scenarioIcon: string;
}

export const GETTING_STARTED_PROMPTS: ScenarioPrompt[] = [
  {
    title: "Build an Autonomous Agent That Earns via Lightning MPP",
    description:
      "Create a complete flow where an agent performs work, gets paid via Lightning, and the provider receives instant settlement.",
    prompt: `Build a minimal FastAPI server that:
1) Accepts a task from an agent
2) Returns HTTP 402 with Payment-Required header if not paid
3) Generates a Lightning invoice via NWC on challenge
4) Verifies preimage on /verify endpoint
5) Returns the work result

Include a client script that hits the endpoint, pays via NWC wallet using fetch402, and prints the result.`,
  },
  {
    title: "Build an Autonomous Agent That Spends via Stripe MPP",
    description:
      "Create a complete flow where an agent buys premium AI inference using Stripe MPP with zero human intervention.",
    prompt: `Build a minimal FastAPI server that:
1) Accepts a task and analyzes it for model recommendation
2) Returns HTTP 402 with www-authenticate: stripe if not paid
3) Creates a Stripe PaymentIntent on challenge
4) Verifies payment on /verify endpoint
5) Calls OpenRouter MCP to run the model (Nemotron 3 Ultra, etc.) and returns the result

Include a client script that hits the endpoint, pays with pm_card_visa, and prints the model output.`,
  },
  {
    title: "Build the Full Autonomous Business: Earn + Spend + Run",
    description:
      "Combine both payment rails: agent earns via Lightning for completed work, then spends those earnings via Stripe to buy premium AI inference (Nemotron 3 Ultra).",
    prompt: `Build a complete autonomous AI business demo:
1) Lightning MPP endpoint where agents get paid for work (NWC + fetch402)
2) Stripe MPP endpoint where agents buy premium AI inference (pm_card_visa + OpenRouter MCP)
3) Business dashboard showing real-time revenue (Lightning earned), costs (Stripe spent), and profit
4) Demo mode that auto-runs the full Earn → Spend → Run flow for video recording

Use the existing 402 proxy for Lightning and Stripe PaymentIntents for Stripe. OpenRouter MCP provides 338+ live models with real-time pricing.`,
  },
];

export function getAllPrompts(): PromptWithScenario[] {
  return scenarios.flatMap((scenario) =>
    (scenario.prompts ?? []).map((prompt) => ({
      ...prompt,
      scenarioTitle: scenario.title,
      scenarioIcon: scenario.icon,
    })),
  );
}