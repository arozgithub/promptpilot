'use server';

/**
 * @fileOverview A flow that enhances a prompt with relevant information from the Joblogic knowledge base.
 *
 * - enhancePromptWithJoblogicKnowledge - A function that enhances the prompt.
 * - EnhancePromptWithJoblogicKnowledgeInput - The input type for the enhancePromptWithJoblogicKnowledge function.
 * - EnhancePromptWithJoblogicKnowledgeOutput - The return type for the enhancePromptWithJoblogicKnowledge function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getRelevantJoblogicKnowledge} from "@/services/joblogic-knowledge";

const EnhancePromptWithJoblogicKnowledgeInputSchema = z.object({
  prompt: z.string().describe('The prompt to enhance.'),
});
export type EnhancePromptWithJoblogicKnowledgeInput = z.infer<typeof EnhancePromptWithJoblogicKnowledgeInputSchema>;

// Internal schema for the prompt that includes knowledge
const EnhancePromptWithKnowledgeSchema = z.object({
  prompt: z.string().describe('The prompt to enhance.'),
  knowledge: z.string().optional().describe('Relevant Joblogic knowledge.'),
});

const EnhancePromptWithJoblogicKnowledgeOutputSchema = z.object({
  enhancedPrompt: z.string().describe('The enhanced prompt with Joblogic knowledge.'),
});
export type EnhancePromptWithJoblogicKnowledgeOutput = z.infer<typeof EnhancePromptWithJoblogicKnowledgeOutputSchema>;

export async function enhancePromptWithJoblogicKnowledge(
  input: EnhancePromptWithJoblogicKnowledgeInput
): Promise<EnhancePromptWithJoblogicKnowledgeOutput> {
  return enhancePromptWithJoblogicKnowledgeFlow(input);
}

const enhancePromptWithJoblogicKnowledgePrompt = ai.definePrompt({
  name: 'enhancePromptWithJoblogicKnowledgePrompt',
  input: {schema: EnhancePromptWithKnowledgeSchema},
  output: {schema: EnhancePromptWithJoblogicKnowledgeOutputSchema},
  prompt: `You are an expert prompt engineer specializing in Joblogic.  A prompt was provided by the user, and your job is to enhance it with information from the Joblogic knowledge base.

Original prompt: {{{prompt}}}

Relevant Joblogic Knowledge:
{{#if knowledge}}
{{{knowledge}}}
{{else}}
There is no relevant Joblogic knowledge.
{{/if}}

Enhanced Prompt:`, // Removed the triple curly braces around enhancedPrompt
});

const enhancePromptWithJoblogicKnowledgeFlow = ai.defineFlow(
  {
    name: 'enhancePromptWithJoblogicKnowledgeFlow',
    inputSchema: EnhancePromptWithJoblogicKnowledgeInputSchema,
    outputSchema: EnhancePromptWithJoblogicKnowledgeOutputSchema,
  },
  async input => {
    const knowledge = await getRelevantJoblogicKnowledge(input.prompt);
    const promptInput = {
      prompt: input.prompt,
      knowledge: knowledge
    };
    const {output} = await enhancePromptWithJoblogicKnowledgePrompt(promptInput, {
      model: 'googleai/gemini-2.5-flash'
    });
    return {enhancedPrompt: output!.enhancedPrompt}; // Corrected to return the enhancedPrompt
  }
);
