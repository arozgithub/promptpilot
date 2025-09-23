'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { rewritePromptAction, RewritePromptInputs } from '@/app/actions';
import { PromptDisplay } from './prompt-display';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/contexts/storage-context';
import { PromptData } from '@/lib/storage';

const formSchema = z.object({
  chatHistory: z.string().optional(),
  followUpQuestion: z.string().nonempty({ message: 'Please provide the follow-up question to rewrite.' }),
});

interface RewritePromptFormProps {
  onPromptRewritten?: (originalQuestion: string, standaloneQuestion: string, chatHistory?: string) => void;
  onAnalyzeClick?: () => void;
  hasRewrittenPrompt?: boolean;
  initialData?: Partial<PromptData>;
}

export function RewritePromptForm({ 
  onPromptRewritten, 
  onAnalyzeClick, 
  hasRewrittenPrompt,
  initialData
}: RewritePromptFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [standaloneQuestion, setStandaloneQuestion] = useState<string | null>(null);
  const { toast } = useToast();
  const { prompts, versions } = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chatHistory: '',
      followUpQuestion: '',
    },
  });

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        chatHistory: initialData.context || '',
        followUpQuestion: initialData.originalPrompt || '',
      });
      if (initialData.improvedPrompt) {
        setStandaloneQuestion(initialData.improvedPrompt);
      }
    }
  }, [initialData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setStandaloneQuestion(null);
    
    try {
      const result = await rewritePromptAction(values as RewritePromptInputs);
      
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      } else if (result.data) {
        setStandaloneQuestion(result.data);
        
        // Create version or new group for rewritten prompt
        const groupName = `Rewritten Prompt ${new Date().toLocaleDateString()}`;
        const existingGroups = versions.promptGroups.filter(g => 
          g.versions.some(v => v.content === values.followUpQuestion)
        );
        
        if (existingGroups.length > 0) {
          // Add as new version to existing group
          const group = existingGroups[0];
          const newVersion = versions.addVersion(group.id, result.data, {
            name: `v${group.versions.length + 1}.0 (Rewritten)`,
            description: 'Standalone question from chat context',
            status: 'draft',
            createdFrom: {
              type: 'rewritten',
              sourceData: {
                chatHistory: values.chatHistory,
                originalQuestion: values.followUpQuestion
              }
            }
          });
          
          if (newVersion) {
            toast({
              title: 'New Version Created',
              description: `Created ${newVersion.name} for "${group.name}"`,
            });
          }
        } else {
          // Create new prompt group
          const group = await versions.createPromptGroup(
            groupName,
            result.data,
            'Rewritten as standalone question from chat context'
          );
          
          if (group) {
            toast({
              title: 'Prompt Created',
              description: `Created new prompt group "${group.name}"`,
            });
          }
        }
        
        // Also save to legacy prompt storage for backward compatibility
        const promptData: Omit<PromptData, 'id' | 'timestamp'> = {
          originalPrompt: values.followUpQuestion,
          improvedPrompt: result.data,
          context: values.chatHistory,
          files: [],
          type: 'rewritten'
        };
        prompts.savePrompt(promptData);
        
        // Notify parent component about the rewritten prompt
        onPromptRewritten?.(values.followUpQuestion, result.data, values.chatHistory);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to rewrite prompt. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="chatHistory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chat History (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Paste the chat history here to provide context for the follow-up question..." 
                    {...field} 
                    rows={4} 
                  />
                </FormControl>
                <FormDescription>
                  Provide the conversation history to help understand the context of the follow-up question.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="followUpQuestion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Follow-Up Question</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter the follow-up question that needs to be rewritten into a standalone question..." 
                    {...field} 
                    rows={4} 
                  />
                </FormControl>
                <FormDescription>
                  The question that depends on previous context and needs to be made standalone.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={isLoading} className="btn-responsive">
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Rewriting...' : 'Rewrite to Standalone'}
            </Button>
            
            {hasRewrittenPrompt && onAnalyzeClick && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onAnalyzeClick}
                className="flex-1 sm:flex-none"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Changes
              </Button>
            )}
          </div>
        </form>
      </Form>
      {standaloneQuestion && (
        <div className="mt-8">
          <h3 className="text-lg font-headline font-semibold mb-2">Standalone Question</h3>
          <PromptDisplay prompt={standaloneQuestion} />
        </div>
      )}
    </div>
  );
}

