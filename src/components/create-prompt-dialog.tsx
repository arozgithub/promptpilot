'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/contexts/storage-context';
import { Plus, Wand2 } from 'lucide-react';

interface CreatePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  initialName?: string;
  initialDescription?: string;
}

export function CreatePromptDialog({ 
  open, 
  onOpenChange, 
  initialContent = '',
  initialName = '',
  initialDescription = ''
}: CreatePromptDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { versions } = useStorage();

  console.log('CreatePromptDialog render:', { open, name, description, content });

  // Effect to log when open state changes
  console.log(`Dialog state changed: ${open ? 'OPENING' : 'CLOSING'}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide both a name and content for the prompt.',
      });
      return;
    }

    if (!versions) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Version management is not available. Please refresh the page.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Creating prompt group:', { name: name.trim(), content: content.trim(), description: description.trim() });
      
      const group = await versions.createPromptGroup(
        name.trim(),
        content.trim(),
        description.trim() || undefined
      );

      console.log('Created group result:', group);

      if (group) {
        toast({
          title: 'Prompt Created',
          description: `Successfully created "${group.name}" with initial version.`,
        });
        
        // Reset form
        setName('');
        setDescription('');
        setContent('');
        onOpenChange(false);
      } else {
        throw new Error('Failed to create prompt group');
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create prompt. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName(initialName);
      setDescription(initialDescription);
      setContent(initialContent);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Prompt {open ? '(OPEN)' : '(CLOSED)'}
          </DialogTitle>
          <DialogDescription>
            Create a new prompt group with an initial version. You can add more versions later.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Prompt Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Support Bot, Content Writer, Code Reviewer"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt does"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Prompt Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your prompt content here..."
              rows={8}
              required
              className="min-h-[200px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Create Prompt
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}