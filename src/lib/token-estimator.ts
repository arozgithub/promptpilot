// Token and cost estimator for different LLM models

// Model pricing information (per 1M tokens) - Updated September 2025
export const modelPricing = {
  // Gemini models (latest pricing)
  'googleai/gemini-1.5-pro': {
    input: 1.25, // $1.25 per 1M input tokens (reduced from $7)
    output: 5.00, // $5.00 per 1M output tokens (reduced from $35)
    maxTokens: 2097152, // 2M context length (increased)
    description: 'Most advanced Gemini model with longest context',
  },
  'googleai/gemini-1.5-flash': {
    input: 0.075, // $0.075 per 1M input tokens (significantly reduced)
    output: 0.30, // $0.30 per 1M output tokens (significantly reduced)
    maxTokens: 1048576, // 1M context length
    description: 'Fast, efficient variant of Gemini 1.5',
  },
  'googleai/gemini-pro': {
    input: 0.50,
    output: 1.50,
    maxTokens: 32768,
    description: 'Standard Gemini model for most use cases',
  },
  'googleai/gemini-pro-vision': {
    input: 0.50,
    output: 1.50,
    maxTokens: 32768,
    description: 'Supports text and image inputs',
  },
  'googleai/gemini-1.0-pro': {
    input: 0.25,
    output: 0.75,
    maxTokens: 30720,
    description: 'Legacy Gemini model',
  },
  
  // OpenAI models (updated pricing)
  'openai/gpt-4o': {
    input: 2.50, // $2.50 per 1M input tokens (reduced)
    output: 10.00, // $10.00 per 1M output tokens (reduced)
    maxTokens: 128000,
    description: 'Latest GPT-4 model with improved capabilities',
  },
  'openai/gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
    maxTokens: 128000,
    description: 'Smaller, faster GPT-4 variant',
  },
  'openai/gpt-4-turbo': {
    input: 10.00,
    output: 30.00,
    maxTokens: 128000,
    description: 'Previous generation GPT-4',
  },
  'openai/gpt-3.5-turbo': {
    input: 0.50,
    output: 1.50,
    maxTokens: 16384,
    description: 'Fast, cost-effective model for simple tasks',
  },
  
  // Anthropic Claude models (updated pricing)
  'anthropic/claude-3.5-sonnet': {
    input: 3.00, // $3.00 per 1M input tokens
    output: 15.00, // $15.00 per 1M output tokens
    maxTokens: 200000,
    description: 'Latest Claude model with enhanced capabilities',
  },
  'anthropic/claude-3-opus': {
    input: 15.00,
    output: 75.00,
    maxTokens: 200000,
    description: 'Most powerful Claude model',
  },
  'anthropic/claude-3-sonnet': {
    input: 3.00,
    output: 15.00,
    maxTokens: 200000,
    description: 'Balance of intelligence and speed',
  },
  'anthropic/claude-3-haiku': {
    input: 0.25, // $0.25 per 1M input tokens
    output: 1.25, // $1.25 per 1M output tokens
    maxTokens: 200000,
    description: 'Fastest Claude model for simple tasks',
  },
  
  // Meta models (open source/hosted pricing estimates)
  'meta/llama-3.2-90b': {
    input: 0.20,
    output: 0.20,
    maxTokens: 128000,
    description: 'Latest Llama model with large parameter count',
  },
  'meta/llama-3.1-70b': {
    input: 0.88,
    output: 0.88,
    maxTokens: 128000,
    description: 'High-performance Llama model',
  },
  'meta/llama-3.1-8b': {
    input: 0.18,
    output: 0.18,
    maxTokens: 128000,
    description: 'Efficient smaller Llama model',
  },
  
  // Mistral models (updated pricing)
  'mistral/mistral-large': {
    input: 2.00,
    output: 6.00,
    maxTokens: 128000,
    description: 'Most capable Mistral model',
  },
  'mistral/mistral-medium': {
    input: 2.70,
    output: 8.10,
    maxTokens: 32768,
    description: 'Balanced Mistral model',
  },
  'mistral/mistral-small': {
    input: 1.00,
    output: 3.00,
    maxTokens: 32768,
    description: 'Cost-effective Mistral model',
  },
  
  // Additional popular models
  'cohere/command-r-plus': {
    input: 3.00,
    output: 15.00,
    maxTokens: 128000,
    description: 'Cohere\'s most powerful model',
  },
  'cohere/command-r': {
    input: 0.50,
    output: 1.50,
    maxTokens: 128000,
    description: 'Balanced Cohere model for general use',
  },
};

