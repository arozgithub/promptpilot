'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { usePrompts } from '@/hooks/use-storage';
import { useAnalyses } from '@/hooks/use-storage';
import { usePreferences } from '@/hooks/use-storage';
import { useFavorites } from '@/hooks/use-storage';
import { 
  versionStorage,
  type PromptGroup,
  type PromptVersion
} from '@/lib/storage';
import { supabasePromptService } from '@/lib/supabase-prompt-service';
import { useStorageManager } from '@/hooks/use-storage';
import { usePromptVersions } from '@/hooks/use-storage';

interface StorageContextType {
  prompts: ReturnType<typeof usePrompts>;
  analyses: ReturnType<typeof useAnalyses>;
  preferences: ReturnType<typeof usePreferences>;
  favorites: ReturnType<typeof useFavorites>;
  storageManager: ReturnType<typeof useStorageManager>;
  versions: ReturnType<typeof usePromptVersions>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

interface StorageProviderProps {
  children: ReactNode;
}

export function StorageProvider({ children }: StorageProviderProps) {
  const prompts = usePrompts();
  const analyses = useAnalyses();
  const preferences = usePreferences();
  const favorites = useFavorites();
  const storageManager = useStorageManager();
  const versions = usePromptVersions();

  const value: StorageContextType = {
    prompts,
    analyses,
    preferences,
    favorites,
    storageManager,
    versions,
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
