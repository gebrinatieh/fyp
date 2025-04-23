import { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Renders a message with formatted code
const MessageWithCode = ({ content }) => {
  const [localShowThinking, setLocalShowThinking] = useState(false);

  // Match <think>...</think> content but don't include the tags in what's shown
  const thinkMatch = content ? content.match(/<think>([\s\S]*?)<\/think>/i) : null;
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;

  // Remove <think> block from visible content
  const visibleContent = thinkMatch ? content.replace(thinkMatch[0], "").trim() : content;

  // Code formatting
  const renderFormattedText = (text) => {
    if (!text) return null;
    
    const parts = text.split(/```/g);
    return parts.map((part, index) => {
      if (index % 2 === 0) return <span key={index}>{part}</span>;

      const lines = part.split("\n");
      const firstLine = lines[0].trim();
      const code = lines.slice(1).join("\n");
      const language = lines.length > 1 ? firstLine : "text";
      const realCode = lines.length > 1 ? code : firstLine;

      return (
        <SyntaxHighlighter
          key={index}
          language={language}
          style={oneDark}
          customStyle={{ borderRadius: "8px", marginTop: "10px" }}
        >
          {realCode}
        </SyntaxHighlighter>
      );
    });
  };

  return (
    <div>
      {/* Think block - only render if thinkContent exists */}
      {thinkContent && thinkContent.trim() !== "" && (
        <div
          style={{
            background: "#f0f0f0",
            border: "1px dashed #999",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
          }}
        >
          <button
            onClick={() => setLocalShowThinking(!localShowThinking)}
            style={{
              marginBottom: "5px",
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "14px",
            }}
          >
            {localShowThinking ? "Hide AI Thinking 🧠" : "Show AI Thinking 🧠"}
          </button>

          {localShowThinking && (
            <div style={{ fontStyle: "italic", color: "#444" }}>
              {renderFormattedText(thinkContent)}
            </div>
          )}
        </div>
      )}

      {/* Visible content */}
      {renderFormattedText(visibleContent)}
    </div>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Add event listener for the Escape key to stop the model
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && loading) {
        stopGeneration();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, abortController]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    
    // Add temporary AI message with an empty think block
    const tempBotMessage = { role: "assistant", content: "<think></think>" };
    setMessages([...updatedMessages, tempBotMessage]);

    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "mousallem9",
          messages: updatedMessages,
          stream: true,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let thinking = "";  // Stores content for the <think> block
      let answer = "";    // Stores final answer content
      let buffer = "";
      let thinkingComplete = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects separated by newline
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.trim() === "") continue;
          
          try {
            const chunk = JSON.parse(line);
            if (chunk.message && chunk.message.content) {
              const chunkContent = chunk.message.content;
              
              // If we haven't seen the closing tag yet, check for it
              if (!thinkingComplete) {
                if (chunkContent.includes("</think>")) {
                  const [thinkingPart, rest] = chunkContent.split("</think>");
                  thinking += thinkingPart;
                  thinkingComplete = true;
                  answer += rest;
                } else {
                  thinking += chunkContent;
                }
              } else {
                // After closing tag, all content goes to answer
                answer += chunkContent;
              }
              
              // Build the current content, ensuring the closing tag is present
              const currentContent = `<think>${thinking}</think>\n${answer}`;
              const updatedMessagesWithResponse = [...updatedMessages];
              updatedMessagesWithResponse.push({ role: "assistant", content: currentContent });
              setMessages(updatedMessagesWithResponse);
            }
          } catch (e) {
            console.error("Error parsing JSON:", e, line);
          }
        }
      }
      
      // Final message with complete thinking and answer
      if (thinking || answer) {
        const finalContent = `<think>${thinking}</think>\n${answer}`;
        const finalMessages = [...updatedMessages];
        finalMessages.push({ role: "assistant", content: finalContent });
        setMessages(finalMessages);
      }
      
    } catch (err) {
      if (err.name === "AbortError") {
        // Aborted, do nothing or notify the user if necessary
        console.log("Request aborted by user.");
      } else {
        console.error("Error:", err);
        const errorMessage = { 
          role: "assistant", 
          content: "Sorry, I encountered an error: " + err.message
        };
        setMessages([...updatedMessages, errorMessage]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  // Stop the current ML generation
  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
      setAbortController(null);
    }
  };
  
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", fontFamily: "Arial" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem",
          borderBottom: "1px solid #ccc",
        }}
      >
        <h1>Professor Moussallem</h1>
        <div style={{ position: "relative" }}>
          <button
            onClick={""}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <img
              src="../public/issam.png"
              alt="Profile"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </button>
        </div>
      </div>
      {/* Chat Display */}
      <div
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "#f9f9f9",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div
                style={{
                  textAlign: msg.role === "user" ? "right" : "left",
                  fontWeight: "bold",
                }}
              >
                {msg.role === "user" ? "🧑 You:" : "🤖 AI:"}
              </div>
              <div 
                style={{ 
                  padding: "8px", 
                  backgroundColor: msg.role === "user" ? "#e3f2fd" : "#fff",
                  borderRadius: "8px",
                  marginLeft: msg.role === "user" ? "25%" : "0",
                  marginRight: msg.role === "user" ? "0" : "25%",
                  whiteSpace: "pre-wrap" 
                }}
              >
                {msg.role === "assistant" ? (
                  <MessageWithCode content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) sendMessage();
          }}
          placeholder="Ask something..."
          disabled={loading}
          style={{
            flexGrow: 1,
            padding: "8px",
            marginRight: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={loading ? stopGeneration : sendMessage}
          disabled={loading && !abortController}
          style={{
            padding: "8px 16px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: loading ? "#d9534f" : "#4CAF50",
            color: "white",
            cursor: "pointer",
          }}
        >
          {loading ? "Stop" : "Send"}
        </button>
      </div>
      
      {/* Typing indicator CSS */}
      <style jsx>{`
        .typing-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #555;
          border-radius: 50%;
          display: inline-block;
          margin: 0 2px;
          opacity: 0.4;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default Chat;
