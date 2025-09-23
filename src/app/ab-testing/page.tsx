'use client';

import { useState } from 'react';
import { ABTestingForm } from '@/components/ab-testing-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function ABTestingPage() {
  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-1 pl-0 hover:bg-transparent hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-bold">Gemini Testing Suite</h1>
            <img src="/gemini-color.svg" alt="Gemini" className="w-8 h-8" />
          </div>
          <p className="text-muted-foreground mt-2">
            Generate variations of your prompts with Gemini models or compare across the Gemini model family.
          </p>
        </div>
        <Link href="/docs/ab-testing" className="hidden md:flex">
          <Button variant="outline" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Gemini Testing Guide
          </Button>
        </Link>
      </div>
      
      <div className="p-6 rounded-lg border">
        <ABTestingForm />
      </div>
    </div>
  );
}