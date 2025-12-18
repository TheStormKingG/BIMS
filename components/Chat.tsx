import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Trash2, MessageCircle, Bot, User, Loader2, Search, MoreVertical } from 'lucide-react';
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
    setCurrentSession,
  } = useChat(spentItems);

  // Get current user
  useEffect(() => {
    const supabaseClient = getSupabase();
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex h-full w-full bg-[#0b141a] animate-fade-in overflow-hidden" style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }}>
      {/* Chat List Sidebar */}
      <div className={`${showChatList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/3 border-r border-[#2a3942] bg-[#111b21] overflow-hidden`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {/* Header */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
          <div className="flex items-center gap-3 flex-1">
            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
              <img
                src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-white font-semibold text-lg">Chats</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-[#2a3942] rounded-full transition-colors"
              title="New chat"
            >
              <Plus className="w-5 h-5 text-[#aebac1]" />
            </button>
            <button
              className="p-2 hover:bg-[#2a3942] rounded-full transition-colors"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5 text-[#aebac1]" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 bg-[#111b21] border-b border-[#2a3942]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full bg-[#202c33] text-white placeholder-[#8696a0] pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#8696a0]" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-[#8696a0] text-sm py-8 px-4">
              {searchQuery ? 'No chats found' : 'No chat sessions yet'}
              <br />
              <button
                onClick={handleNewChat}
                className="text-[#00a884] hover:underline mt-2"
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
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-[#202c33] transition-colors border-b border-[#2a3942] ${
                      isSelected ? 'bg-[#2a3942]' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#6a7175] flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm truncate">AI Assistant</span>
                        <span className="text-[#8696a0] text-xs ml-2 flex-shrink-0">{lastMessage.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[#8696a0] text-sm truncate">{lastMessage.text}</p>
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="ml-2 p-1 hover:bg-[#3a4549] rounded transition-colors flex-shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="w-4 h-4 text-[#8696a0]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${showChatList && window.innerWidth < 768 ? 'hidden' : 'flex'} md:flex flex-1 flex-col bg-[#0b141a] relative overflow-hidden md:pb-0 pb-20`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {!currentSession ? (
          <div className="flex-1 flex items-center justify-center bg-[#0b141a] bg-pattern">
            <div className="text-center max-w-md px-4">
              <div className="w-24 h-24 rounded-full bg-[#2a3942] flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-12 h-12 text-[#8696a0]" />
              </div>
              <h2 className="text-2xl font-light text-[#e9edef] mb-2">AI Finance Assistant</h2>
              <p className="text-[#8696a0] mb-6">
                Ask me anything about your spending, finances, or get personalized insights!
              </p>
              <button
                onClick={handleNewChat}
                className="bg-[#00a884] hover:bg-[#06cf9c] text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Start New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
              <div className="flex items-center gap-3 flex-1">
                {window.innerWidth < 768 && (
                  <button
                    onClick={() => setShowChatList(true)}
                    className="p-2 hover:bg-[#2a3942] rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#aebac1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-base">AI Assistant</h3>
                  <p className="text-[#8696a0] text-xs">Always online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
                  <Search className="w-5 h-5 text-[#aebac1]" />
                </button>
                <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5 text-[#aebac1]" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-2 md:pb-4 mb-20 md:mb-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 100 0 L 0 0 0 100\' fill=\'none\' stroke=\'%231f2937\' stroke-width=\'1\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")' }}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <p className="text-[#8696a0] text-sm">Start the conversation</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[65%] md:max-w-[70%] rounded-lg px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-[#005c4b] text-[#e9edef]'
                          : 'bg-[#202c33] text-[#e9edef]'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${message.role === 'user' ? 'text-[#667781]' : 'text-[#8696a0]'}`}>
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
                  <div className="bg-[#202c33] text-[#e9edef] rounded-lg px-2 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8696a0]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="bg-[#202c33] px-4 py-2 border-t border-[#2a3942] md:relative fixed bottom-20 left-0 right-0 md:bottom-0 md:left-auto md:right-auto flex-shrink-0" style={{ zIndex: 45 }}>
              {error && (
                <div className="mb-2 p-2 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-300">
                  {error}
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-[#2a3942] rounded-full transition-colors flex-shrink-0"
                >
                  <svg className="w-6 h-6 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-[#2a3942] rounded-full transition-colors flex-shrink-0"
                >
                  <svg className="w-6 h-6 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 bg-[#2a3942] text-white placeholder-[#8696a0] px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                  disabled={sending}
                />
                {inputValue.trim() ? (
                  <button
                    type="submit"
                    disabled={sending}
                    className="p-2 bg-[#00a884] hover:bg-[#06cf9c] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 text-white" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVoiceRecord}
                    disabled={sending || !currentSession}
                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'hover:bg-[#2a3942]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <svg className={`w-6 h-6 ${isRecording ? 'text-white' : 'text-[#8696a0]'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
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
