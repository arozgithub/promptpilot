import { supabase } from './supabase';
import { PromptGroup, PromptVersion } from './storage';

// Add initialization check
console.log('🚀 Supabase prompt service initializing...');
console.log('🔧 Supabase client available:', !!supabase);

export interface SupabasePromptGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  tags: string[] | null;
  is_archived: boolean;
  sort_order: number;
}

export interface SupabasePromptVersion {
  id: string;
  group_id: string;
  name: string;
  content: string;
  status: 'draft' | 'current' | 'production';
  version_number: number;
  created_at: string;
  updated_at: string;
  description: string | null;
  parent_version_id: string | null;
  author_notes: string | null;
  performance_score: number;
  usage_count: number;
  is_archived: boolean;
}

export class SupabasePromptService {
  // Helper function to convert Supabase data to local format
  private convertGroupToLocal(supabaseGroup: SupabasePromptGroup, versions: SupabasePromptVersion[] = []): PromptGroup {
    const convertedVersions = versions.map((v, index) => ({
      id: v.id,
      promptId: v.group_id,
      version: index + 1, // Simple versioning based on order
      name: v.name,
      content: v.content,
      status: v.status,
      timestamp: new Date(v.created_at).getTime()
    }));

    // Find current version (first non-draft, or first version if all are draft)
    const currentVersion = convertedVersions.find(v => v.status === 'current') || 
                          convertedVersions.find(v => v.status === 'production') ||
                          convertedVersions[0];

    // Find production version
    const productionVersion = convertedVersions.find(v => v.status === 'production');

    return {
      id: supabaseGroup.id,
      name: supabaseGroup.name,
      description: supabaseGroup.description || '',
      currentVersionId: currentVersion?.id || '',
      productionVersionId: productionVersion?.id,
      versions: convertedVersions,
      timestamp: new Date(supabaseGroup.created_at).getTime(),
      lastModified: new Date(supabaseGroup.updated_at).getTime(),
      supabase_id: supabaseGroup.id // ✅ Set the supabase_id so updates can work
    };
  }

