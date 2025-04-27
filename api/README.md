# MedComm API - Chat Implementation

This document explains the chat system implementation for the MedComm API, which provides real-time streaming responses for medical communication training.

## Endpoints

### 1. Start Chat Session

```
POST /api/start_chat
```

Initializes a new chat session with a selected scenario. Returns a session ID and initial context.

**Request:**
```json
{
  "scenario_id": "difficult_news"
}
```

**Response:**
```json
{
  "session_id": "uuid-string",
  "initial_prompt": "Hello, I'm Dr. Smith. I understand you're here to discuss your test results.",
  "ai_role": "Oncologist delivering difficult news",
  "communication_steps": ["Prepare the environment", "Assess understanding", "Share information clearly"]
}
```

### 2. Send Message (Non-streaming)

```
POST /api/chat
```

Sends a message to the AI in the context of the current scenario and gets a response.

**Request:**
```json
{
  "session_id": "uuid-string",
  "message": "I'm concerned about my recent test results"
}
```

**Response:**
```json
{
  "response": "I understand your concern. Let me explain what your test results show..."
}
```

### 3. Send Message (Streaming)

```
POST /api/chat/stream
```

Sends a message and receives a streaming response using Server-Sent Events (SSE).

**Request:**
```json
{
  "session_id": "uuid-string",
  "message": "I'm concerned about my recent test results",
  "model": "gpt-4o"
}
```

**Response:**
SSE stream with chunks of content:
```
data: {"content": "I understand"}
data: {"content": " your concern."}
data: {"content": " Let me explain"}
...
data: {"content": "", "done": true}
```

### 4. Get Chat History

```
GET /api/chat/history/{session_id}
```

Retrieves the full chat history for a session.

**Response:**
```json
{
  "session_id": "uuid-string",
  "messages": [
    {"role": "assistant", "content": "Hello, I'm Dr. Smith..."},
    {"role": "user", "content": "I'm concerned about my test results"},
    {"role": "assistant", "content": "I understand your concern..."}
  ],
  "scenario": {
    "id": "difficult_news",
    "title": "Delivering Bad News",
    "description": "...",
    "ai_role": "Oncologist delivering difficult news",
    "initial_prompt": "...",
    "communication_steps": [...]
  }
}
```

## System Prompt Construction

The system prompt is constructed based on the scenario data to give the AI appropriate context for responding:

```python
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
```

## Conversation History Management

Conversation history is managed server-side using an in-memory storage system in `chat_state.py`. This approach has several benefits:

1. **Simplified frontend** - The frontend doesn't need to manage complex state
2. **Consistent context** - The server has the complete conversation history for LLM prompting
3. **Better security** - Sensitive medical scenario data stays on the server

For production deployments:

- Consider using a database (e.g., Redis, MongoDB) for persistent storage
- Implement session timeouts to clean up old conversations
- Add authentication to protect patient scenarios

## Streaming Implementation

The streaming implementation uses FastAPI's `StreamingResponse` with Server-Sent Events (SSE):

1. Client sends a message to `/api/chat/stream`
2. Server constructs a prompt with scenario context and conversation history
3. Server initiates a streaming request to OpenAI
4. Each chunk is forwarded to the client in SSE format
5. Frontend displays chunks in real-time with a blinking cursor
6. When complete, the frontend adds the full message to the conversation

This provides a more engaging and realistic experience compared to waiting for complete responses.

## Frontend Integration

The frontend connects to the streaming API using the Fetch API with a ReadableStream:

```javascript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    message: userMessage,
    model: "gpt-4o"
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder("utf-8");

// Process the stream chunks
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const dataLines = chunk.split("\n\n");
  
  for (const line of dataLines) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      
      if (data.content) {
        // Update UI with new content
        fullContent += data.content;
        setStreamingMessage(fullContent);
      }
    }
  }
}
``` 