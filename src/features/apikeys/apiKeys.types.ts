export type LlmProvider =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'mistral'
  | 'ollama'
  | 'custom';

export interface ApiKeyConfig {
  id: string;
  provider: LlmProvider;
  name: string;
  apiKey: string;
  modelName: string;
  baseUrl?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  lastTestedAt?: string;
  testStatus?: 'untested' | 'valid' | 'invalid';
}

export interface ProviderPreset {
  provider: LlmProvider;
  displayName: string;
  defaultModel: string;
  defaultBaseUrl?: string;
  placeholderKey: string;
  helpText: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    provider: 'gemini',
    displayName: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    placeholderKey: 'AIzaSy...',
    helpText: 'Google AI Studio API Key for Gemini 2.5 Flash / Pro',
  },
  {
    provider: 'groq',
    displayName: 'Groq Cloud (Free — Ultra Fast)',
    defaultModel: 'llama-3.3-70b-versatile',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    placeholderKey: 'gsk_...',
    helpText: 'Groq Cloud FREE API — LLaMA 3.3 70B. Get key at console.groq.com (no credit card needed)',
  },
  {
    provider: 'openrouter',
    displayName: 'OpenRouter (Free Models)',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    placeholderKey: 'sk-or-...',
    helpText: 'OpenRouter FREE tier — access Llama, Gemma, Qwen and more. Get key at openrouter.ai (no credit card needed)',
  },
  {
    provider: 'openai',
    displayName: 'OpenAI (GPT-4o)',
    defaultModel: 'gpt-4o',
    placeholderKey: 'sk-proj-...',
    helpText: 'OpenAI Secret API Key for GPT-4o, GPT-4o-mini',
  },
  {
    provider: 'anthropic',
    displayName: 'Anthropic (Claude 3.5)',
    defaultModel: 'claude-3-5-sonnet-latest',
    placeholderKey: 'sk-ant-...',
    helpText: 'Anthropic Console API Key for Claude 3.5 Sonnet',
  },
  {
    provider: 'deepseek',
    displayName: 'DeepSeek AI',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com',
    placeholderKey: 'sk-...',
    helpText: 'DeepSeek API Key for DeepSeek-V3 and DeepSeek-R1',
  },
  {
    provider: 'mistral',
    displayName: 'Mistral AI',
    defaultModel: 'mistral-large-latest',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    placeholderKey: '...',
    helpText: 'Mistral AI Platform API Key',
  },
  {
    provider: 'ollama',
    displayName: 'Ollama (Local / Self-Hosted)',
    defaultModel: 'llama3:latest',
    defaultBaseUrl: 'http://localhost:11434',
    placeholderKey: 'Not required for local Ollama',
    helpText: 'Connect local running Ollama instance',
  },
  {
    provider: 'custom',
    displayName: 'Custom OpenAI-Compatible API',
    defaultModel: 'custom-model-name',
    defaultBaseUrl: 'https://your-custom-llm-endpoint.com/v1',
    placeholderKey: 'sk-...',
    helpText: 'Any custom LLM server with OpenAI-compatible completion API',
  },
];

