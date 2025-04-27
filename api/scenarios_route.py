from fastapi import APIRouter, HTTPException
import json
import os
import sys
from typing import Dict, List, Any
from pydantic import BaseModel

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Python scenarios
try:
    from data.scenarios.scenarios import scenarios
    print(f"Scenarios imported successfully in scenarios_route: {list(scenarios.keys())}")
except Exception as e:
    print(f"Error importing scenarios in scenarios_route: {str(e)}")
    # Fallback to direct JSON file loading
    try:
        with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'scenarios', 'scenarios.json')) as f:
            scenarios = json.load(f)
        print(f"Loaded scenarios from JSON in scenarios_route: {list(scenarios.keys())}")
    except Exception as e2:
        print(f"Error loading scenarios JSON in scenarios_route: {str(e2)}")
        # Create a dummy scenario for testing
        scenarios = {
            "difficult_news": {
                "id": "scenario_01_test",
                "title": "Test Scenario",
                "description": "Test scenario for debugging",
                "ai_role": "Test role",
                "initial_prompt": "This is a test prompt",
                "communication_steps": ["Step 1", "Step 2", "Step 3"]
            }
        }
        print("Using dummy test scenario in scenarios_route")

router = APIRouter()

# Response models
class ScenarioInfo(BaseModel):
    id: str
    title: str
    description: str

class ScenarioListResponse(BaseModel):
    scenarios: List[ScenarioInfo]

@router.get("/api/scenarios", tags=["scenarios"])
async def get_scenarios():
    """Returns all available scenarios with full data"""
    return scenarios

@router.get("/api/scenarios/info", tags=["scenarios"])
async def get_scenarios(id: str = None):
    """Get information about available scenarios"""
    # Get the list of scenarios
    scenarios_list = []
    
    for key, scenario in scenarios.items():
        scenario_info = {
            "id": scenario["id"],
            "title": scenario["title"],
            "description": scenario["description"],
            "ai_role": scenario["ai_role"],
            "communication_steps": scenario["communication_steps"],
            "guidance_cues": scenario.get("guidance_cues", {})
        }
        
        # If an ID was provided, only return that specific scenario
        if id and (scenario["id"] == id or key == id):
            return {"scenarios": [scenario_info]}
            
        scenarios_list.append(scenario_info)
    
    # Return the list of scenarios
    return {"scenarios": scenarios_list}

@router.get("/api/scenarios/{scenario_id}", tags=["scenarios"])
async def get_scenario(scenario_id: str):
    """Returns a specific scenario by ID"""
    # Check if the scenario_id is a direct key in scenarios
    if scenario_id in scenarios:
        return scenarios[scenario_id]
    
    # Otherwise, search by the actual ID field
    for key, scenario in scenarios.items():
        if scenario["id"] == scenario_id:
            return scenario
    
    # If no scenario found, return a 404
    raise HTTPException(status_code=404, detail="Scenario not found") 