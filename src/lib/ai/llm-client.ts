export type LLMProvider = "deepseek" | "openai";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  examples?: Array<{ input: unknown; output: string }>;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface LLMCallResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const PROVIDER_CONFIGS: Record<LLMProvider, { baseUrl: string; model: string }> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async call(options: LLMCallOptions): Promise<LLMCallResult> {
    const providerConfig = PROVIDER_CONFIGS[this.config.provider];
    const baseUrl = this.config.baseUrl || providerConfig.baseUrl;
    const model = this.config.model || providerConfig.model;

    const messages = this.buildMessages(options);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature ?? 0.3,
        stream: !!options.onChunk,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LLMError(`API request failed: ${response.status}`, response.status, errorText);
    }

    if (options.onChunk && response.body) {
      return this.handleStreamResponse(response, options.onChunk);
    }

    return this.handleNormalResponse(response);
  }

  private buildMessages(options: LLMCallOptions): LLMMessage[] {
    const messages: LLMMessage[] = [
      { role: "system", content: options.systemPrompt },
    ];

    if (options.examples && options.examples.length > 0) {
      for (const example of options.examples) {
        messages.push({
          role: "user",
          content: typeof example.input === "string" ? example.input : JSON.stringify(example.input, null, 2),
        });
        messages.push({
          role: "assistant",
          content: example.output,
        });
      }
    }

    messages.push({ role: "user", content: options.userPrompt });

    return messages;
  }

  private async handleNormalResponse(response: Response): Promise<LLMCallResult> {
    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new LLMError("No response choices returned", 0, JSON.stringify(data));
    }

    return {
      content: choice.message?.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private async handleStreamResponse(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<LLMCallResult> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || 0;
              completionTokens = parsed.usage.completion_tokens || 0;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }
}

export class LLMError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "LLMError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

const DAILY_LIMIT = 20;
const STORAGE_KEY = "nbatrade_ai_usage";

export function getDailyUsageCount(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;
    const data = JSON.parse(stored);
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) return 0;
    return data.count || 0;
  } catch {
    return 0;
  }
}

export function incrementDailyUsage(): void {
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyUsageCount();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
}

export function checkDailyLimit(): boolean {
  return getDailyUsageCount() < DAILY_LIMIT;
}

export function getRemainingUsage(): number {
  return Math.max(0, DAILY_LIMIT - getDailyUsageCount());
}

const CACHE_PREFIX = "nbatrade_ai_cache_";
const CACHE_TTL_MS = 30 * 60 * 1000;

export function getCachedResult(key: string): string | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;
    const data = JSON.parse(stored);
    if (Date.now() - data.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data.content;
  } catch {
    return null;
  }
}

export function setCachedResult(key: string, content: string): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ content, timestamp: Date.now() }));
  } catch {
    // localStorage full, ignore
  }
}

export function generateCacheKey(systemPrompt: string, userPrompt: string): string {
  const combined = systemPrompt + "|" + userPrompt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
