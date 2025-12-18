import { useState, useEffect } from 'react';
import {
  ChatSession,
  ChatMessage,
  createChatSession,
  fetchChatSessions,
  fetchChatMessages,
  createChatMessage,
  deleteChatSession,
  updateChatSessionName,
} from '../services/chatDatabase';
import { generateChatResponse, generateChatName } from '../services/chatService';
import { SpentItem } from '../services/spentTableDatabase';

export const useChat = (spentItems: SpentItem[] = []) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    } else {
      setMessages([]);
    }
  }, [currentSession?.id]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChatSessions();
      setSessions(data);
      // Auto-select the most recent session if available
      if (data.length > 0 && !currentSession) {
        setCurrentSession(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load chat sessions:', err);
      if (err?.code !== 'PGRST202' && !err?.message?.includes('does not exist')) {
        setError(err instanceof Error ? err.message : 'Failed to load chat sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      setError(null);
      const data = await fetchChatMessages(sessionId);
      setMessages(data);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      if (err?.code !== 'PGRST202' && !err?.message?.includes('does not exist')) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      }
    }
  };

  const startNewSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const newSession = await createChatSession();
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new chat session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    let sessionToUse = currentSession;
    let isNewSession = false;
    if (!sessionToUse) {
      // Create a new session if none exists
      sessionToUse = await startNewSession();
      isNewSession = true;
    }

    try {
      setSending(true);
      setError(null);

      // Create user message
      const userMessage = await createChatMessage({
        sessionId: sessionToUse.id,
        role: 'user',
        content,
      });
      setMessages(prev => [...prev, userMessage]);

      // Generate AI response with updated messages including the new user message
      const updatedMessages = [...messages, userMessage];
      const aiResponseText = await generateChatResponse(content, updatedMessages, spentItems);

      // Save AI response
      const aiMessage = await createChatMessage({
        sessionId: sessionToUse.id,
        role: 'assistant',
        content: aiResponseText,
      });
      setMessages(prev => [...prev, aiMessage]);

      // Auto-generate name for session if it doesn't have one or is "New Chat"
      // Do this after getting the AI response so we have more context
      const finalMessages = [...updatedMessages, aiMessage];
      const currentName = (sessionToUse.name || '').trim();
      if (!currentName || currentName === '' || currentName.toLowerCase() === 'new chat') {
        try {
          const generatedName = await generateChatName(finalMessages);
          await updateChatSessionName(sessionToUse.id, generatedName);
        } catch (nameError) {
          console.error('Failed to generate chat name:', nameError);
          // Continue even if name generation fails
        }
      }

      // Refresh sessions to update updated_at timestamp and get latest names from DB
      await loadSessions();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        // Switch to another session or clear
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete chat session');
      throw err;
    }
  };

  const renameSession = async (sessionId: string, newName: string) => {
    try {
      await updateChatSessionName(sessionId, newName);
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, name: newName } : s
      ));
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, name: newName });
      }
    } catch (err) {
      console.error('Failed to rename session:', err);
      throw err;
    }
  };

  return {
    sessions,
    currentSession,
    messages,
    loading,
    sending,
    error,
    startNewSession,
    sendMessage,
    deleteSession,
    renameSession,
    setCurrentSession,
    refreshSessions: loadSessions,
  };
};

