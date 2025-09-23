'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  estimatePromptTokensAndCost, 
  formatCost, 
  formatTokenCount, 
  modelPricing 
} from '@/lib/token-estimator';
import { Coins, FileText, ArrowRight, MessageSquare, User } from 'lucide-react';

interface TokenEstimatorProps {
  prompt: string;
  userContext?: string;
  models: string[];
}

export function TokenEstimator({ prompt, userContext = '', models }: TokenEstimatorProps) {
  const [estimates, setEstimates] = useState<Record<string, {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  }>>({});

  // Update estimates when inputs change
  useEffect(() => {
    const newEstimates: Record<string, any> = {};
    
    models.forEach(model => {
      // Different estimated output lengths for different model types
      let estimatedOutputLength = 800;
      
      if (model.includes('gemini-1.5')) {
        estimatedOutputLength = 1000; // Gemini 1.5 models tend to be more verbose
      } else if (model.includes('claude')) {
        estimatedOutputLength = 1200; // Claude models are often quite verbose
      }
      
      newEstimates[model] = estimatePromptTokensAndCost(
        prompt,
        userContext,
        model,
        estimatedOutputLength
      );
    });
    
    setEstimates(newEstimates);
  }, [prompt, userContext, models]);

  if (Object.keys(estimates).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Coins size={16} />
        Token Usage & Cost Estimates
      </h3>
      
      <div className="flex items-center gap-2 text-xs border-b pb-2 mb-2">
        <span className="flex items-center gap-1">
          <User size={14} className="text-muted-foreground" />
          <span className="font-medium">Base Prompt + Context:</span> {formatTokenCount(prompt.length > 0 || userContext.length > 0 ? estimates[models[0]]?.inputTokens || 0 : 0)} tokens
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="flex items-center gap-1">
          <MessageSquare size={14} className="text-muted-foreground" />
          <span className="font-medium">Response:</span> Estimates below
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {models.map(model => {
          const estimate = estimates[model] || {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0
          };
          
          const modelInfo = modelPricing[model as keyof typeof modelPricing] || {
            description: 'External model'
          };
          
          const modelName = model.split('/')[1] || model;
          
          return (
            <Card key={model} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{modelName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {formatCost(estimate.totalCost)}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {modelInfo.description}
                </div>
                
                <div className="grid grid-cols-3 gap-1 pt-2">
                  <div className="text-center p-1 bg-muted/30 rounded-md">
                    <div className="flex items-center justify-center text-xs mb-1 gap-1">
                      <User size={12} />
                      Input
                    </div>
                    <div className="font-mono text-xs">
                      {formatTokenCount(estimate.inputTokens)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatCost(estimate.inputCost)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </div>
                  
                  <div className="text-center p-1 bg-muted/30 rounded-md">
                    <div className="flex items-center justify-center text-xs mb-1 gap-1">
                      <MessageSquare size={12} />
                      Response
                    </div>
                    <div className="font-mono text-xs">
                      {formatTokenCount(estimate.outputTokens)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatCost(estimate.outputCost)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Estimates update in real-time as you type, similar to a live chatbot interaction. Actual usage may vary.
      </p>
    </div>
  );
}