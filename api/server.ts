import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface FounderProfile {
  founder_id: string;
  timestamp: string;
  interview_status: string;
  profile: any;
  interview_metadata: any;
}

interface SessionState {
  session_id: string;
  status: string;
  session_metadata: any;
  progress_tracking: any;
  conversation_state: any;
  decision_trail: any[];
  naming_journey: any;
}

interface SharedConstraints {
  synthesis_timestamp: string;
  alignment_analysis: any;
  naming_direction: any;
  compromise_framework: any;
}

class OnomateAPI {
  private app: express.Application;
  private memoryPath: string;

  constructor() {
    this.app = express();
    this.memoryPath = join(process.cwd(), 'memory');
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes() {
    // Session management
    this.app.post('/session', this.createSession.bind(this));
    this.app.get('/session/:sessionId', this.getSession.bind(this));
    this.app.put('/session/:sessionId', this.updateSession.bind(this));
    
    // Founder management
    this.app.post('/founders', this.createFounderProfile.bind(this));
    this.app.get('/founders/:founderId', this.getFounderProfile.bind(this));
    this.app.put('/founders/:founderId', this.updateFounderProfile.bind(this));
    this.app.post('/founders/:founderId/response', this.addFounderResponse.bind(this));
    
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
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  }

  private async createSession(req: Request, res: Response) {
    try {
      const sessionId = `session_${Date.now()}`;
      const newSession: SessionState = {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to create session' });
    }
  }

  private async getSession(req: Request, res: Response) {
    try {
      const session = await this.loadFromMemory('session.json');
      res.json(session);
    } catch (error) {
      res.status(404).json({ error: 'Session not found' });
    }
  }

  private async updateSession(req: Request, res: Response) {
    try {
      const session = await this.loadFromMemory('session.json');
      const updatedSession = { ...session, ...req.body, updated_at: new Date().toISOString() };
      await this.saveToMemory('session.json', updatedSession);
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  private async createFounderProfile(req: Request, res: Response) {
    try {
      const { founderId } = req.body;
      const profile: FounderProfile = {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to create founder profile' });
    }
  }

  private async getFounderProfile(req: Request, res: Response) {
    try {
      const { founderId } = req.params;
      const profile = await this.loadFromMemory(`${founderId}.json`);
      res.json(profile);
    } catch (error) {
      res.status(404).json({ error: 'Founder profile not found' });
    }
  }

  private async updateFounderProfile(req: Request, res: Response) {
    try {
      const { founderId } = req.params;
      const existingProfile = await this.loadFromMemory(`${founderId}.json`);
      const updatedProfile = { ...existingProfile, ...req.body, timestamp: new Date().toISOString() };
      await this.saveToMemory(`${founderId}.json`, updatedProfile);
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update founder profile' });
    }
  }

  private async addFounderResponse(req: Request, res: Response) {
    try {
      const { founderId } = req.params;
      const { response, timestamp } = req.body;
      
      const existingProfile = await this.loadFromMemory(`${founderId}.json`);
      
      // Initialize responses array if it doesn't exist
      if (!existingProfile.responses) {
        existingProfile.responses = [];
      }
      
      // Add new response
      existingProfile.responses.push({
        content: response,
        timestamp: timestamp || new Date().toISOString(),
        question_number: existingProfile.responses.length + 1
      });
      
      // Update interview status based on number of responses
      if (existingProfile.responses.length >= 5) {
        existingProfile.interview_status = 'complete';
      } else {
        existingProfile.interview_status = 'in_progress';
      }
      
      // Update timestamp
      existingProfile.timestamp = new Date().toISOString();
      
      await this.saveToMemory(`${founderId}.json`, existingProfile);
      res.json(existingProfile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save founder response' });
    }
  }

  private async getSharedConstraints(req: Request, res: Response) {
    try {
      const shared = await this.loadFromMemory('shared.json');
      res.json(shared);
    } catch (error) {
      res.status(404).json({ error: 'Shared constraints not found' });
    }
  }

  private async updateSharedConstraints(req: Request, res: Response) {
    try {
      const existing = await this.loadFromMemory('shared.json');
      const updated = { ...existing, ...req.body, synthesis_timestamp: new Date().toISOString() };
      await this.saveToMemory('shared.json', updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update shared constraints' });
    }
  }

  private async getNameSuggestions(req: Request, res: Response) {
    try {
      const session = await this.loadFromMemory('session.json');
      const names = session.naming_journey?.names_generated || [];
      res.json({ names });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get name suggestions' });
    }
  }

  private async addNameSuggestions(req: Request, res: Response) {
    try {
      const session = await this.loadFromMemory('session.json');
      const newNames = req.body.names || [];
      
      session.naming_journey.names_generated = [
        ...(session.naming_journey.names_generated || []),
        ...newNames.map((name: any) => ({
          ...name,
          id: `name_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        }))
      ];

      await this.saveToMemory('session.json', session);
      res.json({ success: true, nameCount: newNames.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add name suggestions' });
    }
  }

  private async addNameFeedback(req: Request, res: Response) {
    try {
      const { nameId } = req.params;
      const session = await this.loadFromMemory('session.json');
      
      // Find and update the specific name
      const names = session.naming_journey.names_generated || [];
      const nameIndex = names.findIndex((n: any) => n.id === nameId);
      
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to add name feedback' });
    }
  }

  private async invokeAgent(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to invoke agent' });
    }
  }

  private async getAgentStatus(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to get agent status' });
    }
  }

  private async startFlow(req: Request, res: Response) {
    try {
      const { flowName } = req.params;
      // This would integrate with Skybridge flow execution
      res.json({
        flow: flowName,
        status: 'started',
        timestamp: new Date().toISOString(),
        estimated_duration: '30-60 minutes'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start flow' });
    }
  }

  private async getFlowStatus(req: Request, res: Response) {
    try {
      const { flowName } = req.params;
      const session = await this.loadFromMemory('session.json');
      
      res.json({
        flow: flowName,
        status: session.session_metadata.current_flow === flowName ? 'active' : 'pending',
        current_stage: session.session_metadata.current_stage,
        progress_percentage: session.progress_tracking.completion_percentage
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get flow status' });
    }
  }

  private async loadFromMemory(filename: string): Promise<any> {
    const filePath = join(this.memoryPath, filename);
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async saveToMemory(filename: string, data: any): Promise<void> {
    const filePath = join(this.memoryPath, filename);
    await writeFile(filePath, JSON.stringify(data, null, 2));
  }

  public start(port: number = 3001) {
    this.app.listen(port, () => {
      console.log(`Onomate API server running on port ${port}`);
    });
  }
}

// Start the server if this file is run directly
// In ES modules, we can simply start the server since this file is the entry point
const api = new OnomateAPI();
api.start();

export default OnomateAPI;