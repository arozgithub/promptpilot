/**
 * Persistent storage utilities for PromptPilot
 * Handles different data types with appropriate storage mechanisms
 * Now includes Supabase integration for cloud storage
 */

import { supabasePromptService } from './supabase-prompt-service';

// Helper function to check if Supabase is configured
function isSupabaseConfigured(): boolean {
  // In client-side Next.js, environment variables are available at build time
  // but we need to access them properly
  const url = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL 
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
  console.log('🔍 Checking Supabase configuration:', { 
    hasUrl: !!url, 
    hasKey: !!key,
    url: url ? `${url.substring(0, 20)}...` : 'undefined',
    isClient: typeof window !== 'undefined'
  });
  return !!(url && key);
}

// Types for different storage needs
export interface PromptData {
  id: string;
  originalPrompt?: string;
  improvedPrompt?: string;
  context?: string;
  files?: FileData[];
  timestamp: number;
  type: 'generated' | 'improved' | 'analyzed' | 'rewritten' | 'evaluated';
}

// New types for version management
export interface PromptVersion {
  id: string;
  promptId: string; // Reference to the base prompt
  version: number;
  name: string; // User-friendly name for this version
  content: string; // The actual prompt content
  description?: string; // Description of what changed
  status: 'draft' | 'current' | 'production'; // Version status
  parentVersionId?: string; // For branching versions
  metadata?: {
    author?: string;
    tags?: string[];
    performance?: {
      testResults?: any[];
      metrics?: Record<string, number>;
    };
  };
  timestamp: number;
  createdFrom?: {
    type: 'manual' | 'improved' | 'generated' | 'rewritten';
    sourceData?: any;
  };
}

export interface PromptGroup {
  id: string;
  name: string;
  description?: string;
  currentVersionId: string;
  productionVersionId?: string;
  versions: PromptVersion[];
  tags?: string[];
  timestamp: number;
  lastModified: number;
  supabase_id?: string; // For cloud sync
  templates?: string[]; // For template support
  _syncedVersionIds?: Set<string> | string[]; // To track which versions have been synced to Supabase - can be serialized as array
}

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // base64
  size: number;
}

export interface AnalysisResult {
  id: string;
  promptId: string;
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
  timestamp: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  autoAnalyze: boolean;
  maxFileSize: number;
  maxHistoryItems: number;
}

// Storage keys
const STORAGE_KEYS = {
  PROMPTS: 'promptpilot_prompts',
  PROMPT_GROUPS: 'promptpilot_prompt_groups', // New storage for version groups
  ANALYSES: 'promptpilot_analyses',
  PREFERENCES: 'promptpilot_preferences',
  RECENT_PROMPTS: 'promptpilot_recent',
  FAVORITES: 'promptpilot_favorites',
} as const;

