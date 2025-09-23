'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Search, 
  Copy, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Plus,
  Star,
  Clock,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/contexts/storage-context';
import { PromptVersionList } from './prompt-version-list';
import { PromptGroup, PromptVersion } from '@/lib/storage';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

interface PromptTemplatesSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectTemplate: (template: PromptTemplate) => void;
  onSelectVersion?: (version: PromptVersion, group: PromptGroup) => void;
  promptData: Record<string, string>;
}

export function PromptTemplatesSidebar({ 
  isOpen, 
  onToggle, 
  onSelectTemplate, 
  onSelectVersion,
  promptData 
}: PromptTemplatesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PromptGroup | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const { toast } = useToast();
  const { versions } = useStorage();

  // Convert promptData to template format
  const templates: PromptTemplate[] = Object.entries(promptData).map(([key, content]) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: content.split('\n')[0].substring(0, 100) + '...',
    content,
    category: 'Joblogic'
  }));

  // Filter templates based on search
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter prompt groups based on search
  const filteredGroups = versions.promptGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.versions.some(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleCopyTemplate = async (template: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template.id);
      toast({
        title: "Copied!",
        description: "Template copied to clipboard.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy template.",
        variant: "destructive",
      });
    }
  };

  const handleSelectTemplate = async (template: PromptTemplate) => {
    // Create a new prompt group from the template
    const groupName = template.name;
    const group = await versions.createPromptGroup(
      groupName,
      template.content,
      `Template: ${template.description}`
    );
    
    if (group) {
      toast({
        title: "Template Added to Prompts",
        description: `Created "${group.name}" from template.`,
      });
    }
    
    // Also call the original handler for backward compatibility
    onSelectTemplate(template);
  };

  const handleVersionSelect = (version: PromptVersion) => {
    const group = versions.promptGroups.find(g => g.id === version.promptId);
    if (group) {
      setSelectedVersion(version);
      setSelectedGroup(group);
      onSelectVersion?.(version, group);
      toast({
        title: "Version Selected",
        description: `${group.name} - ${version.name} has been loaded.`,
      });
    }
  };

  const handleVersionEdit = (version: PromptVersion) => {
    // For now, just select the version. In future, this could open an edit modal
    handleVersionSelect(version);
  };

  const handleGroupEdit = (group: PromptGroup) => {
    // Future: Open group settings modal
    setSelectedGroup(group);
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={onToggle}
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 p-0 rounded-full shadow-lg ${
          isOpen ? 'left-[25rem]' : 'left-4'
        } transition-all duration-300`}
      >
        {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-96 bg-background border-r border-border/50 transform transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Prompts & Versions</h2>
              </div>
              <Button
                onClick={onToggle}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts and versions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="versions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="versions" className="text-xs">
                  <GitBranch className="h-4 w-4 mr-1" />
                  My Prompts
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" />
                  Templates
                </TabsTrigger>
              </TabsList>
              
              {/* Prompt Versions Tab */}
              <TabsContent value="versions" className="mt-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-3 mt-4">
                    {versions.loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No prompt versions</h3>
                          <p className="text-muted-foreground text-center text-sm mb-4">
                            {searchQuery ? 'No versions match your search.' : 'Create your first prompt to get started.'}
                          </p>
                          {!searchQuery && (
                            <Button 
                              size="sm" 
                              className="gap-2"
                              onClick={async () => {
                                console.log('Create First Prompt clicked in PromptTemplatesSidebar');
                                // Create a new prompt group
                                const defaultName = `New Prompt ${new Date().toISOString().split('T')[0]}`;
                                const group = await versions.createPromptGroup(
                                  defaultName,
                                  '// Enter your prompt content here...',
                                  'A new prompt created from templates'
                                );
                                
                                if (group) {
                                  toast({
                                    title: 'Prompt Created',
                                    description: `"${defaultName}" has been created successfully.`,
                                  });
                                } else {
                                  toast({
                                    variant: 'destructive',
                                    title: 'Error',
                                    description: 'Failed to create prompt. Please try again.',
                                  });
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Create First Prompt
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      filteredGroups.map((group) => (
                        <PromptVersionList
                          key={group.id}
                          group={group}
                          onVersionSelect={handleVersionSelect}
                          onVersionEdit={handleVersionEdit}
                          onGroupEdit={handleGroupEdit}
                          selectedVersionId={selectedVersion?.id}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-3 mt-4">
                    {filteredTemplates.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                          <p className="text-muted-foreground text-center text-sm">
                            {searchQuery ? 'No templates match your search.' : 'No templates available.'}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredTemplates.map((template) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-medium break-words leading-tight mb-1">
                                  {template.name}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                                <Badge variant="secondary" className="text-xs mt-2">
                                  {template.category}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex gap-2 mb-2">
                              <Button
                                size="sm"
                                onClick={() => handleSelectTemplate(template)}
                                className="flex-1 h-8 text-xs"
                              >
                                <GitBranch className="h-3 w-3 mr-1" />
                                Create Prompt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyTemplate(template)}
                                className="h-8 w-8 p-0"
                              >
                                {copiedId === template.id ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  // Just call the legacy handler without creating a prompt group
                                  onSelectTemplate(template);
                                  toast({
                                    title: "Template Selected",
                                    description: "Template loaded for editing.",
                                  });
                                }}
                                className="flex-1 h-7 text-xs"
                              >
                                Load Only
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}
