import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Trash2, MessageCircle, Bot, User, Loader2, Search, MoreVertical, Settings as SettingsIcon, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { ChatSession, ChatMessage } from '../services/chatDatabase';
import { getSupabase } from '../services/supabaseClient';

interface ChatProps {
  spentItems: any[];
}

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export const Chat: React.FC<ChatProps> = ({ spentItems }) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatList, setShowChatList] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
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
  } = useChat(spentItems);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  // Get current user
  useEffect(() => {
    const supabaseClient = getSupabase();
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Scroll only the messages container, not the entire page, to keep header visible
    const messagesContainer = messagesEndRef.current?.closest('.overflow-y-auto');
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    } else {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages]);

  // On mobile, hide chat list when a session is selected
  useEffect(() => {
    if (currentSession && window.innerWidth < 768) {
      setShowChatList(false);
    }
  }, [currentSession]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsRecording(false);
          
          // Auto-send the transcribed text
          if (transcript.trim() && currentSession) {
            handleSendTranscribedMessage(transcript);
          }
        };

        recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          alert('Speech recognition failed. Please try typing instead.');
        };

        recognitionInstance.onend = () => {
          setIsRecording(false);
        };

        setRecognition(recognitionInstance);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession]);

  const handleSendTranscribedMessage = async (transcript: string) => {
    if (!transcript.trim() || sending || !currentSession) return;

    const messageToSend = transcript.trim();
    setInputValue('');

    try {
      await sendMessage(messageToSend);
    } catch (err) {
      console.error('Failed to send transcribed message:', err);
    }
  };

  const handleVoiceRecord = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
        setIsRecording(false);
        alert('Failed to start recording. Please try again.');
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const messageToSend = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(messageToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      await startNewSession();
      if (window.innerWidth < 768) {
        setShowChatList(false);
      }
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteSession(sessionId);
        if (currentSession?.id === sessionId && sessions.length > 1) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            setCurrentSession(remainingSessions[0]);
          }
        } else if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setShowChatList(true);
        }
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSession(session);
    if (window.innerWidth < 768) {
      setShowChatList(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    // In a real implementation, you might search through message content
    return formatDate(session.updatedAt).toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get last message for a session (simplified - in real app, fetch from DB)
  const getLastMessage = (session: ChatSession) => {
    if (session.id === currentSession?.id && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      return {
        text: lastMsg.content.length > 50 ? lastMsg.content.substring(0, 50) + '...' : lastMsg.content,
        time: formatMessageTime(lastMsg.createdAt),
      };
    }
    return { text: 'Tap to start conversation', time: formatDate(session.updatedAt) };
  };

  return (
    <div className="flex h-full w-full bg-white animate-fade-in overflow-hidden" style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }}>
      {/* Chat List Sidebar */}
      <div className={`${showChatList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/3 border-r border-gray-200 bg-white overflow-hidden`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-[8px] flex-1">
            <img src="/stashway-logo.png" alt="Stashway" className="w-[47.5px] h-[47.5px] flex-shrink-0 md:hidden" />
            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
              <img
                src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover hidden md:block"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center hidden md:flex">
                <User className="w-5 h-5 text-gray-700" />
              </div>
            )}
            <span className="text-[22.8px] md:text-lg font-bold md:font-semibold text-slate-900 truncate">Chats</span>
          </div>
          <div className="flex items-center gap-[8px] flex-shrink-0">
            <button
              onClick={handleNewChat}
              className="p-[6px] bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
              title="New chat"
            >
              <Plus className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={() => navigate('/settings', { state: { openPersonalInfo: true } })}
              className="p-[6px] bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer md:hidden"
            >
              {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                <img
                  src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-500" />
              )}
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden md:block"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 bg-white border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-gray-600 text-sm py-8 px-4">
              {searchQuery ? 'No chats found' : 'No chat sessions yet'}
              <br />
              <button
                onClick={handleNewChat}
                className="text-emerald-600 hover:underline mt-2"
              >
                Start a new chat
              </button>
            </div>
          ) : (
            <div>
              {filteredSessions.map((session) => {
                const lastMessage = getLastMessage(session);
                const isSelected = currentSession?.id === session.id;
                
                return (
                  <div
                    key={session.id}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-100 transition-colors border-b border-gray-200 ${
                      isSelected ? 'bg-gray-100' : 'bg-white'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
                        <img src="/stashway-logo.png" alt="Stashway" className="w-6 h-6 object-cover" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        {editingSessionId === session.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={async () => {
                              if (editName.trim()) {
                                try {
                                  await renameSession(session.id, editName.trim());
                                } catch (err) {
                                  console.error('Failed to rename:', err);
                                }
                              }
                              setEditingSessionId(null);
                              setEditName('');
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (editName.trim()) {
                                  try {
                                    await renameSession(session.id, editName.trim());
                                  } catch (err) {
                                    console.error('Failed to rename:', err);
                                  }
                                }
                                setEditingSessionId(null);
                                setEditName('');
                              } else if (e.key === 'Escape') {
                                setEditingSessionId(null);
                                setEditName('');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-transparent border-b border-emerald-600 text-gray-900 font-medium text-sm focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span 
                              className="text-gray-900 font-medium text-sm truncate flex-1 cursor-pointer"
                              onClick={() => handleSessionSelect(session)}
                            >
                              {session.name || 'New Chat'}
                            </span>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(session.id);
                                  setEditName(session.name || '');
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Rename chat"
                              >
                                <Pencil className="w-3 h-3 text-gray-600" />
                              </button>
                              <span className="text-gray-500 text-xs">{lastMessage.time}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p 
                          className="text-gray-600 text-sm truncate cursor-pointer"
                          onClick={() => handleSessionSelect(session)}
                        >
                          {lastMessage.text}
                        </p>
                        {isSelected && editingSessionId !== session.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${showChatList && window.innerWidth < 768 ? 'hidden' : 'flex'} md:flex flex-1 flex-col bg-white relative overflow-hidden md:pb-0 pb-20`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {!currentSession ? (
          <div className="flex-1 flex items-center justify-center bg-white bg-pattern">
            <div className="text-center max-w-md px-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-12 h-12 text-gray-600" />
              </div>
              <h2 className="text-2xl font-light text-gray-900 mb-2">Stashway<sup className="text-xs">™</sup></h2>
              <p className="text-gray-600 mb-6">
                Ask me anything about your spending, finances, or get personalized insights!
              </p>
              <button
                onClick={handleNewChat}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Start New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200 sticky top-0 z-40">
              <div className="flex items-center gap-[8px] flex-1">
                {window.innerWidth < 768 ? (
                  <>
                    <button
                      onClick={() => setShowChatList(true)}
                      className="p-[6px] bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer flex-shrink-0"
                    >
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <img src="/stashway-logo.png" alt="Stashway" className="w-[47.5px] h-[47.5px] flex-shrink-0" />
                    <h3 className="text-[22.8px] font-bold text-slate-900 truncate">Stashway<sup className="text-xs">™</sup></h3>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src="/stashway-logo.png" alt="Stashway" className="w-10 h-10 object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 font-medium text-base">Stashway<sup className="text-xs">™</sup></h3>
                      <p className="text-gray-500 text-xs">Always online</p>
                    </div>
                  </>
                )}
              </div>
              {window.innerWidth < 768 && (
                <div className="flex items-center gap-[8px] flex-shrink-0">
                  <button
                    onClick={() => navigate('/settings', { state: { openPersonalInfo: true } })}
                    className="p-[6px] bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                      <img
                        src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-500" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-2 md:pb-4 mb-20 md:mb-0 bg-white">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <p className="text-gray-500 text-sm">Start the conversation</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[65%] md:max-w-[70%] rounded-lg px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                        <span className="text-[10px]">{formatMessageTime(message.createdAt)}</span>
                        {message.role === 'user' && (
                          <svg className="w-4 h-4" viewBox="0 0 16 15" width="16" height="15">
                            <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 text-gray-900 rounded-lg px-2 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="bg-white px-4 py-2 border-t border-gray-200 md:relative fixed bottom-20 left-0 right-0 md:bottom-0 md:left-auto md:right-auto flex-shrink-0" style={{ zIndex: 45 }}>
              {error && (
                <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded-lg text-xs text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  disabled={sending || !currentSession}
                />
                {inputValue.trim() ? (
                  <button
                    type="submit"
                    disabled={sending || !currentSession}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVoiceRecord}
                    className={`p-2 rounded-full transition-colors ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Voice input'}
                    disabled={sending || !currentSession}
                  >
                    <svg
                      className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-gray-700'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
