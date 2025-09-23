
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle, Wand2, BookText, BarChart3, Play } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { generatePromptAction, GeneratePromptInputs } from '@/app/actions';
import { PromptDisplay } from './prompt-display';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from './file-upload';
import { prepareFilesForGemini } from '@/lib/file-utils';
import { useStorage } from '@/contexts/storage-context';
import { PromptData } from '@/lib/storage';
import Link from 'next/link';

const formSchema = z.object({
  role: z.string().optional(),
  context: z.string().optional(),
  sampleInput: z.string().optional(),
  expectedOutput: z.string().optional(),
  enhanceWithJoblogic: z.boolean().default(false),
});

interface GeneratePromptFormProps {
  onPromptGenerated?: (prompt: string, context?: string, files?: File[]) => void;
  onAnalyzeClick?: () => void;
  hasGeneratedPrompt?: boolean;
  initialData?: Partial<PromptData>;
}

export function GeneratePromptForm({ 
  onPromptGenerated, 
  onAnalyzeClick, 
  hasGeneratedPrompt,
  initialData
}: GeneratePromptFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const { prompts, versions } = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: initialData?.context || '',
      context: initialData?.context || '',
      sampleInput: '',
      expectedOutput: '',
      enhanceWithJoblogic: false,
    },
  });

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        role: initialData.context || '',
        context: initialData.context || '',
        sampleInput: '',
        expectedOutput: '',
        enhanceWithJoblogic: false,
      });
      if (initialData.improvedPrompt) {
        setGeneratedPrompt(initialData.improvedPrompt);
      }
    }
  }, [initialData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedPrompt(null);
    
    try {
      let files = undefined;
      if (uploadedFiles.length > 0) {
        files = await prepareFilesForGemini(uploadedFiles);
      }
      
      const enhancedValues = {
        ...values,
        files
      };
      
      const result = await generatePromptAction(enhancedValues as GeneratePromptInputs);
      
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      } else if (result.data) {
        setGeneratedPrompt(result.data);
        
        // Create new prompt group for generated prompt
        const groupName = values.role || values.context || `Generated Prompt ${new Date().toLocaleDateString()}`;
        const group = await versions.createPromptGroup(
          groupName,
          result.data,
          values.context || 'Generated prompt based on provided requirements'
        );
        
        if (group) {
          toast({
            title: 'Prompt Generated',
            description: `Created new prompt group "${group.name}"`,
          });
        }
        
        // Also save to legacy prompt storage for backward compatibility
        const promptData: Omit<PromptData, 'id' | 'timestamp'> = {
          originalPrompt: result.data,
          improvedPrompt: result.data,
          context: values.context,
          files: uploadedFiles.map(file => ({
            name: file.name,
            mimeType: file.type,
            data: '', // Will be populated by prepareFilesForGemini
            size: file.size
          })),
          type: 'generated'
        };
        prompts.savePrompt(promptData);
        
        // Notify parent component about the generated prompt
        onPromptGenerated?.(result.data, values.context, uploadedFiles);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process files. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., An expert copywriter" {...field} />
                  </FormControl>
                  <FormDescription>What role should the AI assume?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Writing a marketing email for a new product" {...field} />
                  </FormControl>
                  <FormDescription>What is the situation or background?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="sampleInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sample Input / Task</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Product: 'AI-powered shoes'. Features: self-tying, adjusts to foot shape." {...field} rows={4} />
                </FormControl>
                <FormDescription>Provide an example of the input or the task for the AI.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedOutput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Output</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., A catchy and persuasive email subject line and body." {...field} rows={4} />
                </FormControl>
                <FormDescription>What should the ideal response look like?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Upload Files (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload Excel files, PDFs, or images to provide additional context for prompt generation.
              </p>
              <FileUpload
                onFilesChange={(files) => setUploadedFiles(files.map(f => f.file))}
                maxFiles={5}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="enhanceWithJoblogic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-accent/20">
                <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center gap-2">
                    <BookText className="h-4 w-4" />
                    Enhance with Joblogic Knowledge
                  </FormLabel>
                  <FormDescription>
                    Enrich the prompt with relevant information from the Joblogic knowledge base.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={isLoading} className="btn-responsive">
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Generating...' : 'Generate Prompt'}
            </Button>
            
            {hasGeneratedPrompt && onAnalyzeClick && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onAnalyzeClick}
                className="btn-responsive"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Prompt
              </Button>
            )}
          </div>
        </form>
      </Form>
      {generatedPrompt && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-headline font-semibold mb-2">Generated Prompt</h3>
          <PromptDisplay prompt={generatedPrompt} />
          
          {/* Launch Playground Section */}
          <div className="mt-6 p-4 border border-primary/20 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Test Your Generated Prompt
              </h4>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Launch the testing playground to interact with your generated prompt and see how it performs in real-time conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href={`/playground?prompt=${encodeURIComponent(generatedPrompt)}&model=googleai/gemini-2.5-flash&temperature=0.7`}
                className="btn-responsive"
              >
                <Button className="w-full gap-2">
                  <Play className="h-4 w-4" />
                  Launch Playground
                </Button>
              </Link>
              
              {hasGeneratedPrompt && onAnalyzeClick && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onAnalyzeClick}
                  className="btn-responsive"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze Prompt
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
