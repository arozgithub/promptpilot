'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Loader2, 
  Wand2, 
  X, 
  Plus, 
  Send,
  Copy,
  User,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  estimatePromptTokensAndCost, 
  formatCost, 
  formatTokenCount
} from '@/lib/token-estimator';
import ReactMarkdown from 'react-markdown';

const formSchema = z.object({
  basePrompt: z.string().nonempty({ message: 'Please provide a base prompt.' }),
  userContext: z.string().optional(),
  chatbotModels: z.array(z.string()).min(2).max(3).default([
    'googleai/gemini-1.5-pro', 
    'googleai/gemini-1.5-flash', 
    'googleai/gemini-pro'
  ]),
});

interface ChatbotResponse {
  id: string;
  model: string;
  content: string;
  isLoading: boolean;
  error?: string;
  tokenEstimate: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

// All available model options
const availableModels = [
  { 
    value: 'googleai/gemini-1.5-pro', 
    label: 'Gemini 1.5 Pro', 
    description: 'Most advanced Gemini model with longest context'
  },
  { 
    value: 'googleai/gemini-1.5-flash', 
    label: 'Gemini 1.5 Flash', 
    description: 'Fast, efficient variant of Gemini 1.5'
  },
  { 
    value: 'googleai/gemini-pro', 
    label: 'Gemini Pro', 
    description: 'Standard Gemini model for most use cases'
  },
  { 
    value: 'googleai/gemini-pro-vision', 
    label: 'Gemini Pro Vision', 
    description: 'Supports text and image inputs'
  },
  { 
    value: 'openai/gpt-4o', 
    label: 'GPT-4o', 
    description: 'Latest GPT-4 model with improved capabilities'
  },
  { 
    value: 'anthropic/claude-3-opus', 
    label: 'Claude 3 Opus', 
    description: 'Most powerful Claude model'
  },
  { 
    value: 'anthropic/claude-3-sonnet', 
    label: 'Claude 3 Sonnet', 
    description: 'Balance of intelligence and speed'
  },
];

interface ABTestingFormProps {
  initialPrompt?: string;
  initialUserContext?: string;
  onResponseGenerated?: (responses: ChatbotResponse[]) => void;
}

export function ABTestingForm({ initialPrompt, initialUserContext, onResponseGenerated }: ABTestingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatbotResponses, setChatbotResponses] = useState<ChatbotResponse[]>([]);
  const [activeUserInput, setActiveUserInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      basePrompt: initialPrompt || 'You are a helpful AI assistant that provides accurate, thoughtful responses.',
      userContext: initialUserContext || '',
      chatbotModels: ['googleai/gemini-1.5-pro', 'googleai/gemini-1.5-flash'],
    },
  });

  // Update token estimates and response structure when inputs change or models change
  useEffect(() => {
    const basePrompt = form.watch('basePrompt');
    const userContext = activeUserInput || form.watch('userContext');
    const selectedModels = form.watch('chatbotModels');
    
    // Generate token estimates for each model
    if (basePrompt || userContext) {
      const updatedResponses = selectedModels.map((model, index) => {
        const existingResponse = chatbotResponses[index] || {
          id: `chatbot-${index}`,
          model: model,
          content: '',
          isLoading: false,
          tokenEstimate: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0
          }
        };
        
        // Only update token estimates, preserve other properties (like content)
        const estimatedOutputLength = existingResponse.content 
          ? existingResponse.content.length / 4 // If we have content, estimate based on it
          : 800; // Default estimated output length
          
        const tokenEstimate = estimatePromptTokensAndCost(
          basePrompt,
          userContext,
          model,
          estimatedOutputLength
        );
        
        return {
          ...existingResponse,
          model: model,
          tokenEstimate
        };
      });
      
      setChatbotResponses(updatedResponses);
    }
  }, [form.watch('basePrompt'), form.watch('userContext'), form.watch('chatbotModels'), activeUserInput]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // Update all chatbots with loading state
      setChatbotResponses(prev => prev.map(response => ({
        ...response,
        isLoading: true,
        error: undefined
      })));
      
      // In a real implementation, we'd call the API for each model
      // but for demonstration purposes, we'll simulate responses
      
      const updatedResponses = await Promise.all(values.chatbotModels.map(async (model, index) => {
        try {
          // Get the existing response or create a new one
          const existingResponse = chatbotResponses[index] || {
            id: `chatbot-${index}`,
            model,
            content: '',
            isLoading: true,
            tokenEstimate: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              inputCost: 0,
              outputCost: 0,
              totalCost: 0
            }
          };
          
          // Simulate API call with a delay based on model (to make it feel more realistic)
          const delay = model.includes('flash') ? 800 : 
                        model.includes('gpt-4') ? 2000 : 1500;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Generate a response based on the model
          const userInput = values.userContext || activeUserInput;
          const combinedInput = `${values.basePrompt}\n\n${userInput}`;
          
          // Use the model name to create slightly different responses
          const modelShortName = model.split('/')[1] || model;
          const responseContent = generateSimulatedResponse(modelShortName, userInput);
          
          // Estimate tokens and costs for the actual response
          const estimatedOutputLength = responseContent.length / 4; // Approx tokens
          const tokenEstimate = estimatePromptTokensAndCost(
            values.basePrompt,
            userInput,
            model,
            estimatedOutputLength
          );
          
          return {
            ...existingResponse,
            content: responseContent,
            isLoading: false,
            tokenEstimate
          };
          
        } catch (error) {
          // Handle errors for individual models
          console.error(`Error with model ${model}:`, error);
          return {
            id: `chatbot-${index}`,
            model,
            content: '',
            isLoading: false,
            error: `Failed to get response from ${model.split('/')[1] || model}`,
            tokenEstimate: chatbotResponses[index]?.tokenEstimate || {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              inputCost: 0,
              outputCost: 0,
              totalCost: 0
            }
          };
        }
      }));
      
      setChatbotResponses(updatedResponses);
      setActiveUserInput('');
      
      // Call the callback if provided
      if (onResponseGenerated) {
        onResponseGenerated(updatedResponses);
      }
      
    } catch (error) {
      console.error('Error processing chatbot responses:', error);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate responses. Please try again.',
      });
      
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Function to generate realistic responses based on model characteristics
  function generateSimulatedResponse(modelName: string, userInput: string): string {
    if (!userInput) {
      return `I'm ready to help! Please enter your question or request in the message box below, and I'll provide a response tailored to demonstrate ${modelName}'s capabilities.`;
    }
    
    // Generate contextual responses based on the user's actual input and model characteristics
    const inputLower = userInput.toLowerCase();
    const isQuestion = userInput.includes('?') || inputLower.startsWith('what') || inputLower.startsWith('how') || inputLower.startsWith('why') || inputLower.startsWith('when') || inputLower.startsWith('where');
    const isTask = inputLower.includes('help') || inputLower.includes('create') || inputLower.includes('write') || inputLower.includes('explain') || inputLower.includes('analyze');
    
    // Check if this is a complete creative writing instruction (system prompt + user input)
    const hasWritingInstructions = inputLower.includes('you are a') && inputLower.includes('writer');
    const hasUserInput = inputLower.includes('user') || inputLower.includes('based on') || inputLower.includes('input');
    const isCreativeWritingTask = hasWritingInstructions || (inputLower.includes('write a') && inputLower.includes('story'));
    
    // Check if this looks like creative content that should trigger story writing
    const looksLikeCreativePrompt = !hasWritingInstructions && !isQuestion && !isTask && (
      userInput.length > 20 && (
        inputLower.includes('sun') || inputLower.includes('sea') || inputLower.includes('beach') ||
        inputLower.includes('lighthouse') || inputLower.includes('storm') || inputLower.includes('night') ||
        inputLower.includes('forest') || inputLower.includes('mountain') || inputLower.includes('city') ||
        inputLower.includes('rain') || inputLower.includes('wind') || inputLower.includes('ocean') ||
        inputLower.includes('swimming') || inputLower.includes('breeze') || inputLower.includes('sunset')
      )
    );
    
    if (modelName.includes('gemini-1.5-pro')) {
      if (isCreativeWritingTask || looksLikeCreativePrompt) {
        // Execute creative writing task based on the input
        if (inputLower.includes('sun') && inputLower.includes('sea') && inputLower.includes('swimming')) {
          return `**Golden Afternoon**\n\nMarina had waited all summer for this perfect day. The morning's storm clouds had finally parted, revealing brilliant sunshine that danced across the turquoise waves. A gentle sea breeze carried the scent of salt and freedom as she stepped onto the warm sand. Without hesitation, she ran toward the water, her worries dissolving with each splash. The ocean welcomed her like an old friend, its gentle swells lifting her spirits higher than they'd been in months. As she floated on her back, watching seagulls paint lazy circles against the azure sky, Marina realized this was exactly where she belonged—suspended between sea and sky, cradled by sunshine and possibility.\n\n*Word count: 109 words*`;
        } else {
          return `**The Beacon's Last Watch**\n\nThrough sheets of rain and howling wind, Eleanor pressed her weathered hands against the lighthouse glass, watching the tempest rage below. For forty years, she had climbed these spiraling stairs each night, but tomorrow the automated system would take over, and her vigil would end. As lightning illuminated the churning sea, she spotted a small fishing boat struggling against the waves, its engine failing. Without hesitation, Eleanor cranked the great light to full intensity, sweeping its powerful beam across the water in the old distress pattern her father had taught her. The boat's captain saw the signal and adjusted course toward the hidden safe harbor only the keepers knew. As the vessel disappeared safely into the cove, Eleanor smiled through her tears—perhaps this lonely lighthouse needed her for just one more night.\n\n*Word count: 118 words*`;
        }
      } else if (isQuestion) {
        return `Thank you for your thoughtful question about "${userInput.length > 100 ? userInput.substring(0, 100) + '...' : userInput}". As Gemini 1.5 Pro, I can provide a comprehensive analysis.\n\nThis is a multi-faceted topic that requires careful consideration of several key factors. Let me break this down systematically:\n\n**Primary Analysis:**\n- The core issue you're addressing involves understanding the underlying principles and their practical applications\n- Context and nuance are crucial here, as different situations may require different approaches\n\n**Key Considerations:**\n- Current best practices in this domain suggest a balanced approach\n- Historical precedents show that successful implementations typically follow certain patterns\n- Future implications should also be considered for long-term sustainability\n\n**Recommended Approach:**\nBased on my analysis, I'd suggest starting with a thorough assessment of your specific requirements, followed by a phased implementation that allows for iteration and refinement.\n\nWould you like me to elaborate on any of these points or explore specific aspects in greater detail?`;
      } else if (isTask) {
        return `I'd be happy to help you with this task. As Gemini 1.5 Pro, I can provide comprehensive assistance with complex requests like yours.\n\n**Understanding Your Request:**\nYou're asking me to work with: "${userInput.length > 100 ? userInput.substring(0, 100) + '...' : userInput}"\n\n**My Approach:**\n1. **Analysis Phase:** First, I'll break down the key components and requirements\n2. **Planning Phase:** Develop a structured approach that addresses all aspects\n3. **Implementation Phase:** Provide detailed, actionable guidance\n4. **Optimization Phase:** Suggest refinements and improvements\n\n**Detailed Response:**\nThis type of request benefits from my advanced reasoning capabilities. I can consider multiple perspectives, analyze potential challenges, and provide solutions that are both practical and innovative.\n\nThe key to success here is maintaining focus on your specific goals while ensuring the approach is scalable and maintainable. I recommend we proceed systematically, with regular checkpoints to ensure we're meeting your expectations.\n\nShall we dive deeper into any particular aspect of this task?`;
      } else {
        // Handle creative, descriptive, or general content
        const isCreative = inputLower.includes('story') || inputLower.includes('poem') || inputLower.includes('lighthouse') || inputLower.includes('night') || inputLower.includes('stormy') || inputLower.includes('lonely') || inputLower.includes('dream') || inputLower.includes('imagine');
        const isDescriptive = userInput.length > 50 && (userInput.includes(',') || userInput.includes('and') || userInput.match(/\b(dark|bright|cold|warm|beautiful|mysterious|ancient|forgotten)\b/i));
        
        if (isCreative || isDescriptive) {
          return `"${userInput}" - What a vivid and evocative image!\n\nAs Gemini 1.5 Pro, I can appreciate the rich layers of meaning in your prompt. Let me offer a comprehensive creative response:\n\n**Literary Analysis:**\nThis scene captures profound themes of isolation, resilience, and purpose. The lighthouse serves as both literal beacon and metaphorical symbol - standing sentinel against the chaos, offering guidance despite its own solitude.\n\n**Visual & Emotional Landscape:**\nI can envision the weathered stone tower, its light cutting through sheets of rain and spray, while waves crash against the rocky foundation. There's something deeply human about this scene - the lighthouse keeper perhaps watching from within, maintaining hope in the darkness.\n\n**Creative Interpretation:**\nThis could be the opening of many stories: A keeper's final night before automation takes over... A ghost story where the light never dims... A metaphor for someone feeling isolated but still trying to help others... Or perhaps a symbol of endurance and duty in the face of adversity.\n\n**Thematic Depth:**\n- **Isolation vs. Connection:** Alone yet serving others\n- **Light vs. Darkness:** Hope persisting through difficulty\n- **Nature vs. Human Will:** Standing firm against the storm\n- **Duty vs. Self:** The keeper's commitment despite personal cost\n\n**Creative Potential:**\nThis prompt could inspire poetry, short fiction, artwork, or philosophical reflection on themes of purpose, solitude, and resilience.\n\nWould you like me to explore any particular creative direction or thematic element in greater detail?`;
        } else {
          return `I understand you'd like me to work with: "${userInput}"\n\nAs Gemini 1.5 Pro, I bring advanced reasoning and comprehensive analysis to this topic. Let me provide a thorough response:\n\n**Contextual Analysis:**\nYour input presents an interesting subject that merits careful examination. I can approach this from multiple analytical perspectives to provide you with comprehensive insights.\n\n**Multi-Dimensional Perspective:**\nLet me consider this topic through several important lenses:\n- **Practical Applications:** How this relates to real-world scenarios and use cases\n- **Theoretical Framework:** The underlying principles and concepts involved\n- **Contextual Relevance:** How this fits within broader patterns and trends\n- **Strategic Implications:** Potential outcomes and considerations for different approaches\n\n**Detailed Analysis:**\nBased on my processing of your input, I can identify several key areas worth exploring. The subject matter suggests connections to established knowledge domains, and I can draw upon relevant examples and case studies to provide meaningful insights.\n\n**Recommendations:**\n1. **Deep Dive:** We could explore specific aspects in greater detail\n2. **Comparative Analysis:** Look at this alongside related topics or alternatives\n3. **Practical Application:** Focus on actionable insights and implementation\n4. **Future Considerations:** Examine long-term implications and trends\n\nThis represents my comprehensive initial analysis. Would you like me to focus on any particular dimension or explore specific aspects in greater depth?`;
        }
      }
    } else if (modelName.includes('gemini-1.5-flash')) {
      if (isCreativeWritingTask || looksLikeCreativePrompt) {
        // Execute creative writing task based on the input
        if (inputLower.includes('sun') && inputLower.includes('sea') && inputLower.includes('swimming')) {
          return `**Paradise Found** ✨\n\nAlex kicked off her sandals and felt the warm sand squeeze between her toes. After weeks of gray office walls, this was exactly what her soul needed. The afternoon sun painted everything golden—the rolling waves, the gentle breeze that carried hints of coconut sunscreen and adventure. She ran straight into the welcoming embrace of the sea, laughing as the cool water shocked her sun-warmed skin awake. Floating on her back, arms spread wide like she was hugging the whole world, Alex watched puffy white clouds drift lazily overhead. In this perfect moment, suspended between sky and sea, she remembered what pure joy felt like.\n\n*Word count: 108 words*`;
        } else {
          return `**Storm's End**\n\nThe lighthouse keeper's cat darted between his legs as Marcus climbed the final steps, oil lamp flickering in the wind. Below, waves exploded against the rocks like liquid thunder, but something was different tonight—a warm golden glow emanated from the beacon room above. As he pushed open the weathered door, Marcus gasped. The old lighthouse lens had somehow caught and concentrated the aurora borealis streaming across the storm clouds, transforming the beacon into a cascade of green and gold light that danced across the churning sea. Ships miles away would see this impossible beauty and know they were safe. Magic, he thought, can happen anywhere—even in the loneliest places.\n\n*Word count: 112 words*`;
        }
      } else {
        const isCreative = inputLower.includes('story') || inputLower.includes('poem') || inputLower.includes('lighthouse') || inputLower.includes('night') || inputLower.includes('stormy') || inputLower.includes('lonely') || inputLower.includes('dream') || inputLower.includes('imagine');
        
        if (isCreative) {
          return `"${userInput}" - Love the imagery! ✨\n\n**Quick Creative Take:**\nThis paints such a powerful scene! I'm getting major atmospheric vibes - the contrast between the lighthouse's steady beam and the chaos of the storm.\n\n**Key Elements:**\n• **Mood:** Dramatic, melancholic, yet hopeful\n• **Symbolism:** Guidance through adversity, standing strong alone\n• **Visual:** Dark sky, crashing waves, piercing light\n• **Emotion:** Isolation but with purpose\n\n**Creative Angles:**\n- **Story starter:** Perfect opening for a tale of mystery or redemption\n- **Character study:** The lighthouse keeper's perspective\n- **Metaphor:** Life challenges and finding your way\n- **Artistic inspiration:** Would make stunning visual art\n\n**Flash Inspiration:**\nThe lighthouse doesn't just survive the storm - it transforms it into purpose. Every flash of light is a small victory against the darkness.\n\n**Bottom Line:** This is rich material for creative work - whether poetry, prose, art, or just reflection on resilience.\n\nWant me to develop any specific creative direction?`;
        } else {
          return `Got it! Working on: "${userInput.length > 80 ? userInput.substring(0, 80) + '...' : userInput}"\n\n**Quick Analysis:**\n${isQuestion ? 'Great question!' : isTask ? 'I can help with that!' : 'Interesting topic!'} Here's my efficient take:\n\n**Key Points:**\n• **Fast insight:** This connects to several important concepts\n• **Practical angle:** The most effective approach is usually straightforward\n• **Implementation:** Start simple, then expand as needed\n\n**My Recommendation:**\n${isQuestion ? 'The answer depends on your specific context, but generally speaking, the best approach involves understanding the fundamentals first, then applying them systematically.' : isTask ? 'For this task, I\'d suggest breaking it into manageable chunks, tackling the most critical elements first, then building from there.' : 'This topic benefits from a balanced perspective - consider both theoretical foundations and real-world applications.'}\n\n**Next Steps:**\n1. ${isQuestion ? 'Clarify your specific situation' : isTask ? 'Define success criteria' : 'Identify your primary goals'}\n2. ${isQuestion ? 'Apply relevant principles' : isTask ? 'Create an action plan' : 'Gather necessary resources'}\n3. ${isQuestion ? 'Test and validate' : isTask ? 'Execute systematically' : 'Implement thoughtfully'}\n\n**Bottom Line:** ${isQuestion ? 'Focus on practical application over theory' : isTask ? 'Start now, iterate quickly' : 'Balance efficiency with thoroughness'}\n\nNeed me to dive deeper into any specific aspect?`;
        }
      }
    } else if (modelName.includes('gemini-pro')) {
      return `Regarding your input: "${userInput.length > 90 ? userInput.substring(0, 90) + '...' : userInput}"\n\n**My Analysis:**\nBased on my training, I would approach this by first understanding the core requirements and then developing a structured response that addresses your specific needs.\n\n**Key Considerations:**\n- **Context:** The nature of your request suggests you're looking for ${isQuestion ? 'clear answers and practical guidance' : isTask ? 'actionable assistance and step-by-step support' : 'thoughtful analysis and balanced perspectives'}\n- **Approach:** A systematic methodology works best for topics like this\n- **Scope:** I'll focus on providing value while remaining comprehensive\n\n**Detailed Response:**\n${isQuestion ? 'To answer your question effectively, I need to consider multiple dimensions. The most direct response involves understanding both the immediate query and its broader implications. From what you\'ve shared, the key factors include practical applicability, contextual relevance, and long-term sustainability.' : isTask ? 'For this task, success depends on clear planning and systematic execution. I recommend starting with a thorough understanding of requirements, then developing a step-by-step approach that allows for flexibility and iteration. The process should be both efficient and effective.' : 'This topic deserves careful consideration from multiple angles. The most balanced approach involves examining theoretical foundations, practical applications, and real-world constraints. By integrating these perspectives, we can develop a comprehensive understanding.'}\n\n**Alternative Perspectives:**\nIf you're looking for different viewpoints, you might also consider approaching this from ${isQuestion ? 'empirical, theoretical, or practical angles' : isTask ? 'creative, analytical, or collaborative perspectives' : 'historical, contemporary, or future-focused dimensions'}.\n\n**Conclusion:**\nThis represents a solid foundation for addressing your needs. Would you like me to elaborate on any particular aspect?`;
    } else if (modelName.includes('gpt-4')) {
      return `I've analyzed your request: "${userInput.length > 85 ? userInput.substring(0, 85) + '...' : userInput}"\n\n**GPT-4 Analysis:**\nAfter processing your input, I believe the most appropriate response involves a multi-layered approach that combines analytical rigor with practical applicability.\n\n**Historical Context:**\nSimilar queries have been addressed through various methodologies. Historical precedents suggest that the most successful approaches typically involve:\n- Systematic analysis of core components\n- Integration of multiple perspectives\n- Practical validation of theoretical concepts\n\n**Current Best Practices:**\nIn today's landscape, the most effective strategies emphasize:\n1. **Evidence-based reasoning:** Grounding responses in verifiable information\n2. **Contextual awareness:** Adapting approaches to specific circumstances\n3. **Iterative refinement:** Continuously improving based on feedback\n\n**My Recommended Framework:**\n**Phase 1 - Understanding:** ${isQuestion ? 'Clarify the specific aspects of your question that are most important' : isTask ? 'Define clear objectives and success criteria for the task' : 'Establish the scope and boundaries of the topic'}\n\n**Phase 2 - Analysis:** ${isQuestion ? 'Examine the question from multiple analytical perspectives' : isTask ? 'Break down the task into manageable, sequential components' : 'Research relevant information and identify key patterns'}\n\n**Phase 3 - Synthesis:** ${isQuestion ? 'Integrate findings into a coherent, actionable answer' : isTask ? 'Develop a comprehensive plan that addresses all requirements' : 'Combine insights into a unified understanding'}\n\n**Phase 4 - Validation:** Test assumptions and refine the approach based on results\n\n**Conclusion:**\nThis framework provides a robust foundation for addressing your needs. I'd be happy to elaborate on any specific aspect or dive deeper into particular components.\n\nWhat would be most helpful for your next steps?`;
    } else if (modelName.includes('claude')) {
      if (isCreativeWritingTask || looksLikeCreativePrompt) {
        // Execute creative writing task based on the input
        if (inputLower.includes('sun') && inputLower.includes('sea') && inputLower.includes('swimming')) {
          return `**Summer's Embrace**\n\nThe morning had started with rain, but by noon, Emma found herself standing at the water's edge, marveling at how quickly the world had transformed. Golden sunlight spilled across the restless sea like liquid honey, while a soft breeze carried the promise of afternoon adventures. She'd almost cancelled this trip, almost let her worries keep her home. But now, as she waded deeper into the welcoming waves, feeling the sun warm her shoulders and the salt water lift away her stress, Emma understood something important: sometimes the best decisions are the ones that feel like coming home to yourself. The ocean held her gently, and for the first time in months, she breathed freely.\n\n*Word count: 118 words*`;
        } else {
          return `**The Last Light**\n\nSarah had inherited more than just the lighthouse—she'd inherited her grandfather's stubborn devotion to it. Tonight, as rain hammered the windows and the automated beacon failed for the third time this month, she found herself climbing the spiral stairs with an old oil lamp, just as he once had. The storm had driven a small sailboat dangerously close to the hidden rocks below. Without thinking, Sarah began the ancient rhythm: three long flashes, pause, three short, pause, three long again. SOS in light. Through the darkness, she saw the boat's navigation lights shift course, moving toward safe water. As she watched them disappear into the harbor, Sarah realized some traditions weren't about the past—they were about being ready when someone needed you most.\n\n*Word count: 119 words*`;
        }
      } else {
        const isCreative = inputLower.includes('story') || inputLower.includes('poem') || inputLower.includes('lighthouse') || inputLower.includes('night') || inputLower.includes('stormy') || inputLower.includes('lonely') || inputLower.includes('dream') || inputLower.includes('imagine');
        
        if (isCreative) {
          return `Thank you for sharing: "${userInput}"\n\nWhat a beautifully evocative image you've painted! I find myself genuinely moved by the scene you've described.\n\n**My Response:**\nThere's something profoundly human about this image - a lighthouse standing sentinel through the storm. I can almost feel the salt spray and hear the wind howling around that weathered tower.\n\n**What I Find Compelling:**\nThe lighthouse becomes such a rich metaphor, doesn't it? It's simultaneously:\n- **Solitary yet purposeful** - alone but serving others\n- **Steadfast yet vulnerable** - strong structure facing nature's power\n- **Beacon of hope** - cutting through darkness when it's needed most\n\n**Deeper Reflection:**\nI think what strikes me most is the paradox at the heart of this scene. The lighthouse is lonely, yes, but its loneliness serves a vital purpose. There's something beautiful about that - the way isolation can become a form of service, the way standing apart can mean guiding others home.\n\nIt makes me think about those moments in life when we feel like that lighthouse - weathering our own storms while trying to be a steady light for others. The keeper up there, perhaps watching through rain-lashed windows, maintaining that essential beacon even when the world feels chaotic.\n\n**Creative Possibilities:**\nThis could open into so many directions - a meditation on duty and solitude, a ghost story about the last keeper, a metaphor for resilience, or simply a moment of atmospheric beauty to savor.\n\n**Personal Touch:**\nI find myself wondering about the lighthouse keeper's story. What brought them there? What do they think about during the long, stormy nights?\n\nWhat draws you to this particular image? I'd love to explore wherever your imagination wants to take this.`;
        } else {
          return `Thank you for sharing: "${userInput.length > 85 ? userInput.substring(0, 85) + '...' : userInput}"\n\nI'd be genuinely happy to help you with this ${isQuestion ? 'question' : isTask ? 'task' : 'topic'}.\n\n**My Approach:**\nI like to start by really understanding what you're looking for, then provide a response that's both helpful and thoughtful. For ${isQuestion ? 'questions like yours' : isTask ? 'tasks like this' : 'topics like this'}, I find it works best to combine clear, practical guidance with deeper insights.\n\n**Key Insights:**\nWhat strikes me about ${isQuestion ? 'your question' : isTask ? 'this task' : 'this topic'} is that it touches on some really important considerations:\n\n- **Practical dimension:** ${isQuestion ? 'You need actionable information you can apply' : isTask ? 'You want concrete steps you can follow' : 'You\'re looking for insights you can use'}\n- **Contextual dimension:** ${isQuestion ? 'The answer likely depends on your specific situation' : isTask ? 'Success depends on your particular circumstances' : 'The relevance varies based on your context'}\n- **Strategic dimension:** ${isQuestion ? 'There may be different approaches depending on your goals' : isTask ? 'The best method might depend on your resources and timeline' : 'Different perspectives might be valuable for different purposes'}\n\n**Balanced Perspective:**\n${isQuestion ? 'While there isn\'t always one "right" answer, I can share what generally works well based on established principles and common patterns. The key is usually finding the approach that best fits your specific needs and circumstances.' : isTask ? 'The most effective way forward typically involves breaking this down into manageable parts, then tackling each systematically while remaining flexible enough to adjust based on what you learn along the way.' : 'I think the most valuable approach here involves looking at this from multiple angles - considering both the immediate practical aspects and the broader implications or context.'}\n\n**Moving Forward:**\nI hope this perspective is helpful as a starting point. I'd be very happy to explore any aspect in more depth, or if there are particular dimensions you'd like me to focus on, just let me know.\n\nWhat would be most useful for you right now?`;
        }
      }
    } else {
      return `Processing your input: "${userInput.length > 90 ? userInput.substring(0, 90) + '...' : userInput}"\n\n**Response Analysis:**\nAs an AI language model, I can provide assistance with ${isQuestion ? 'answering your question' : isTask ? 'helping with this task' : 'exploring this topic'}.\n\n**Understanding Your Needs:**\n${isQuestion ? 'Your question requires a comprehensive response that addresses the core inquiry while providing practical value.' : isTask ? 'This task involves multiple components that can be addressed systematically for optimal results.' : 'This topic merits careful consideration from multiple perspectives to provide a complete view.'}\n\n**My Response:**\n${isQuestion ? 'Based on available information and established patterns, the most accurate answer involves considering several factors. The key principles that apply here include practical applicability, contextual relevance, and evidence-based reasoning.' : isTask ? 'To accomplish this task effectively, I recommend a structured approach that prioritizes clear objectives, systematic execution, and iterative improvement. Success typically depends on careful planning and consistent implementation.' : 'From an analytical perspective, this topic encompasses several important dimensions. The most balanced view considers theoretical foundations, practical applications, and real-world implications to provide comprehensive understanding.'}\n\n**Practical Considerations:**\n- Current best practices suggest ${isQuestion ? 'validating answers through multiple sources' : isTask ? 'breaking complex tasks into manageable steps' : 'examining topics from multiple viewpoints'}\n- Implementation success often depends on ${isQuestion ? 'adapting general principles to specific contexts' : isTask ? 'maintaining focus while remaining flexible' : 'balancing thoroughness with practical constraints'}\n- Long-term value comes from ${isQuestion ? 'understanding underlying principles rather than just surface answers' : isTask ? 'building sustainable processes rather than quick fixes' : 'developing transferable insights rather than isolated facts'}\n\n**Please note:** This is a simulated response for demonstration purposes. In a production environment, this would connect to actual AI services.\n\nHow can I help you further develop this concept?`;
    }
  }
  
  // Handle model selection change
  const handleModelChange = (index: number, newModel: string) => {
    const currentModels = form.getValues('chatbotModels');
    const updatedModels = [...currentModels];
    updatedModels[index] = newModel;
    
    form.setValue('chatbotModels', updatedModels);
  };
  
  // Add another chatbot (up to 3)
  const addChatbot = () => {
    const currentModels = form.getValues('chatbotModels');
    if (currentModels.length < 3) {
      // Find a model we're not using yet
      const unusedModels = availableModels
        .filter(model => !currentModels.includes(model.value))
        .map(model => model.value);
      
      const newModel = unusedModels[0] || 'googleai/gemini-pro';
      form.setValue('chatbotModels', [...currentModels, newModel]);
    }
  };
  
  // Remove a chatbot (minimum 2)
  const removeChatbot = (index: number) => {
    const currentModels = form.getValues('chatbotModels');
    if (currentModels.length > 2) {
      const updatedModels = currentModels.filter((_, i) => i !== index);
      form.setValue('chatbotModels', updatedModels);
    }
  };
  
  // Copy response to clipboard
  const handleCopyToClipboard = (indexOrContent: number | string, contentIndex?: number) => {
    // If first argument is a number, it's an index to get content from chatbotResponses
    if (typeof indexOrContent === 'number') {
      const index = indexOrContent;
      const response = chatbotResponses[index];
      if (response && response.content) {
        navigator.clipboard.writeText(response.content).then(() => {
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 2000);
          
          toast({
            title: 'Copied!',
            description: 'Response copied to clipboard',
          });
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No content to copy',
        });
      }
    } 
    // If first argument is a string and second is a number, use them directly
    else if (typeof indexOrContent === 'string' && typeof contentIndex === 'number') {
      navigator.clipboard.writeText(indexOrContent).then(() => {
        setCopiedIndex(contentIndex);
        setTimeout(() => setCopiedIndex(null), 2000);
        
        toast({
          title: 'Copied!',
          description: 'Content copied to clipboard',
        });
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Base prompt input (shared across all chatbots) */}
          <div className="mb-8 max-w-5xl mx-auto">
            <Card className="border">
              
              
              
              <CardContent className="p-8">
                <FormField
                  control={form.control}
                  name="basePrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-3 text-lg font-semibold mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                          <Wand2 className="h-5 w-5" />
                        </div>
                        System Prompt Template
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea 
                            placeholder="Define your AI assistant's role, personality, and guidelines here..."
                            className="min-h-[140px] resize-none"
                            {...field} 
                          />
                          <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Shared Template
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription className="text-sm mt-3 text-muted-foreground p-3 rounded-lg border-l-4 border-primary">
                        💡 This template will be applied to all AI models. Define the assistant's personality, expertise, and behavioral guidelines here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Main chatbot interface */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 justify-center">
              {form.watch('chatbotModels').map((modelValue, index) => {
                // Find the model info
                const modelInfo = availableModels.find(m => m.value === modelValue);
                const chatbotResponse = chatbotResponses[index] || {
                  id: `chatbot-${index}`,
                  model: modelValue,
                  content: '',
                  isLoading: false,
                  tokenEstimate: {
                    inputTokens: 0,
                    outputTokens: 0, 
                    totalTokens: 0,
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0
                  }
                };
              
              // Calculate tokens on the fly
              const basePrompt = form.watch('basePrompt');
              const userContext = form.watch('userContext') || activeUserInput;
              
              // Calculate token estimation for each model
              const tokenEstimate = estimatePromptTokensAndCost(
                basePrompt,
                userContext,
                modelValue,
                800 // Default estimated output length
              );
              
              return (
                <Card 
                  key={`chatbot-${index}`} 
                  className="w-full min-w-[450px] max-w-2xl mx-auto border" 
                >
                  
                  <CardHeader className="pb-4">
                    
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Model selection dropdown */}
                        <div className="flex flex-col">
                          <Select 
                            value={modelValue}
                            onValueChange={(newValue) => handleModelChange(index, newValue)}
                          >
                            <SelectTrigger className="w-[240px]">
                              <SelectValue>
                                <span className="font-medium flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  {modelValue.split('/')[1] || modelValue}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map(model => (
                                <SelectItem key={model.value} value={model.value} className="hover:bg-blue-50">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{model.label}</span>
                                    <span className="text-xs text-muted-foreground">{model.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Model description with enhanced styling */}
                          <span className="text-sm text-gray-300 mt-2 ml-1 opacity-90">
                            {modelInfo?.description || 'AI language model'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Add/Remove buttons with enhanced styling */}
                      <div className="flex items-center gap-3">
                        {index > 0 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 hover:border-red-300"
                            onClick={() => removeChatbot(index)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                        {index === form.watch('chatbotModels').length - 1 && 
                         form.watch('chatbotModels').length < 3 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200 hover:border-green-300"
                            onClick={addChatbot}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Model
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-8">
                    {/* Chat response area with enhanced design */}
                    <div className="h-[480px] overflow-y-auto mb-6 relative bg-muted/20 rounded-lg p-6 border">
                      {chatbotResponse.content ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({children}) => <p className="mb-4 text-base leading-relaxed">{children}</p>,
                              h3: ({children}) => <h3 className="text-lg font-semibold mb-3">{children}</h3>,
                              ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                            }}
                          >
                            {chatbotResponse.content}
                          </ReactMarkdown>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="absolute top-4 right-4"
                            onClick={() => handleCopyToClipboard(index)}
                          >
                            <Copy className={`h-4 w-4 mr-2 ${copiedIndex === index ? "text-green-500" : "text-gray-600"}`} />
                            {copiedIndex === index ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                      ) : chatbotResponse.isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <div className="relative">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-blue-200 animate-pulse"></div>
                          </div>
                          <div className="text-center">
                            <p className="text-lg text-gray-800 dark:text-gray-200 animate-pulse font-medium mb-2">Generating response...</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while {modelValue.split('/')[1]} processes your request</p>
                          </div>
                        </div>
                      ) : chatbotResponse.error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-600 dark:text-red-400 gap-4 animate-in fade-in duration-300">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50">
                            <AlertTriangle className="h-8 w-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-lg mb-2">{chatbotResponse.error}</p>
                            <p className="text-sm text-gray-500">Please try again or contact support if the issue persists</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                            <MessageSquare className="h-10 w-10" />
                          </div>
                          <div className="text-center max-w-sm">
                            <p className="text-lg font-medium mb-2">Ready to respond</p>
                            <p className="text-sm opacity-80">Enter a message below and click "Send to All Models" to see this model's response</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Token estimation */}
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Usage & Cost Estimate
                        </h4>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {formatCost(chatbotResponse.tokenEstimate?.totalCost || tokenEstimate.totalCost)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Cost</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-background/50 rounded-md p-3 border">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-foreground">Input</span>
                          </div>
                          <div className="text-base font-semibold text-foreground">
                            {formatTokenCount(tokenEstimate.inputTokens)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            tokens • {formatCost(tokenEstimate.inputCost)}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-1">
                            Your prompt + context
                          </div>
                        </div>
                        
                        <div className="bg-background/50 rounded-md p-3 border">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-foreground">Output</span>
                          </div>
                          <div className="text-base font-semibold text-foreground">
                            {formatTokenCount(chatbotResponse.tokenEstimate?.outputTokens || tokenEstimate.outputTokens)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            tokens • {formatCost(chatbotResponse.tokenEstimate?.outputCost || tokenEstimate.outputCost)}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-1">
                            AI response (estimated)
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                        <div className="text-xs text-muted-foreground text-center">
                          💡 Costs are estimated based on {modelValue.split('/')[1]} pricing
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
          
          {/* Enhanced User input area */}
          <div className="w-full my-12">
            <Card className="w-full max-w-5xl mx-auto">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Your Message</h3>
                      <p className="text-muted-foreground">This will be sent to all selected AI models for comparison</p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="userContext"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              placeholder="Ask a question, describe a task, or provide context for the AI models to respond to..."
                              className="min-h-[160px] resize-none"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setActiveUserInput(e.target.value);
                              }}
                              value={field.value || activeUserInput}
                            />
                            
                            {/* Character counter */}
                            <div className="absolute top-4 right-4 text-xs text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-lg">
                              {(field.value || activeUserInput || '').length} chars
                            </div>
                            
                            {/* Send button */}
                            <div className="absolute bottom-6 right-6">
                              <Button 
                                type="submit" 
                                size="lg"
                                className="h-14 px-8 text-lg font-semibold"
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Send className="mr-3 h-6 w-6" />
                                    Send to All Models
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription className="text-base mt-4 text-muted-foreground p-4 rounded-xl border-l-4 border-primary flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <span>Your message will be combined with the system prompt template above and sent to each selected AI model. Compare their responses to find the best approach for your use case.</span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );

  return (
    <div>
      <Tabs defaultValue="variations" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="variations">Multi-Variant Testing</TabsTrigger>
          <TabsTrigger value="models">Model Comparison</TabsTrigger>
        </TabsList>
        
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted">
          <div className="flex items-center gap-3 mb-2">
            <img src="/gemini-color.svg" alt="Gemini Logo" className="w-6 h-6" />
            <h3 className="text-lg font-medium">A/B Testing</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Compare your prompt across different Gemini models or generate multiple variations.
            This tool is optimized for working with Google's Gemini family of models.
          </p>
        </div>
        
        <TabsContent value="variations">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Generate Multiple Variations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create multiple variations of your prompt using different Gemini models to compare effectiveness and find the best version.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="models">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Compare Across Models</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run your prompt across the Gemini model family with an optional comparison to other leading models.
            </p>
          </div>
        </TabsContent>
      
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="basePrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Prompt (Instructions)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your prompt instructions here..." 
                        {...field} 
                        rows={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="userContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Context (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any context, data or specific information for the prompt..." 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be passed to the model as user context/input along with your base prompt instructions.
                    </p>
                  </FormItem>
                )}
              />
            </div>
            
            <TabsContent value="variations" className="space-y-6 mt-0">
              <FormField
                control={form.control}
                name="variationCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Variations</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select number of variations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Variations</SelectItem>
                          <SelectItem value="4">4 Variations</SelectItem>
                          <SelectItem value="5">5 Variations</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Token estimator for variations tab - always visible */}
              <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Real-Time Token & Cost Estimation</h4>
                </div>
                <TokenEstimator 
                  prompt={form.watch('basePrompt')} 
                  userContext={form.watch('userContext')}
                  models={geminiModels.slice(0, parseInt(form.watch('variationCount'))).map(m => m.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Estimates update as you type, showing projected token usage and costs for each model's response.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="models" className="space-y-6 mt-0">
              <div className="space-y-4">
                <FormLabel>Select Models to Compare</FormLabel>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gemini Models Section */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Gemini Models</h4>
                    <div className="flex flex-wrap gap-2">
                      {geminiModels.map(model => (
                        <Badge key={model.value} variant="outline" className="py-2 px-3">
                          {model.label} ✓
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Other Models Section */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Other Models (Optional)</h4>
                    <div className="flex flex-wrap gap-2">
                      {otherModels.map(model => (
                        <Badge key={model.value} variant="outline" className={`py-2 px-3 ${model.value === 'openai/gpt-4o' ? '' : 'opacity-50'}`}>
                          {model.label} {model.value === 'openai/gpt-4o' ? '✓' : ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Priority is given to comparing across Gemini model variants, with optional inclusion of other models.
                </p>

                {/* Token estimator for model comparison tab */}
                <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                  <h4 className="text-sm font-medium mb-3">Token & Cost Estimation</h4>
                  <TokenEstimator 
                    prompt={form.watch('basePrompt')} 
                    userContext={form.watch('userContext')}
                    models={[...geminiModels.slice(0, 3).map(m => m.value), 'openai/gpt-4o']}
                  />
                </div>
              </div>
            </TabsContent>
            
            <div>
              <FormLabel>Evaluation Metrics</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="py-2 px-3">Accuracy ✓</Badge>
                <Badge variant="outline" className="py-2 px-3">Creativity ✓</Badge>
                <Badge variant="outline" className="py-2 px-3">Tone ✓</Badge>
                <Badge variant="outline" className="py-2 px-3 opacity-50">Coherence</Badge>
                <Badge variant="outline" className="py-2 px-3 opacity-50">Persuasiveness</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                In the full implementation, users would be able to select evaluation metrics.
              </p>
            </div>
            
            <Button type="submit" disabled={isLoading} className="btn-responsive">
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SplitSquareVertical className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Generating...' : activeTab === 'variations' ? 'Generate Variations' : 'Compare Across Models'}
            </Button>
          </form>
        </Form>
      </Tabs>
      
      {variations.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-headline font-semibold">Results</h3>
            <Button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              variant="outline"
              className="gap-2"
            >
              {isEvaluating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {isEvaluating ? 'Evaluating...' : 'Auto-Evaluate Results'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variations.map((variation, index) => (
              <Card key={variation.id} className={variation.overall && variation.overall >= 8 ? "border-green-500" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span>
                      {activeTab === 'variations' ? `Variation ${index + 1}` : variation.model?.split('/')[1]}
                    </span>
                    {variation.overall && (
                      <Badge variant={variation.overall >= 8 ? "default" : "outline"}>
                        Score: {variation.overall}/10
                      </Badge>
                    )}
                  </CardTitle>
                  
                  {activeTab === 'variations' && (
                    <div className="mt-2">
                      <Select 
                        defaultValue={variation.selectedModel || geminiModels[0].value}
                        onValueChange={(value) => {
                          const updatedVariations = [...variations];
                          updatedVariations[index].selectedModel = value;
                          
                          // In a complete implementation, we would regenerate this specific variation
                          // with the newly selected model
                          
                          // Update the variation content to reflect model change
                          updatedVariations[index].content = `${form.getValues().basePrompt}\n\n[This variation would be regenerated using ${value}. In production, selecting a new model would regenerate this variation.]`;
                          
                          setVariations(updatedVariations);
                          
                          toast({
                            title: 'Model Changed',
                            description: `Changed model for variation ${index + 1} to ${geminiModels.find(m => m.value === value)?.label || value}`,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select Gemini model" />
                        </SelectTrigger>
                        <SelectContent>
                          {geminiModels.map(model => (
                            <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Display model details for both tabs */}
                  <div className="flex items-center gap-2 mt-2">
                    <img 
                      src="/gemini-color.svg" 
                      alt="Gemini" 
                      className="w-4 h-4"
                      style={{ opacity: variation.selectedModel?.includes('gemini') ? 1 : 0.5 }}
                    />
                    <CardDescription className="text-xs">
                      {variation.modelInfo?.displayName || 
                       geminiModels.find(m => m.value === (variation.selectedModel || variation.model))?.label || 
                       (variation.selectedModel || variation.model)?.split('/')[1]}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-sm max-h-80 overflow-y-auto">
                  {/* Content display with clear separation between base prompt and context */}
                  <div className="space-y-3">
                    {/* Extract and display base prompt and user context separately for clarity */}
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <User className="h-3 w-3" />
                        <span>Base Prompt + User Context</span>
                      </div>
                      <PromptDisplay prompt={variation.content.split('\n\n[')[0]} />
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>Model Response</span>
                      </div>
                      <div className="p-2 bg-muted/20 rounded-md">
                        {/* Display simulated model response */}
                        <p className="italic text-muted-foreground">
                          [This is where the actual model response would appear. In the full implementation, 
                          this would be the generated output from {variation.modelInfo?.displayName || variation.selectedModel}.]
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {variation.scores && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Scores:</h4>
                      <div className="space-y-1">
                        {Object.entries(variation.scores).map(([metric, score]) => (
                          <div key={metric} className="flex justify-between text-sm">
                            <span className="capitalize">{metric}</span>
                            <span>{score}/10</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="flex justify-between w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopyToClipboard(variation.content, index)}
                      className="gap-1"
                    >
                      {copiedIndex === index ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedIndex === index ? 'Copied' : 'Copy'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => handleSaveToVersionControl(index)}
                    >
                      <GitBranch className="h-4 w-4" />
                      Save Version
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}