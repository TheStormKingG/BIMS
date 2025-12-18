import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

export interface ChatSession {
  id: string;
  userId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CreateChatSessionInput {
  // No input needed - session is auto-created
}

export interface CreateChatMessageInput {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Create a new chat session
 */
export const createChatSession = async (): Promise<ChatSession> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert([{ user_id: user.id }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name || null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Fetch all chat sessions for the user
 */
export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    name: item.name || null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
};

/**
 * Fetch messages for a specific session
 */
export const fetchChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    sessionId: item.session_id,
    role: item.role,
    content: item.content,
    createdAt: item.created_at,
  }));
};

/**
 * Create a new chat message
 */
export const createChatMessage = async (input: CreateChatMessageInput): Promise<ChatMessage> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      session_id: input.sessionId,
      role: input.role,
      content: input.content,
    }])
    .select()
    .single();

  if (error) throw error;

  // Update session's updated_at timestamp
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.sessionId);

  return {
    id: data.id,
    sessionId: data.session_id,
    role: data.role,
    content: data.content,
    createdAt: data.created_at,
  };
};

/**
 * Update a chat session's name
 */
export const updateChatSessionName = async (sessionId: string, name: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('chat_sessions')
    .update({ name })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) throw error;
};

/**
 * Delete a chat session (cascades to messages)
 */
export const deleteChatSession = async (sessionId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) throw error;
};

