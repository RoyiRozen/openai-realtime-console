"""
Chat State Manager

Simple in-memory storage for managing chat sessions.
In a production environment, this would typically use a proper database.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

# In-memory store for chat sessions
chat_sessions = {}

def create_session(scenario_id: str, scenario_data: Dict[str, Any]) -> str:
    """
    Create a new chat session for a specific scenario
    
    Args:
        scenario_id: The ID of the scenario
        scenario_data: The full scenario data
        
    Returns:
        session_id: Unique identifier for the chat session
    """
    session_id = str(uuid.uuid4())
    
    chat_sessions[session_id] = {
        "session_id": session_id,
        "scenario_id": scenario_id,
        "created_at": datetime.now().isoformat(),
        "scenario_data": scenario_data,
        "messages": [],
        "current_step": 0,
        "completed_steps": [],
        "active": True
    }
    
    return session_id

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a chat session by ID
    
    Args:
        session_id: The session ID to retrieve
        
    Returns:
        The session data or None if not found
    """
    return chat_sessions.get(session_id)

def add_message(session_id: str, message: Dict[str, Any]) -> bool:
    """
    Add a message to a chat session
    
    Args:
        session_id: The session ID
        message: The message object with at least 'role' and 'content'
        
    Returns:
        True if successful, False if session not found
    """
    session = get_session(session_id)
    if not session:
        return False
    
    session["messages"].append(message)
    return True

def update_step(session_id: str, step_index: int, completed: bool = False) -> bool:
    """
    Update the current step in a chat session
    
    Args:
        session_id: The session ID
        step_index: The index of the current step
        completed: Whether to mark the step as completed
        
    Returns:
        True if successful, False if session not found
    """
    session = get_session(session_id)
    if not session:
        return False
    
    session["current_step"] = step_index
    
    if completed and step_index not in session["completed_steps"]:
        session["completed_steps"].append(step_index)
    
    return True

def get_active_sessions() -> List[Dict[str, Any]]:
    """
    Get all active chat sessions
    
    Returns:
        List of active sessions
    """
    return [session for session in chat_sessions.values() if session.get("active", True)]

def close_session(session_id: str) -> bool:
    """
    Mark a chat session as inactive
    
    Args:
        session_id: The session ID to close
        
    Returns:
        True if successful, False if session not found
    """
    session = get_session(session_id)
    if not session:
        return False
    
    session["active"] = False
    return True 