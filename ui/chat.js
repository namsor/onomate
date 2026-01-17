"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
require("./Chat.css");
const OnomateChat = () => {
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [currentMessage, setCurrentMessage] = (0, react_1.useState)('');
    const [sessionState, setSessionState] = (0, react_1.useState)(null);
    const [nameSuggestions, setNameSuggestions] = (0, react_1.useState)([]);
    const [currentFounder, setCurrentFounder] = (0, react_1.useState)('founder_a');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const messagesEndRef = (0, react_1.useRef)(null);
    const apiBase = 'http://localhost:3001';
    (0, react_1.useEffect)(() => {
        initializeSession();
    }, []);
    (0, react_1.useEffect)(() => {
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
            const { sessionId, session } = await response.json();
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
        }
        catch (error) {
            console.error('Failed to initialize session:', error);
        }
    };
    const addSystemMessage = (content, type = 'message') => {
        const newMessage = {
            id: `msg_${Date.now()}`,
            timestamp: new Date().toISOString(),
            sender: 'facilitator',
            content,
            type
        };
        setMessages(prev => [...prev, newMessage]);
    };
    const sendMessage = async () => {
        if (!currentMessage.trim() || isLoading)
            return;
        // Add user message
        const userMessage = {
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
        }
        catch (error) {
            console.error('Failed to process message:', error);
            addSystemMessage("I apologize, but I encountered an error processing your message. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const processMessage = async (message, founder) => {
        // Simulate agent processing based on current flow/stage
        if (sessionState?.current_flow === 'intake') {
            await processInterviewMessage(message, founder);
        }
        else if (sessionState?.current_flow === 'naming') {
            await processNamingMessage(message, founder);
        }
        else if (sessionState?.current_flow === 'convergence') {
            await processConvergenceMessage(message, founder);
        }
    };
    const processInterviewMessage = async (message, founder) => {
        // Mock interviewer agent response
        const responses = [
            "That's really helpful insight. Can you tell me more about what draws you to that approach?",
            "I understand. What would success look like for your company name in that context?",
            "Interesting perspective. How important is that particular aspect compared to other naming considerations?",
            "Got it. Let me ask about domain requirements - how critical is securing the .com domain?"
        ];
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        const response = responses[Math.floor(Math.random() * responses.length)];
        addSystemMessage(response, 'question');
    };
    const processNamingMessage = async (message, founder) => {
        // Mock name suggestion processing
        if (message.toLowerCase().includes('generate') || message.toLowerCase().includes('suggest')) {
            await generateNameSuggestions();
        }
        else {
            addSystemMessage("I'm analyzing your feedback on the current name suggestions. This helps me understand your preferences better.");
        }
    };
    const processConvergenceMessage = async (message, founder) => {
        addSystemMessage("Thank you for that input. Let me facilitate a discussion between both founders about this decision point.");
    };
    const generateNameSuggestions = async () => {
        setIsLoading(true);
        addSystemMessage("Let me generate some name suggestions based on your preferences...", 'system_update');
        // Mock name generation
        const mockNames = [
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
    const reactToName = async (nameId, reaction) => {
        setNameSuggestions(prev => prev.map(name => name.id === nameId
            ? {
                ...name,
                founder_reactions: {
                    ...name.founder_reactions,
                    [currentFounder]: reaction
                }
            }
            : name));
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
        }
        catch (error) {
            console.error('Failed to submit name feedback:', error);
        }
    };
    const switchFounder = () => {
        const newFounder = currentFounder === 'founder_a' ? 'founder_b' : 'founder_a';
        setCurrentFounder(newFounder);
        addSystemMessage(`Switched to ${newFounder === 'founder_a' ? 'Founder A' : 'Founder B'}'s perspective.`, 'system_update');
    };
    const getReactionColor = (reaction) => {
        switch (reaction) {
            case 'love': return '#22c55e';
            case 'like': return '#84cc16';
            case 'neutral': return '#6b7280';
            case 'dislike': return '#f59e0b';
            case 'reject': return '#ef4444';
            default: return '#d1d5db';
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "chat-container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "chat-header", children: [(0, jsx_runtime_1.jsxs)("div", { className: "session-info", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Onomate Naming Session" }), sessionState && ((0, jsx_runtime_1.jsxs)("div", { className: "session-details", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Flow: ", sessionState.current_flow] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Stage: ", sessionState.current_stage] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Progress: ", sessionState.progress_percentage, "%"] })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "founder-switch", children: [(0, jsx_runtime_1.jsx)("button", { className: `founder-btn ${currentFounder === 'founder_a' ? 'active' : ''}`, onClick: () => setCurrentFounder('founder_a'), children: "Founder A" }), (0, jsx_runtime_1.jsx)("button", { className: `founder-btn ${currentFounder === 'founder_b' ? 'active' : ''}`, onClick: () => setCurrentFounder('founder_b'), children: "Founder B" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "messages-container", children: [messages.map((message) => ((0, jsx_runtime_1.jsxs)("div", { className: `message ${message.sender}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "message-header", children: [(0, jsx_runtime_1.jsx)("span", { className: "sender", children: message.sender.replace('_', ' ').toUpperCase() }), (0, jsx_runtime_1.jsx)("span", { className: "timestamp", children: new Date(message.timestamp).toLocaleTimeString() })] }), (0, jsx_runtime_1.jsx)("div", { className: "message-content", children: message.content })] }, message.id))), nameSuggestions.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "name-suggestions", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Name Suggestions" }), (0, jsx_runtime_1.jsx)("div", { className: "names-grid", children: nameSuggestions.map((suggestion) => ((0, jsx_runtime_1.jsxs)("div", { className: "name-card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "name-header", children: [(0, jsx_runtime_1.jsx)("h4", { children: suggestion.name }), (0, jsx_runtime_1.jsx)("span", { className: `domain-status ${suggestion.domain_status}`, children: suggestion.domain_status })] }), (0, jsx_runtime_1.jsxs)("div", { className: "name-details", children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Category:" }), " ", suggestion.category] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Rationale:" }), " ", suggestion.rationale] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Confidence:" }), " ", suggestion.confidence_score, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reactions", children: [(0, jsx_runtime_1.jsx)("p", { children: "Your reaction:" }), (0, jsx_runtime_1.jsx)("div", { className: "reaction-buttons", children: ['love', 'like', 'neutral', 'dislike', 'reject'].map((reaction) => ((0, jsx_runtime_1.jsx)("button", { className: `reaction-btn ${suggestion.founder_reactions?.[currentFounder] === reaction ? 'selected' : ''}`, style: {
                                                            backgroundColor: suggestion.founder_reactions?.[currentFounder] === reaction
                                                                ? getReactionColor(reaction)
                                                                : undefined
                                                        }, onClick: () => reactToName(suggestion.id, reaction), children: reaction }, reaction))) })] }), suggestion.founder_reactions && ((0, jsx_runtime_1.jsxs)("div", { className: "founder-reactions", children: [(0, jsx_runtime_1.jsx)("p", { children: "Reactions:" }), (0, jsx_runtime_1.jsxs)("div", { className: "reaction-summary", children: [suggestion.founder_reactions.founder_a && ((0, jsx_runtime_1.jsxs)("span", { className: "founder-reaction", children: ["A: ", suggestion.founder_reactions.founder_a] })), suggestion.founder_reactions.founder_b && ((0, jsx_runtime_1.jsxs)("span", { className: "founder-reaction", children: ["B: ", suggestion.founder_reactions.founder_b] }))] })] }))] }, suggestion.id))) })] })), isLoading && ((0, jsx_runtime_1.jsx)("div", { className: "loading-indicator", children: (0, jsx_runtime_1.jsxs)("div", { className: "loading-dots", children: [(0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {})] }) })), (0, jsx_runtime_1.jsx)("div", { ref: messagesEndRef })] }), (0, jsx_runtime_1.jsx)("div", { className: "chat-input", children: (0, jsx_runtime_1.jsxs)("div", { className: "input-container", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: currentMessage, onChange: (e) => setCurrentMessage(e.target.value), onKeyPress: (e) => e.key === 'Enter' && sendMessage(), placeholder: `Type your message as ${currentFounder.replace('_', ' ')}...`, disabled: isLoading }), (0, jsx_runtime_1.jsx)("button", { onClick: sendMessage, disabled: isLoading || !currentMessage.trim(), children: "Send" })] }) })] }));
};
exports.default = OnomateChat;
//# sourceMappingURL=chat.js.map