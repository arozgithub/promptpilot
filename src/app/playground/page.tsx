'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlaygroundInterface } from '@/components/playground-interface';
import { PlaygroundSettings } from '@/components/playground-settings';
import { ChatHistorySidebar } from '@/components/chat-history-sidebar';
import { StressTestInterface } from '@/components/stress-test-interface';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, PanelLeft, PanelLeftClose, Home, ArrowLeft, TestTube } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { GlobalFooter } from '@/components/global-footer';

// Force dynamic rendering for this page since it uses useSearchParams
export const dynamic = 'force-dynamic';

interface PlaygroundPageProps {
  searchParams?: {
    prompt?: string;
    model?: string;
    temperature?: string;
  };
}

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showStressTest, setShowStressTest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const savedSessions = localStorage.getItem('playground-sessions');
      if (savedSessions) {
        try {
          const sessions = JSON.parse(savedSessions);
          if (sessions.length > 0) {
            return sessions[0].id; // Use the most recent session
          }
        } catch (error) {
          console.error('Failed to parse saved sessions:', error);
        }
      }
    }
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get initial values from URL params
  const initialPrompt = searchParams?.get('prompt') || '';
  const initialModel = searchParams?.get('model') || 'googleai/gemini-2.5-flash';
  const initialTemperature = parseFloat(searchParams?.get('temperature') || '0.7');

  const [playgroundConfig, setPlaygroundConfig] = useState({
    systemPrompt: initialPrompt,
    model: initialModel || 'googleai/gemini-2.5-flash',
    temperature: initialTemperature,
    maxTokens: 1000,
    topP: 0.9,
    topK: 40,
    stopSequences: [] as string[],
  });

  const [conversation, setConversation] = useState<Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>>([]);

  const [isStreaming, setIsStreaming] = useState(false);

  // Initialize conversation with system prompt if provided
  useEffect(() => {
    if (initialPrompt && conversation.length === 0) {
      setConversation([{
        id: 'system-0',
        role: 'system',
        content: initialPrompt,
        timestamp: Date.now()
      }]);
    }
  }, [initialPrompt, conversation.length]);

  // Ensure current session exists in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentSessionId) {
      const savedSessions = localStorage.getItem('playground-sessions');
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];
      
      // Check if current session exists
      const sessionExists = sessions.find((s: any) => s.id === currentSessionId);
      
      if (!sessionExists) {
        // Create session if it doesn't exist
        const newSession = {
          id: currentSessionId,
          title: "New Chat",
          timestamp: Date.now(),
          messageCount: 0,
          author: 'admin'
        };
        
        const updatedSessions = [newSession, ...sessions];
        localStorage.setItem('playground-sessions', JSON.stringify(updatedSessions));
        setRefreshTrigger(prev => prev + 1);
      }
    }
  }, [currentSessionId]);

  const handleSendMessage = async (message: string, attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    preview?: string;
  }>) => {
    if (!message.trim() || isStreaming) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: Date.now(),
      attachments
    };

    setConversation(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/playground/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...conversation, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          config: playgroundConfig
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now()
      };

      setConversation(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setConversation(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearConversation = () => {
    setConversation(playgroundConfig.systemPrompt ? [{
      id: 'system-0',
      role: 'system',
      content: playgroundConfig.systemPrompt,
      timestamp: Date.now()
    }] : []);
  };

  const handleConfigChange = (newConfig: Partial<typeof playgroundConfig>) => {
    setPlaygroundConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleSystemPromptChange = (newPrompt: string) => {
    setPlaygroundConfig(prev => ({ ...prev, systemPrompt: newPrompt }));
  };

  // Generate unique session ID
  const generateSessionId = () => {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Session management
  const handleNewSession = () => {
    // Check if current session has conversation history
    const userAssistantMessages = conversation.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant'
    );
    
    if (userAssistantMessages.length === 0) {
      // Don't create new session if no conversation history
      return;
    }
    
    const newSessionId = generateSessionId();
    
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      // Create new session in localStorage
      const newSession = {
        id: newSessionId,
        title: "New Chat",
        timestamp: Date.now(),
        messageCount: 0,
        author: 'admin'
      };
      
      // Load existing sessions and add new one
      const savedSessions = localStorage.getItem('playground-sessions');
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];
      const updatedSessions = [newSession, ...sessions];
      localStorage.setItem('playground-sessions', JSON.stringify(updatedSessions));
    }
    
    // Update current session and clear conversation
    setCurrentSessionId(newSessionId);
    setConversation([]);
    
    // Trigger sidebar refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
    // Load session data from localStorage
    const savedSessions = localStorage.getItem('playground-sessions');
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions);
        const session = sessions.find((s: any) => s.id === sessionId);
        if (session) {
          // Load conversation from session
          const savedConversation = localStorage.getItem(`playground-conversation-${sessionId}`);
          if (savedConversation) {
            setConversation(JSON.parse(savedConversation));
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        }
      }
    }
  };

  const handleSessionDelete = (sessionId: string) => {
    if (currentSessionId === sessionId) {
      setConversation([]);
      setCurrentSessionId('default');
    }
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
    localStorage.removeItem(`playground-conversation-${sessionId}`);
    }
  };

  const handleSessionRename = (sessionId: string, newTitle: string) => {
    // This is handled by the sidebar component
  };

  // Save conversation to localStorage when it changes
  useEffect(() => {
    if (conversation.length > 0 && typeof window !== 'undefined') {
      console.log('Saving conversation:', { currentSessionId, conversationLength: conversation.length });
      
      // Save conversation
      localStorage.setItem(`playground-conversation-${currentSessionId}`, JSON.stringify(conversation));
      console.log('Conversation saved to localStorage');
      
      // Count only user and assistant messages (exclude system messages)
      const userAssistantMessages = conversation.filter(msg => 
        msg.role === 'user' || msg.role === 'assistant'
      );
      
      // Update session info in localStorage
      const savedSessions = localStorage.getItem('playground-sessions');
      if (savedSessions) {
        try {
          const sessions = JSON.parse(savedSessions);
          const sessionIndex = sessions.findIndex((s: any) => s.id === currentSessionId);
          
          if (sessionIndex !== -1) {
            // Update existing session
            sessions[sessionIndex] = {
              ...sessions[sessionIndex],
          messageCount: userAssistantMessages.length,
          timestamp: Date.now(),
          systemPrompt: playgroundConfig.systemPrompt
            };
            
            // Update title after first user message
            if (userAssistantMessages.length === 1) {
              const firstUserMessage = conversation.find(msg => msg.role === 'user');
              if (firstUserMessage) {
                sessions[sessionIndex].title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
              }
            }
            
            localStorage.setItem('playground-sessions', JSON.stringify(sessions));
            console.log('Session updated in localStorage:', sessions[sessionIndex]);
            // Trigger sidebar refresh
            setRefreshTrigger(prev => prev + 1);
          } else {
            console.log('Session not found in localStorage, creating new one');
            // Create new session if not found
            const newSession = {
              id: currentSessionId,
              title: userAssistantMessages.length === 1 ? 
                (conversation.find(msg => msg.role === 'user')?.content.substring(0, 50) + '...' || 'New Chat') : 
                'New Chat',
              timestamp: Date.now(),
              messageCount: userAssistantMessages.length,
              author: 'admin'
            };
            
            const updatedSessions = [newSession, ...sessions];
            localStorage.setItem('playground-sessions', JSON.stringify(updatedSessions));
            console.log('New session created:', newSession);
            setRefreshTrigger(prev => prev + 1);
          }
        } catch (error) {
          console.error('Failed to update session:', error);
        }
      } else {
        console.log('No saved sessions found, creating new one');
        // Create new session if no sessions exist
        const newSession = {
          id: currentSessionId,
          title: userAssistantMessages.length === 1 ? 
            (conversation.find(msg => msg.role === 'user')?.content.substring(0, 50) + '...' || 'New Chat') : 
            'New Chat',
          timestamp: Date.now(),
          messageCount: userAssistantMessages.length,
          author: 'admin'
        };
        
        localStorage.setItem('playground-sessions', JSON.stringify([newSession]));
        console.log('First session created:', newSession);
        setRefreshTrigger(prev => prev + 1);
      }
    }
  }, [conversation, currentSessionId, playgroundConfig.systemPrompt]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CTRL+B - Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
      
      // SHIFT+P - Open playground (if not already here)
      if (e.shiftKey && e.key === 'P') {
        e.preventDefault();
        // If we're already in playground, just focus the input
        const textarea = document.querySelector('textarea[placeholder*="Ask anything"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-1.5">
          {!showSidebar && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(true)}
                className="gap-1 text-xs h-7"
              >
                <PanelLeft className="h-3 w-3" />
                <span className="font-medium">Show History</span>
              </Button>
              <div className="h-3 w-px bg-border" />
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs h-7"
                >
                  <Home className="h-3 w-3" />
                  <span className="font-medium">Back to Home</span>
                </Button>
              </Link>
            </div>
          )}
          <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStressTest(!showStressTest)}
              className={`h-6 w-6 p-0 ${showSidebar ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  title="Stress Test Interface"
                >
                  <TestTube className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
              className={`h-6 w-6 p-0 ${showSidebar ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  title="Settings"
                >
                  <Settings className="h-3 w-3" />
                </Button>
            <div className={`transition-opacity duration-300 ${showSidebar ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Chat History Sidebar - Always reserve space */}
        <div className={`${showSidebar ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        {showSidebar && (
            <ChatHistorySidebar
              currentSessionId={currentSessionId}
              currentConversationLength={conversation.length}
              onSessionSelect={handleSessionSelect}
              onNewSession={handleNewSession}
              onSessionDelete={handleSessionDelete}
              onSessionRename={handleSessionRename}
              onSettingsClick={() => setShowSettings(!showSettings)}
              onStressTestClick={() => setShowStressTest(!showStressTest)}
              onClearClick={handleClearConversation}
              onHideSidebar={() => setShowSidebar(false)}
              onVersionSelect={(version, group) => {
                console.log('Version selected:', version, group);
                // You can handle version selection here if needed
              }}
              refreshTrigger={refreshTrigger}
            />
          )}
          </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showSettings ? (
            /* Settings View - Full Width */
            <div className="flex-1 p-3 md:p-4 overflow-auto">
              <div className="max-w-3xl mx-auto">
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(false)}
                      className="gap-1 text-xs h-7"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to Playground
                    </Button>
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold mb-1">Playground Settings</h2>
                  <p className="text-xs text-muted-foreground">Configure your AI model and conversation parameters</p>
                </div>
                <PlaygroundSettings
                  config={playgroundConfig}
                  onConfigChange={handleConfigChange}
                />
              </div>
            </div>
          ) : showStressTest ? (
            /* Stress Test View - Full Width */
            <div className="flex-1 p-3 md:p-4 overflow-auto">
              <div className="max-w-6xl mx-auto">
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStressTest(false)}
                      className="gap-1 text-xs h-7"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to Playground
                    </Button>
                  </div>
                </div>
                <StressTestInterface
                  onSendMessage={handleSendMessage}
                  onSystemPromptChange={handleSystemPromptChange}
                  currentSystemPrompt={playgroundConfig.systemPrompt}
                />
              </div>
            </div>
          ) : (
            /* Chat Interface - Normal View */
            <div className="flex-1 flex flex-col min-h-0">
              <PlaygroundInterface
                conversation={conversation}
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                systemPrompt={playgroundConfig.systemPrompt}
              />
            </div>
          )}
          
          {/* Footer - Inside main chat area for proper alignment */}
          <div className="mt-0">
            <GlobalFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <PlaygroundContent />
    </Suspense>
  );
}
