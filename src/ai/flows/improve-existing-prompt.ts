'use server';

/**
 * @fileOverview An AI agent for improving existing prompts.
 *
 * - improveExistingPrompt - A function that accepts an existing prompt, a description of the problem, and expected changes, then refines the prompt.
 * - ImproveExistingPromptInput - The input type for the improveExistingPrompt function.
 * - ImproveExistingPromptOutput - The return type for the improveExistingPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {FileData} from '@/lib/file-utils';

const ImproveExistingPromptInputSchema = z.object({
  existingPrompt: z
    .string()
    .describe('The existing prompt that needs improvement.'),
  problemDescription: z
    .string()
    .describe('A description of the problem with the existing prompt.'),
  expectedChanges: z
    .string()
    .describe('The expected changes to the existing prompt.'),
  files: z.array(z.object({
    name: z.string(),
    mimeType: z.string(),
    data: z.string()
  })).optional().describe('Optional files to include in the prompt improvement.'),
  agentPrompt: z.string().optional().describe('Optional agent prompt to use as reference for improvement.'),
});
export type ImproveExistingPromptInput = z.infer<
  typeof ImproveExistingPromptInputSchema
>;

const ImproveExistingPromptOutputSchema = z.object({
  improvedPrompt: z.string().describe('The improved and refined prompt.'),
});
export type ImproveExistingPromptOutput = z.infer<
  typeof ImproveExistingPromptOutputSchema
>;

export async function improveExistingPrompt(
  input: ImproveExistingPromptInput
): Promise<ImproveExistingPromptOutput> {
  return improveExistingPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveExistingPromptPrompt',
  input: {schema: ImproveExistingPromptInputSchema},
  output: {schema: ImproveExistingPromptOutputSchema},
  prompt: `You are an expert prompt engineer. You will be given an existing prompt, a description of the problem with the prompt, and the expected changes to the prompt. You will rewrite and refine the prompt based on this information.

  {{#if agentPrompt}}
  Reference Agent Prompt:
  {{{agentPrompt}}}
  
  Use this agent prompt as a reference for best practices and structure when improving the existing prompt.
  {{/if}}

Existing Prompt: {{{existingPrompt}}}
Problem Description: {{{problemDescription}}}
Expected Changes: {{{expectedChanges}}}

{{#if files}}
Additional Context from Files:
{{#each files}}
- {{name}} ({{mimeType}}): [File content provided as media]
{{/each}}
{{/if}}

CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
- Read the "Expected Changes" field VERY carefully and follow it PRECISELY
- If the expected changes ask for minimal modifications or specific additions, make ONLY those changes
- Preserve the original structure, formatting, and content unless specifically asked to change it
- If the expected changes say "keep most of it the same but only add X", then keep the original prompt intact and only add the requested element
- Do NOT rewrite, restructure, or improve anything that wasn't explicitly mentioned in the expected changes
- Do NOT make unnecessary changes beyond what is explicitly requested in the expected changes
- Do NOT change the tone, style, or approach unless specifically requested
- If only one specific issue needs fixing, fix ONLY that issue and leave everything else unchanged
- Your goal is to make the MINIMAL changes necessary to address the specific problem described

Improved Prompt:`, // Keep it as a single line.
});

const improveExistingPromptFlow = ai.defineFlow(
  {
    name: 'improveExistingPromptFlow',
    inputSchema: ImproveExistingPromptInputSchema,
    outputSchema: ImproveExistingPromptOutputSchema,
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
