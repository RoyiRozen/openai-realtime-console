import { useState, useEffect, useRef } from "react";
import { MessageSquare, RotateCcw } from "react-feather";
import Button from "./Button";

export default function ScenarioChat({ sessionData, onRestart }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

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
    }
  }, [sessionData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message to chat
    const userMessage = {
      role: "user",
      content: inputMessage,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // In a full implementation, you would send this message to an API endpoint
    // that handles the response from the AI based on the scenario
    
    // For now, let's simulate a response after a short delay
    setTimeout(() => {
      const aiResponse = {
        role: "assistant",
        content: "This is a simulated response. In a real implementation, this would connect to the AI backend based on the scenario context.",
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Scenario information header */}
      <div className="bg-gray-100 p-4 border-b">
        <h2 className="font-bold text-lg">{sessionData?.scenario_title || "Medical Communication Scenario"}</h2>
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-gray-600">
            Session ID: {sessionData?.session_id.substring(0, 8)}...
          </div>
          <Button 
            onClick={onRestart}
            className="bg-gray-200 text-gray-800 text-sm"
            icon={<RotateCcw size={14} />}
          >
            New Scenario
          </Button>
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
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputMessage.trim()) {
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className={`${!inputMessage.trim() ? 'bg-gray-300' : 'bg-blue-500'}`}
            icon={<MessageSquare size={16} />}
          >
            Send
          </Button>
        </div>
        
        {/* Communication steps guidance */}
        {sessionData?.communication_steps && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-600">Communication Steps:</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {sessionData.communication_steps.map((step, index) => (
                <span 
                  key={index}
                  className="bg-gray-100 text-xs px-2 py-1 rounded-full"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 