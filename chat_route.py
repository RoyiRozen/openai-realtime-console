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
from dotenv import load_dotenv

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

# Initialize OpenAI clients directly
# Load environment variables
load_dotenv()

# Get API key from environment variables
api_key = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI clients
try:
    if not api_key or api_key == "your-api-key-here":
        print("WARNING: No valid OpenAI API key found. Using mock OpenAI client.")
        # Create mock OpenAI client for testing
        class MockOpenAI:
            class ChatCompletions:
                def create(self, **kwargs):
                    class MockResponse:
                        class Choice:
                            class Message:
                                content = "This is a mock response because no valid OpenAI API key was provided."
                            
                            def __init__(self):
                                self.message = self.Message()

                        def __init__(self):
                            self.choices = [self.Choice()]
                    
                    return MockResponse()
            
            def __init__(self):
                self.chat = self.ChatCompletions()
        
        client = MockOpenAI()
        async_client = MockOpenAI()
    else:
        client = OpenAI(api_key=api_key)
        async_client = AsyncOpenAI(api_key=api_key)
except Exception as e:
    print(f"Error initializing OpenAI clients: {str(e)}")
    # Create a fallback mock client
    class MockOpenAI:
        class ChatCompletions:
            def create(self, **kwargs):
                class MockResponse:
                    class Choice:
                        class Message:
                            content = "Error initializing OpenAI client. This is a fallback response."
                        
                        def __init__(self):
                            self.message = self.Message()

                    def __init__(self):
                        self.choices = [self.Choice()]
                
                return MockResponse()
        
        def __init__(self):
            self.chat = self.ChatCompletions()
    
    client = MockOpenAI()
    async_client = MockOpenAI()

router = APIRouter() 