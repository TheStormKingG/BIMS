import React, { useState } from 'react';
import { User, Mail, UserPlus, MessageSquare, Info, Camera, ChevronRight, X } from 'lucide-react';
import { getSupabase } from '../services/supabaseClient';

interface SettingsProps {
  user: any;
}

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [problemText, setProblemText] = useState('');
  const supabase = getSupabase();

  const handleProfilePhoto = () => {
    // TODO: Implement profile photo upload
    alert('Profile photo upload coming soon!');
  };

  const handlePersonalInformation = () => {
    setSelectedOption('personal-info');
  };

  const handleLinkedEmail = () => {
    setSelectedOption('linked-email');
  };

  const handleInviteContact = () => {
    setSelectedOption('invite-contact');
  };

  const handleProblemSuggestions = () => {
    setSelectedOption('problem-suggestions');
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    // TODO: Implement invite functionality
    alert(`Invite sent to ${inviteEmail}!`);
    setInviteEmail('');
    setSelectedOption(null);
  };

  const handleSubmitProblem = async () => {
    if (!problemText.trim()) {
      alert('Please enter your problem or suggestion');
      return;
    }
    // TODO: Implement feedback submission
    alert('Thank you for your feedback!');
    setProblemText('');
    setSelectedOption(null);
  };

  if (selectedOption) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedOption === 'personal-info' && 'Personal Information'}
              {selectedOption === 'linked-email' && 'Linked Email Address'}
              {selectedOption === 'invite-contact' && 'Invite a Contact'}
              {selectedOption === 'problem-suggestions' && 'Problem/Suggestions'}
            </h1>
            <button
              onClick={() => setSelectedOption(null)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Personal Information */}
          {selectedOption === 'personal-info' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue={user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed here</p>
              </div>
              <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
                Save Changes
              </button>
            </div>
          )}

          {/* Linked Email Address */}
          {selectedOption === 'linked-email' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Current Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Add Additional Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter email address to link"
                />
              </div>
              <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
                Link Email
              </button>
            </div>
          )}

          {/* Invite Contact */}
          {selectedOption === 'invite-contact' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <p className="text-slate-600">Invite a friend or family member to join Stashway!</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter email address"
                />
              </div>
              <button
                onClick={handleSendInvite}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Send Invite
              </button>
            </div>
          )}

          {/* Problem/Suggestions */}
          {selectedOption === 'problem-suggestions' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <p className="text-slate-600">We'd love to hear from you! Share any problems you've encountered or suggestions for improvement.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Feedback</label>
                <textarea
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black resize-none"
                  placeholder="Describe the problem or share your suggestion..."
                />
              </div>
              <button
                onClick={handleSubmitProblem}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Profile Photo */}
          <button
            onClick={handleProfilePhoto}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-medium text-slate-900">Profile Photo</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Personal Information */}
          <button
            onClick={handlePersonalInformation}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-900">Personal Information</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Linked Email Address */}
          <button
            onClick={handleLinkedEmail}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium text-slate-900">Linked Email Address</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Invite a Contact */}
          <button
            onClick={handleInviteContact}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium text-slate-900">Invite a Contact</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Problem/Suggestions */}
          <button
            onClick={handleProblemSuggestions}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium text-slate-900">Problem/Suggestions</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* App Version */}
          <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Info className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-slate-900">App Version</span>
                <span className="text-sm text-slate-500">1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

