// src/ai/flows/generate-prompt-from-details.ts
'use server';

/**
 * @fileOverview Generates a well-structured prompt based on provided details.
 *
 * - generatePromptFromDetails - A function that generates a prompt based on the provided role, context, sample input, and expected output.
 * - GeneratePromptFromDetailsInput - The input type for the generatePromptFromDetails function.
 * - GeneratePromptFromDetailsOutput - The return type for the generatePromptFromDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {FileData} from '@/lib/file-utils';

const GeneratePromptFromDetailsInputSchema = z.object({
  role: z.string().describe('The role the AI should assume.'),
  context: z.string().describe('The context in which the AI will be operating.'),
  sampleInput: z.string().describe('A sample input that the AI will receive.'),
  expectedOutput: z.string().describe('The expected output from the AI for the given sample input.'),
  files: z.array(z.object({
    name: z.string(),
    mimeType: z.string(),
    data: z.string()
  })).optional().describe('Optional files to include in the prompt generation.'),
  agentPrompt: z.string().optional().describe('Optional agent prompt to use as base for generation.'),
});

export type GeneratePromptFromDetailsInput = z.infer<
  typeof GeneratePromptFromDetailsInputSchema
>;

const GeneratePromptFromDetailsOutputSchema = z.object({
  prompt: z.string().describe('The generated prompt.'),
});

export type GeneratePromptFromDetailsOutput = z.infer<
  typeof GeneratePromptFromDetailsOutputSchema
>;

export async function generatePromptFromDetails(
  input: GeneratePromptFromDetailsInput
): Promise<GeneratePromptFromDetailsOutput> {
  return generatePromptFromDetailsFlow(input);
}

const generatePromptFromDetailsPrompt = ai.definePrompt({
  name: 'generatePromptFromDetailsPrompt',
  input: {schema: GeneratePromptFromDetailsInputSchema},
  output: {schema: GeneratePromptFromDetailsOutputSchema},
  prompt: `You are an expert prompt engineer. Your task is to generate a well-structured prompt based on the details provided.

  {{#if agentPrompt}}
  Base Agent Prompt:
  {{{agentPrompt}}}
  
  Use this agent prompt as the foundation and enhance it with the specific details provided below.
  {{/if}}

  Role: {{{role}}}
  Context: {{{context}}}
  Sample Input: {{{sampleInput}}}
  Expected Output: {{{expectedOutput}}}

  {{#if files}}
  Additional Context from Files:
  {{#each files}}
  - {{name}} ({{mimeType}}): [File content provided as media]
  {{/each}}
  {{/if}}

  Generated Prompt:`, // Ensure this is a good prompt itself!
});

const generatePromptFromDetailsFlow = ai.defineFlow(
  {
    name: 'generatePromptFromDetailsFlow',
    inputSchema: GeneratePromptFromDetailsInputSchema,
    outputSchema: GeneratePromptFromDetailsOutputSchema,
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

    const {output} = await generatePromptFromDetailsPrompt(input, {
      model: 'googleai/gemini-2.5-flash'
    });
    return output!;
  }
);
