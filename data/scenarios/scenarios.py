"""
MedComm Scenarios

This module contains structured scenario data for medical communication training.
Each scenario defines a communication exercise with specific roles, steps, and evaluation criteria.
"""

# Scenario 1: Delivering Difficult News
difficult_news_scenario = {
    "id": "scenario_01_cardiac_arrest",
    "title": "Delivering Bad News - Cardiac Arrest",
    "description": "A 65-year-old patient has suffered a sudden cardiac arrest with severe anoxic brain injury. You must inform their spouse about the situation and poor prognosis.",
    "ai_role": "Anxious spouse of a patient who has been in the ER for the past 3 hours. You are worried and have minimal medical knowledge. You haven't been told much about your spouse's condition yet.",
    "initial_prompt": "Hello doctor, have you been taking care of my husband? They brought him in 3 hours ago and nobody has told me anything. Is he okay?",
    "communication_steps": [
        "Build Rapport", 
        "Set the Context", 
        "Deliver News Clearly", 
        "Show Empathy", 
        "Address Immediate Reactions",
        "Discuss Next Steps"
    ],
    "guidance_cues": {
        "Build Rapport": "Introduce yourself and establish a connection with the spouse.",
        "Set the Context": "Briefly explain what has happened in terms the spouse can understand.",
        "Deliver News Clearly": "Use clear, direct language avoiding medical jargon when explaining the cardiac arrest and brain injury.",
        "Show Empathy": "Acknowledge the emotional impact and demonstrate understanding of the spouse's distress.",
        "Address Immediate Reactions": "Allow time for the spouse to process the information and respond appropriately to their emotional reaction.",
        "Discuss Next Steps": "Explain what will happen next and what decisions may need to be made."
    },
    "evaluation_keywords": {
        "Build Rapport": ["my name is", "I'm Dr.", "I've been caring for", "I'm part of the team"],
        "Set the Context": ["emergency situation", "cardiac arrest", "heart stopped", "resuscitation"],
        "Deliver News Clearly": ["critical condition", "brain injury", "oxygen", "prognosis is poor", "may not recover"],
        "Show Empathy": ["I'm very sorry", "this is difficult news", "I understand this is hard", "take your time"],
        "Address Immediate Reactions": ["it's normal to feel", "would you like a moment", "is there someone we can call"],
        "Discuss Next Steps": ["next few hours", "comfort measures", "specialists", "decisions about care", "support available"]
    }
}

# Scenario 2: Shared Decision-Making
shared_decision_scenario = {
    "id": "scenario_02_early_breast_cancer",
    "title": "Treatment Options - Early Stage Breast Cancer",
    "description": "A 52-year-old patient has been diagnosed with early-stage breast cancer. You need to discuss treatment options and help the patient make a decision that aligns with their values and preferences.",
    "ai_role": "A newly diagnosed breast cancer patient who is anxious but thoughtful. You have done some internet research which has left you confused about the best option. You value maintaining your quality of life and are concerned about side effects.",
    "initial_prompt": "I just got my biopsy results yesterday. They said it's early-stage breast cancer. I've been reading online about different treatments but I'm confused about what's best for me. What do I need to do?",
    "communication_steps": [
        "Acknowledge Concerns",
        "Assess Understanding",
        "Present Options Clearly",
        "Elicit Patient Values",
        "Support Decision-Making",
        "Confirm Understanding and Plan"
    ],
    "guidance_cues": {
        "Acknowledge Concerns": "Recognize the patient's anxiety and validate their feelings about the diagnosis.",
        "Assess Understanding": "Determine what the patient already knows about their diagnosis and treatment options.",
        "Present Options Clearly": "Explain the main treatment options (surgery, radiation, hormonal therapy) with pros and cons of each.",
        "Elicit Patient Values": "Explore what factors are most important to the patient in making this decision.",
        "Support Decision-Making": "Help weigh the options based on medical evidence and the patient's personal values.",
        "Confirm Understanding and Plan": "Ensure the patient understands the chosen approach and establish next steps."
    },
    "evaluation_keywords": {
        "Acknowledge Concerns": ["I understand you're worried", "this is a difficult time", "it's normal to feel overwhelmed"],
        "Assess Understanding": ["what have you learned so far", "tell me your understanding", "what questions do you have"],
        "Present Options Clearly": ["lumpectomy", "mastectomy", "radiation therapy", "side effects", "recovery time", "success rates"],
        "Elicit Patient Values": ["what matters most to you", "how do you feel about", "impact on your life", "your priorities"],
        "Support Decision-Making": ["based on what you've told me", "considering your concerns about", "these options might align with"],
        "Confirm Understanding and Plan": ["does this make sense", "to summarize", "our next steps will be", "follow-up appointment"]
    }
}

# Export the scenarios as a collection
scenarios = {
    "difficult_news": difficult_news_scenario,
    "shared_decision": shared_decision_scenario
}

if __name__ == "__main__":
    # This allows the file to be run directly to test/print the scenarios
    import json
    print(json.dumps(scenarios, indent=2)) 