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
  const [alignmentAnalysisShown, setAlignmentAnalysisShown] = useState(false);
  const [messageCounter, setMessageCounter] = useState(0);
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
      // First, reset founder profiles for a fresh start
      await resetFounderProfiles();
      
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

      // Reset conversation state
      setAlignmentAnalysisShown(false);
      setNameSuggestions([]);

      // Add welcome message
      addSystemMessage("Welcome to Onomate! I'm your naming facilitator. I'll help you both find the perfect name for your startup through a structured conversation. Let's start by understanding each of your individual preferences.");
      
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const resetFounderProfiles = async () => {
    try {
      // Reset both founder profiles to start fresh
      const resetProfile = (founderId: string) => ({
        founder_id: founderId,
        timestamp: new Date().toISOString(),
        interview_status: "not_started",
        responses: [],
        profile: {
          business_context: {},
          naming_preferences: {}
        }
      });

      await fetch(`${apiBase}/founders/founder_a`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetProfile('founder_a'))
      });

      await fetch(`${apiBase}/founders/founder_b`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetProfile('founder_b'))
      });
    } catch (error) {
      console.error('Failed to reset founder profiles:', error);
    }
  };

  const addSystemMessage = (content: string, type: Message['type'] = 'message') => {
    // Check if this exact message was just added to prevent duplicates
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content === content && lastMessage.sender === 'facilitator') {
      console.log('Duplicate message prevented:', content);
      return;
    }
    
    const newMessage: Message = {
      id: `msg_${Date.now()}_${messageCounter}`,
      timestamp: new Date().toISOString(),
      sender: 'facilitator',
      content,
      type
    };
    setMessages(prev => [...prev, newMessage]);
    setMessageCounter(prev => prev + 1);
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
    
    // Debug: log current state
    console.log('Interview progression debug:', {
      founderId: founderProfile?.founder_id,
      responseCount,
      lastResponse,
      interviewStatus: founderProfile?.interview_status,
      responses: responses.slice(-2) // Show last 2 responses
    });
    
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
    
    if (!alignmentAnalysisShown && (message.toLowerCase().includes('ok') || message.toLowerCase().includes('yes') || message.toLowerCase().includes('ready'))) {
      // Founder is ready to proceed - show analysis for the first time
      addSystemMessage("Perfect! I'm now analyzing both of your responses to identify areas where you align and where we need creative solutions. Let me work on this analysis...", 'system_update');
      
      setTimeout(async () => {
        await showAlignmentAnalysis();
        setAlignmentAnalysisShown(true);
      }, 2000);
    } else if (alignmentAnalysisShown && (message.toLowerCase().includes('yes') || message.toLowerCase().includes('ready') || message.toLowerCase().includes('suggest'))) {
      // Analysis already shown, user is ready for name suggestions
      addSystemMessage("Excellent! Let me generate some name suggestions based on our analysis...", 'system_update');
      setTimeout(async () => {
        await generateNameSuggestions();
      }, 1500);
    } else {
      // Handle other input during alignment phase
      addSystemMessage("I understand. I'm currently analyzing your responses to create a comprehensive naming strategy. This will help identify where you both align and where we might need creative compromises.");
    }
  };

  const showAlignmentAnalysis = async () => {
    // Get actual founder responses for AI analysis
    const founderAProfile = await fetchFounderProfile('founder_a');
    const founderBProfile = await fetchFounderProfile('founder_b');
    
    addSystemMessage("Based on your responses, here's what I found:", 'system_update');
    
    try {
      // Call the synthesizer agent for real AI analysis
      const analysisResponse = await fetch(`${apiBase}/agents/synthesizer/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_alignment',
          data: {
            founder_a: founderAProfile,
            founder_b: founderBProfile,
            session_id: sessionState?.session_id
          }
        })
      });
      
      const analysis = await analysisResponse.json();
      
      setTimeout(() => {
        addSystemMessage(analysis.alignment_areas || "🎯 **Areas of Alignment:**\nAnalyzing common ground between founders...", 'message');
      }, 1000);
      
      setTimeout(() => {
        addSystemMessage(analysis.balance_areas || "⚖️ **Areas to Balance:**\nIdentifying differences to address...", 'message');
      }, 3000);
      
      setTimeout(() => {
        addSystemMessage(analysis.naming_strategy || "🚀 **Naming Strategy:**\nDeveloping approach based on your preferences... Ready to see suggestions?", 'question');
      }, 5000);
      
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      // Fallback to basic analysis if AI fails
      setTimeout(() => {
        addSystemMessage("🎯 **Areas of Alignment:**\nBoth founders are focused on the same target market and business goals.", 'message');
      }, 1000);
    }
    
    // Progress to naming stage
    setTimeout(async () => {
      if (sessionState) {
        setSessionState(prev => prev ? {
          ...prev,
          current_flow: "naming",
          current_stage: "generation",
          progress_percentage: 50
        } : prev);
      }
    }, 6000);
  };

  const processNamingMessage = async (message: string, founder: string) => {
    // Check if we have any name suggestions yet
    const hasExistingSuggestions = nameSuggestions.length > 0;
    
    if (!hasExistingSuggestions && (message.toLowerCase().includes('yes') || message.toLowerCase().includes('ready') || message.toLowerCase().includes('ok'))) {
      // First time in naming flow - generate initial suggestions
      await generateNameSuggestions();
    } else if (message.toLowerCase().includes('generate') || message.toLowerCase().includes('suggest') || message.toLowerCase().includes('more')) {
      // User explicitly asking for (more) suggestions
      await generateNameSuggestions();
    } else if (hasExistingSuggestions) {
      // Check if both founders have provided reactions to analyze feedback
      const allNamesHaveReactions = nameSuggestions.every(name => 
        name.founder_reactions?.founder_a && name.founder_reactions?.founder_b
      );
      
      if (allNamesHaveReactions && (message.toLowerCase().includes('done') || message.toLowerCase().includes('analyze') || message.toLowerCase().includes('decide') || message.toLowerCase().includes('next'))) {
        // All reactions collected, analyze and facilitate decision
        await analyzeFeedbackAndFacilitateDecision();
      } else if (allNamesHaveReactions) {
        // Auto-trigger analysis when both founders have reacted to all names
        addSystemMessage("Great! I can see both founders have shared reactions to all suggestions. Let me analyze your feedback to help guide the final decision...", 'system_update');
        setTimeout(async () => {
          await analyzeFeedbackAndFacilitateDecision();
        }, 2000);
      } else {
        // Still waiting for more reactions
        addSystemMessage("I'm analyzing your feedback on the current name suggestions. This helps me understand your preferences better.");
      }
    } else {
      // Default case - generate suggestions
      await generateNameSuggestions();
    }
  };

  const processConvergenceMessage = async (message: string, founder: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('yes') || lowerMessage.includes('agree') || lowerMessage.includes('choose') || lowerMessage.includes('decide')) {
      addSystemMessage("Excellent! It sounds like you're ready to make a decision. Let me help facilitate the final choice...", 'system_update');
      
      setTimeout(() => {
        addSystemMessage("🎉 **Decision Support:** Based on your reactions, I recommend focusing on your top candidates. Would you like me to help you compare the final options or do you have a preferred choice in mind?", 'question');
      }, 2000);
    } else if (lowerMessage.includes('more') || lowerMessage.includes('different') || lowerMessage.includes('other') || 
               lowerMessage.includes('additional') || lowerMessage.includes('suggestions') || 
               lowerMessage.includes('explore') || lowerMessage.includes('variations') || 
               lowerMessage.includes('alternatives') || lowerMessage.includes('generate')) {
      addSystemMessage("Perfect! I'll generate additional suggestions. Since you've already seen one set, let me create variations and alternatives that build on what we've learned...", 'system_update');
      
      setTimeout(async () => {
        await generateVariationsAndAlternatives();
      }, 2000);
    } else if (lowerMessage.includes('final') || lowerMessage.includes('ready') || lowerMessage.includes('pick')) {
      addSystemMessage("Great! Let's finalize your decision. Based on the feedback so far, which name resonates most strongly with your combined vision?", 'question');
    } else if (lowerMessage.includes('discuss') || lowerMessage.includes('options') || lowerMessage.includes('compare') || lowerMessage.includes('analyze')) {
      // Help facilitate discussion of available options
      await facilitateOptionsDiscussion();
    } else if (lowerMessage.includes('back') || lowerMessage.includes('previous') || lowerMessage.includes('earlier') || lowerMessage.includes('original')) {
      addSystemMessage("Would you like me to remind you of your previous strong candidates? Sometimes the first good options are the best ones!", 'question');
    } else {
      addSystemMessage("Thank you for that input. I'm here to help facilitate the final decision between both founders. Feel free to discuss the options or let me know if you need additional suggestions.", 'message');
    }
  };

  const facilitateOptionsDiscussion = async () => {
    addSystemMessage("Let me help facilitate your options discussion...", 'system_update');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Look for names with positive reactions from both founders
    const strongCandidates = nameSuggestions.filter(name => {
      const aReaction = name.founder_reactions?.founder_a;
      const bReaction = name.founder_reactions?.founder_b;
      return (aReaction === 'love' || aReaction === 'like') && (bReaction === 'love' || bReaction === 'like');
    });
    
    if (strongCandidates.length > 0) {
      const candidatesList = strongCandidates.map(name => 
        `**${name.name}** - ${name.rationale.slice(0, 80)}...`
      ).join('\n• ');
      
      addSystemMessage(`💡 **Your Strong Candidates:**\n• ${candidatesList}\n\nThese names received positive feedback from both founders. Which aspects of these resonate most with each of you?`, 'message');
      
      setTimeout(() => {
        addSystemMessage("Consider: What specific elements of these names appeal to each founder? How do they align with your business goals? Would any of these work as your final choice, or do you need something that combines elements from multiple candidates?", 'question');
      }, 3000);
    } else {
      addSystemMessage("I notice we haven't found strong consensus candidates yet. Let me help identify what each founder values most in the names we've seen so far...", 'message');
      
      setTimeout(() => {
        addSystemMessage("Would you like me to: 1) Generate completely new suggestions with a different approach, 2) Focus on finding compromise solutions, or 3) Help you articulate what you're both looking for?", 'question');
      }, 2500);
    }
  };

  const generateNameSuggestions = async () => {
    setIsLoading(true);
    addSystemMessage("Let me generate name suggestions based on your preferences...", 'system_update');
    
    try {
      // Get founder profiles for context
      const founderAProfile = await fetchFounderProfile('founder_a');
      const founderBProfile = await fetchFounderProfile('founder_b');
      
      // Call the namer agent for real AI name generation
      const nameResponse = await fetch(`${apiBase}/agents/namer/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_names',
          data: {
            founder_a: founderAProfile,
            founder_b: founderBProfile,
            session_id: sessionState?.session_id,
            constraints: {
              count: 5,
              include_rationale: true
            }
          }
        })
      });
      
      const nameData = await nameResponse.json();
      
      if (nameData.suggestions && Array.isArray(nameData.suggestions)) {
        const formattedSuggestions = nameData.suggestions.map((name: any, index: number) => ({
          id: `name_${index + 1}`,
          name: name.name,
          category: name.category || 'compound',
          rationale: name.rationale || 'AI-generated suggestion',
          confidence_score: name.confidence_score || 80,
          domain_status: name.domain_status || 'unknown'
        }));
        
        setNameSuggestions(formattedSuggestions);
        
        // Save names to session backend
        if (sessionState?.session_id) {
          try {
            await fetch(`${apiBase}/names/${sessionState.session_id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ names: formattedSuggestions })
            });
          } catch (error) {
            console.error('Failed to save names to session:', error);
          }
        }
      } else {
        // Fallback if AI generation fails
        throw new Error('Invalid AI response format');
      }
      
    } catch (error) {
      console.error('AI name generation failed:', error);
      // Show error message instead of fallback names
      addSystemMessage("I apologize, but I'm having trouble generating name suggestions right now. Please try again in a moment, or let me know if you'd like to discuss your preferences further.", 'message');
      setNameSuggestions([]);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    addSystemMessage("I've generated name suggestions using AI analysis of your preferences. Please review and share your reactions!", 'name_suggestion');
    setIsLoading(false);
  };



  const generateVariationsAndAlternatives = async () => {
    setIsLoading(true);
    addSystemMessage("Generating variations and alternatives based on your feedback...", 'system_update');
    
    try {
      // Get founder profiles and current suggestions for context
      const founderAProfile = await fetchFounderProfile('founder_a');
      const founderBProfile = await fetchFounderProfile('founder_b');
      
      // Call the namer agent for AI-generated variations
      const nameResponse = await fetch(`${apiBase}/agents/namer/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_variations',
          data: {
            founder_a: founderAProfile,
            founder_b: founderBProfile,
            previous_suggestions: nameSuggestions,
            session_id: sessionState?.session_id,
            constraints: {
              count: 5,
              variation_type: 'alternatives',
              include_rationale: true
            }
          }
        })
      });
      
      const variationData = await nameResponse.json();
      
      if (variationData.suggestions && Array.isArray(variationData.suggestions)) {
        const formattedVariations = variationData.suggestions.map((name: any, index: number) => ({
          id: `var_${index + 1}`,
          name: name.name,
          category: name.category || 'compound',
          rationale: name.rationale || 'AI-generated variation',
          confidence_score: name.confidence_score || 80,
          domain_status: name.domain_status || 'unknown'
        }));
        
        setNameSuggestions(formattedVariations);
        
        // Save variations to session backend
        if (sessionState?.session_id) {
          try {
            await fetch(`${apiBase}/names/${sessionState.session_id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ names: formattedVariations })
            });
          } catch (error) {
            console.error('Failed to save variations to session:', error);
          }
        }
      } else {
        throw new Error('Invalid AI variation response');
      }
      
    } catch (error) {
      console.error('AI variation generation failed:', error);
      addSystemMessage("I'm having trouble generating variations right now. Could you tell me more specifically what aspects you'd like me to explore or modify from the previous suggestions?", 'message');
      setNameSuggestions([]);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    addSystemMessage("I've generated new variations based on your feedback and preferences. Please review and share your reactions!", 'name_suggestion');
    setIsLoading(false);
  };

  const analyzeFeedbackAndFacilitateDecision = async () => {
    // Analyze the reactions and identify top candidates
    const reactionScores = { love: 5, like: 4, neutral: 3, dislike: 2, reject: 1 };
    
    const analyzedNames = nameSuggestions.map(name => {
      const founderAScore = name.founder_reactions?.founder_a ? reactionScores[name.founder_reactions.founder_a] : 0;
      const founderBScore = name.founder_reactions?.founder_b ? reactionScores[name.founder_reactions.founder_b] : 0;
      const totalScore = founderAScore + founderBScore;
      const hasStrongSupport = founderAScore >= 4 && founderBScore >= 4; // Both like or love
      const hasLoveFromOne = (founderAScore === 5 || founderBScore === 5);
      
      return {
        ...name,
        totalScore,
        hasStrongSupport,
        hasLoveFromOne,
        founderAScore,
        founderBScore
      };
    }).sort((a, b) => b.totalScore - a.totalScore);

    const topCandidates = analyzedNames.filter(name => name.hasStrongSupport);
    const strongestCandidate = analyzedNames[0];

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addSystemMessage("📊 **Feedback Analysis Complete!**", 'system_update');
    
    setTimeout(() => {
      if (topCandidates.length > 0) {
        const topNames = topCandidates.slice(0, 3).map(name => 
          `**${name.name}** (A: ${name.founder_reactions?.founder_a}, B: ${name.founder_reactions?.founder_b})`
        ).join('\n• ');
        
        addSystemMessage(`🎯 **Top Candidates with Strong Support:**\n• ${topNames}\n\nThese names received positive reactions from both founders!`, 'message');
      } else {
        addSystemMessage("🤔 **Interesting Challenge:** No names received strong support from both founders. Let me help you find common ground.", 'message');
      }
    }, 2000);

    setTimeout(() => {
      if (strongestCandidate.totalScore >= 8 && strongestCandidate.hasStrongSupport) {
        // Clear winner
        addSystemMessage(`🌟 **Strong Consensus:** "${strongestCandidate.name}" appears to be your strongest candidate! Both founders gave positive feedback. Would you like to move forward with this name or explore variations?`, 'question');
      } else if (topCandidates.length > 0) {
        // Multiple good options
        addSystemMessage(`⚖️ **Decision Time:** You have ${topCandidates.length} strong candidates. I recommend discussing these top options together. Which aspects of these names resonate most with your vision?`, 'question');
      } else {
        // Need to generate new options
        addSystemMessage("🔄 **New Direction Needed:** Based on your feedback, let me generate a fresh set of options that better align with both your preferences. What elements from the previous suggestions did you find most appealing?", 'question');
      }
    }, 4000);

    // Progress to convergence stage
    setTimeout(async () => {
      if (sessionState) {
        setSessionState(prev => prev ? {
          ...prev,
          current_flow: "convergence",
          current_stage: "decision",
          progress_percentage: 80
        } : prev);
      }
    }, 5000);
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
      const sessionId = sessionState?.session_id || 'default_session';
      await fetch(`${apiBase}/names/${sessionId}/${nameId}/feedback`, {
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