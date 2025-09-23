'use server';

/**
 * @fileOverview An AI agent for evaluating and correcting prompts for clarity, completeness, and correctness.
 *
 * - evaluatePrompt - A function that analyzes and improves prompts for clarity, completeness, and correctness.
 * - EvaluatePromptInput - The input type for the evaluatePrompt function.
 * - EvaluatePromptOutput - The return type for the evaluatePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluatePromptInputSchema = z.object({
  promptToEvaluate: z
    .string()
    .describe('The prompt to evaluate and correct.'),
  chatbotType: z
    .enum(['supportchatbot_conversation_llm', 'supportchatbot_other_agent', 'supportchatbot_howto_agent', 'supportchatbot_complex_agent', 'supportchatbot_condition_agent'])
    .describe('The type of chatbot the prompt is intended for.'),
  files: z.array(z.object({
    name: z.string(),
    mimeType: z.string(),
    data: z.string()
  })).optional().describe('Optional files to include in the prompt evaluation.'),
});
export type EvaluatePromptInput = z.infer<typeof EvaluatePromptInputSchema>;

const EvaluatePromptOutputSchema = z.object({
  analysis: z.string().describe('Analysis of the prompt identifying issues and strengths, with special attention to chatbot-specific logic and tag patterns.'),
  suggestedCorrection: z.string().describe('Specific changes needed in quotes, focusing on chatbot-specific improvements and tag-based logic.'),
  location: z.string().describe('Location in the prompt where changes were applied (e.g., tag trigger definitions, conditional logic section, reasoning requirements).'),
  reason: z.string().describe('Reason why the changes improve the chatbot flow and decision-making process.'),
  needsCorrection: z.boolean().describe('Whether the prompt needs correction or is already good.'),
});
export type EvaluatePromptOutput = z.infer<typeof EvaluatePromptOutputSchema>;

export async function evaluatePrompt(
  input: EvaluatePromptInput
): Promise<EvaluatePromptOutput> {
  return evaluatePromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluatePromptPrompt',
  input: {schema: EvaluatePromptInputSchema},
  output: {schema: EvaluatePromptOutputSchema},
  prompt: `You are an expert prompt engineer and AI analyst specializing in Joblogic chatbot prompt evaluation. You will analyze and improve prompts for clarity, completeness, and correctness with a special focus on tag-based logic, conditional flows, and chatbot-specific patterns.

## 📌 Responsibilities

### 1. Analyze the Prompt
- Check for **clarity**  
  Is the prompt unambiguous and easy to understand?  
  For conditional agents: Are the branching conditions clearly defined?
  For tag-based agents: Are the tag triggers (#Sensitive, #Escalate, #Probing, etc.) clearly specified?

- Check for **completeness**  
  Does it include all necessary instructions and input variables?  
  For conditional agents: Are all possible conditions and their outcomes specified?
  For tag-based agents: Are all required tags and their triggers defined?

- Identify **weaknesses**  
  Look for:
  - Ambiguity in conditional logic or tag triggers
  - Redundancy in branching statements or tag definitions
  - Missing context for decision points or tag conditions
  - Incorrect or missing variable usage in conditions
  - Unclear conditional flow structure
  - Missing or poorly defined tag patterns

### 2. Suggest Corrections
- If issues exist, provide ONLY the specific changes needed in quotes " ".
- Focus specifically on chatbot-specific improvements:
  - Clarify branching logic and conditional flows
  - Improve tag trigger definitions (#Sensitive, #Escalate, #Probing, #Troubleshooting, #Answer)
  - Fix variable usage in conditions
  - Add missing decision points or tag conditions
  - Enhance reasoning requirements and response formatting
- Clearly specify:
  - **Location** in the prompt where changes are applied.  
  - **Reason** why the change improves the chatbot logic.  
- If no issues are found, confirm with: "No changes needed"
- **CRITICAL**: DO NOT PROVIDE COMPLETE PROMPT - ONLY PROVIDE CHANGES REQUIRED IN " ". FOCUS ON CHATBOT-SPECIFIC PATTERNS.

### 3. Adapt for Use Cases

Tailor corrections depending on the chatbot type:
- **supportchatbot_conversation_llm** → prioritize natural conversation flow, greeting patterns, escalation triggers, sentiment detection
- **supportchatbot_other_agent** → ensure multi-agent compatibility, tool integration, reasoning requirements, tag-based responses
- **supportchatbot_howto_agent** → emphasize step-by-step instructions, clarification requests, answer tagging
- **supportchatbot_complex_agent** → strengthen multi-step problem solving, probing logic, troubleshooting flow, escalation criteria
- **supportchatbot_condition_agent** → **PRIORITY FOCUS**: clarify branching logic, decision trees, classification rules, JSON output structure

### 4. Tag-Based Analysis

Pay special attention to these tag patterns:
- **#Sensitive**: Personal data, company info, financial details detection
- **#Escalate**: Human agent requests, unresolved issues, escalation triggers
- **#Probing**: Clarification requests, vague query handling
- **#Troubleshooting**: Follow-up guidance after probing
- **#Answer**: Direct responses to specific queries
- **#Clarify**: Broad query clarification requests
- **#NoAnswer**: Unanswerable queries
- **#FollowUpAck**: End-of-conversation acknowledgments

## 📤 Output Format

- **Analysis**: The prompt analysis identifying strengths and weaknesses, with special attention to chatbot-specific logic and tag patterns.
- **Suggested Correction**: "Specific changes needed in quotes, focusing on chatbot-specific improvements"
- **Location**: Section where changes were applied (e.g., "Tag trigger definitions", "Conditional logic section", "Reasoning requirements").
- **Reason**: Explanation of why changes improve the chatbot flow and decision-making process.
- **Headings should be bold, and response updated query in " "**

Prompt to Evaluate: {{promptToEvaluate}}

Chatbot Type: {{chatbotType}}

{{#if files}}
Additional Context from Files:
{{#each files}}
- {{name}} ({{mimeType}}): [File content provided as media]
{{/each}}
{{/if}}

Please analyze this prompt and provide corrections if needed, with special focus on chatbot-specific patterns and tag-based logic:`,
});

const evaluatePromptFlow = ai.defineFlow(
  {
    name: 'evaluatePromptFlow',
    inputSchema: EvaluatePromptInputSchema,
    outputSchema: EvaluatePromptOutputSchema,
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
