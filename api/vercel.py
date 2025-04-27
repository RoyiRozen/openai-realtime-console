import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# Initialize OpenAI clients
client = OpenAI(api_key=api_key)
async_client = AsyncOpenAI(api_key=api_key)

# Import routers - with explicit relative imports for Vercel
from .scenarios_route import router as scenarios_router
from .chat_route import router as chat_router
from .evaluate_route import router as evaluate_router

# Initialize FastAPI app
app = FastAPI(title="MedComm API", 
              description="API for medical communication training scenarios",
              version="1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

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

# Root path handler for Vercel
@app.get("/api")
def api_root():
    return {"message": "MedComm API - Use the appropriate endpoints"} 