  // Get all prompt groups with their versions
  async getAllGroups(): Promise<PromptGroup[]> {
    try {
      // First get all groups
      const { data: groups, error: groupsError } = await supabase
        .from('prompt_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;
      if (!groups) return [];

      // Then get all versions
      const { data: versions, error: versionsError } = await supabase
        .from('prompt_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;

      // Group versions by group_id
      const versionsByGroup = (versions || []).reduce((acc, version) => {
        if (!acc[version.group_id]) {
          acc[version.group_id] = [];
        }
        acc[version.group_id].push(version);
        return acc;
      }, {} as Record<string, SupabasePromptVersion[]>);

      // Convert to local format
      return groups.map(group => 
        this.convertGroupToLocal(group, versionsByGroup[group.id] || [])
      );
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  }

  // Create a new prompt group
  async createGroup(name: string, initialContent: string, description?: string, options?: { skipInitialVersion?: boolean }): Promise<PromptGroup | null> {
    console.log('🎯 createGroup called with:', { 
      name, 
      initialContent: initialContent.substring(0, 50), 
      description,
      skipInitialVersion: options?.skipInitialVersion
    });
    try {
      // Create the group with actual available fields
      // Use initialContent (the prompt text) as the description for the group
      console.log('📝 Creating group in Supabase...');
      const { data: group, error: groupError } = await supabase
        .from('prompt_groups')
        .insert({
          name,
          description: initialContent, // Store the prompt text as the description
          tags: [], // Empty array for tags
          is_archived: false,
          sort_order: 0
        })
        .select()
        .single();

      if (groupError) {
        console.error('❌ Group creation error:', groupError);
        throw groupError;
      }

      console.log('✅ Group created successfully:', group);
      console.log('📝 Prompt text stored in description field (length:', initialContent.length, 'chars)');

      let version;
      
      // Create the initial version only if not skipped
      if (!options?.skipInitialVersion) {
        console.log('📝 Creating initial version...');
        const { data: versionData, error: versionError } = await supabase
          .from('prompt_versions')
          .insert({
            group_id: group.id,
            name: `${name} v1`,
            content: initialContent,
            status: 'current', // Set as current version
            version_number: 1,
            description: 'Initial version',
            parent_version_id: null,
            author_notes: null,
            performance_score: 0.0,
            usage_count: 0,
            is_archived: false
          })
          .select()
          .single();

        if (versionError) {
          console.error('❌ Version creation error:', versionError);
          throw versionError;
        }

        console.log('✅ Version created successfully:', versionData);
        version = versionData;
      } else {
        console.log('⏭️ Skipping initial version creation as requested');
      }

      const result = this.convertGroupToLocal(group, version ? [version] : []);
      console.log('🔄 Converted to local format:', result);
      return result;
    } catch (error) {
      console.error('Error creating group:', error);
      return null;
    }
  }

  // Add a new version to a group
  async addVersion(groupId: string, name: string, content: string): Promise<PromptVersion | null> {
    console.log('🎯 addVersion called with:', { 
      groupId, 
      name, 
      contentPreview: content.substring(0, 50)
    });
    try {
      // Get the current highest version number for this group
      const { data: existingVersions, error: versionError } = await supabase
        .from('prompt_versions')
        .select('version_number')
        .eq('group_id', groupId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) throw versionError;
      
      console.log('✅ Found existingVersions:', existingVersions);

      const nextVersionNumber = existingVersions.length > 0 ? existingVersions[0].version_number + 1 : 1;
      const versionName = name || `Version ${nextVersionNumber}`;
      
      console.log('📝 Creating version with number:', nextVersionNumber);
      console.log('📝 Version name:', versionName);

      // Create the version with all available fields
      const { data: version, error: insertError } = await supabase
        .from('prompt_versions')
        .insert({
          group_id: groupId,
          name: versionName,
          content,
          status: 'draft',
          version_number: nextVersionNumber,
          description: `Version ${nextVersionNumber} of the prompt`,
          parent_version_id: null,
          author_notes: null,
          performance_score: 0.0,
          usage_count: 0,
          is_archived: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Version insertion error:', insertError);
        throw insertError;
      }
      
      console.log('✅ Successfully created version:', version);

      return {
        id: version.id,
        promptId: version.group_id,
        version: version.version_number,
        name: version.name,
        content: version.content,
        status: version.status,
        timestamp: new Date(version.created_at).getTime()
      };
    } catch (error) {
      console.error('Error adding version:', error);
      return null;
    }
  }

  // Update version status
  async setVersionStatus(versionId: string, status: 'draft' | 'current' | 'production'): Promise<boolean> {
    try {
      // Get the version details
      const { data: version, error: versionError } = await supabase
        .from('prompt_versions')
        .select('group_id')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      // If setting to current or production, first set all other versions in the group to draft
      if (status === 'current' || status === 'production') {
        await supabase
          .from('prompt_versions')
          .update({ status: 'draft' })
          .eq('group_id', version.group_id)
          .neq('id', versionId);
      }

      // Update the target version
      const { error: statusError } = await supabase
        .from('prompt_versions')
        .update({ status })
        .eq('id', versionId);

      if (statusError) throw statusError;

      return true;
    } catch (error) {
      console.error('Error setting version status:', error);
      return false;
    }
  }

  // Update version content
  async updateVersion(versionId: string, updates: { name?: string; content?: string; description?: string }): Promise<boolean> {
    console.log('🎯 updateVersion called:', { versionId, updates });
    try {
      const { error } = await supabase
        .from('prompt_versions')
        .update(updates)
        .eq('id', versionId);

      if (error) {
        console.error('❌ Supabase updateVersion error:', error);
        throw error;
      }
      console.log('✅ Supabase updateVersion success');
      return true;
    } catch (error) {
      console.error('Error updating version:', error);
      return false;
    }
  }

  // Delete a version
  async deleteVersion(versionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('prompt_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting version:', error);
      return false;
    }
  }

  // Delete a group and all its versions
  async deleteGroup(groupId: string): Promise<boolean> {
    try {
      // Delete all versions first (cascade should handle this, but being explicit)
      await supabase
        .from('prompt_versions')
        .delete()
        .eq('group_id', groupId);

      // Delete the group
      const { error } = await supabase
        .from('prompt_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      return false;
    }
  }

  // Update group details
  async updateGroup(groupId: string, updates: { name?: string; description?: string }): Promise<boolean> {
    console.log('🎯 updateGroup called:', { groupId, updates });
    try {
      const { error } = await supabase
        .from('prompt_groups')
        .update(updates)
        .eq('id', groupId);

      if (error) {
        console.error('❌ Supabase updateGroup error:', error);
        throw error;
      }
      console.log('✅ Supabase updateGroup success');
      return true;
    } catch (error) {
      console.error('Error updating group:', error);
      return false;
    }
  }

  // Get a specific group with versions
  async getGroup(groupId: string): Promise<PromptGroup | null> {
    try {
      const { data: group, error: groupError } = await supabase
        .from('prompt_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const { data: versions, error: versionsError } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;

      return this.convertGroupToLocal(group, versions || []);
    } catch (error) {
      console.error('Error fetching group:', error);
      return null;
    }
  }
}

// Export singleton instance
export const supabasePromptService = new SupabasePromptService();