// Improved token count estimator (English text)
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // More accurate approximation based on OpenAI's research:
  // - Average ~4 characters per token for English
  // - Punctuation and spaces affect tokenization
  // - Account for common patterns
  
  // Remove extra whitespace
  const cleanText = text.trim().replace(/\s+/g, ' ');
  
  // Base estimation: 4 characters per token
  let tokenCount = Math.ceil(cleanText.length / 4);
  
  // Adjust for common patterns that affect tokenization:
  // - Numbers: often tokenized as single tokens
  const numberMatches = cleanText.match(/\b\d+\b/g);
  if (numberMatches) {
    // Numbers are typically more efficient in tokenization
    tokenCount -= Math.floor(numberMatches.length * 0.3);
  }
  
  // - Common words: often single tokens
  const commonWords = cleanText.match(/\b(the|and|is|to|of|in|it|you|that|he|was|for|on|are|as|with|his|they|i|at|be|this|have|from|or|one|had|by|word|but|not|what|all|were|we|when|your|can|said|there|each|which|she|do|how|their|if|will|up|other|about|out|many|then|them|these|so|some|her|would|make|like|into|him|has|two|more|very|after|words|first|where|been|call|who|did)\b/gi);
  if (commonWords) {
    // Common words are typically tokenized efficiently
    tokenCount -= Math.floor(commonWords.length * 0.2);
  }
  
  // - Special characters and punctuation: can increase token count
  const specialChars = cleanText.match(/[^\w\s]/g);
  if (specialChars) {
    tokenCount += Math.floor(specialChars.length * 0.1);
  }
  
  // Minimum token count of 1
  return Math.max(1, Math.floor(tokenCount));
}

// Estimate cost in USD
export function estimateCost(
  inputTokens: number, 
  outputTokens: number, 
  modelName: string
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = modelPricing[modelName as keyof typeof modelPricing] || {
    input: 5.0,
    output: 15.0
  };
  
  // Calculate costs (convert from "per million" to "per token")
  const inputCost = (inputTokens * pricing.input) / 1000000;
  const outputCost = (outputTokens * pricing.output) / 1000000;
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost,
    outputCost,
    totalCost
  };
}

// Format cost as USD with appropriate precision
export function formatCost(cost: number): string {
  if (cost === 0) {
    return '$0.0000';
  }
  
  if (cost < 0.001) {
    // For very small costs, show more decimal places
    return `$${cost.toFixed(6)}`;
  } else if (cost < 0.01) {
    // For small costs, show 4 decimal places
    return `$${cost.toFixed(4)}`;
  } else if (cost < 1) {
    // For moderate costs, show 3 decimal places
    return `$${cost.toFixed(3)}`;
  } else {
    // For larger costs, show 2 decimal places
    return `$${cost.toFixed(2)}`;
  }
}

// Format token count with abbreviations (K, M)
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(2)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Estimate tokens and cost for a prompt and user context
export function estimatePromptTokensAndCost(
  prompt: string, 
  userContext: string = "", 
  modelName: string,
  estimatedOutputLength: number = 300 // Reduced default for more realistic estimates
): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
} {
  const promptTokens = estimateTokenCount(prompt);
  const contextTokens = estimateTokenCount(userContext);
  const inputTokens = promptTokens + contextTokens;
  
  // Adjust output estimation based on prompt type
  let adjustedOutputLength = estimatedOutputLength;
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('short story') || promptLower.includes('paragraph')) {
    // Short stories typically 100-150 tokens
    adjustedOutputLength = 120;
  } else if (promptLower.includes('essay') || promptLower.includes('detailed')) {
    // Longer form content
    adjustedOutputLength = 500;
  } else if (promptLower.includes('list') || promptLower.includes('bullet')) {
    // Lists are typically shorter
    adjustedOutputLength = 150;
  } else if (promptLower.includes('summary')) {
    // Summaries are concise
    adjustedOutputLength = 200;
  } else if (promptLower.includes('code') || promptLower.includes('programming')) {
    // Code can vary widely
    adjustedOutputLength = 250;
  }
  
  const outputTokens = adjustedOutputLength;
  
  const { inputCost, outputCost, totalCost } = estimateCost(
    inputTokens, 
    outputTokens, 
    modelName
  );
  
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost
  };
}