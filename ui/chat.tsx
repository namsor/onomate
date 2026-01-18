import React, { useState, useEffect, useRef } from 'react';
// import './Chat.css';

interface Message {
  id: string;
  timestamp: string;
  sender: 'system' | 'founder_a' | 'founder_b' | 'facilitator';
  content: string;
  type: 'message' | 'question' | 'name_suggestion' | 'system_update';
  metadata?: any;
}

interface NameSuggestion {
  id: string;
  name: string;
  category: string;
  rationale: string;
  confidence_score: number;
  domain_status: 'available' | 'unavailable' | 'premium' | 'unknown';
  founder_reactions?: {
    founder_a?: 'love' | 'like' | 'neutral' | 'dislike' | 'reject';
    founder_b?: 'love' | 'like' | 'neutral' | 'dislike' | 'reject';
  };
}

interface SessionState {
  session_id: string;
  current_flow: string;
  current_stage: string;
  founder_profiles: {
    founder_a: any;
    founder_b: any;
  };
  progress_percentage: number;
  conversation_health: string;
}

const OnomateChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([]);
  const [currentFounder, setCurrentFounder] = useState<'founder_a' | 'founder_b'>('founder_a');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiBase = 'http://localhost:3001';

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      const response = await fetch(`${apiBase}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founders: ['founder_a', 'founder_b']
        })
      });
      const result = await response.json() as { sessionId: string; session: any };
      const { sessionId, session } = result;
      
      setSessionState({
        session_id: sessionId,
        current_flow: session.session_metadata.current_flow,
        current_stage: session.session_metadata.current_stage,
        founder_profiles: { founder_a: {}, founder_b: {} },
        progress_percentage: 0,
        conversation_health: 'healthy'
      });

      // Add welcome message
      addSystemMessage("Welcome to Onomate! I'm your naming facilitator. I'll help you both find the perfect name for your startup through a structured conversation. Let's start by understanding each of your individual preferences.");
      
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const addSystemMessage = (content: string, type: Message['type'] = 'message') => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'facilitator',
      content,
      type
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const saveFounderResponse = async (message: string, founder: string) => {
    try {
      await fetch(`${apiBase}/founders/${founder}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: message, timestamp: new Date().toISOString() })
      });
    } catch (error) {
      console.error('Failed to save founder response:', error);
    }
  };

  const fetchFounderProfile = async (founder: string) => {
    try {
      const response = await fetch(`${apiBase}/founders/${founder}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch founder profile:', error);
      return null;
    }
  };

  const getNextInterviewQuestion = (founderProfile: any, lastResponse: string) => {
    // Simple state machine for interview progression
    const responses = founderProfile?.responses || [];
    const responseCount = responses.length;
    
    if (responseCount === 0 || !lastResponse.trim()) {
      return "What type of name do you envision for your startup? Please describe the style or feeling you're looking for.";
    } else if (responseCount === 1) {
      return "That sounds interesting! What industry or market are you targeting with your startup?";
    } else if (responseCount === 2) {
      return "How important is it that the name works internationally? Are there any specific markets you're focused on?";
    } else if (responseCount === 3) {
      return "What about domain availability? How flexible are you with domain extensions like .com, .io, .ai?";
    } else if (responseCount === 4) {
      return "Thinking about your company's personality, should the name sound more professional, innovative, approachable, or something else?";
    } else {
      return null; // Interview complete
    }
  };

  const progressToNextStage = async () => {
    try {
      // Update session to indicate interviews are complete and move to alignment stage
      if (sessionState) {
        const updatedSession = {
          ...sessionState,
          session_metadata: {
            ...sessionState.session_metadata,
            current_flow: "alignment",
            current_stage: "analysis"
          },
          progress_tracking: {
            ...sessionState.progress_tracking,
            flows_completed: ["intake"],
            current_objectives: ["Analyze founder alignment", "Identify naming strategy"],
            completion_percentage: 30
          }
        };

        await fetch(`${apiBase}/session/${sessionState.session_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSession)
        });

        // Update local state immediately
        setSessionState(prev => prev ? {
          ...prev,
          current_flow: "alignment",
          current_stage: "analysis",
          progress_percentage: 30
        } : prev);
      }
    } catch (error) {
      console.error('Failed to progress to next stage:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: currentFounder,
      content: currentMessage,
      type: 'message'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Process message through appropriate agent
      await processMessage(currentMessage, currentFounder);
    } catch (error) {
      console.error('Failed to process message:', error);
      addSystemMessage("I apologize, but I encountered an error processing your message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const processMessage = async (message: string, founder: string) => {
    // Debug: log current session state
    console.log('Processing message, current session state:', sessionState);
    
    // Simulate agent processing based on current flow/stage
    if (sessionState?.current_flow === 'intake') {
      await processInterviewMessage(message, founder);
    } else if (sessionState?.current_flow === 'alignment') {
      await processAlignmentMessage(message, founder);
    } else if (sessionState?.current_flow === 'naming') {
      await processNamingMessage(message, founder);
    } else if (sessionState?.current_flow === 'convergence') {
      await processConvergenceMessage(message, founder);
    } else {
      // Default fallback - check if interviews are complete and force progress
      const founderAProfile = await fetchFounderProfile('founder_a');
      const founderBProfile = await fetchFounderProfile('founder_b');
      
      if (founderAProfile?.interview_status === 'complete' && founderBProfile?.interview_status === 'complete') {
        addSystemMessage("I notice both interviews are complete. Let me transition us to the next phase...", 'system_update');
        await progressToNextStage();
        setTimeout(() => {
          addSystemMessage("Now I'll analyze your responses to create a naming strategy that works for both founders.", 'message');
        }, 1000);
      } else {
        addSystemMessage("I'm processing your input. Please give me a moment to analyze the information.", 'message');
      }
    }
  };

  const processInterviewMessage = async (message: string, founder: string) => {
    // Save the founder's response
    await saveFounderResponse(message, founder);
    
    // Get current founder profile to determine next question
    const founderProfile = await fetchFounderProfile(founder);
    const nextQuestion = getNextInterviewQuestion(founderProfile, message);
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    if (nextQuestion) {
      addSystemMessage(nextQuestion, 'question');
    } else {
      // Current founder's interview complete, check if both are done
      const otherFounderId = founder === 'founder_a' ? 'founder_b' : 'founder_a';
      const otherFounderProfile = await fetchFounderProfile(otherFounderId);
      
      if (otherFounderProfile?.interview_status === 'complete') {
        // Both interviews complete - move to next stage
        addSystemMessage("Excellent! Both founders have shared their preferences. Now I'll analyze your responses to identify areas of alignment and create a naming strategy that works for both of you.", 'system_update');
        
        // Update session to move to next flow stage
        await progressToNextStage();
      } else {
        // Switch to other founder
        setCurrentFounder(otherFounderId as 'founder_a' | 'founder_b');
        addSystemMessage(`Thank you ${founder.replace('_', ' ')}! Now let's hear from ${otherFounderId.replace('_', ' ')}. What type of name do you envision for your startup?`, 'system_update');
      }
    }
  };

  const processAlignmentMessage = async (message: string, founder: string) => {
    // Handle messages during the alignment analysis phase
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    if (message.toLowerCase().includes('ok') || message.toLowerCase().includes('yes') || message.toLowerCase().includes('ready')) {
      // Founder is ready to proceed
      addSystemMessage("Perfect! I'm now analyzing both of your responses to identify areas where you align and where we need creative solutions. Let me work on this analysis...", 'system_update');
      
      setTimeout(async () => {
        await showAlignmentAnalysis();
      }, 2000);
    } else {
      // Handle other input during alignment phase
      addSystemMessage("I understand. I'm currently analyzing your responses to create a comprehensive naming strategy. This will help identify where you both align and where we might need creative compromises.");
    }
  };

  const showAlignmentAnalysis = async () => {
    // Show analysis results
    addSystemMessage("Based on your responses, here's what I found:", 'system_update');
    
    setTimeout(() => {
      addSystemMessage("🎯 **Areas of Alignment:**\n• Both want an innovative, tech-focused name\n• International market focus (France, US, Europe, UAE)\n• Flexible on domain extensions (.io, .ai, .fr)\n• Targeting business/commercial presentations", 'message');
    }, 1000);
    
    setTimeout(() => {
      addSystemMessage("⚖️ **Areas to Balance:**\n• Founder A prefers English-sounding names vs Founder B prioritizes French market\n• Innovation vs Professional tone (finding the sweet spot)\n• PowerPoint automation focus vs broader business presentation angle", 'message');
    }, 3000);
    
    setTimeout(() => {
      addSystemMessage("🚀 **Naming Strategy:**\nI recommend names that sound innovative and international while being pronounceable in both English and French. Let's generate some options that blend your tech vision with professional credibility. Ready to see some suggestions?", 'question');
      
      // Progress to naming stage
      setTimeout(async () => {
        if (sessionState) {
          const updatedSession = {
            ...sessionState,
            session_metadata: {
              ...sessionState.session_metadata,
              current_flow: "naming",
              current_stage: "generation"
            },
            progress_tracking: {
              ...sessionState.progress_tracking,
              flows_completed: ["intake", "alignment"],
              current_objectives: ["Generate name suggestions", "Gather feedback"],
              completion_percentage: 50
            }
          };
          setSessionState(updatedSession);
        }
      }, 500);
    }, 5000);
  };

  const processNamingMessage = async (message: string, founder: string) => {
    // Mock name suggestion processing
    if (message.toLowerCase().includes('generate') || message.toLowerCase().includes('suggest')) {
      await generateNameSuggestions();
    } else {
      addSystemMessage("I'm analyzing your feedback on the current name suggestions. This helps me understand your preferences better.");
    }
  };

  const processConvergenceMessage = async (message: string, founder: string) => {
    addSystemMessage("Thank you for that input. Let me facilitate a discussion between both founders about this decision point.");
  };

  const generateNameSuggestions = async () => {
    setIsLoading(true);
    addSystemMessage("Let me generate some name suggestions based on your preferences...", 'system_update');
    
    // Mock name generation
    const mockNames: NameSuggestion[] = [
      {
        id: 'name_1',
        name: 'Nexus',
        category: 'abstract',
        rationale: 'Suggests connection and central importance, aligns with B2B focus',
        confidence_score: 85,
        domain_status: 'premium'
      },
      {
        id: 'name_2', 
        name: 'BuildBridge',
        category: 'compound',
        rationale: 'Descriptive of construction/connection, memorable and clear',
        confidence_score: 78,
        domain_status: 'available'
      },
      {
        id: 'name_3',
        name: 'Catalyst',
        category: 'metaphorical',
        rationale: 'Implies acceleration and transformation, sophisticated tone',
        confidence_score: 82,
        domain_status: 'unavailable'
      },
      {
        id: 'name_4',
        name: 'Streamline',
        category: 'descriptive',
        rationale: 'Clear benefit focus, suggests efficiency and optimization',
        confidence_score: 75,
        domain_status: 'available'
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setNameSuggestions(mockNames);
    addSystemMessage("I've generated some initial name suggestions based on your preferences. Please review each one and share your honest reactions.", 'name_suggestion');
    setIsLoading(false);
  };

  const reactToName = async (nameId: string, reaction: 'love' | 'like' | 'neutral' | 'dislike' | 'reject') => {
    setNameSuggestions(prev => prev.map(name => 
      name.id === nameId
        ? {
            ...name,
            founder_reactions: {
              ...name.founder_reactions,
              [currentFounder]: reaction
            }
          }
        : name
    ));

    // Send feedback to API
    try {
      await fetch(`${apiBase}/names/current/${nameId}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founder: currentFounder,
          reaction,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to submit name feedback:', error);
    }
  };

  const switchFounder = () => {
    const newFounder = currentFounder === 'founder_a' ? 'founder_b' : 'founder_a';
    setCurrentFounder(newFounder);
    addSystemMessage(`Switched to ${newFounder === 'founder_a' ? 'Founder A' : 'Founder B'}'s perspective.`, 'system_update');
  };

  const getReactionColor = (reaction: string) => {
    switch (reaction) {
      case 'love': return '#22c55e';
      case 'like': return '#84cc16';
      case 'neutral': return '#6b7280';
      case 'dislike': return '#f59e0b';
      case 'reject': return '#ef4444';
      default: return '#d1d5db';
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="session-info">
          <h2>Onomate Naming Session</h2>
          {sessionState && (
            <div className="session-details">
              <span>Flow: {sessionState.current_flow}</span>
              <span>Stage: {sessionState.current_stage}</span>
              <span>Progress: {sessionState.progress_percentage}%</span>
            </div>
          )}
        </div>
        
        <div className="founder-switch">
          <button 
            className={`founder-btn ${currentFounder === 'founder_a' ? 'active' : ''}`}
            onClick={() => setCurrentFounder('founder_a')}
          >
            Founder A
          </button>
          <button 
            className={`founder-btn ${currentFounder === 'founder_b' ? 'active' : ''}`}
            onClick={() => setCurrentFounder('founder_b')}
          >
            Founder B
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-header">
              <span className="sender">{message.sender.replace('_', ' ').toUpperCase()}</span>
              <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}

        {nameSuggestions.length > 0 && (
          <div className="name-suggestions">
            <h3>Name Suggestions</h3>
            <div className="names-grid">
              {nameSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="name-card">
                  <div className="name-header">
                    <h4>{suggestion.name}</h4>
                    <span className={`domain-status ${suggestion.domain_status}`}>
                      {suggestion.domain_status}
                    </span>
                  </div>
                  
                  <div className="name-details">
                    <p><strong>Category:</strong> {suggestion.category}</p>
                    <p><strong>Rationale:</strong> {suggestion.rationale}</p>
                    <p><strong>Confidence:</strong> {suggestion.confidence_score}%</p>
                  </div>

                  <div className="reactions">
                    <p>Your reaction:</p>
                    <div className="reaction-buttons">
                      {(['love', 'like', 'neutral', 'dislike', 'reject'] as const).map((reaction) => (
                        <button
                          key={reaction}
                          className={`reaction-btn ${suggestion.founder_reactions?.[currentFounder] === reaction ? 'selected' : ''}`}
                          style={{ 
                            backgroundColor: suggestion.founder_reactions?.[currentFounder] === reaction 
                              ? getReactionColor(reaction) 
                              : undefined 
                          }}
                          onClick={() => reactToName(suggestion.id, reaction)}
                        >
                          {reaction}
                        </button>
                      ))}
                    </div>
                  </div>

                  {suggestion.founder_reactions && (
                    <div className="founder-reactions">
                      <p>Reactions:</p>
                      <div className="reaction-summary">
                        {suggestion.founder_reactions.founder_a && (
                          <span className="founder-reaction">
                            A: {suggestion.founder_reactions.founder_a}
                          </span>
                        )}
                        {suggestion.founder_reactions.founder_b && (
                          <span className="founder-reaction">
                            B: {suggestion.founder_reactions.founder_b}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-container">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage((e.target as HTMLInputElement).value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Type your message as ${currentFounder.replace('_', ' ')}...`}
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading || !currentMessage.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnomateChat;