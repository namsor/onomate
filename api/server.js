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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
class OnomateAPI {
    app;
    memoryPath;
    constructor() {
        this.app = (0, express_1.default)();
        this.memoryPath = (0, path_1.join)(process.cwd(), 'memory');
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
    }
    setupRoutes() {
        // Session management
        this.app.post('/session', this.createSession.bind(this));
        this.app.get('/session/:sessionId', this.getSession.bind(this));
        this.app.put('/session/:sessionId', this.updateSession.bind(this));
        // Founder management
        this.app.post('/founders', this.createFounderProfile.bind(this));
        this.app.get('/founders/:founderId', this.getFounderProfile.bind(this));
        this.app.put('/founders/:founderId', this.updateFounderProfile.bind(this));
        // Shared constraints and alignment
        this.app.get('/shared/:sessionId', this.getSharedConstraints.bind(this));
        this.app.put('/shared/:sessionId', this.updateSharedConstraints.bind(this));
        // Name generation and evaluation
        this.app.get('/names/:sessionId', this.getNameSuggestions.bind(this));
        this.app.post('/names/:sessionId', this.addNameSuggestions.bind(this));
        this.app.put('/names/:sessionId/:nameId/feedback', this.addNameFeedback.bind(this));
        // Agent interactions
        this.app.post('/agents/:agentName/invoke', this.invokeAgent.bind(this));
        this.app.get('/agents/:agentName/status', this.getAgentStatus.bind(this));
        // Flow management
        this.app.post('/flows/:flowName/start', this.startFlow.bind(this));
        this.app.get('/flows/:flowName/status', this.getFlowStatus.bind(this));
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
    }
    async createSession(req, res) {
        try {
            const sessionId = `session_${Date.now()}`;
            const newSession = {
                session_id: sessionId,
                status: 'created',
                session_metadata: {
                    founders: req.body.founders || ['founder_a', 'founder_b'],
                    facilitator_agent: 'facilitator',
                    current_flow: 'intake',
                    current_stage: 'welcome',
                    estimated_duration_minutes: 180,
                    actual_duration_minutes: 0
                },
                progress_tracking: {
                    flows_completed: [],
                    current_objectives: ['Complete founder interviews'],
                    next_milestones: ['Gather individual preferences'],
                    completion_percentage: 0
                },
                conversation_state: {
                    energy_level: 'high',
                    tension_level: 'low',
                    engagement_scores: { founder_a: 0.8, founder_b: 0.8 },
                    last_intervention: null,
                    conversation_health: 'healthy'
                },
                decision_trail: [{
                        timestamp: new Date().toISOString(),
                        decision_type: 'session_start',
                        details: 'Initiated naming session for co-founders',
                        agents_involved: ['facilitator'],
                        founder_input: true
                    }],
                naming_journey: {
                    constraints_gathered: false,
                    alignment_achieved: false,
                    names_generated: [],
                    names_evaluated: [],
                    shortlist: [],
                    final_decision: null
                }
            };
            await this.saveToMemory('session.json', newSession);
            res.status(201).json({ sessionId, session: newSession });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create session' });
        }
    }
    async getSession(req, res) {
        try {
            const session = await this.loadFromMemory('session.json');
            res.json(session);
        }
        catch (error) {
            res.status(404).json({ error: 'Session not found' });
        }
    }
    async updateSession(req, res) {
        try {
            const session = await this.loadFromMemory('session.json');
            const updatedSession = { ...session, ...req.body, updated_at: new Date().toISOString() };
            await this.saveToMemory('session.json', updatedSession);
            res.json(updatedSession);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update session' });
        }
    }
    async createFounderProfile(req, res) {
        try {
            const { founderId } = req.body;
            const profile = {
                founder_id: founderId,
                timestamp: new Date().toISOString(),
                interview_status: 'pending',
                profile: req.body.profile || {},
                interview_metadata: {
                    duration_minutes: 0,
                    completion_percentage: 0,
                    follow_up_needed: [],
                    interviewer_notes: ''
                }
            };
            await this.saveToMemory(`${founderId}.json`, profile);
            res.status(201).json(profile);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create founder profile' });
        }
    }
    async getFounderProfile(req, res) {
        try {
            const { founderId } = req.params;
            const profile = await this.loadFromMemory(`${founderId}.json`);
            res.json(profile);
        }
        catch (error) {
            res.status(404).json({ error: 'Founder profile not found' });
        }
    }
    async updateFounderProfile(req, res) {
        try {
            const { founderId } = req.params;
            const existingProfile = await this.loadFromMemory(`${founderId}.json`);
            const updatedProfile = { ...existingProfile, ...req.body, timestamp: new Date().toISOString() };
            await this.saveToMemory(`${founderId}.json`, updatedProfile);
            res.json(updatedProfile);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update founder profile' });
        }
    }
    async getSharedConstraints(req, res) {
        try {
            const shared = await this.loadFromMemory('shared.json');
            res.json(shared);
        }
        catch (error) {
            res.status(404).json({ error: 'Shared constraints not found' });
        }
    }
    async updateSharedConstraints(req, res) {
        try {
            const existing = await this.loadFromMemory('shared.json');
            const updated = { ...existing, ...req.body, synthesis_timestamp: new Date().toISOString() };
            await this.saveToMemory('shared.json', updated);
            res.json(updated);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update shared constraints' });
        }
    }
    async getNameSuggestions(req, res) {
        try {
            const session = await this.loadFromMemory('session.json');
            const names = session.naming_journey?.names_generated || [];
            res.json({ names });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get name suggestions' });
        }
    }
    async addNameSuggestions(req, res) {
        try {
            const session = await this.loadFromMemory('session.json');
            const newNames = req.body.names || [];
            session.naming_journey.names_generated = [
                ...(session.naming_journey.names_generated || []),
                ...newNames.map((name) => ({
                    ...name,
                    id: `name_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString()
                }))
            ];
            await this.saveToMemory('session.json', session);
            res.json({ success: true, nameCount: newNames.length });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to add name suggestions' });
        }
    }
    async addNameFeedback(req, res) {
        try {
            const { nameId } = req.params;
            const session = await this.loadFromMemory('session.json');
            // Find and update the specific name
            const names = session.naming_journey.names_generated || [];
            const nameIndex = names.findIndex((n) => n.id === nameId);
            if (nameIndex === -1) {
                return res.status(404).json({ error: 'Name not found' });
            }
            names[nameIndex].feedback = {
                ...(names[nameIndex].feedback || {}),
                ...req.body,
                timestamp: new Date().toISOString()
            };
            await this.saveToMemory('session.json', session);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to add name feedback' });
        }
    }
    async invokeAgent(req, res) {
        try {
            const { agentName } = req.params;
            const { action, inputs, context } = req.body;
            // This would integrate with the actual Skybridge agent execution
            // For now, return a mock response
            const result = {
                agent: agentName,
                action,
                timestamp: new Date().toISOString(),
                status: 'completed',
                outputs: req.body.mockOutputs || [],
                execution_time_ms: Math.random() * 1000
            };
            // Log the agent interaction to session
            const session = await this.loadFromMemory('session.json');
            session.agent_interactions = session.agent_interactions || [];
            session.agent_interactions.push(result);
            await this.saveToMemory('session.json', session);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to invoke agent' });
        }
    }
    async getAgentStatus(req, res) {
        try {
            const { agentName } = req.params;
            // Mock agent status - in real implementation, this would check agent health
            res.json({
                agent: agentName,
                status: 'ready',
                last_execution: new Date().toISOString(),
                performance_metrics: {
                    average_response_time: '850ms',
                    success_rate: '98.5%'
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get agent status' });
        }
    }
    async startFlow(req, res) {
        try {
            const { flowName } = req.params;
            // This would integrate with Skybridge flow execution
            res.json({
                flow: flowName,
                status: 'started',
                timestamp: new Date().toISOString(),
                estimated_duration: '30-60 minutes'
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to start flow' });
        }
    }
    async getFlowStatus(req, res) {
        try {
            const { flowName } = req.params;
            const session = await this.loadFromMemory('session.json');
            res.json({
                flow: flowName,
                status: session.session_metadata.current_flow === flowName ? 'active' : 'pending',
                current_stage: session.session_metadata.current_stage,
                progress_percentage: session.progress_tracking.completion_percentage
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get flow status' });
        }
    }
    async loadFromMemory(filename) {
        const filePath = (0, path_1.join)(this.memoryPath, filename);
        const content = await (0, promises_1.readFile)(filePath, 'utf-8');
        return JSON.parse(content);
    }
    async saveToMemory(filename, data) {
        const filePath = (0, path_1.join)(this.memoryPath, filename);
        await (0, promises_1.writeFile)(filePath, JSON.stringify(data, null, 2));
    }
    start(port = 3001) {
        this.app.listen(port, () => {
            console.log(`Onomate API server running on port ${port}`);
        });
    }
}
// Start the server if this file is run directly
if (require.main === module) {
    const api = new OnomateAPI();
    api.start();
}
exports.default = OnomateAPI;
//# sourceMappingURL=server.js.map