import React from 'react';
import { X, Trophy } from 'lucide-react';
import { Celebration } from '../services/celebrationService';

interface CelebrationModalProps {
  celebration: Celebration;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ celebration, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-6 shadow-lg">
            <Trophy className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Congratulations!
          </h2>

          <p className="text-lg text-slate-700 mb-6 leading-relaxed">
            {celebration.message}
          </p>

          <button
            onClick={onClose}
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
};

