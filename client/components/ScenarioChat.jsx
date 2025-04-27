import { useState, useEffect, useRef } from "react";
import { MessageSquare, RotateCcw, ArrowRight, Check, Award } from "react-feather";
import Button from "./Button";
import EvaluationPanel from "./EvaluationPanel";

export default function ScenarioChat({ sessionData, onRestart }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Initialize chat with the initial message from the scenario
  useEffect(() => {
    if (sessionData) {
      // Add the initial AI message
      setMessages([
        {
          role: "assistant",
          content: sessionData.initial_prompt,
        },
      ]);
      // Reset step tracking when a new scenario is loaded
      setCurrentStep(0);
      setCompletedSteps([]);
    }
  }, [sessionData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Advance to the next step
  const advanceToNextStep = () => {
    if (currentStep < (sessionData?.communication_steps?.length || 0) - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Mark current step as completed
  const markStepCompleted = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
  };

  // Get guidance cue for the current step
  const getCurrentGuidanceCue = () => {
    if (!sessionData?.scenario_data?.guidance_cues) return null;
    
    const stepName = sessionData.communication_steps[currentStep];
    return sessionData.scenario_data.guidance_cues[stepName];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Add user message to chat
    const userMessage = {
      role: "user",
      content: inputMessage,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // First, send the non-streaming version
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     session_id: sessionData.session_id,
      //     message: userMessage.content
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`API response error: ${response.status}`);
      // }
      
      // const data = await response.json();
      // setMessages(prev => [...prev, {
      //   role: "assistant",
      //   content: data.response
      // }]);

      // Use the streaming version instead
      // First, add an empty assistant message that will be updated as the stream comes in
      setStreamingMessage("");
      
      // Create EventSource for SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // Instead of directly connecting to the endpoint, we'll post to it first
      // and then handle the returned stream
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          message: userMessage.content,
          current_step: currentStep,
          model: "gpt-4o"  // You can make this customizable
        }),
      });
      
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let fullContent = "";
      
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value);
          const dataLines = chunk.split("\n\n");
          
          for (const line of dataLines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.error) {
                  console.error("Stream error:", data.error);
                  break;
                }
                
                if (data.content) {
                  fullContent += data.content;
                  setStreamingMessage(fullContent);
                }
                
                if (data.done) {
                  // Message complete, add it to messages array
                  setMessages(prev => [...prev, {
                    role: "assistant",
                    content: fullContent
                  }]);
                  setStreamingMessage("");
                  
                  // After AI responds, we'll handle step progression
                  // For this simple version, we'll advance the step every 2 turns (user message + AI response)
                  if (messages.length % 4 === 1) { // Every 2 exchanges (4 messages including both user and AI)
                    markStepCompleted();
                    advanceToNextStep();
                  }
                  
                  break;
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
        
        setIsLoading(false);
      };
      
      processStream().catch(err => {
        console.error("Stream processing error:", err);
        setIsLoading(false);
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
      // Show error message
      setMessages(prev => [...prev, {
        role: "system",
        content: `Error: ${error.message}`
      }]);
    }
  };

  // Manually advance to next step
  const handleAdvanceStep = () => {
    markStepCompleted();
    advanceToNextStep();
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Scenario information header */}
      <div className="bg-gray-100 p-4 border-b">
        <h2 className="font-bold text-lg">{sessionData?.scenario_title || "Medical Communication Scenario"}</h2>
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-gray-600">
            Session ID: {sessionData?.session_id ? sessionData.session_id.substring(0, 8) + '...' : ''}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowEvaluation(true)}
              className="bg-blue-500 text-white text-sm"
              icon={<Award size={14} />}
            >
              Evaluate
            </Button>
            <Button 
              onClick={onRestart}
              className="bg-gray-200 text-gray-800 text-sm"
              icon={<RotateCcw size={14} />}
            >
              New Scenario
            </Button>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3/4 p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : message.role === 'system'
                    ? 'bg-red-100 text-red-800 rounded-bl-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-3/4 p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none">
                {streamingMessage}
                <span className="ml-1 animate-pulse">▋</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area with guidance */}
      <div className="border-t p-4">
        {/* Current Step Guidance Cue */}
        {sessionData?.communication_steps && sessionData?.communication_steps[currentStep] && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-800">
                Current Step: {sessionData.communication_steps[currentStep]}
              </h3>
              <Button
                onClick={handleAdvanceStep}
                className="bg-blue-100 text-blue-700 text-xs py-1"
                icon={<ArrowRight size={12} />}
              >
                Next Step
              </Button>
            </div>
            {getCurrentGuidanceCue() && (
              <p className="text-sm text-blue-700 mt-1">{getCurrentGuidanceCue()}</p>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim() && !isLoading) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            placeholder={isLoading ? "AI is responding..." : "Type your message..."}
            className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className={`${!inputMessage.trim() || isLoading ? 'bg-gray-300' : 'bg-blue-500'}`}
            icon={<MessageSquare size={16} />}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
        
        {/* Communication steps progress */}
        {sessionData?.communication_steps && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-600">Progress:</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {sessionData.communication_steps.map((step, index) => (
                <span 
                  key={index}
                  className={`text-xs px-2 py-1 rounded-full flex items-center ${
                    index === currentStep
                      ? 'bg-blue-500 text-white' 
                      : completedSteps.includes(index)
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {completedSteps.includes(index) && <Check size={12} className="mr-1" />}
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evaluation panel */}
      {showEvaluation && (
        <EvaluationPanel 
          sessionId={sessionData.session_id}
          onClose={() => setShowEvaluation(false)}
        />
      )}
    </div>
  );
} 