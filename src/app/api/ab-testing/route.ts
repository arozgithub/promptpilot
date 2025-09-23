import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Validate the input schema
const abTestingSchema = z.object({
  basePrompt: z.string().min(1).max(10000),
  userContext: z.string().optional(),
  testType: z.enum(['variations', 'models']),
  variationCount: z.number().int().min(1).max(5).optional(),
  modelSelection: z.array(z.string()).optional(),
  selectedModels: z.array(z.string()).optional(), // Array of models for each variation
  evaluationMetrics: z.array(z.string()).optional(),
});

// Type for prompt variations
interface PromptVariation {
  id: string;
  content: string;
  model?: string;
  selectedModel?: string;
}

// Gemini model options
const geminiModels = [
  { value: 'googleai/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'googleai/gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'googleai/gemini-pro', label: 'Gemini Pro' },
  { value: 'googleai/gemini-pro-vision', label: 'Gemini Pro Vision' },
  { value: 'googleai/gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
];

// Add route for evaluation
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.variations || !Array.isArray(body.variations) || body.variations.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No variations provided for evaluation' 
      }, { status: 400 });
    }
    
    const basePrompt = body.basePrompt || '';
    const userContext = body.userContext || '';
    const metrics = body.metrics || ['accuracy', 'creativity', 'tone'];
    
    const evaluatedVariations = await evaluateVariations(basePrompt, body.variations, metrics, userContext);
    
    return NextResponse.json({ 
      success: true, 
      variations: evaluatedVariations 
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to evaluate variations' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate the request
    const validated = abTestingSchema.parse(body);
    
    // Process based on test type
    if (validated.testType === 'variations') {
      const count = validated.variationCount || 3;
      // Use selectedModels if provided (for specific model per variation)
      const variations = await generateVariations(
        validated.basePrompt, 
        count,
        validated.selectedModels,
        validated.userContext
      );
      
      return NextResponse.json({ success: true, variations });
    } 
    else if (validated.testType === 'models') {
      // Default to Gemini models with one external model for comparison
      const models = validated.modelSelection || [
        'googleai/gemini-1.5-pro', 
        'googleai/gemini-1.5-flash', 
        'googleai/gemini-pro',
        'openai/gpt-4o'
      ];
      
      const variations = await compareAcrossModels(validated.basePrompt, models, validated.userContext);
      
      return NextResponse.json({ success: true, variations });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid test type' }, { status: 400 });
  } catch (error) {
    console.error('A/B testing error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process request' 
    }, { status: 500 });
  }
}

async function generateVariations(basePrompt: string, count: number, selectedModels?: string[], userContext?: string): Promise<PromptVariation[]> {
  try {
    // In a real implementation, we would call the AI to generate variations
    const variations: PromptVariation[] = [];
    
    // Include user context if provided
    const contextPrefix = userContext ? `User Context: ${userContext}\n\n` : '';
    
    for (let i = 0; i < count; i++) {
      // Get the selected model for this variation, or default to Gemini 1.5 Pro
      const modelName = selectedModels && selectedModels[i] 
        ? selectedModels[i] 
        : geminiModels[i % geminiModels.length].value;
        
      // In a production system, we'd call the AI model to generate a variation
      // If there's user context, it would be passed to the model appropriately
      const variationPrompt = `Generate a variation of this prompt that conveys the same intent but with different wording and structure: ${basePrompt}`;
      
      try {
        // In a real implementation we'd use the actual Gemini model
        // const result = await ai.generate(modelName, variationPrompt, userContext);
        // const generatedContent = result.text();
        
        // For demo purposes, just return a simulated response
        const modelLabel = geminiModels.find(m => m.value === modelName)?.label || modelName;
        
        variations.push({
          id: `var-${Date.now()}-${i}`,
          content: `${basePrompt}\n\n${contextPrefix}[This is a simulated variation #${i+1} that would be generated by ${modelLabel}]`,
          selectedModel: modelName
        });
      } catch (err) {
        console.error(`Error with model ${modelName}:`, err);
        // Return a fallback response for this variation
        variations.push({
          id: `var-${Date.now()}-${i}`,
          content: `${basePrompt}\n\n${contextPrefix}[Error generating variation with ${modelName}]`,
          selectedModel: modelName
        });
      }
    }
    
    return variations;
  } catch (error) {
    console.error('Error generating variations:', error);
    throw error;
  }
}

async function compareAcrossModels(basePrompt: string, models: string[], userContext?: string): Promise<PromptVariation[]> {
  try {
    const variations: PromptVariation[] = [];
    
    // Prioritize Gemini models
    const geminiModelValues = geminiModels.map(m => m.value);
    const prioritizedModels = [...models].sort((a, b) => {
      // Sort Gemini models first
      const aIsGemini = a.includes('gemini');
      const bIsGemini = b.includes('gemini');
      
      if (aIsGemini && !bIsGemini) return -1;
      if (!aIsGemini && bIsGemini) return 1;
      return 0;
    });
    
    // Include user context if provided
    const contextPrefix = userContext ? `User Context: ${userContext}\n\n` : '';
    
    // Process each model
    for (const model of prioritizedModels) {
      try {
        // In a real implementation, we would call the respective model API
        // const result = await ai.generate(model, basePrompt, userContext);
        // const generatedContent = result.text();
        
        // Get a user-friendly model name
        const modelParts = model.split('/');
        const provider = modelParts[0];
        const modelName = modelParts[1] || model;
        const displayName = geminiModels.find(m => m.value === model)?.label || modelName;
        
        variations.push({
          id: `model-${Date.now()}-${variations.length}`,
          model,
          selectedModel: model,
          content: `${basePrompt}\n\n${contextPrefix}[This is where the actual output from ${displayName} would appear. In production, this would be generated by calling the ${provider} API with the ${modelName} model.]`
        });
      } catch (err) {
        console.error(`Error with model ${model}:`, err);
        variations.push({
          id: `model-${Date.now()}-${variations.length}`,
          model,
          selectedModel: model,
          content: `${basePrompt}\n\n${contextPrefix}[Error generating content with ${model}]`
        });
      }
    }
    
    return variations;
  } catch (error) {
    console.error('Error comparing across models:', error);
    throw error;
  }
}

// API route for evaluating prompt variations
export async function evaluateVariations(
  basePrompt: string, 
  variations: PromptVariation[], 
  metrics: string[],
  userContext?: string
) {
  try {
    // In a real implementation, we'd call an evaluation model
    // For demo, generate random scores with slight preference for Gemini 1.5 Pro
    return variations.map(variation => {
      const scores: Record<string, number> = {};
      
      // Get model bonus (slight advantage for Gemini 1.5 Pro)
      const modelBonus = (variation.selectedModel === 'googleai/gemini-1.5-pro') ? 0.5 : 0;
      
      metrics.forEach(metric => {
        // Base score with slight randomization
        let score = Math.round((Math.random() * 10) * 10) / 10;
        
        // Apply model bonus but cap at 10
        score = Math.min(10, score + modelBonus);
        
        scores[metric] = score;
      });
      
      // Calculate overall score
      const overall = Object.values(scores).reduce((sum, score) => sum + score, 0) / metrics.length;
      
      return {
        ...variation,
        scores,
        overall: Math.round(overall * 10) / 10,
        // Include model information in the evaluated result
        modelInfo: {
          name: variation.selectedModel || variation.model,
          displayName: geminiModels.find(m => m.value === (variation.selectedModel || variation.model))?.label 
            || (variation.selectedModel || variation.model)
        }
      };
    });
  } catch (error) {
    console.error('Error evaluating variations:', error);
    throw error;
  }
}