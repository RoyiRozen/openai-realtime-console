import { useState, useEffect, useRef } from "react";
import { MessageSquare, RotateCcw } from "react-feather";
import Button from "./Button";

export default function ScenarioChat({ sessionData, onRestart }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
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

  return (
    <div className="flex flex-col w-full h-full">
      {/* Scenario information header */}
      <div className="bg-gray-100 p-4 border-b">
        <h2 className="font-bold text-lg">{sessionData?.scenario_title || "Medical Communication Scenario"}</h2>
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-gray-600">
            Session ID: {sessionData?.session_id ? sessionData.session_id.substring(0, 8) + '...' : ''}
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

      {/* Input area */}
      <div className="border-t p-4">
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