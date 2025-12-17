import React from 'react';
import { Lightbulb, X, Check } from 'lucide-react';
import { Tip } from '../services/tipsDatabase';

interface TipsProps {
  tips: Tip[];
  onMarkAsRead: (tipId: string) => void;
  onDismiss: (tipId: string) => void;
  showAll?: boolean;
}

export const Tips: React.FC<TipsProps> = ({ tips, onMarkAsRead, onDismiss, showAll = false }) => {
  if (tips.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <Lightbulb className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No tips available. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tips.map((tip) => (
        <div
          key={tip.id}
          className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
        >
          <div className="flex-shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-sm leading-relaxed">{tip.tipText}</p>
            {tip.tipCategory && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-800 rounded">
                {tip.tipCategory}
              </span>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center gap-1">
            {!tip.readAt && (
              <button
                onClick={() => onMarkAsRead(tip.id)}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDismiss(tip.id)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

