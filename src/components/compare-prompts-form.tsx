'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Target, CheckCircle, Lightbulb, BarChart3, Play, GitBranch } from 'lucide-react';
import { comparePrompts } from '@/ai/flows/compare-prompts';
import { FileUpload } from './file-upload';
import { DiffChecker } from './diff-checker';
import { prepareFilesForGemini } from '@/lib/file-utils';
import { useStorage } from '@/contexts/storage-context';
import { PromptData, AnalysisResult } from '@/lib/storage';
import Link from 'next/link';

interface ComparisonResult {
  summary: string;
  improvements: Array<{
    category: string;
    description: string;
    impact: string;
  }>;
  metrics: {
    clarityScore: number;
    specificityScore: number;
    structureScore: number;
    overallScore: number;
  };
  beforeAfterAnalysis: {
    beforeStrengths: string[];
    beforeWeaknesses: string[];
    afterStrengths: string[];
    keyChanges: string[];
  };
  recommendations: string[];
}

interface ComparePromptsFormProps {
  initialData?: {
    originalPrompt?: string;
    improvedPrompt?: string;
    context?: string;
    files?: File[];
  };
  onDataChange?: (data: any) => void;
  promptData?: Partial<PromptData>;
  existingAnalysis?: AnalysisResult;
}

export function ComparePromptsForm({ initialData, onDataChange, promptData, existingAnalysis }: ComparePromptsFormProps) {
  const [originalPrompt, setOriginalPrompt] = useState(initialData?.originalPrompt || '');
  const [improvedPrompt, setImprovedPrompt] = useState(initialData?.improvedPrompt || '');
  const [context, setContext] = useState(initialData?.context || '');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>(initialData?.files || []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(existingAnalysis ? {
    summary: existingAnalysis.summary,
    improvements: existingAnalysis.improvements,
    metrics: existingAnalysis.metrics,
    beforeAfterAnalysis: existingAnalysis.beforeAfterAnalysis,
    recommendations: existingAnalysis.recommendations
  } : null);
  const [error, setError] = useState<string | null>(null);
  const [isSavingToVersions, setIsSavingToVersions] = useState(false);
  const { prompts, analyses, versions } = useStorage();
  const { toast } = useToast();

  // Auto-populate when initial data changes
  React.useEffect(() => {
    if (initialData) {
      setOriginalPrompt(initialData.originalPrompt || '');
      setImprovedPrompt(initialData.improvedPrompt || '');
      setContext(initialData.context || '');
      setUploadedFiles(initialData.files || []);
      
      // Only auto-trigger analysis if both prompts are available AND no existing analysis
      if (initialData.originalPrompt && initialData.improvedPrompt && !existingAnalysis) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleAutoAnalysis();
        }, 100);
      }
    }
  }, [initialData]);

  // Auto-populate when existing analysis is loaded
  React.useEffect(() => {
    if (existingAnalysis && promptData) {
      setOriginalPrompt(promptData.originalPrompt || '');
      setImprovedPrompt(promptData.improvedPrompt || '');
      setContext(promptData.context || '');
    }
  }, [existingAnalysis, promptData]);

  const handleAutoAnalysis = async () => {
    if (!originalPrompt.trim() || !improvedPrompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let files = undefined;
      if (uploadedFiles.length > 0) {
        files = await prepareFilesForGemini(uploadedFiles);
      }
      
      const comparison = await comparePrompts({
        originalPrompt: originalPrompt.trim(),
        improvedPrompt: improvedPrompt.trim(),
        context: context.trim() || undefined,
        files,
      });
      setResult(comparison);
      
      // Save analysis to local storage
      // Generate a temporary promptId if none exists (for standalone analyses)
      const promptId = promptData?.id || `temp-${Date.now()}`;
      
      const analysisData: Omit<AnalysisResult, 'id' | 'timestamp'> = {
        promptId: promptId,
        summary: comparison.summary,
        improvements: comparison.improvements,
        metrics: comparison.metrics,
        beforeAfterAnalysis: comparison.beforeAfterAnalysis,
        recommendations: comparison.recommendations
      };
      analyses.saveAnalysis(analysisData);
    } catch (err) {
      setError('Failed to analyze prompts. Please try again.');
      console.error('Comparison error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalPrompt.trim() || !improvedPrompt.trim()) {
      setError('Please provide both original and improved prompts.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let files = undefined;
      if (uploadedFiles.length > 0) {
        files = await prepareFilesForGemini(uploadedFiles);
      }
      
      const comparison = await comparePrompts({
        originalPrompt: originalPrompt.trim(),
        improvedPrompt: improvedPrompt.trim(),
        context: context.trim() || undefined,
        files,
      });
      setResult(comparison);
      
      // Save analysis to local storage
      // Generate a temporary promptId if none exists (for standalone analyses)
      const promptId = promptData?.id || `temp-${Date.now()}`;
      
      const analysisData: Omit<AnalysisResult, 'id' | 'timestamp'> = {
        promptId: promptId,
        summary: comparison.summary,
        improvements: comparison.improvements,
        metrics: comparison.metrics,
        beforeAfterAnalysis: comparison.beforeAfterAnalysis,
        recommendations: comparison.recommendations
      };
      analyses.saveAnalysis(analysisData);
    } catch (err) {
      setError('Failed to analyze prompts. Please try again.');
      console.error('Comparison error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToVersionControl = async () => {
    if (!originalPrompt.trim() || !improvedPrompt.trim()) {
      setError('Please provide both original and improved prompts before saving to version control.');
      return;
    }

    setIsSavingToVersions(true);

    try {
      let groupName = `Comparison Analysis ${new Date().toLocaleDateString()}`;
      
      // Check if we should create a new version or new group
      const existingGroups = versions.promptGroups.filter(g => 
        g.versions.some(v => v.content === originalPrompt.trim())
      );
      
      if (existingGroups.length > 0) {
        // Add as new version to existing group
        const group = existingGroups[0];
        const newVersion = versions.addVersion(group.id, improvedPrompt.trim(), {
          name: `v${group.versions.length + 1}.0 (Compared)`,
          description: `Compared and analyzed version${context ? ': ' + context : ''}`,
          status: 'current', // Set as current to make it active
          createdFrom: {
            type: 'manual',
            sourceData: {
              originalPrompt: originalPrompt.trim(),
              improvedPrompt: improvedPrompt.trim(),
              context: context.trim() || undefined,
              analysis: result || undefined
            }
          }
        });
        
        if (newVersion) {
          setError(null);
          toast({
            title: 'Saved to Version Control',
            description: `Created ${newVersion.name} for "${group.name}"`,
          });
        }
      } else {
        // Create new prompt group with original version first
        const group = await versions.createPromptGroup(
          groupName,
          originalPrompt.trim(), // Original prompt as the first version
          `Original prompt before comparison analysis`
        );
        
        if (group) {
          // Now add the improved version as the second version
          const improvedVersion = versions.addVersion(group.id, improvedPrompt.trim(), {
            name: 'v2.0 (Compared)',
            description: `Compared and analyzed version${context ? ': ' + context : ''}`,
            status: 'current', // Mark this as current version
            createdFrom: {
              type: 'manual',
              sourceData: {
                originalPrompt: originalPrompt.trim(),
                improvedPrompt: improvedPrompt.trim(),
                context: context.trim() || undefined,
                analysis: result || undefined
              }
            }
          });
          
          if (improvedVersion) {
            setError(null);
            toast({
              title: 'Version Control Group Created',
              description: `Created "${group.name}" with compared version`,
            });
          }
        }
      }
    } catch (error) {
      setError('Failed to save to version control. Please try again.');
      console.error('Version control save error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save to version control. Please try again.',
      });
    } finally {
      setIsSavingToVersions(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 6) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  // Check if this is an auto-populated analysis
  const isAutoAnalysis = initialData && initialData.originalPrompt && initialData.improvedPrompt;

  return (
    <div className="space-y-6">
      {isAutoAnalysis && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              <BarChart3 className="h-5 w-5 text-blue-600" />
            )}
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              {isLoading ? 'Analyzing Prompt...' : 'Auto-Generated Analysis'}
            </h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {isLoading 
              ? 'Please wait while we analyze your prompt changes and improvements...'
              : 'This analysis was automatically generated from your previous prompt generation/improvement. The form below is pre-populated with your data for further customization.'
            }
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="original-prompt">Original Prompt</Label>
          <Textarea
            id="original-prompt"
            placeholder="Paste your original prompt here..."
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            className="min-h-[120px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="improved-prompt">Improved Prompt</Label>
          <Textarea
            id="improved-prompt"
            placeholder="Paste your improved prompt here..."
            value={improvedPrompt}
            onChange={(e) => setImprovedPrompt(e.target.value)}
            className="min-h-[120px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="context">Context (Optional)</Label>
          <Input
            id="context"
            placeholder="e.g., Marketing email, Technical documentation, Creative writing..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Upload Files (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload Excel files, PDFs, or images to provide additional context for comparison analysis.
            </p>
            <FileUpload
              onFilesChange={(files) => setUploadedFiles(files.map(f => f.file))}
              maxFiles={5}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading} className="btn-responsive">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Prompts...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Compare & Analyze
            </>
          )}
        </Button>
      </form>

      {result && (
        <div className="space-y-6">
          {/* Diff Checker Component */}
          <DiffChecker 
            originalText={originalPrompt}
            improvedText={improvedPrompt}
            title="Prompt Comparison"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Analysis Summary
              </CardTitle>
              <CardDescription>{result.summary}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${getScoreBgColor(result.metrics.clarityScore)}`}>
                  <div className="text-sm font-medium text-muted-foreground">Clarity</div>
                  <div className={`text-2xl font-bold ${getScoreColor(result.metrics.clarityScore)}`}>
                    {result.metrics.clarityScore}/10
                  </div>
                  <Progress value={result.metrics.clarityScore * 10} className="mt-2" />
                </div>
                <div className={`p-4 rounded-lg ${getScoreBgColor(result.metrics.specificityScore)}`}>
                  <div className="text-sm font-medium text-muted-foreground">Specificity</div>
                  <div className={`text-2xl font-bold ${getScoreColor(result.metrics.specificityScore)}`}>
                    {result.metrics.specificityScore}/10
                  </div>
                  <Progress value={result.metrics.specificityScore * 10} className="mt-2" />
                </div>
                <div className={`p-4 rounded-lg ${getScoreBgColor(result.metrics.structureScore)}`}>
                  <div className="text-sm font-medium text-muted-foreground">Structure</div>
                  <div className={`text-2xl font-bold ${getScoreColor(result.metrics.structureScore)}`}>
                    {result.metrics.structureScore}/10
                  </div>
                  <Progress value={result.metrics.structureScore * 10} className="mt-2" />
                </div>
                <div className={`p-4 rounded-lg ${getScoreBgColor(result.metrics.overallScore)}`}>
                  <div className="text-sm font-medium text-muted-foreground">Overall</div>
                  <div className={`text-2xl font-bold ${getScoreColor(result.metrics.overallScore)}`}>
                    {result.metrics.overallScore}/10
                  </div>
                  <Progress value={result.metrics.overallScore * 10} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Before Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {result.beforeAfterAnalysis.beforeStrengths.map((strength, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Weaknesses</h4>
                  <ul className="space-y-1">
                    {result.beforeAfterAnalysis.beforeWeaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {weakness}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">After Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-600 mb-2">New Strengths</h4>
                  <ul className="space-y-1">
                    {result.beforeAfterAnalysis.afterStrengths.map((strength, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-600 mb-2">Key Changes</h4>
                  <ul className="space-y-1">
                    {result.beforeAfterAnalysis.keyChanges.map((change, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {change}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Detailed Improvements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.improvements.map((improvement, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{improvement.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{improvement.description}</p>
                    <p className="text-sm font-medium text-green-600">Impact: {improvement.impact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Additional Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span className="text-sm text-muted-foreground">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Launch Playground Section */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Test Your Improved Prompt
              </CardTitle>
              <CardDescription>
                Launch the testing playground to interact with your improved prompt and see how it performs in real-time conversations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-medium mb-2">System Prompt Preview:</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {improvedPrompt}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    href={`/playground?prompt=${encodeURIComponent(improvedPrompt)}&model=gemini-1.5-flash&temperature=0.7`}
                    className="flex-1"
                  >
                    <Button className="w-full gap-2">
                      <Play className="h-4 w-4" />
                      Launch Playground
                    </Button>
                  </Link>
                  
                  <Button 
                    type="button" 
                    onClick={handleSaveToVersionControl}
                    disabled={isSavingToVersions}
                    className="gap-2 border border-primary"
                  >
                    {isSavingToVersions ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                    {isSavingToVersions ? 'Saving...' : 'Save to Versions'}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  💡 <strong>Pro tip:</strong> Test different types of questions to see how well your prompt handles various scenarios and edge cases.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}