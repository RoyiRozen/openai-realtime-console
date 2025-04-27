import { useState, useEffect } from "react";
import { List, Play } from "react-feather";
import Button from "./Button";

export default function ScenarioSelector({ onScenarioSelect }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);

  // Fetch available scenarios on component mount
  useEffect(() => {
    async function fetchScenarios() {
      try {
        const response = await fetch('/api/scenarios/info');
        if (!response.ok) {
          throw new Error(`Error fetching scenarios: ${response.statusText}`);
        }
        const data = await response.json();
        setScenarios(data.scenarios || []);
      } catch (err) {
        console.error("Failed to fetch scenarios:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchScenarios();
  }, []);

  // Handle scenario selection
  const handleSelectScenario = async (scenarioId) => {
    try {
      setLoading(true);
      const response = await fetch('/api/start_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });

      if (!response.ok) {
        throw new Error(`Error starting chat: ${response.statusText}`);
      }

      const sessionData = await response.json();
      
      // Call parent's handler with the session data
      onScenarioSelect(sessionData);
    } catch (err) {
      console.error("Failed to start chat session:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p>Loading scenarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <p className="text-red-500">Error: {error}</p>
        <Button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-400"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-4">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <List className="mr-2" />
        Select a Communication Scenario
      </h2>
      
      <div className="grid grid-cols-1 gap-4">
        {scenarios.map((scenario) => (
          <div 
            key={scenario.id}
            className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
              selectedScenario === scenario.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedScenario(scenario.id)}
          >
            <h3 className="font-semibold">{scenario.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
            
            {selectedScenario === scenario.id && (
              <Button 
                className="mt-3 bg-green-500"
                onClick={() => handleSelectScenario(scenario.id)}
                icon={<Play size={16} />}
              >
                Start Scenario
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {scenarios.length === 0 && (
        <div className="text-center mt-8">
          <p>No scenarios available.</p>
        </div>
      )}
    </div>
  );
} 