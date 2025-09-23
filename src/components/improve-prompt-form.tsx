
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle, Wand2, BarChart3, Play, Undo2, GitBranch, Save } from 'lucide-react';
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
import { improvePromptAction, ImprovePromptInputs } from '@/app/actions';
import { PromptDisplay } from './prompt-display';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from './file-upload';
import { prepareFilesForGemini } from '@/lib/file-utils';
import { useStorage } from '@/contexts/storage-context';
import { PromptData } from '@/lib/storage';
import Link from 'next/link';

const formSchema = z.object({
  existingPrompt: z.string().nonempty({ message: 'Please provide the prompt to improve.' }),
  problemDescription: z.string().nonempty({ message: 'Please describe the problem.' }),
  expectedChanges: z.string().nonempty({ message: 'Please specify the expected changes.' }),
});

interface ImprovePromptFormProps {
  onPromptImproved?: (originalPrompt: string, improvedPrompt: string, context?: string, files?: File[]) => void;
  onAnalyzeClick?: () => void;
  hasImprovedPrompt?: boolean;
  initialData?: Partial<PromptData>;
}

export function ImprovePromptForm({ 
  onPromptImproved, 
  onAnalyzeClick, 
  hasImprovedPrompt,
  initialData
}: ImprovePromptFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);
  const [isSavingToVersions, setIsSavingToVersions] = useState(false);
  const { toast } = useToast();
  const { prompts, versions } = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      existingPrompt: initialData?.originalPrompt || '',
      problemDescription: '',
      expectedChanges: '',
    },
  });

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        existingPrompt: initialData.originalPrompt || '',
        problemDescription: '',
        expectedChanges: '',
      });
      if (initialData.improvedPrompt) {
        setImprovedPrompt(initialData.improvedPrompt);
      }
      setIsAutoPopulated(!!initialData.originalPrompt);
    }
  }, [initialData, form]);

  const handleUndo = () => {
    form.reset({
      existingPrompt: '',
      problemDescription: '',
      expectedChanges: '',
    });
    setImprovedPrompt(null);
    setUploadedFiles([]);
    setIsAutoPopulated(false);
  };

  const handleSaveToVersionControl = async () => {
    if (!improvedPrompt) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No improved prompt to save.',
      });
      return;
    }

    setIsSavingToVersions(true);

    try {
      const values = form.getValues();
      let groupName = `Prompt ${new Date().toLocaleDateString()}`;
      
      // Check if this is an improvement of an existing prompt
      if (initialData?.originalPrompt) {
        const groups = prompts.prompts.filter(p => p.originalPrompt === values.existingPrompt);
        if (groups.length > 0) {
          groupName = `Improved ${groups[0].type} Prompt`;
        }
      }
      
      // First check for groups that already have the original prompt as a version
      const existingGroups = versions.promptGroups.filter(g => 
        g.versions.some(v => v.content === values.existingPrompt)
      );
      
      if (existingGroups.length > 0) {
        // Add as new version to existing group
        const group = existingGroups[0];
        const newVersion = versions.addVersion(group.id, improvedPrompt, {
          name: `v${group.versions.length + 1}.0 (Improved)`,
          description: `Improved version: ${values.expectedChanges}`,
          status: 'draft',
          createdFrom: {
            type: 'improved',
            sourceData: {
              problemDescription: values.problemDescription,
              expectedChanges: values.expectedChanges,
              originalPrompt: values.existingPrompt
            }
          }
        });
        
        if (newVersion) {
          toast({
            title: 'Saved to Version Control',
            description: `Created ${newVersion.name} for "${group.name}"`,
          });
        }
      } else {
        // Create new prompt group with original version first
        const group = await versions.createPromptGroup(
          groupName,
          values.existingPrompt, // Original prompt as the first version
          `Original prompt before improvements`
        );
        
        if (group) {
          // Now add the improved version as the second version
          const improvedVersion = versions.addVersion(group.id, improvedPrompt, {
            name: 'v2.0 (Improved)',
            description: `Improved version: ${values.expectedChanges}`,
            status: 'current', // Mark this as current (but keep the original one)
            createdFrom: {
              type: 'improved',
              sourceData: {
                problemDescription: values.problemDescription,
                expectedChanges: values.expectedChanges,
                originalPrompt: values.existingPrompt
              }
            }
          });
          
          if (improvedVersion) {
            toast({
              title: 'Version Control Group Created',
              description: `Created "${group.name}" with improved version`,
            });
          }
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save to version control. Please try again.',
      });
    } finally {
      setIsSavingToVersions(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setImprovedPrompt(null);
    
    try {
      let files = undefined;
      if (uploadedFiles.length > 0) {
        files = await prepareFilesForGemini(uploadedFiles);
      }
      
      const enhancedValues = {
        ...values,
        files
      };
      
      const result = await improvePromptAction(enhancedValues as ImprovePromptInputs);
      
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      } else if (result.data) {
        setImprovedPrompt(result.data);
        
        // Just store in legacy prompt storage for backward compatibility
        // Do NOT automatically create versions - let user use the "Save to Versions" button
        
        // Save to legacy prompt storage for backward compatibility
        const promptData: Omit<PromptData, 'id' | 'timestamp'> = {
          originalPrompt: values.existingPrompt,
          improvedPrompt: result.data,
          context: values.problemDescription,
          files: uploadedFiles.map(file => ({
            name: file.name,
            mimeType: file.type,
            data: '', // Will be populated by prepareFilesForGemini
            size: file.size
          })),
          type: 'improved'
        };
        prompts.savePrompt(promptData);
        
        // Notify parent component about the improved prompt
        onPromptImproved?.(values.existingPrompt, result.data, values.problemDescription, uploadedFiles);
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
          <FormField
            control={form.control}
            name="existingPrompt"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Existing Prompt</FormLabel>
                  {isAutoPopulated && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      className="gap-2"
                    >
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </Button>
                  )}
                </div>
                <FormControl>
                  <Textarea placeholder="Paste your existing prompt here..." {...field} rows={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="problemDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Problem Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="What's wrong with the current prompt? e.g., 'The output is too generic...'" {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedChanges"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Changes</FormLabel>
                <FormControl>
                  <Textarea placeholder="What should the improved prompt do differently? e.g., 'It should use a persuasive tone...'" {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Upload Files (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload Excel files, PDFs, or images to provide additional context for prompt improvement.
              </p>
              <FileUpload
                onFilesChange={(files) => setUploadedFiles(files.map(f => f.file))}
                maxFiles={5}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={isLoading} className="btn-responsive">
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Refining...' : 'Refine Prompt'}
            </Button>
            
            {hasImprovedPrompt && onAnalyzeClick && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onAnalyzeClick}
                className="btn-responsive"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Changes
              </Button>
            )}
          </div>
        </form>
      </Form>
      {improvedPrompt && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-headline font-semibold mb-2">Refined Prompt</h3>
          <PromptDisplay prompt={improvedPrompt} />
          
          {/* Launch Playground Section */}
          <div className="mt-6 p-4 border border-primary/20 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Test Your Improved Prompt
              </h4>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Launch the testing playground to interact with your improved prompt and see how it performs in real-time conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href={`/playground?prompt=${encodeURIComponent(improvedPrompt)}&model=googleai/gemini-2.5-flash&temperature=0.7`}
                className="flex-1"
              >
                <Button className="w-full gap-2">
                  <Play className="h-4 w-4" />
                  Launch Playground
                </Button>
              </Link>
              
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveToVersionControl}
                disabled={isSavingToVersions}
                className="gap-2"
              >
                {isSavingToVersions ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
                {isSavingToVersions ? 'Saving...' : 'Save to Versions'}
              </Button>
              
              {hasImprovedPrompt && onAnalyzeClick && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onAnalyzeClick}
                  className="btn-responsive"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze Changes
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
