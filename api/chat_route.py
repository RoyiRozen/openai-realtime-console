from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import sys
from typing import Dict, List, Any, Optional
from fastapi.responses import StreamingResponse
import json
import time
from openai import OpenAI, AsyncOpenAI
import asyncio
import async_timeout

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
from app import client, async_client  # Import both clients from app.py

router = APIRouter()

# Request and response models
class StartChatRequest(BaseModel):
    scenario_id: str

class StartChatResponse(BaseModel):
    session_id: str
    initial_prompt: str
    ai_role: str
    communication_steps: List[str]

class ChatMessage(BaseModel):
    session_id: str
    message: str

class ChatStreamRequest(BaseModel):
    session_id: str
    message: str
    model: str = "gpt-4o"

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

def construct_system_prompt(scenario_data):
    """
    Construct a detailed system prompt based on the scenario data
    """
    ai_role = scenario_data["ai_role"]
    description = scenario_data["description"]
    
    system_prompt = f"""You are a medical AI assistant simulating a {ai_role} in the following scenario:

{description}

Your role is to provide realistic and empathetic responses that demonstrate effective medical communication techniques.
Focus on clear explanations, emotional support, and shared decision-making when appropriate.
Maintain a professional, compassionate tone throughout the conversation.
Respond to the patient's concerns directly and do not change the subject.
"""
    
    # Add communication steps as guidelines if available
    if "communication_steps" in scenario_data and scenario_data["communication_steps"]:
        system_prompt += "\n\nYou should follow these communication steps:\n"
        for i, step in enumerate(scenario_data["communication_steps"], 1):
            system_prompt += f"{i}. {step}\n"
            
    return system_prompt

@router.post("/api/chat", tags=["chat"])
async def chat(message: ChatMessage):
    """Send a message to the chat and get a response"""
    session = chat_state.get_session(message.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Add the user message to the session
    chat_state.add_message(
        message.session_id,
        {
            "role": "user",
            "content": message.message
        }
    )
    
    # Get the scenario data
    scenario_data = session["scenario_data"]
    
    # Construct the system prompt
    system_prompt = construct_system_prompt(scenario_data)
    
    # Prepare the full message history for the API call
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add the conversation history
    for msg in session["messages"]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    try:
        # Send the request to OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1000
        )
        
        # Extract the response
        ai_response = response.choices[0].message.content
        
        # Add the AI's response to the session
        chat_state.add_message(
            message.session_id,
            {
                "role": "assistant",
                "content": ai_response
            }
        )
        
        return {
            "response": ai_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

async def stream_openai_response(session_id, messages, model):
    """Stream the response from OpenAI API"""
    try:
        response = await async_client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=1000
        )
        
        # Initialize the complete response to capture for session history
        complete_response = ""
        
        # Stream each chunk as it arrives
        async for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                complete_response += content
                yield f"data: {json.dumps({'content': content})}\n\n"
                await asyncio.sleep(0)
        
        # Store the complete response in the session history
        if complete_response:
            chat_state.add_message(
                session_id,
                {
                    "role": "assistant", 
                    "content": complete_response
                }
            )
            
        # Send an event to signal the end of the stream
        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        yield f"data: {json.dumps({'error': error_msg})}\n\n"

@router.post("/api/chat/stream", tags=["chat"])
async def stream_chat(request: ChatStreamRequest):
    """Send a message to the chat and get a streaming response"""
    session = chat_state.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Add the user message to the session
    chat_state.add_message(
        request.session_id,
        {
            "role": "user",
            "content": request.message
        }
    )
    
    # Get the scenario data
    scenario_data = session["scenario_data"]
    
    # Construct the system prompt
    system_prompt = construct_system_prompt(scenario_data)
    
    # Prepare the full message history for the API call
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add the conversation history
    for msg in session["messages"]:
        # Skip the last message which we just added
        if msg["role"] == "user" and msg["content"] == request.message:
            continue
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add the new user message at the end
    messages.append({"role": "user", "content": request.message})
    
    # Return a streaming response
    return StreamingResponse(
        stream_openai_response(request.session_id, messages, request.model),
        media_type="text/event-stream"
    )

@router.get("/api/chat/history/{session_id}", tags=["chat"])
async def get_chat_history(session_id: str):
    """Get the chat history for a session"""
    session = chat_state.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return {
        "session_id": session_id,
        "messages": session["messages"],
        "scenario": session["scenario_data"]
    } 