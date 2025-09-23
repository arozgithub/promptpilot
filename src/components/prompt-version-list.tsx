'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MoreVertical, 
  Play, 
  Settings, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Star,
  GitBranch,
  Clock,
  Eye,
  Copy,
  Crown,
  Target,
  FileEdit,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/contexts/storage-context';
import { PromptGroup, PromptVersion } from '@/lib/storage';
import Link from 'next/link';

interface PromptVersionListProps {
  group: PromptGroup;
  onVersionSelect?: (version: PromptVersion) => void;
  onVersionEdit?: (version: PromptVersion) => void;
  onGroupEdit?: (group: PromptGroup) => void;
  selectedVersionId?: string;
}

export function PromptVersionList({ 
  group, 
  onVersionSelect, 
  onVersionEdit,
  onGroupEdit,
  selectedVersionId 
}: PromptVersionListProps) {
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGroupName, setEditGroupName] = useState(group.name);
  const [deleteVersion, setDeleteVersion] = useState<PromptVersion | null>(null);
  const [deleteGroup, setDeleteGroup] = useState(false);
  const { toast } = useToast();
  const { versions } = useStorage();

  const getStatusColor = (status: PromptVersion['status']) => {
    switch (status) {
      case 'production':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white';
      case 'draft':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getStatusIcon = (status: PromptVersion['status']) => {
    switch (status) {
      case 'production':
        return <Crown className="h-3 w-3" />;
      case 'current':
        return <Target className="h-3 w-3" />;
      case 'draft':
        return <FileEdit className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleStatusChange = async (versionId: string, newStatus: 'draft' | 'current' | 'production') => {
    const success = versions.setVersionStatus(versionId, newStatus);
    if (success) {
      toast({
        title: `Version set as ${newStatus}`,
        description: `The version has been marked as ${newStatus}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update version status.',
      });
    }
  };

  const handleDeleteVersion = async (version: PromptVersion) => {
    const success = versions.deleteVersion(version.id);
    if (success) {
      toast({
        title: 'Version deleted',
        description: `${version.name} has been deleted.`,
      });
      setDeleteVersion(null);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete version. Cannot delete the only version in a group.',
      });
    }
  };

  const handleDeleteGroup = async () => {
    const success = await versions.deleteGroup(group.id);
    if (success) {
      toast({
        title: 'Prompt group deleted',
        description: `${group.name} and all its versions have been deleted.`,
      });
      setDeleteGroup(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete prompt group.',
      });
    }
  };

  const handleVersionNameEdit = (version: PromptVersion) => {
    setEditingVersion(version.id);
    setEditName(version.name);
  };

  const handleSaveVersionName = () => {
    if (editingVersion && editName.trim()) {
      const success = versions.updateVersion(editingVersion, { 
        name: editName.trim() 
      });
      
      if (success) {
        toast({
          title: 'Version Name Updated',
          description: `Version name updated to "${editName.trim()}"`,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: 'Failed to update version name. Please try again.',
          variant: 'destructive',
        });
      }
      
      setEditingVersion(null);
      setEditName('');
    }
  };

  const handleGroupNameEdit = () => {
    setEditingGroup(true);
    setEditGroupName(group.name);
  };

  const handleSaveGroupName = () => {
    if (editGroupName.trim() && editGroupName !== group.name) {
      const success = versions.updateGroup(group.id, { name: editGroupName.trim() });
      if (success) {
        toast({
          title: 'Group renamed',
          description: `Renamed to "${editGroupName}"`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to rename group.',
        });
      }
    }
    setEditingGroup(false);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const sortedVersions = [...group.versions].sort((a, b) => b.version - a.version);

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingGroup ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="h-8 font-semibold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGroupName();
                      if (e.key === 'Escape') setEditingGroup(false);
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveGroupName}
                    className="h-8 px-3"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingGroup(false)}
                    className="h-8 px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GitBranch className="h-5 w-5" />
                  {group.name}
                  <Badge variant="secondary" className="text-xs">
                    {group.versions.length} version{group.versions.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              )}
              {group.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {group.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleGroupNameEdit}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Rename Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onGroupEdit?.(group)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDeleteGroup(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {sortedVersions.map((version) => (
              <div
                key={version.id}
                className={`group relative rounded-lg border p-3 transition-all duration-200 cursor-pointer ${
                  selectedVersionId === version.id 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'hover:bg-muted/50 border-border'
                }`}
                onClick={() => onVersionSelect?.(version)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {editingVersion === version.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-6 text-sm font-medium"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveVersionName();
                              if (e.key === 'Escape') setEditingVersion(null);
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveVersionName}
                            className="h-6 px-2 text-xs"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingVersion(null)}
                            className="h-6 px-2 text-xs"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          {version.name}
                          <Badge 
                            className={`text-xs h-5 px-2 ${getStatusColor(version.status)}`}
                          >
                            {getStatusIcon(version.status)}
                            <span className="ml-1 capitalize">{version.status}</span>
                          </Badge>
                        </h4>
                      )}
                    </div>
                    
                    {version.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {version.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(version.timestamp)}
                      </span>
                      <span>v{version.version}</span>
                      {version.createdFrom && (
                        <span className="flex items-center gap-1">
                          <span>from {version.createdFrom.type}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Link 
                      href={`/playground?prompt=${encodeURIComponent(version.content)}&model=googleai/gemini-2.5-flash&temperature=0.7`}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                        title="Test in Playground"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </Link>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVersionEdit?.(version);
                      }}
                      title="View/Edit"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const newVersion = versions.addVersion(group.id, version.content, {
                            name: `v${group.versions.length + 1}.0 (Copy)`,
                            description: `Copy of ${version.name}`,
                            status: 'draft',
                            parentVersionId: version.id,
                            createdFrom: { type: 'manual' }
                          });
                          if (newVersion) {
                            toast({
                              title: 'Version Created',
                              description: `Created ${newVersion.name} from ${version.name}`,
                            });
                          }
                        }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create New Version
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleVersionNameEdit(version)}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        {version.status !== 'current' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(version.id, 'current')}>
                            <Target className="mr-2 h-4 w-4" />
                            Set as Current
                          </DropdownMenuItem>
                        )}
                        {version.status !== 'production' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(version.id, 'production')}>
                            <Crown className="mr-2 h-4 w-4" />
                            Set as Production
                          </DropdownMenuItem>
                        )}
                        {version.status !== 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(version.id, 'draft')}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            Mark as Draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(version.content);
                            toast({
                              title: 'Copied to clipboard',
                              description: 'Prompt content has been copied.',
                            });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Content
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteVersion(version)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Version
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Version Dialog */}
      <AlertDialog open={deleteVersion !== null} onOpenChange={() => setDeleteVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version "{deleteVersion?.name}"? This action cannot be undone.
              {deleteVersion?.status === 'production' && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This is your production version!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVersion && handleDeleteVersion(deleteVersion)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Dialog */}
      <AlertDialog open={deleteGroup} onOpenChange={setDeleteGroup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}" and all its versions? This action cannot be undone.
              <span className="block mt-2 text-destructive font-medium">
                This will delete {group.versions.length} version{group.versions.length !== 1 ? 's' : ''}!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}