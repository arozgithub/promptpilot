'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Split, FileText, Copy } from 'lucide-react';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

interface DiffCheckerProps {
  originalText: string;
  improvedText: string;
  title?: string;
}

export function DiffChecker({ originalText, improvedText, title = "Text Comparison" }: DiffCheckerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  
  // Ultra-fast manual diff algorithm - optimized for speed (< 7 seconds)
  const generateDiff = (original: string, improved: string): DiffLine[] => {
    const startTime = performance.now();
    
    // Skip complex processing for extremely large texts
    if (original.length > 50000 || improved.length > 50000) {
      console.log('⚡ Large text detected - using simplified diff');
      const endTime = performance.now();
      console.log(`⚡ Ultra-fast diff: ${(endTime - startTime).toFixed(2)}ms`);
      return [
        { type: 'removed', content: 'Large text detected - showing simplified comparison' },
        { type: 'added', content: 'Large text detected - showing simplified comparison' }
      ];
    }
    
    const originalLines = original.split('\n');
    const improvedLines = improved.split('\n');
    const diff: DiffLine[] = [];
    
    const maxLines = Math.max(originalLines.length, improvedLines.length);
    
    // Ultra-fast O(n) algorithm - no complex operations
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i];
      const improvedLine = improvedLines[i];
      
      if (originalLine === undefined) {
        diff.push({ type: 'added', content: improvedLine });
      } else if (improvedLine === undefined) {
        diff.push({ type: 'removed', content: originalLine });
      } else if (originalLine === improvedLine) {
        diff.push({ type: 'unchanged', content: originalLine });
      } else {
        diff.push({ type: 'removed', content: originalLine });
        diff.push({ type: 'added', content: improvedLine });
      }
    }
    
    const endTime = performance.now();
    console.log(`⚡ Ultra-fast diff: ${(endTime - startTime).toFixed(2)}ms`);
    
    return diff;
  };

  // Lightning-fast simple diff - character level comparison with early exit
  const getSimpleDiff = (original: string, improved: string) => {
    const startTime = performance.now();
    
    // For very large texts, use line-by-line comparison instead
    if (original.length > 10000 || improved.length > 10000) {
      const originalLines = original.split('\n');
      const improvedLines = improved.split('\n');
      const maxLines = Math.max(originalLines.length, improvedLines.length);
      const result = [];
      
      for (let i = 0; i < maxLines; i++) {
        const origLine = originalLines[i] || '';
        const impLine = improvedLines[i] || '';
        
        if (origLine === impLine) {
          result.push({ text: origLine + '\n', changed: false });
        } else {
          result.push({ text: impLine + '\n', changed: true });
        }
      }
      
      const endTime = performance.now();
      console.log(`⚡ Lightning-fast line diff: ${(endTime - startTime).toFixed(2)}ms`);
      return result;
    }
    
    // For smaller texts, do character comparison
    const result = [];
    const minLength = Math.min(original.length, improved.length);
    let lastMatch = 0;
    
    for (let i = 0; i < minLength; i++) {
      if (original[i] !== improved[i]) {
        if (i > lastMatch) {
          result.push({ text: improved.substring(lastMatch, i), changed: false });
        }
        // Find next matching character or end
        let nextMatch = i;
        while (nextMatch < minLength && original[nextMatch] !== improved[nextMatch]) {
          nextMatch++;
        }
        result.push({ text: improved.substring(i, nextMatch), changed: true });
        lastMatch = nextMatch;
        i = nextMatch - 1; // -1 because loop will increment
      }
    }
    
    // Add remaining text
    if (lastMatch < improved.length) {
      result.push({ text: improved.substring(lastMatch), changed: improved.length > original.length });
    }
    
    const endTime = performance.now();
    console.log(`⚡ Lightning-fast char diff: ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  };


  const diff = generateDiff(originalText, improvedText);

  // Create separate arrays for left and right sides
  const leftSide = diff.map((line, index) => ({
    ...line,
    index,
    show: line.type === 'removed' || line.type === 'unchanged'
  }));

  const rightSide = diff.map((line, index) => ({
    ...line,
    index,
    show: line.type === 'added' || line.type === 'unchanged'
  }));

  const renderDiffLine = (line: DiffLine, index: number, showLineNumbers = false) => {
    const baseClasses = "px-2 py-1 text-sm";
    const lineNumber = showLineNumbers ? `${index + 1}`.padStart(3, ' ') : '';
    
    switch (line.type) {
      case 'unchanged':
        return (
          <span key={index} className={`${baseClasses} text-foreground`}>
            {showLineNumbers && <span className="text-muted-foreground mr-2 select-none">{lineNumber}</span>}
            {line.content}
          </span>
        );
      case 'added':
        return (
          <span key={index} className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium`}>
            {showLineNumbers && <span className="text-green-600 mr-2 select-none">{lineNumber}</span>}
            {line.content}
          </span>
        );
      case 'removed':
        return (
          <span key={index} className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 font-medium`}>
            {showLineNumbers && <span className="text-red-600 mr-2 select-none">{lineNumber}</span>}
            {line.content}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded"></div>
                <span className="text-green-800 dark:text-green-200">Added/Improved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 rounded"></div>
                <span className="text-red-800 dark:text-red-200">Removed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Unchanged</span>
              </div>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
                className="flex items-center gap-2"
              >
                <Split className="h-4 w-4" />
                Side by Side
              </Button>
              <Button
                variant={viewMode === 'unified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('unified')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Unified
              </Button>
            </div>
          </div>

          {/* Conditional rendering based on view mode */}
          {viewMode === 'side-by-side' ? (
            /* Side by side comparison */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Original Text
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(originalText)}
                    className="h-6 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-4 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10 min-h-[300px] font-mono">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {originalText}
                  </div>
                </div>
              </div>

              {/* Improved Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Improved Text
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(improvedText)}
                    className="h-6 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-4 border-2 border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/10 min-h-[300px] font-mono">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {(() => {
                      const startTime = performance.now();
                      
                      // Check for extremely large texts and use fallback
                      if (originalText.length > 100000 || improvedText.length > 100000) {
                        const endTime = performance.now();
                        console.log(`⚡ Large text fallback: ${(endTime - startTime).toFixed(2)}ms`);
                        
                        return (
                          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded">
                            <p className="font-medium">⚡ Large Text Detected</p>
                            <p className="text-sm mt-2">Text is too large for detailed comparison. Showing simplified view:</p>
                            <div className="mt-4 p-2 bg-red-100 dark:bg-red-900/20 rounded">
                              <span className="text-red-800 dark:text-red-200 font-medium">Different content detected</span>
                            </div>
                          </div>
                        );
                      }
                      
                      // Ultra-fast rendering for normal-sized texts
                      const simpleDiff = getSimpleDiff(originalText, improvedText);
                      
                      const result = (
                        <div>
                          {simpleDiff.map((chunk, index) => (
                            <span 
                              key={index} 
                              className={
                                chunk.changed 
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 font-medium' 
                                  : ''
                              }
                            >
                              {chunk.text}
                            </span>
                          ))}
                        </div>
                      );
                      
                      const endTime = performance.now();
                      console.log(`⚡ Ultra-fast rendering: ${(endTime - startTime).toFixed(2)}ms`);
                      
                      return result;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Unified diff view */
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Unified View
              </h4>
              <div className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/10 min-h-[300px] font-mono">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {diff.map((line, index) => renderDiffLine(line, index, true))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
