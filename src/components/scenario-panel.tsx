import { useScenarioStore } from "@/stores";
import { StripeMPPFetchScenario } from "./402";

export function ScenarioPanel() {
  const { currentScenario } = useScenarioStore();

  switch (currentScenario.id) {
    case "stripe-mpp-fetch":
      return <StripeMPPFetchScenario />;
    default:
      return null;
  }
}