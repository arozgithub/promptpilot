
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneratePromptForm } from './generate-prompt-form';
import { ImprovePromptForm } from './improve-prompt-form';
import { ComparePromptsForm } from './compare-prompts-form';
import { RewritePromptForm } from './rewrite-prompt-form';
import { EvaluatePromptForm } from './evaluate-prompt-form';
import { HistoryTab } from './history-tab';
import { PenSquare, Wand2, BarChart3, History, RefreshCw, Search } from 'lucide-react';
import { PromptData, AnalysisResult } from '@/lib/storage';
import { useStorage } from '@/contexts/storage-context';

interface LocalPromptData {
  originalPrompt?: string;
  improvedPrompt?: string;
  context?: string;
  files?: File[];
}

interface PromptPilotProps {
  onClearSelectedPrompt?: () => void;
}

export function PromptPilot({ onClearSelectedPrompt }: PromptPilotProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const [promptData, setPromptData] = useState<LocalPromptData>({});
  const [loadedPromptData, setLoadedPromptData] = useState<Partial<PromptData> | null>(null);
  const [loadedAnalysis, setLoadedAnalysis] = useState<AnalysisResult | null>(null);
  const { prompts } = useStorage();

  const handlePromptGenerated = (prompt: string, context?: string, files?: File[]) => {
    setPromptData({
      originalPrompt: prompt,
      improvedPrompt: prompt,
      context,
      files
    });
  };

  const handlePromptImproved = (originalPrompt: string, improvedPrompt: string, context?: string, files?: File[]) => {
    setPromptData({
      originalPrompt,
      improvedPrompt,
      context,
      files
    });
  };

  const handlePromptRewritten = (originalQuestion: string, standaloneQuestion: string, chatHistory?: string) => {
    setPromptData({
      originalPrompt: originalQuestion,
      improvedPrompt: standaloneQuestion,
      context: chatHistory,
      files: []
    });
  };

  const handlePromptEvaluated = (originalPrompt: string, correctedPrompt: string, analysis: string, chatbotType: string, files?: File[]) => {
    setPromptData({
      originalPrompt,
      improvedPrompt: correctedPrompt,
      context: analysis,
      files: files || []
    });
  };

  const handleAnalyzeClick = () => {
    setActiveTab('compare');
  };

  const handleLoadPrompt = (promptData: PromptData) => {
    setLoadedPromptData(promptData);
    
    // Determine which tab to switch to based on prompt type
    if (promptData.type === 'generated') {
      setActiveTab('generate');
    } else if (promptData.type === 'improved') {
      setActiveTab('improve');
    } else if (promptData.type === 'rewritten') {
      setActiveTab('rewrite');
    } else if (promptData.type === 'evaluated') {
      setActiveTab('evaluate');
    } else {
      setActiveTab('compare');
    }
  };

  const handleLoadAnalysis = (analysisData: AnalysisResult) => {
    // Store the loaded analysis
    setLoadedAnalysis(analysisData);
    
    // Find the associated prompt data using the promptId
    const associatedPrompt = prompts.prompts.find(p => p.id === analysisData.promptId);
    
    if (associatedPrompt) {
      // Set the loaded prompt data with the original and improved prompts
      setLoadedPromptData({
        id: associatedPrompt.id,
        originalPrompt: associatedPrompt.originalPrompt,
        improvedPrompt: associatedPrompt.improvedPrompt,
        context: associatedPrompt.context,
        type: associatedPrompt.type,
        timestamp: associatedPrompt.timestamp
      });
      
      // Set the current prompt data for the form
      setPromptData({
        originalPrompt: associatedPrompt.originalPrompt || '',
        improvedPrompt: associatedPrompt.improvedPrompt || '',
        context: associatedPrompt.context || '',
        files: []
      });
    } else {
      // If no associated prompt found, just set the analysis data
      setLoadedPromptData({
        id: analysisData.id,
        originalPrompt: '',
        improvedPrompt: '',
        context: analysisData.summary,
        type: 'analyzed',
        timestamp: analysisData.timestamp
      });
    }
    
    setActiveTab('compare');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Clear selected prompt and generated prompt when switching to generate tab
    if (value === 'generate') {
      setPromptData({});
      setLoadedPromptData(null);
      onClearSelectedPrompt?.();
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg rounded-lg p-1">
          <TabsTrigger 
            value="generate" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-md"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Generate New
          </TabsTrigger>
          <TabsTrigger 
            value="improve" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-md"
          >
            <PenSquare className="mr-2 h-4 w-4" />
            Improve Existing
          </TabsTrigger>
          <TabsTrigger 
            value="compare" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-md"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Compare & Analyze
          </TabsTrigger>
          <TabsTrigger 
            value="rewrite" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Rewrite
          </TabsTrigger>
          <TabsTrigger 
            value="evaluate" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-md"
          >
            <Search className="mr-2 h-4 w-4" />
            Evaluate
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-md"
          >
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate" className="mt-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
            <GeneratePromptForm 
              onPromptGenerated={handlePromptGenerated}
              onAnalyzeClick={handleAnalyzeClick}
              hasGeneratedPrompt={!!promptData.improvedPrompt}
              initialData={loadedPromptData ?? undefined}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="improve" className="mt-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
            <ImprovePromptForm 
              onPromptImproved={handlePromptImproved}
              onAnalyzeClick={handleAnalyzeClick}
              hasImprovedPrompt={!!promptData.improvedPrompt}
              initialData={loadedPromptData ?? undefined}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="compare" className="mt-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
            <ComparePromptsForm 
              initialData={promptData}
              onDataChange={setPromptData}
              promptData={loadedPromptData ?? undefined}
              existingAnalysis={loadedAnalysis ?? undefined}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="rewrite" className="mt-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
            <RewritePromptForm 
              onPromptRewritten={handlePromptRewritten}
              onAnalyzeClick={handleAnalyzeClick}
              hasRewrittenPrompt={!!promptData.improvedPrompt}
              initialData={loadedPromptData ?? undefined}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="evaluate" className="mt-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
            <EvaluatePromptForm 
              onPromptEvaluated={handlePromptEvaluated}
              onAnalyzeClick={handleAnalyzeClick}
              hasEvaluatedPrompt={!!promptData.improvedPrompt}
              initialData={loadedPromptData ?? undefined}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
            <HistoryTab 
              onLoadPrompt={handleLoadPrompt}
              onLoadAnalysis={handleLoadAnalysis}
            />
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
