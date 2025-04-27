import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI
import uvicorn
import sys

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
api_key = os.getenv("OPENAI_API_KEY")
if not api_key or api_key == "your-api-key-here":
    print("WARNING: OPENAI_API_KEY environment variable is not set or is using the default value. Mock responses will be used.")
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
    # Initialize OpenAI clients
    client = OpenAI(api_key=api_key)
    async_client = AsyncOpenAI(api_key=api_key)

# Initialize FastAPI app
app = FastAPI(title="MedComm API", 
              description="API for medical communication training scenarios",
              version="1.0")

# Import routers - do this AFTER initializing client to avoid circular imports
try:
    from api.scenarios_route import router as scenarios_router
    from api.chat_route import router as chat_router
    from api.evaluate_route import router as evaluate_router
except ImportError:
    try:
        # Fallback to direct import if not in a package
        from scenarios_route import router as scenarios_router
        from chat_route import router as chat_router
        from evaluate_route import router as evaluate_router
    except ImportError as e:
        print(f"Error importing routers: {str(e)}")
        raise

# Include routers
app.include_router(scenarios_router, tags=["Scenarios"])
app.include_router(chat_router, tags=["Chat"])
app.include_router(evaluate_router, tags=["Evaluation"])

# Define request model
class PromptRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o"
    max_tokens: int = 500

@app.get("/")
def read_root():
    return {"message": "MedComm API - Medical Communication Training"}

@app.post("/api/test-openai")
async def test_openai(request: PromptRequest):
    try:
        response = client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": request.prompt}
            ],
            max_tokens=request.max_tokens
        )
        
        return {
            "text": response.choices[0].message.content,
            "model": request.model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

# For local development
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 