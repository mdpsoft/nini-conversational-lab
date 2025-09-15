import { Turn, Knobs } from '../../types/core';
import { UserAI } from '../userai/UserAI';
import { insertKnobsIntoXml } from './xml';
import { countEmojis } from '../../utils/emoji';

export interface OpenAIResponse {
  success: boolean;
  text: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  meta?: {
    chars: number;
    emoji_count: number;
    crisis_active: boolean;
  };
}

interface NiniResponse {
  success: boolean;
  text: string;
  meta?: any;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface NiniOptions {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface NiniAdapterOptions {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout?: number;
}

class NiniAdapter {
  private static readonly DEFAULT_TIMEOUT = 20000; // 20s
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAYS = [1000, 2000]; // exponential backoff

  // Specialized method for USERAI turns using runtime prompt
  static async respondAsUserAI(
    userAI: UserAI,
    knobs: Partial<Knobs>,
    niniOptions: NiniOptions,
    simulationMode: boolean = false
  ): Promise<NiniResponse> {
    const runtimePrompt = await userAI.buildRuntimePrompt();
    
    if (!runtimePrompt) {
      // Fallback to regular generation if no profile
      return { 
        success: true, 
        text: "No entiendo bien, ¿podrías explicarme más?",
        meta: { fallback: true }
      };
    }

    if (simulationMode) {
      return {
        success: true,
        text: this.getSimulatedUserAIResponse(userAI),
        meta: { 
          simulated: true,
          runtime_prompt_used: true,
          prompt_length: runtimePrompt.length,
          runtime_debug: userAI.getRuntimeDebugInfo()
        }
      };
    }

    try {
      const messages = [
        { role: 'system', content: runtimePrompt },
        { role: 'user', content: 'Continúa la conversación siguiendo tu perfil y el beat narrativo.' }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${niniOptions.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: niniOptions.model,
          messages,
          temperature: niniOptions.temperature,
          max_tokens: niniOptions.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        text: data.choices[0].message.content,
        meta: {
          runtime_prompt_used: true,
          prompt_length: runtimePrompt.length,
          model: niniOptions.model,
          usage: data.usage,
          runtime_debug: userAI.getRuntimeDebugInfo()
        }
      };
    } catch (error) {
      console.error('Error in UserAI OpenAI call:', error);
      return {
        success: false,
        text: 'Estoy teniendo un problema técnico para responder ahora mismo. ¿Querés que lo intentemos de nuevo en unos segundos?',
        meta: { 
          error: true,
          fallback: true,
          runtime_prompt_available: true,
          runtime_debug: userAI.getRuntimeDebugInfo()
        }
      };
    }
  }

  private static getSimulatedUserAIResponse(userAI: UserAI): string {
    // Get contextual simulated responses based on UserAI state
    const responses = [
      "Eso tiene mucho sentido, gracias por explicármelo así.",
      "No había pensado en eso antes, me ayuda mucho.",
      "¿Podrías darme un ejemplo concreto de cómo hacer eso?",
      "Me da un poco de miedo intentarlo, pero creo que tenés razón.",
      "¿Y si no funciona? ¿Qué otras opciones tendría?",
      "Perfecto, voy a intentar eso. ¿Hay algo más que debería saber?"
    ];
    
    // Simple selection based on turn count for variety
    const context = (userAI as any).context;
    const index = context?.turnCount ? context.turnCount % responses.length : 0;
    
    return responses[index];
  }
  
  static async respondWithNini(
    systemPrompt: string,
    conversationHistory: Turn[],
    knobs: Partial<Knobs>,
    niniOptions: NiniOptions,
    simulationMode: boolean = false
  ): Promise<NiniResponse> {
    
    // Simulation mode - return stub response
    if (simulationMode || !niniOptions.apiKey) {
      return this.generateSimulationResponse(conversationHistory, knobs);
    }
    
    try {
      const systemMessage = insertKnobsIntoXml(systemPrompt, knobs);
      const messages = this.buildMessages(systemMessage, conversationHistory);
      
      // Estimate cost before making request
      const estimatedCost = this.estimateCost(systemMessage, conversationHistory, niniOptions.maxTokens);
      console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);
      
      // Make API request with retries
      const response = await this.makeRequestWithRetries(messages, niniOptions);
      
      if (!response.success) {
        return response;
      }
      
      // Add telemetry to response
      const enrichedResponse = this.addTelemetry(response);
      
      return enrichedResponse;
      
    } catch (error) {
      console.error('NiniAdapter error:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
  
  private static generateSimulationResponse(
    conversationHistory: Turn[],
    knobs: Partial<Knobs>
  ): NiniResponse {
    const lastUserTurn = conversationHistory
      .filter(turn => turn.agent === 'user')
      .pop();
    
    if (!lastUserTurn) {
      return {
        success: true,
        text: "Hola, estoy aquí para acompañarte. ¿Qué está pasando?",
      };
    }
    
    // Simple simulation based on conversation length and knobs
    const turnCount = conversationHistory.length;
    const empathy = knobs.empathy || 0.7;
    const directiveness = knobs.directiveness || 0.5;
    
    let response = "";
    
    if (turnCount <= 2) {
      // Recap phase
      if (empathy > 0.6) {
        response = `Entiendo que estás pasando por una situación difícil. Lo que me compartes suena realmente desafiante.`;
      } else {
        response = `Veo que tienes una situación que te preocupa. ¿Podrías contarme más detalles?`;
      }
    } else if (turnCount <= 4) {
      // Questioning phase
      if (directiveness > 0.6) {
        response = `¿Qué es lo más urgente que necesitas resolver hoy?`;
      } else {
        response = `¿Cómo te sientes cuando esto pasa?`;
      }
    } else if (turnCount <= 6) {
      // Move phase - offer A/B options
      response = `Te sugiero dos opciones: A) Hablar directamente con la persona involucrada, o B) Tomarte un tiempo para reflexionar primero. ¿Cuál te resuena más?`;
    } else {
      // Wrap up
      response = `Has compartido mucho y espero que esto te ayude. ¿Hay algo más en lo que pueda apoyarte hoy?`;
    }
    
    // Add emoji based on knobs
    const emojiRate = knobs.emoji_bias || 0.3;
    if (Math.random() < emojiRate && !response.includes('crisis')) {
      response += " ✨";
    }
    
    return {
      success: true,
      text: response,
      usage: {
        prompt_tokens: 150,
        completion_tokens: 50,
        total_tokens: 200,
      },
    };
  }
  
  private static buildMessages(systemMessage: string, conversationHistory: Turn[]) {
    const messages = [
      {
        role: 'system',
        content: systemMessage,
      }
    ];
    
    conversationHistory.forEach(turn => {
      messages.push({
        role: turn.agent === 'user' ? 'user' : 'assistant',
        content: turn.text,
      });
    });
    
    return messages;
  }
  
  private static async makeRequestWithRetries(
    messages: any[],
    options: NiniOptions
  ): Promise<NiniResponse> {
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.makeOpenAIRequest(messages, options);
        return response;
      } catch (error) {
        const isLastAttempt = attempt === this.MAX_RETRIES;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || isLastAttempt) {
          return {
            success: false,
            text: '',
            error: errorMessage,
          };
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retrying request (attempt ${attempt + 2}/${this.MAX_RETRIES + 1})`);
      }
    }
    
    return {
      success: false,
      text: '',
      error: 'Max retries exceeded',
    };
  }
  
  private static async makeOpenAIRequest(
    messages: any[],
    options: NiniOptions
  ): Promise<NiniResponse> {
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.DEFAULT_TIMEOUT);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          presence_penalty: 0,
          frequency_penalty: 0,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }
      
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      if (!text) {
        throw new Error('Empty response from OpenAI');
      }
      
      return {
        success: true,
        text,
        usage: data.usage,
      };
      
    } catch (error) {
      clearTimeout(timeout);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
  
  private static isRetryableError(error: any): boolean {
    if (typeof error === 'string') return false;
    
    const message = error?.message || '';
    const status = error?.status;
    
    // Retryable status codes
    const retryableCodes = [429, 500, 502, 503, 504];
    if (status && retryableCodes.includes(status)) return true;
    
    // Timeout errors are retryable
    if (message.includes('timeout')) return true;
    if (message.includes('network')) return true;
    
    return false;
  }
  
  private static addTelemetry(response: NiniResponse): NiniResponse {
    if (!response.success || !response.text) return response;
    
    // Basic telemetry - will be enhanced by linters
    const chars = response.text.length;
    const emojiCount = countEmojis(response.text);
    
    // This could be expanded to detect other patterns
    const crisisActive = this.detectCrisisPatterns(response.text);
    
    return {
      ...response,
      // Add telemetry metadata that can be used by the Runner
      meta: {
        chars,
        emoji_count: emojiCount,
        crisis_active: crisisActive,
      } as any,
    };
  }
  
  private static detectCrisisPatterns(text: string): boolean {
    const crisisKeywords = [
      'crisis', 'emergency', 'safety', 'professional help',
      'recursos de ayuda', 'profesional de salud'
    ];
    
    const lowercaseText = text.toLowerCase();
    return crisisKeywords.some(keyword => lowercaseText.includes(keyword));
  }
  
  private static estimateCost(
    systemMessage: string,
    conversationHistory: Turn[],
    maxTokens: number
  ): number {
    // Rough token estimation (1 token ≈ 4 characters)
    const inputText = systemMessage + conversationHistory.map(t => t.text).join(' ');
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = maxTokens;
    
    // GPT-5 pricing (example - adjust based on actual pricing)
    const inputCost = inputTokens * 0.00003; // $0.03 per 1K tokens
    const outputCost = outputTokens * 0.00006; // $0.06 per 1K tokens
    
    return inputCost + outputCost;
  }
  
  // Test connection method for settings page
  static async testConnection(
    apiKey: string,
    model: string = 'gpt-5-2025-08-07'
  ): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `API Error: ${response.status} - ${errorData.error?.message || response.statusText}`,
        };
      }
      
      const data = await response.json();
      const models = data.data || [];
      
      // Check if requested model is available
      const modelExists = models.some((m: any) => m.id === model);
      if (!modelExists) {
        return {
          success: false,
          error: `Model ${model} not available with this API key`,
        };
      }
      
      return {
        success: true,
        latency,
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

export default NiniAdapter;