// Utility functions
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// LocalStorage utilities
export const localStorage = {
  // Generic methods
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      // Special handling for prompt groups to handle Set serialization
      if (key === STORAGE_KEYS.PROMPT_GROUPS) {
        const groups = value as unknown as PromptGroup[];
        // Convert Set to Array for serialization
        const serializable = groups.map(group => {
          if (group._syncedVersionIds instanceof Set) {
            return {
              ...group,
              _syncedVersionIds: Array.from(group._syncedVersionIds)
            };
          }
          return group;
        });
        window.localStorage.setItem(key, JSON.stringify(serializable));
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  },

  clear(): boolean {
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  // Size management
  getSize(): number {
    let total = 0;
    for (const key in window.localStorage) {
      if (window.localStorage.hasOwnProperty(key)) {
        total += window.localStorage[key].length + key.length;
      }
    }
    return total;
  },

  // Check if we're approaching storage limits
  isNearLimit(): boolean {
    const size = this.getSize();
    const limit = 5 * 1024 * 1024; // 5MB
    return size > limit * 0.8; // 80% of limit
  }
};

// Prompt storage
export const promptStorage = {
  // Save a new prompt
  save(prompt: Omit<PromptData, 'id' | 'timestamp'>): string {
    const id = generateId();
    const promptData: PromptData = {
      ...prompt,
      id,
      timestamp: Date.now(),
    };

    // Save to main storage
    const prompts = this.getAll();
    prompts.push(promptData);
    localStorage.set(STORAGE_KEYS.PROMPTS, prompts);

    // Update recent prompts (keep last 10)
    this.updateRecent(promptData);

    return id;
  },

  // Get all prompts
  getAll(): PromptData[] {
    return localStorage.get(STORAGE_KEYS.PROMPTS, []);
  },

  // Get recent prompts
  getRecent(limit: number = 10): PromptData[] {
    return localStorage.get(STORAGE_KEYS.RECENT_PROMPTS, []).slice(0, limit);
  },

  // Update recent prompts list
  updateRecent(prompt: PromptData): void {
    const recent = this.getRecent(20); // Keep more in recent
    const filtered = recent.filter(p => p.id !== prompt.id);
    const updated = [prompt, ...filtered].slice(0, 10);
    localStorage.set(STORAGE_KEYS.RECENT_PROMPTS, updated);
  },

  // Get prompt by ID
  getById(id: string): PromptData | null {
    const prompts = this.getAll();
    return prompts.find(p => p.id === id) || null;
  },

  // Delete prompt
  delete(id: string): boolean {
    const prompts = this.getAll();
    const filtered = prompts.filter(p => p.id !== id);
    localStorage.set(STORAGE_KEYS.PROMPTS, filtered);
    
    // Also remove from recent
    const recent = this.getRecent(20);
    const recentFiltered = recent.filter(p => p.id !== id);
    localStorage.set(STORAGE_KEYS.RECENT_PROMPTS, recentFiltered);
    
    return true;
  },

  // Search prompts
  search(query: string): PromptData[] {
    const prompts = this.getAll();
    const lowercaseQuery = query.toLowerCase();
    return prompts.filter(p => 
      p.originalPrompt?.toLowerCase().includes(lowercaseQuery) ||
      p.improvedPrompt?.toLowerCase().includes(lowercaseQuery) ||
      p.context?.toLowerCase().includes(lowercaseQuery)
    );
  }
};

// Version management storage
export const versionStorage = {
  // Check if Supabase is configured
  isSupabaseConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // Create a new prompt group with first version
  async createPromptGroup(name: string, content: string, description?: string): Promise<PromptGroup> {
    console.log('🚀 createPromptGroup called:', { name, content: content.substring(0, 50), description });
    try {
      if (isSupabaseConfigured()) {
        console.log('✅ Supabase is configured, creating group...');
        const group = await supabasePromptService.createGroup(name, content, description);
        if (group) {
          console.log('✅ Successfully created group in Supabase:', group);
          // Immediately add to localStorage for instant UI update
          const groups: PromptGroup[] = localStorage.get(STORAGE_KEYS.PROMPT_GROUPS, []);
          groups.unshift(group); // Add to beginning
          localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
          console.log('💾 Added group to localStorage for immediate UI update');
          
          // Trigger a full refresh from Supabase to ensure consistency
          setTimeout(() => {
            console.log('🔄 Triggering background sync for consistency...');
            this.syncFromSupabase();
          }, 100);
          
          return group;
        }
        console.warn('⚠️ Supabase returned null, falling back to localStorage');
      } else {
        console.log('❌ Supabase not configured, using localStorage');
      }
    } catch (error) {
      console.error('❌ Supabase error, falling back to localStorage:', error);
    }

    // Fallback to localStorage implementation
    const groupId = generateId();
    const versionId = generateId();
    
    const firstVersion: PromptVersion = {
      id: versionId,
      promptId: groupId,
      version: 1,
      name: 'v1.0',
      content,
      description: description || 'Initial version',
      status: 'current',
      timestamp: Date.now(),
      createdFrom: { type: 'manual' }
    };

    const group: PromptGroup = {
      id: groupId,
      name,
      description,
      currentVersionId: versionId,
      versions: [firstVersion],
      timestamp: Date.now(),
      lastModified: Date.now()
    };

    const groups = this.getAllGroups();
    groups.push(group);
    localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);

    // Sync to Supabase in background
    this.syncToSupabase(groups);

    return group;
  },

  // Add new version to existing prompt group
  addVersion(
    groupId: string, 
    content: string, 
    options: {
      name?: string;
      description?: string;
      status?: 'draft' | 'current';
      createdFrom?: PromptVersion['createdFrom'];
      parentVersionId?: string;
    } = {}
  ): PromptVersion | null {
    const groups = this.getAllGroups();
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) return null;

    const group = groups[groupIndex];
    const nextVersionNumber = Math.max(...group.versions.map(v => v.version)) + 1;
    const versionId = generateId();

    const newVersion: PromptVersion = {
      id: versionId,
      promptId: groupId,
      version: nextVersionNumber,
      name: options.name || `v${nextVersionNumber}.0`,
      content,
      description: options.description,
      status: options.status || 'draft',
      parentVersionId: options.parentVersionId,
      timestamp: Date.now(),
      createdFrom: options.createdFrom || { type: 'manual' }
    };

    // If this is being set as current, update the previous current to draft
    if (newVersion.status === 'current') {
      group.versions.forEach(v => {
        if (v.status === 'current') v.status = 'draft';
      });
      group.currentVersionId = versionId;
    }

    group.versions.push(newVersion);
    group.lastModified = Date.now();
    
    groups[groupIndex] = group;
    localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);

    // Sync to Supabase in background
    this.syncToSupabase(groups);

    return newVersion;
  },

  // Get all prompt groups
  getAllGroups(): PromptGroup[] {
    console.log('📋 getAllGroups called');
    // Sync from Supabase in background
    this.syncFromSupabase();
    const groups = localStorage.get(STORAGE_KEYS.PROMPT_GROUPS, []);
    
    // Ensure _syncedVersionIds is properly restored as a Set
    (groups as Array<PromptGroup & {_syncedVersionIds?: Set<string> | string[]}> ).forEach(group => {
      if (group._syncedVersionIds && Array.isArray(group._syncedVersionIds)) {
        group._syncedVersionIds = new Set(group._syncedVersionIds);
      } else if (!group._syncedVersionIds) {
        group._syncedVersionIds = new Set<string>();
      }
    });
    
    console.log('📋 Returning', groups.length, 'groups from localStorage');
    return groups;
  },

  // Background sync from Supabase (non-blocking)
  syncFromSupabase(): void {
    console.log('🔄 syncFromSupabase called');
    if (isSupabaseConfigured()) {
      console.log('✅ Supabase is configured, attempting to sync...');
      supabasePromptService.getAllGroups()
        .then(groups => {
          console.log('✅ Synced from Supabase:', groups.length, 'groups');
          localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
          // Dispatch custom event to notify components
          window.dispatchEvent(new CustomEvent('promptGroupsUpdated', { detail: groups }));
        })
        .catch(error => {
          console.warn('❌ Background sync from Supabase failed:', error);
        });
    } else {
      console.log('❌ Supabase not configured, skipping sync');
    }
  },

  // Background sync to Supabase (non-blocking)
  syncToSupabase(groups: PromptGroup[]): void {
    if (isSupabaseConfigured()) {
      console.log('🔄 syncToSupabase called, checking groups and versions...');
      // Find groups that need to be synced
      groups.forEach(group => {
        // Case 1: New group that needs to be created in Supabase
        if (!group.supabase_id && group.versions.length > 0) {
          console.log(`📥 Creating new group "${group.name}" in Supabase...`);
          // Create new group in Supabase with first version content
          const firstVersion = group.versions[0];
          supabasePromptService.createGroup(group.name, firstVersion.content, group.description)
            .then(supabaseGroup => {
              if (supabaseGroup) {
                console.log('✅ Created group in Supabase:', supabaseGroup.id);
                // Update local storage with Supabase ID
                group.supabase_id = supabaseGroup.id;
                localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
                
                // If there are more versions (beyond the first), add them as well
                if (group.versions.length > 1) {
                  const additionalVersions = group.versions.slice(1);
                  console.log(`📥 Adding ${additionalVersions.length} additional versions for group ${supabaseGroup.id}`);
                  
                  // Process each additional version
                  additionalVersions.forEach(version => {
                    supabasePromptService.addVersion(
                      supabaseGroup.id, 
                      version.name, 
                      version.content
                    ).then(result => {
                      if (result) {
                        console.log(`✅ Added version ${version.name} to Supabase`);
                        // Update version status if needed
                        if (version.status === 'current' || version.status === 'production') {
                          supabasePromptService.setVersionStatus(result.id, version.status);
                        }
                      }
                    });
                  });
                }
              }
            })
            .catch(error => {
              console.warn('❌ Failed to create group in Supabase:', error);
            });
        } 
        // Case 2: Existing group with new versions to sync
        else if (group.supabase_id) {
          // Get versions that might need syncing (filter out ones we know exist in Supabase)
          // This is a simple approach - ideally we'd maintain a list of synced version IDs
          console.log(`🔍 Checking for new versions in group "${group.name}" (${group.supabase_id})`);
          
          // We'll track which versions we've already tried to sync to avoid duplicates
          if (!group._syncedVersionIds) {
            group._syncedVersionIds = new Set<string>();
          }
          
          // Find versions that haven't been synced yet
          console.log(`🔍 Group "${group.name}" has ${group.versions.length} versions, checking which need sync...`);
          console.log(`🔍 _syncedVersionIds:`, group._syncedVersionIds instanceof Set 
            ? Array.from(group._syncedVersionIds) 
            : group._syncedVersionIds);
            
          group.versions.forEach(version => {
            // Skip versions we've already attempted to sync
            if (group._syncedVersionIds && 
                ((group._syncedVersionIds instanceof Set && group._syncedVersionIds.has(version.id)) ||
                (Array.isArray(group._syncedVersionIds) && group._syncedVersionIds.includes(version.id)))) {
              console.log(`⏩ Skipping version ${version.name} (${version.id}) - already synced`);
              return;
            }
            
            console.log(`📥 Adding version ${version.name} to existing group ${group.supabase_id}`);
            supabasePromptService.addVersion(
              group.supabase_id!, 
              version.name, 
              version.content
            ).then(result => {
              if (result) {
                console.log(`✅ Added version ${version.name} to Supabase`);
                // Mark version as synced
                if (!group._syncedVersionIds) {
                  group._syncedVersionIds = new Set<string>();
                } else if (Array.isArray(group._syncedVersionIds)) {
                  group._syncedVersionIds = new Set(group._syncedVersionIds);
                }
                
                // Now we know it's a Set
                (group._syncedVersionIds as Set<string>).add(version.id);
                
                // Save the updated tracking info to localStorage
                localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
                
                // Update version status if needed
                if (version.status === 'current' || version.status === 'production') {
                  supabasePromptService.setVersionStatus(result.id, version.status);
                }
              }
            }).catch(error => {
              console.warn(`❌ Failed to add version ${version.name} to Supabase:`, error);
            });
          });
        }
      });
    }
  },

  // Get prompt group by ID
  getGroupById(groupId: string): PromptGroup | null {
    const groups = this.getAllGroups();
    return groups.find(g => g.id === groupId) || null;
  },

  // Get version by ID
  getVersionById(versionId: string): PromptVersion | null {
    const groups = this.getAllGroups();
    for (const group of groups) {
      const version = group.versions.find(v => v.id === versionId);
      if (version) return version;
    }
    return null;
  },

  // Get all versions for a prompt group
  getVersionsForGroup(groupId: string): PromptVersion[] {
    const group = this.getGroupById(groupId);
    return group ? group.versions.sort((a, b) => b.version - a.version) : [];
  },

  // Set version status
  setVersionStatus(versionId: string, status: 'draft' | 'current' | 'production'): boolean {
    const groups = this.getAllGroups();
    let updated = false;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const versionIndex = group.versions.findIndex(v => v.id === versionId);
      
      if (versionIndex !== -1) {
        // If setting as current or production, clear that status from other versions in the group
        if (status === 'current' || status === 'production') {
          group.versions.forEach((v, idx) => {
            if (idx !== versionIndex && v.status === status) {
              v.status = 'draft';
            }
          });
          
          // Update group's current/production version ID
          if (status === 'current') {
            group.currentVersionId = versionId;
          } else if (status === 'production') {
            group.productionVersionId = versionId;
          }
        }

        group.versions[versionIndex].status = status;
        group.lastModified = Date.now();
        updated = true;
        break;
      }
    }

    if (updated) {
      localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
      // Sync to Supabase in background
      this.syncToSupabase(groups);
    }
    
    return updated;
  },

  // Delete version
  deleteVersion(versionId: string): boolean {
    const groups = this.getAllGroups();
    let updated = false;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const versionIndex = group.versions.findIndex(v => v.id === versionId);
      
      if (versionIndex !== -1) {
        // Don't allow deleting if it's the only version
        if (group.versions.length === 1) {
          return false;
        }

        const versionToDelete = group.versions[versionIndex];
        
        // If deleting current version, set the latest version as current
        if (versionToDelete.status === 'current') {
          const remainingVersions = group.versions.filter((_, idx) => idx !== versionIndex);
          const latestVersion = remainingVersions.sort((a, b) => b.version - a.version)[0];
          if (latestVersion) {
            latestVersion.status = 'current';
            group.currentVersionId = latestVersion.id;
          }
        }

        // If deleting production version, clear production version ID
        if (versionToDelete.status === 'production') {
          group.productionVersionId = undefined;
        }

        group.versions.splice(versionIndex, 1);
        group.lastModified = Date.now();
        updated = true;
        break;
      }
    }

    if (updated) {
      localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
    }
    
    return updated;
  },

  // Delete entire prompt group
  async deleteGroup(groupId: string): Promise<boolean> {
    console.log('🗑️ deleteGroup called:', { groupId });
    try {
      if (isSupabaseConfigured()) {
        console.log('✅ Supabase is configured, deleting from Supabase...');
        const success = await supabasePromptService.deleteGroup(groupId);
        if (success) {
          console.log('✅ Successfully deleted group from Supabase');
          // Also remove from localStorage for immediate UI update
          const groups = this.getAllGroups();
          const filtered = groups.filter(g => g.id !== groupId);
          localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, filtered);
          console.log('💾 Removed group from localStorage for immediate UI update');
          
          // Trigger a full refresh from Supabase to ensure consistency
          setTimeout(() => {
            console.log('🔄 Triggering background sync for consistency...');
            this.syncFromSupabase();
          }, 100);
          
          return true;
        }
        console.warn('⚠️ Supabase delete failed, still removing from localStorage');
      } else {
        console.log('❌ Supabase not configured, only deleting from localStorage');
      }
    } catch (error) {
      console.error('❌ Supabase delete error:', error);
    }

    // Fallback to localStorage-only deletion
    const groups = this.getAllGroups();
    const filtered = groups.filter(g => g.id !== groupId);
    localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, filtered);
    return groups.length !== filtered.length;
  },

  // Update group metadata
  updateGroup(groupId: string, updates: Partial<Pick<PromptGroup, 'name' | 'description' | 'tags'>>): boolean {
    const groups = this.getAllGroups();
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) return false;

    const group = groups[groupIndex];
    const supabase_id = group.supabase_id; // Store this before updating
    
    groups[groupIndex] = {
      ...groups[groupIndex],
      ...updates,
      lastModified: Date.now()
    };
    
    localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);

    // Sync update to Supabase if the group exists there
    if (isSupabaseConfigured() && supabase_id) {
      supabasePromptService.updateGroup(supabase_id, {
        name: updates.name,
        description: updates.description
      }).catch(error => {
        console.warn('Failed to update group in Supabase:', error);
      });
    }

    return true;
  },

  // Update version metadata
  updateVersion(versionId: string, updates: Partial<Pick<PromptVersion, 'name' | 'description'>>): boolean {
    const groups = this.getAllGroups();
    let updated = false;
    let versionSupabaseId: string | undefined;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const versionIndex = group.versions.findIndex(v => v.id === versionId);
      
      if (versionIndex !== -1) {
        const version = group.versions[versionIndex];
        
        group.versions[versionIndex] = {
          ...group.versions[versionIndex],
          ...updates
        };
        group.lastModified = Date.now();
        updated = true;
        
        // Check if this version has a Supabase ID for updating
        versionSupabaseId = version.id; // In our case, version.id is used as Supabase ID
        break;
      }
    }

    if (updated) {
      localStorage.set(STORAGE_KEYS.PROMPT_GROUPS, groups);
      
      // Sync update to Supabase if configured
      if (isSupabaseConfigured() && versionSupabaseId) {
        console.log('🔄 Updating version in Supabase:', { versionSupabaseId, updates });
        supabasePromptService.updateVersion(versionSupabaseId, {
          name: updates.name,
          description: updates.description
        }).then(success => {
          if (success) {
            console.log('✅ Successfully updated version in Supabase');
          } else {
            console.warn('❌ Failed to update version in Supabase');
          }
        }).catch(error => {
          console.warn('Failed to update version in Supabase:', error);
        });
      } else {
        console.log('❌ Version update not synced to Supabase:', { 
          isSupabaseConfigured: isSupabaseConfigured(), 
          versionSupabaseId,
          versionId 
        });
      }
    }
    
    return updated;
  },

  // Search across all versions
  searchVersions(query: string): { group: PromptGroup; version: PromptVersion }[] {
    const groups = this.getAllGroups();
    const results: { group: PromptGroup; version: PromptVersion }[] = [];
    const lowercaseQuery = query.toLowerCase();

    groups.forEach(group => {
      group.versions.forEach(version => {
        if (
          version.content.toLowerCase().includes(lowercaseQuery) ||
          version.name.toLowerCase().includes(lowercaseQuery) ||
          version.description?.toLowerCase().includes(lowercaseQuery) ||
          group.name.toLowerCase().includes(lowercaseQuery)
        ) {
          results.push({ group, version });
        }
      });
    });

    return results;
  },

  // Get recent versions across all groups
  getRecentVersions(limit: number = 10): { group: PromptGroup; version: PromptVersion }[] {
    const groups = this.getAllGroups();
    const allVersions: { group: PromptGroup; version: PromptVersion }[] = [];

    groups.forEach(group => {
      group.versions.forEach(version => {
        allVersions.push({ group, version });
      });
    });

    return allVersions
      .sort((a, b) => b.version.timestamp - a.version.timestamp)
      .slice(0, limit);
  }
};

