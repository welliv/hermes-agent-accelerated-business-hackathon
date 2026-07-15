import { useEffect } from "react";
import { Routes, Route, useParams, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { GettingStarted } from "@/components/getting-started";
import { ScenarioInfo } from "@/components/scenario-info";
import { ScenarioPanel } from "@/components/scenario-panel";
import { VisualizationPanel } from "@/components/visualization-panel";
import { useScenarioStore } from "@/stores";
import { useDevConsole } from "@/hooks/use-dev-console";
import { getScenarioById } from "@/data/scenarios";

function ScenarioRoute() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const setCurrentScenario = useScenarioStore(
    (state) => state.setCurrentScenario,
  );

  useEffect(() => {
    if (scenarioId) {
      const scenario = getScenarioById(scenarioId);
      setCurrentScenario(scenarioId);
      if (!scenario) {
        console.warn(`Unknown scenario: ${scenarioId}`);
      }
    }
  }, [scenarioId, setCurrentScenario]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-6 border-b p-6">
        <ScenarioInfo />
        <ScenarioPanel />
      </div>
      <div className="min-h-0 flex-1">
        <VisualizationPanel />
      </div>
    </div>
  );
}

function App() {
  useDevConsole();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<GettingStarted />} />
        <Route
          path="/:scenarioId"
          element={
            <ScenarioRoute />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
