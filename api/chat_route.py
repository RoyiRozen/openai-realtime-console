from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import sys
from typing import Dict, List, Any, Optional

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the scenarios and chat state manager
try:
    from data.scenarios.scenarios import scenarios
    print(f"Scenarios imported successfully in chat_route: {list(scenarios.keys())}")
except Exception as e:
    print(f"Error importing scenarios in chat_route: {str(e)}")
    # Fallback to direct JSON file loading
    import json
    try:
        with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'scenarios', 'scenarios.json')) as f:
            scenarios = json.load(f)
        print(f"Loaded scenarios from JSON in chat_route: {list(scenarios.keys())}")
    except Exception as e2:
        print(f"Error loading scenarios JSON in chat_route: {str(e2)}")
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
        print("Using dummy test scenario in chat_route")

import chat_state

router = APIRouter()

# Request and response models
class StartChatRequest(BaseModel):
    scenario_id: str

class StartChatResponse(BaseModel):
    session_id: str
    initial_prompt: str
    ai_role: str
    communication_steps: List[str]

@router.post("/api/start_chat", response_model=StartChatResponse, tags=["chat"])
async def start_chat(request: StartChatRequest):
    """Initialize a new chat session with the selected scenario"""
    # Find the scenario by ID
    target_scenario = None
    scenario_key = None
    
    # First check if scenario_id matches a direct key
    if request.scenario_id in scenarios:
        target_scenario = scenarios[request.scenario_id]
        scenario_key = request.scenario_id
    else:
        # Otherwise search by the ID field
        for key, scenario in scenarios.items():
            if scenario["id"] == request.scenario_id:
                target_scenario = scenario
                scenario_key = key
                break
    
    if not target_scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Create a new chat session
    session_id = chat_state.create_session(scenario_key, target_scenario)
    
    # Add the initial AI message
    chat_state.add_message(
        session_id,
        {
            "role": "assistant",
            "content": target_scenario["initial_prompt"]
        }
    )
    
    # Return the session info and initial prompt
    return {
        "session_id": session_id,
        "initial_prompt": target_scenario["initial_prompt"],
        "ai_role": target_scenario["ai_role"],
        "communication_steps": target_scenario["communication_steps"]
    } 