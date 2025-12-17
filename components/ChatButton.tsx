import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatButtonProps {
  className?: string;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/chat')}
      className={`
        ${className}
        bg-emerald-600 hover:bg-emerald-700 
        text-white 
        rounded-full 
        shadow-lg shadow-emerald-900/30
        hover:shadow-xl hover:shadow-emerald-900/40
        active:scale-95
        transition-all duration-200
        flex items-center justify-center
        z-40
      `}
      title="AI Chat"
      aria-label="Open AI Chat"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
};