// Analysis storage
export const analysisStorage = {
  // Save analysis result
  save(analysis: Omit<AnalysisResult, 'id' | 'timestamp'>): string {
    const id = generateId();
    const analysisData: AnalysisResult = {
      ...analysis,
      id,
      timestamp: Date.now(),
    };

    const analyses = this.getAll();
    analyses.push(analysisData);
    localStorage.set(STORAGE_KEYS.ANALYSES, analyses);

    return id;
  },

  // Get all analyses
  getAll(): AnalysisResult[] {
    return localStorage.get(STORAGE_KEYS.ANALYSES, []);
  },

  // Get analysis by prompt ID
  getByPromptId(promptId: string): AnalysisResult | null {
    const analyses = this.getAll();
    return analyses.find(a => a.promptId === promptId) || null;
  },

  // Get recent analyses
  getRecent(limit: number = 5): AnalysisResult[] {
    const analyses = this.getAll();
    return analyses
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
};

// User preferences storage
export const preferencesStorage = {
  // Get preferences
  get(): UserPreferences {
    return localStorage.get(STORAGE_KEYS.PREFERENCES, {
      theme: 'system',
      autoAnalyze: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxHistoryItems: 100,
    });
  },

  // Update preferences
  update(updates: Partial<UserPreferences>): boolean {
    const current = this.get();
    const updated = { ...current, ...updates };
    return localStorage.set(STORAGE_KEYS.PREFERENCES, updated);
  },

  // Reset to defaults
  reset(): boolean {
    return localStorage.remove(STORAGE_KEYS.PREFERENCES);
  }
};

// Favorites storage
export const favoritesStorage = {
  // Add to favorites
  add(promptId: string): boolean {
    const favorites = this.getAll();
    if (!favorites.includes(promptId)) {
      favorites.push(promptId);
      return localStorage.set(STORAGE_KEYS.FAVORITES, favorites);
    }
    return true;
  },

  // Remove from favorites
  remove(promptId: string): boolean {
    const favorites = this.getAll();
    const filtered = favorites.filter(id => id !== promptId);
    return localStorage.set(STORAGE_KEYS.FAVORITES, filtered);
  },

  // Get all favorites
  getAll(): string[] {
    return localStorage.get(STORAGE_KEYS.FAVORITES, []);
  },

  // Check if favorited
  isFavorite(promptId: string): boolean {
    const favorites = this.getAll();
    return favorites.includes(promptId);
  },

  // Get favorite prompts
  getFavoritePrompts(): PromptData[] {
    const favorites = this.getAll();
    const prompts = promptStorage.getAll();
    return prompts.filter(p => favorites.includes(p.id));
  }
};

// Storage management utilities
export const storageManager = {
  // Get storage usage info
  getUsageInfo() {
    const prompts = promptStorage.getAll();
    const analyses = analysisStorage.getAll();
    const totalSize = localStorage.getSize();
    
    return {
      totalSize,
      promptsCount: prompts.length,
      analysesCount: analyses.length,
      isNearLimit: localStorage.isNearLimit(),
    };
  },

  // Clean up old data
  cleanup(olderThanDays: number = 30): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    // Clean up old prompts
    const prompts = promptStorage.getAll();
    const recentPrompts = prompts.filter(p => p.timestamp > cutoff);
    if (recentPrompts.length !== prompts.length) {
      localStorage.set(STORAGE_KEYS.PROMPTS, recentPrompts);
      removedCount += prompts.length - recentPrompts.length;
    }

    // Clean up old analyses
    const analyses = analysisStorage.getAll();
    const recentAnalyses = analyses.filter(a => a.timestamp > cutoff);
    if (recentAnalyses.length !== analyses.length) {
      localStorage.set(STORAGE_KEYS.ANALYSES, recentAnalyses);
      removedCount += analyses.length - recentAnalyses.length;
    }

    return removedCount;
  },

  // Export data
  exportData() {
    return {
      prompts: promptStorage.getAll(),
      analyses: analysisStorage.getAll(),
      preferences: preferencesStorage.get(),
      favorites: favoritesStorage.getAll(),
      exportDate: new Date().toISOString(),
    };
  },

  // Import data
  importData(data: any): boolean {
    try {
      if (data.prompts) localStorage.set(STORAGE_KEYS.PROMPTS, data.prompts);
      if (data.analyses) localStorage.set(STORAGE_KEYS.ANALYSES, data.analyses);
      if (data.preferences) localStorage.set(STORAGE_KEYS.PREFERENCES, data.preferences);
      if (data.favorites) localStorage.set(STORAGE_KEYS.FAVORITES, data.favorites);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
};
