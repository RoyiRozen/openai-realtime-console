from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import re
from typing import List, Dict, Any

# Import chat state to access conversation history
import chat_state

router = APIRouter()

class EvaluationRequest(BaseModel):
    """Request model for evaluation endpoint"""
    session_id: str

class StepEvaluation(BaseModel):
    """Evaluation result for a single communication step"""
    step_name: str
    keywords_found: bool
    matching_keywords: List[str] = []
    score: float = 0.0  # 0.0 to 1.0

class EvaluationResponse(BaseModel):
    """Response model for evaluation endpoint"""
    session_id: str
    scenario_id: str
    steps_evaluation: List[StepEvaluation]
    overall_score: float
    feedback: str

def generate_basic_feedback(scenario_data: Dict[str, Any], conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate basic feedback based on keyword matching for each communication step
    
    Args:
        scenario_data: The scenario data including steps and evaluation keywords
        conversation_history: List of conversation messages
    
    Returns:
        Dictionary with evaluation results
    """
    # Extract just the user messages from the conversation history
    user_messages = [msg["content"] for msg in conversation_history if msg["role"] == "user"]
    all_user_text = " ".join(user_messages).lower()
    
    steps = scenario_data.get("communication_steps", [])
    evaluation_keywords = scenario_data.get("evaluation_keywords", {})
    
    # Results for each step
    steps_evaluation = []
    total_score = 0.0
    
    # Evaluate each communication step
    for step in steps:
        # Get keywords for the current step
        step_keywords = evaluation_keywords.get(step, [])
        
        # Check if any of the keywords are in the user messages
        matching_keywords = []
        for keyword in step_keywords:
            # Use regex to search for the whole word or phrase
            if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', all_user_text):
                matching_keywords.append(keyword)
        
        # Calculate step score based on number of matching keywords
        keywords_found = len(matching_keywords) > 0
        step_score = len(matching_keywords) / len(step_keywords) if step_keywords else 0.0
        
        # Cap the score at 1.0 (100%)
        step_score = min(step_score, 1.0)
        
        # Add to overall score
        total_score += step_score
        
        # Add evaluation for this step
        steps_evaluation.append({
            "step_name": step,
            "keywords_found": keywords_found,
            "matching_keywords": matching_keywords,
            "score": step_score
        })
    
    # Calculate overall score as an average
    overall_score = total_score / len(steps) if steps else 0.0
    
    # Generate text feedback
    feedback_text = "Communication Skills Evaluation:\n\n"
    
    for eval_step in steps_evaluation:
        step_name = eval_step["step_name"]
        score = eval_step["score"]
        keywords_status = "Keywords found" if eval_step["keywords_found"] else "Keywords not found"
        
        # Add more detailed feedback for each step
        if score >= 0.7:
            assessment = "Excellent"
        elif score >= 0.4:
            assessment = "Good"
        elif score > 0:
            assessment = "Needs improvement"
        else:
            assessment = "Not addressed"
        
        feedback_text += f"Step '{step_name}': {keywords_status}. {assessment}.\n"
        
        # Add specific keywords found for more detail
        if eval_step["matching_keywords"]:
            feedback_text += f"   Keywords detected: {', '.join(eval_step['matching_keywords'])}\n"
    
    # Add overall assessment
    feedback_text += f"\nOverall Communication Score: {overall_score:.1f}/1.0\n"
    
    if overall_score >= 0.8:
        feedback_text += "Overall Assessment: Excellent communication skills demonstrated."
    elif overall_score >= 0.6:
        feedback_text += "Overall Assessment: Good communication skills with some areas for improvement."
    elif overall_score >= 0.4:
        feedback_text += "Overall Assessment: Adequate communication with several areas needing improvement."
    else:
        feedback_text += "Overall Assessment: Communication skills need significant improvement."
    
    return {
        "steps_evaluation": steps_evaluation,
        "overall_score": overall_score,
        "feedback": feedback_text
    }

@router.post("/api/evaluate", response_model=EvaluationResponse, tags=["evaluation"])
async def evaluate_conversation(request: EvaluationRequest):
    """
    Evaluate a conversation based on scenario communication steps and keywords
    """
    # Get the session
    session = chat_state.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Get the scenario data and conversation history
    scenario_data = session["scenario_data"]
    conversation_history = session["messages"]
    
    # Generate feedback
    evaluation_results = generate_basic_feedback(scenario_data, conversation_history)
    
    # Return the evaluation response
    return {
        "session_id": request.session_id,
        "scenario_id": session["scenario_id"],
        "steps_evaluation": evaluation_results["steps_evaluation"],
        "overall_score": evaluation_results["overall_score"],
        "feedback": evaluation_results["feedback"]
    } 