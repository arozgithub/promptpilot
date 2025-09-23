'use server';

/**
 * @fileOverview An AI agent for comparing and analyzing prompt improvements.
 *
 * - comparePrompts - A function that compares original and improved prompts and provides detailed analysis.
 * - ComparePromptsInput - The input type for the comparePrompts function.
 * - ComparePromptsOutput - The return type for the comparePrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {FileData} from '@/lib/file-utils';

const ComparePromptsInputSchema = z.object({
  originalPrompt: z
    .string()
    .describe('The original prompt before improvement.'),
  improvedPrompt: z
    .string()
    .describe('The improved prompt after enhancement.'),
  context: z
    .string()
    .optional()
    .describe('Optional context about the use case or domain.'),
  files: z.array(z.object({
    name: z.string(),
    mimeType: z.string(),
    data: z.string()
  })).optional().describe('Optional files to include in the comparison analysis.'),
});

export type ComparePromptsInput = z.infer<typeof ComparePromptsInputSchema>;

const ComparePromptsOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the key improvements made.'),
  improvements: z.array(z.object({
    category: z.string().describe('The category of improvement (e.g., Clarity, Specificity, Structure)'),
    description: z.string().describe('Description of what was improved'),
    impact: z.string().describe('The expected impact of this improvement'),
  })).describe('Detailed list of improvements made'),
  metrics: z.object({
    clarityScore: z.number().min(0).max(10).describe('Clarity score out of 10'),
    specificityScore: z.number().min(0).max(10).describe('Specificity score out of 10'),
    structureScore: z.number().min(0).max(10).describe('Structure score out of 10'),
    overallScore: z.number().min(0).max(10).describe('Overall quality score out of 10'),
  }).describe('Quality metrics for the improved prompt'),
  beforeAfterAnalysis: z.object({
    beforeStrengths: z.array(z.string()).describe('Strengths of the original prompt'),
    beforeWeaknesses: z.array(z.string()).describe('Weaknesses of the original prompt'),
    afterStrengths: z.array(z.string()).describe('Strengths of the improved prompt'),
    keyChanges: z.array(z.string()).describe('Key changes made during improvement'),
  }).describe('Before and after analysis'),
  recommendations: z.array(z.string()).describe('Additional recommendations for further improvement'),
});

export type ComparePromptsOutput = z.infer<typeof ComparePromptsOutputSchema>;

export async function comparePrompts(
  input: ComparePromptsInput
): Promise<ComparePromptsOutput> {
  return comparePromptsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'comparePromptsPrompt',
  input: {schema: ComparePromptsInputSchema},
  output: {schema: ComparePromptsOutputSchema},
  prompt: `You are an expert prompt engineer and AI analyst. You will be given an original prompt and an improved version of that prompt. Your task is to provide a comprehensive analysis of the improvements made.

Original Prompt:
{{{originalPrompt}}}

Improved Prompt:
{{{improvedPrompt}}}

Context: {{{context}}}

{{#if files}}
Additional Context from Files:
{{#each files}}
- {{name}} ({{mimeType}}): [File content provided as media]
{{/each}}
{{/if}}

Please analyze the improvements and provide:
1. A clear summary of the key improvements
2. Detailed breakdown of improvements by category
3. Quality metrics (scores out of 10)
4. Before/after analysis highlighting strengths, weaknesses, and key changes
5. Additional recommendations for further improvement

Be thorough, objective, and provide actionable insights.`,
});

const comparePromptsFlow = ai.defineFlow(
  {
    name: 'comparePromptsFlow',
    inputSchema: ComparePromptsInputSchema,
    outputSchema: ComparePromptsOutputSchema,
  },
  async input => {
    // Handle media files properly
    const mediaParts = [];
    if (input.files) {
      for (const file of input.files) {
        if (file.mimeType.startsWith('image/')) {
          mediaParts.push({
            media: {
              mimeType: file.mimeType,
              data: file.data
            }
          });
        }
      }
    }

    const {output} = await prompt(input, {
      model: 'googleai/gemini-2.5-flash'
    });
    return output!;
  }
);
